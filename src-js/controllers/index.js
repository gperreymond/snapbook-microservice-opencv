"use strict";

// Wee will have to change that very soon plz !
var cloudcv;
if (process.env.TUTUM_SERVICE_HOSTNAME) {
  cloudcv = require('../build/Release/cloudcv');
} else {
  cloudcv = require('../../build/Release/cloudcv');
} 

var path = require('path');
var fse = require('fs-extra');
var Q = require('q'); // https://github.com/kriskowal/q

exports.alive = {
  auth: false,
  handler: function(request, reply) {
    reply({alive:true});
  }
};

exports.compare = {
  auth: false,
  handler: function(request, reply) {
    var onFail = false;
    compareHandler(request.payload.filepath)
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

function compareHandler(filepath) {
  
  var imview;
  
  return promisedLoadImage(filepath)
  .then(function(result) {
    imview = result;
    return imview;
  });
  
}

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