"use strict";

if (process.env.ENABLE_NEWRELIC) require('newrelic');

var server = require('./server');
server.start(function() {
  console.log('Server started ', server.info.uri);
});