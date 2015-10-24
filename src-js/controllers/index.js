"use strict";

// Wee will have to change that very soon plz !
var cloudcv;
if (process.env.TUTUM_SERVICE_HOSTNAME) {
  cloudcv = require('./build/Release/cloudcv');
} else {
  cloudcv = require('../../build/Release/cloudcv');
}


var path = require('path');
var fse = require('fs-extra');
var Boom = require('boom');

exports.alive = {
  auth: false,
  handler: function(request, reply) {
    reply({alive:true});
  }
};

exports.compare = {
  auth: false,
  handler: function(request, reply) {
    reply({compare:true});
  }
};

exports.compute = {
  auth: false,
  handler: function(request, reply) {
    // load
    var dirpath = path.dirname(request.payload.filepath);
    var basename = path.basename(request.payload.filepath,'.jpg');
    cloudcv.loadImage(request.payload.filepath, function(err, imview) {
      if (err) {
        console.log(err);
        return reply(Boom.badImplementation());
      }
      // resize
      var maxWidth = 512;
      var maxHeight = 512;
      getOptimalSizeImage(imview, maxWidth, maxHeight, function(w, h) {
        imview.thumbnail(w, h, function(err, imview_thumb) {
          if (err) {
            console.log(err);
            return reply(Boom.badImplementation());
          }
          // compute
          imview_thumb.compute('AKAZE', function(err, imview_compute) {
            if (err) {
              console.log(err);
              return reply(Boom.badImplementation());
            }
            // save thumb
            imview_thumb.asPngStream(function(err, data) {
              if (err) {
                console.log(err);
                return reply(Boom.badImplementation());
              }
              var file_cpte = path.normalize(dirpath+'/thumbs/'+basename+'-thb.png');
              fse.ensureFileSync(file_cpte);
              fse.writeFileSync(file_cpte, new Buffer(data));
              // save keypoints
              var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
              fse.ensureFileSync(keypointsFile);
              fse.writeFileSync(keypointsFile, imview_thumb.keypoints());
              // save descriptors
              var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
              fse.ensureFileSync(descriptorsFile);
              fse.writeFileSync(descriptorsFile, imview_thumb.descriptors());
              // save compute
              imview_compute.asPngStream(function(err, data) {
                if (err) {
                  console.log(err);
                  return reply(Boom.badImplementation());
                }
                var file_cpte = path.normalize(dirpath+'/computes/'+basename+'-cpte.png');
                fse.ensureFileSync(file_cpte);
                fse.writeFileSync(file_cpte, new Buffer(data));
                // return 200
                reply({compute:true});
              });
            });
          });
        });
      });
    });
  }
};

function getOptimalSizeImage(imgview, maxWidth, maxHeight, callback) {
  var w;
  var h;
  if ( imgview.width() > maxWidth || imgview.height() > maxHeight ) {
    var imgWidth = imgview.width();
    var imgHeight = imgview.height();
    var _width = imgview.width();
    var _height = imgview.height();
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
    w = imgview.width();
    h = imgview.height();
  }
  callback(w, h);
}