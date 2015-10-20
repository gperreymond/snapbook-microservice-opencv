'use-strict';

var chai = require('chai');
var expect = chai.expect;
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var cloudcv = require('../build/Release/cloudcv');

