"use strict";

var chai = require('chai');
var expect = chai.expect;
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var cloudcv = require('../build/Release/cloudcv');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');

var imview_snap_upload = null;
var imview_snap_compute = null;

var imview_pattern_good = null;
var imview_pattern_fail = null;

var snap_broken_filepath = path.resolve('test/applications/mocha/uploads/snap-broken.jpg');
var snap_upload_filepath = path.resolve('test/applications/mocha/uploads/snap-upload.jpg');
var pattern_good_filepath = path.resolve('test/applications/mocha/patterns/pattern-good.jpg');
var pattern_fail_filepath = path.resolve('test/applications/mocha/patterns/pattern-fail.jpg');

var keypoints_dirpath = 'test/applications/mocha/patterns/keypoints';
var descriptors_dirpath = 'test/applications/mocha/patterns/descriptors';

describe('opencv', function () {
  it('should return the version of cloudcv', function (done) {
    try {
      expect(cloudcv.version()).to.be.equal('3.0');
      done();
    } catch (e) {
      done(e);
    }
  });
  it('should return that image "snap-broken.jpg" does not exist', function (done) {
    try {
      fs.stat(snap_broken_filepath, function(err, stats) {
        expect(err).to.be.not.null;
        expect(stats).to.be.undefined;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should load the image "snap-upload.jpg" and return width=480 and height=640', function (done) {
    try {
      expect(fs.statSync(snap_upload_filepath)).to.be.an('object');
      cloudcv.loadImage(snap_upload_filepath, function(err, imview) {
        expect(err).to.be.null;
        expect(imview).to.be.not.null;
        expect(imview.width()).to.equal(480);
        expect(imview.height()).to.equal(640);
        imview_snap_upload = imview;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should load the image "pattern-good.jpg" and return width=959 and height=480', function (done) {
    try {
      expect(fs.statSync(pattern_good_filepath)).to.be.an('object');
      cloudcv.loadImage(pattern_good_filepath, function(err, imview) {
        expect(err).to.be.null;
        expect(imview).to.be.not.null;
        expect(imview.width()).to.equal(959);
        expect(imview.height()).to.equal(480);
        imview_pattern_good = imview;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should load the image "pattern-fail.jpg" and return width=959 and height=480', function (done) {
    try {
      expect(fs.statSync(pattern_fail_filepath)).to.be.an('object');
      cloudcv.loadImage(pattern_fail_filepath, function(err, imview) {
        expect(err).to.be.null;
        expect(imview).to.be.not.null;
        expect(imview.width()).to.equal(959);
        expect(imview.height()).to.equal(480);
        imview_pattern_fail = imview;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should compute the image "snap-upload.jpg" with "WTF!" and returns [Error: Method not implemented]', function (done) {
    try {
      imview_snap_upload.compute('WTF!', function(err, imview_compute) {
        expect(err).to.be.not.null;
        expect(imview_compute).to.be.undefined;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should compute the image "snap-upload.jpg" with "ORB" and returns keypoints and descriptors', function (done) {
    try {
      imview_snap_upload.compute('ORB', function(err, imview_compute) {
        expect(err).to.be.null;
        expect(imview_compute).to.be.not.null;
        expect(imview_snap_upload.descriptors()).to.be.not.null;
        expect(imview_snap_upload.keypoints()).to.be.not.null;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should compute the image "snap-upload.jpg" with "AKAZE" and returns keypoints and descriptors', function (done) {
    try {
      imview_snap_upload.compute('AKAZE', function(err, imview_compute) {
        expect(err).to.be.null;
        expect(imview_compute).to.be.not.null;
        expect(imview_snap_upload.descriptors()).to.be.not.null;
        expect(imview_snap_upload.keypoints()).to.be.not.null;
        imview_snap_compute = imview_snap_upload;
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should compute the image "pattern-good.jpg" with "AKAZE" and returns keypoints and descriptors', function (done) {
    try {
      imview_pattern_good.compute('AKAZE', function(err, imview_compute) {
        // compute pattern
        expect(err).to.be.null;
        expect(imview_compute).to.be.not.null;
        expect(imview_pattern_good.descriptors()).to.be.not.null;
        expect(imview_pattern_good.keypoints()).to.be.not.null;
        // write files
        var keypointsFile = path.resolve(keypoints_dirpath+'/pattern-good-kpts.yml');
        fse.ensureFileSync(keypointsFile);
        fse.writeFileSync(keypointsFile, imview_pattern_good.keypoints());
        var descriptorsFile = path.resolve(descriptors_dirpath+'/pattern-good-dcts.yml');
        fse.ensureFileSync(descriptorsFile);
        fse.writeFileSync(descriptorsFile, imview_pattern_good.descriptors());
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should compute the image "pattern-fail.jpg" with "AKAZE" and returns keypoints and descriptors', function (done) {
    try {
      imview_pattern_fail.compute('AKAZE', function(err, imview_compute) {
        // compute pattern
        expect(err).to.be.null;
        expect(imview_compute).to.be.not.null;
        expect(imview_pattern_fail.descriptors()).to.be.not.null;
        expect(imview_pattern_fail.keypoints()).to.be.not.null;
        // write files
        var keypointsFile = path.resolve(keypoints_dirpath+'/pattern-fail-kpts.yml');
        fse.ensureFileSync(keypointsFile);
        fse.writeFileSync(keypointsFile, imview_pattern_fail.keypoints());
        var descriptorsFile = path.resolve(descriptors_dirpath+'/pattern-fail-dcts.yml');
        fse.ensureFileSync(descriptorsFile);
        fse.writeFileSync(descriptorsFile, imview_pattern_fail.descriptors());
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should return coincide=true when compare "pattern-good.jpg" and "snap-upload.jpg"', function (done) {
    try {
      var keypointsFile = path.resolve(keypoints_dirpath+'/pattern-good-kpts.yml');
      var descriptorsFile = path.resolve(descriptors_dirpath+'/pattern-good-dcts.yml');
      imview_snap_compute.compare(keypointsFile, descriptorsFile, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.at.least(20);
        done();
      });
    } catch (e) {
      done(e);
    }
  });
  it('should return coincide=false when compare "pattern-fail.jpg" and "snap-upload.jpg"', function (done) {
    try {
      var keypointsFile = path.resolve(keypoints_dirpath+'/pattern-fail-kpts.yml');
      var descriptorsFile = path.resolve(descriptors_dirpath+'/pattern-fail-dcts.yml');
      imview_snap_compute.compare(keypointsFile, descriptorsFile, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.below(20);
        done();
      });
    } catch (e) {
      done(e);
    }
  });
});

