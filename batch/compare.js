"use strict";

var cloudcv = require('../build/Release/cloudcv');

var path = require('path');
var _ = require('lodash');
var async = require('async');
var dir = require('node-dir');

var params = {};
process.argv.forEach(function (val, index, array) {
  console.log(array);
  if ( index>=2 ) {
    params[val.split('=')[0]] = path.resolve(val.split('=')[1]);
  } else {
  }
});

var processes = 2;
var q = async.queue(function (task, callback) {
  console.log('batch', task.pattern);
  batch(path.normalize(task.pattern), task.imview, function(err, result) {
    if (err) {
      callback(err, false);
    } else {
      console.log('finished processing', result.data);
      callback(false, result);
    }
  });
}, processes);
q.drain = function() {
  console.log('all items have been processed');
};

cloudcv.loadImage(params.source, function(err, imview) {
  if (err) return console.log(err);
  imview.compute('AKAZE', function(err, imview_compute) {
    imview_compute = null;
    if (err) return console.log(err);
    start(imview);
  });
});

function start(imview) {
  dir.readFiles(params.application, {
    match: /.jpg$/,
    exclude: /^\./
  }, function(err, content, next) {
    if (err) throw err;
    next();
  },
  function(err, files){
    files = _.take(files,files.length/1);
    if (err) throw err;
    console.log('*****', 'GLOBAL START', files.length);
    var TS = new Date();
    async.map(files,
      function(item, cb) {
        q.push({pattern : item, imview : imview}, function (err,result) {
          if (err) {
            cb(null, false);
          } else {
            cb(null, result);
          }  
        });
      }, function(err, results) {
        var TE = new Date();
        console.log('*****', 'GLOBAL END','execute in', TE-TS, 'ms');
        console.log(err, results);
    });
  });
}

function batch(filepath, imview, callback_batch) {
  var filename = path.basename(filepath);
  var dirpath = path.dirname(filepath);
  var basename = path.basename(filepath,'.jpg');
  
  var results = {};
  results.logs = {};
  results.logs.filename = filename;
  
  var t1 = new Date();
  var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
  var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
  
  imview.compare(keypointsFile, descriptorsFile, function(err, result) {
    var t2 = new Date();
    results.logs.compare = t2 - t1;
    results.data = result;
    callback_batch(err, results);
  });
}