'use-strict';

var chai = require('chai');
var expect = chai.expect;
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var cloudcv = require('../build/Release/cloudcv');

//console.log(cloudcv.buildInformation());

describe('opencv', function () {
  it('should return the version of cloudcv we use', function (done) {
    try {
      expect(cloudcv.version()).to.be.equal('3.0');
      done();
    } catch (e) {
      done(e);
    }
  });
});

