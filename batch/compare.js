"use strict";

var cloudcv = require('../build/Release/cloudcv');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var dir = require('node-dir');

/**
 * 
 * @source = snap filepth
 * @application = application's patterns dirpath
 * 
 * node batch/compare.js source=/home/ubuntu/workspace/ftp/bo.snapbook.io/applications/uploads/2015/11/30/93ce6032-86e2-4acb-b0be-439176d82401.jpg application=/home/ubuntu/workspace/ftp/bo.snapbook.io/applications/5656de2d6c675d15135ba9dd/patterns
 * 
 **/ 

var processes = 100;

var params = {};
process.argv.forEach(function (val, index, array) {
  if ( index>=2 ) {
    params[val.split('=')[0]] = path.resolve(val.split('=')[1]);
  } else {
  }
});

var t1 = new Date();
var q = async.queue(function (task, callback) {
  batch(path.normalize(task.pattern), task.imview, function(err, result) {
    if (err) {
      callback(err, false);
    } else {
      if ( process.env.DEBUG && result.data>0 ) console.log('finished processing', task.pattern, result.data);
      callback(false, result);
    }
  });
}, processes);
q.drain = function() {
  var t2 = new Date();
  if ( process.env.DEBUG ) console.log('all items have been processed', t2-t1);
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
    if (err) throw err;
    async.map(files,
      function(item, cb) {
        q.push({pattern : item, imview : imview}, function(err) {
          cb(err); 
        });
      }, function(err, results) {
        
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