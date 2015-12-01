"use strict";

// Wee will have to change that very soon plz !
var cloudcv;
if (process.env.TUTUM_SERVICE_HOSTNAME) {
  cloudcv = require('../build/Release/cloudcv');
} else {
  cloudcv = require('../../build/Release/cloudcv');
} 

var dir = require('node-dir');
var async = require('async');
var _ = require('lodash');
var path = require('path');
var fse = require('fs-extra');
var gm = require('gm');
var md5 = require('md5-file');

var Boom = require('boom');
var Q = require('q'); // https://github.com/kriskowal/q

exports.alive = {
  auth: false,
  handler: function(request, reply) {
    reply({alive:true});
  }
};

exports.analyse = {
  auth: false,
  handler: function(request, reply) {
    try {
      gm(request.payload.filepath)
      .identify(function(err, data) {
        if (err) return reply(Boom.badRequest(err));
        var stats = {};
        var fstats = fse.lstatSync(request.payload.filepath);
        stats.md5 = md5(request.payload.filepath);
        stats.size = fstats.size;
        stats.format = data.format;
        stats.channel = data['Channel Statistics'];
        stats.date = new Date();
        stats.width = data.size.width;
        stats.height = data.size.height;
        reply(stats);
      });
    } catch (e) {
      reply(Boom.badRequest(e));
    }
  }
};

exports.compare = {
  auth: false,
  handler: function(request, reply) {
	  try {
      async.waterfall([
        // 1. initialize
        function(callback) {
          var results = {};
          results.snap_filepath = request.payload.snap_filepath;
          callback(null, results);
        },
        // 1. load image
        function(results, callback) {
          load_image(results.snap_filepath, function(err, imview) {
            if (err) return callback(err, null);
            results.imview = imview;
            callback(null, results);
          });
        },
        // 2. resize image
        function(results, callback) {
          var w;
          var h;
          var maxWidth = 512;
          var maxHeight = 512;
          if ( results.imview.width() > maxWidth || results.imview.height() > maxHeight ) {
            var imgWidth = results.imview.width();
            var imgHeight = results.imview.height();
            var _width = results.imview.width();
            var _height = results.imview.height();
            if (maxWidth && _width > maxWidth) {
              _width = maxWidth;
              _height = (imgHeight * _width / imgWidth);
            }
            if (maxHeight && _height > maxHeight) {
              _height = maxHeight;
              _width = (imgWidth * _height / imgHeight);
            }
            w = _width;
            h = _height;
          } else {
            w = results.imview.width();
            h = results.imview.height();
          }
          results.imview.thumbnail(w, h, function(error, imview_thumb) {
            if (error) return callback(error, null);
            results.imview = imview_thumb;
            callback(null, results);
          });
          
        },
        // 3. compute just resized image
        function(results, callback) {
          results.imview.compute('AKAZE', function(err, imview_compute) {
            imview_compute = null;
            if (err) return callback(err, null);
            callback(null, results);
          });
        },
        // 4. compare process
        function(results, callback) {
          results.compare_results = [];
          // prepare queues
          var q = async.queue(function (task, cb) {
            compare_execute(task.pattern_filepath, task.snap_imview, function(e, r) {
              if (r.coincide === true ) {
                r.pattern = path.basename(task.pattern_filepath, '.jpg');
                results.compare_results.push(r);
              }
              cb();
            });
          }, 20);
          q.drain = function() {
            console.log('all items have been processed');
            callback(null, results);
          };
          // prepares files
          var volumes_applications = process.env.SNAPBOOK_VOLUMES_APPLICATIONS;
          dir.readFiles(volumes_applications+'/'+request.params.id+'/patterns', {
            match: /.jpg$/,
            exclude: /^\./
          }, function(err, content, next) {
            next(err);
          },
          function(err, files) {
            if (err) return callback(err, null);
            results.files = files;
            _.each(results.files, function(item) {
              q.push({pattern_filepath : path.normalize(item), snap_imview : results.imview}, function(err) {
                if (err) {}
              });
            });
          });
        },
        // 5. analyse
        function(results, callback) {
          
          //var list_patterns = _.pluck(results.compare_results, 'pattern');
    			var final_results;
    			var id_pattern;
    			
    			var resmode;
    			if ( _.isNull(request.payload.mode) || _.isUndefined(request.payload.mode) ) {
    				resmode = 'debug';
    			} else {
    				resmode = request.payload.mode;
    				delete request.payload.mode;
    			}
    			
    			switch (resmode) {
  					/**case 'activity':
  						final_results = _.pluck(_.sortByOrder(results.compare_results, 'good_matches', 'desc'), 'pattern');
  						if ( _.isArray(final_results)) {
  							id_pattern = final_results[0];
  							Activities
  							.findOne({ patterns: { "$in" : [id_pattern]} })
  							.populate('ressources patterns')
  							.exec( function(err,activity) {
  								if ( err ) {
  			                		errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE',err);
  									callback(errorEvent,results);
  				            	} else {
  				            		final_results = activity;
  				            		logger.metadata.activity = (_.isNull(activity)) ? false : activity._id.toString();
  									callback(null,final_results);
  				            	}
  							});
  						} else { 
  							final_results = {};
  							callback(null, final_results);
  						}
  						break;**/
  					case 'pattern':
  						final_results = _.pluck(_.sortByOrder(results.compare_results, 'good_matches', 'desc'), 'pattern');
  						if ( _.isArray(final_results)) {
  							id_pattern = final_results[0];
  							callback(null, id_pattern);
  						} else {
  							final_results = {};
  							callback(null, final_results);
  						}
  						break;
  					case 'debug':
  					  callback(null, results.compare_results);
  						/*Patterns.find({ '_id' : { $in : list_patterns } },function(err, patterns) {
  							if (err) {
  								errorEvent = new ErrorEvent(418,'ERROR_ANALYSE',err);
  								callback(errorEvent,results);
  							} else {
  								results.patterns = patterns;
  								callback(null,results);
  							}
  						});*/
  						break;
		    	}
        }
      ], function(err, results) {
			  if (err) return reply(Boom.badRequest(err));
				if ( _.isNull(results) ) results = {};
				reply(results);
		  });
    } catch(e) {
      reply(Boom.badRequest(e));
    }
  }
};

exports.compute = {
  auth: false,
  handler: function(request, reply) {
    var onFail = false;
    computeHandler(request.payload.filepath)
    .progress(function(progress) {
      console.log('Promise Progress', progress);
    })
    .fail(function(error) {
      console.log('Promise Fail', request.payload.filepath, error);
      onFail = true;
    })
    .done(function() {
      console.log('Promise Done', request.payload.filepath);
      reply({done:!onFail});
    });
  }
};

// COMPARE

var load_image = function(filepath, callback) {
  cloudcv.loadImage(filepath, function(err, imview) {
    if (err) return callback(err, null);
    callback(null, imview);
  });

};

var compare_execute = function(filepath, imview, callback_batch) {
  var dirpath = path.dirname(filepath);
  var basename = path.basename(filepath,'.jpg');
  var results = {};
  var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
  var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
  imview.compare(keypointsFile, descriptorsFile, function(err, result) {
    if ( result===0 ) {
      results.coincide = false;
    } else {
      results.coincide = true;
      results.good_matches = result;
    }
    callback_batch(err, results);
  });
};

// BATCH

function computeHandler(filepath) {
  
  var imview;
  var imview_thumb;
  var imview_compute;
  
  return promisedLoadImage(filepath)
  .then(function(result) {
    imview = result;
    return promisedResizeImage(imview, filepath);
  })
  .then(function(result) {
    imview_thumb = result;
    return promisedComputeImage(imview_thumb, filepath);
  })
  .then(function(result) {
    imview_compute = result;
    return promisedSaveImage(imview_compute, filepath, 'computes', 'cpte');
  })
  .then(function() {
    return promisedSaveImage(imview_thumb, filepath, 'thumbs', 'thb');
  })
  .then(function() {
    return promisedSaveImageKeypoints(imview_thumb, filepath);
  })
  .then(function() {
    return promisedSaveImageDescriptors(imview_thumb, filepath);
  });
  
}

function promisedLoadImage(filepath) {
  var deferred = Q.defer();
  cloudcv.loadImage(filepath, function(error, imview) {
    deferred.notify({ step:'Load Image', filepath:filepath });
    if (error) {
      deferred.reject(new Error(error));
    } else {
      deferred.resolve(imview);
    }
  });
  return deferred.promise;
}

function promisedResizeImage(imview, filepath) {
  var deferred = Q.defer();
  deferred.notify({ step:'Resize Image', filepath:filepath });
  try {
    var w;
    var h;
    var maxWidth = 512;
    var maxHeight = 512;
    if ( imview.width() > maxWidth || imview.height() > maxHeight ) {
      var imgWidth = imview.width();
      var imgHeight = imview.height();
      var _width = imview.width();
      var _height = imview.height();
      if (maxWidth && _width > maxWidth) {
        _width = maxWidth;
        _height = (imgHeight * _width / imgWidth);
      }
      if (maxHeight && _height > maxHeight) {
        _height = maxHeight;
        _width = (imgWidth * _height / imgHeight);
      }
      w = _width;
      h = _height;
    } else {
      w = imview.width();
      h = imview.height();
    }
    imview.thumbnail(w, h, function(error, imview_thumb) {
      if (error) {
        deferred.reject(new Error(error));
      } else {
        deferred.resolve(imview_thumb);
      }
    });
  } catch (e) {
    deferred.reject(new Error(e));
  }
  return deferred.promise;
}

function promisedComputeImage(imview, filepath) {
  var deferred = Q.defer();
  imview.compute('AKAZE', function(error, imview_compute) {
    deferred.notify({ step:'Compute Image', filepath:filepath });
    if (error) {
      deferred.reject(new Error(error));
    } else {
      deferred.resolve(imview_compute);
    }
  });
  return deferred.promise;
}

function promisedSaveImage(imview, filepath, target, suffix) {
  var deferred = Q.defer();
  var dirpath = path.dirname(filepath);
  var basename = path.basename(filepath,'.jpg');
  imview.asPngStream(function(error, data) {
    deferred.notify({ step:'Save Image', filepath:filepath, target:target });
    if (error) {
      deferred.reject(new Error(error));
    } else {
      var filepath_save = path.normalize(dirpath+'/'+target+'/'+basename+'-'+suffix+'.png');
      fse.removeSync(filepath_save);
      fse.ensureFileSync(filepath_save);
      fse.writeFileSync(filepath_save, new Buffer(data));
      deferred.resolve();
    }
  });
  return deferred.promise;
}

function promisedSaveImageKeypoints(imview, filepath) {
  var deferred = Q.defer();
  var dirpath = path.dirname(filepath);
  var basename = path.basename(filepath,'.jpg');
  
  var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
  fse.ensureFileSync(keypointsFile);
  fse.writeFileSync(keypointsFile, imview.keypoints());
  
  deferred.notify({ step:'Save Keypoints', filepath:filepath, target:'keypoints' });
  deferred.resolve();
  
  return deferred.promise;
}

function promisedSaveImageDescriptors(imview, filepath) {
  var deferred = Q.defer();
  var dirpath = path.dirname(filepath);
  var basename = path.basename(filepath,'.jpg');
  
  var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
  fse.ensureFileSync(descriptorsFile);
  fse.writeFileSync(descriptorsFile, imview.descriptors());
  
  deferred.notify({ step:'Save Descriptors', filepath:filepath, target:'descriptors' });
  deferred.resolve();
  
  return deferred.promise;
}