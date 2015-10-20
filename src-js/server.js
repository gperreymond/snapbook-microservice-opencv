'use-strict';

var Hapi = require('hapi');
var Routes = require('./routes');

// !-- FOR TESTS
var options = {
  host: process.env.SNAPBOOK_MICROSERVICE_OPENCV_ADDR || 'localhost',
  port: process.env.SNAPBOOK_MICROSERVICE_OPENCV_PORT || '10101'
};
// --!

var server = new Hapi.Server({
  debug: false,
  connections: {
    routes: {
      cors: true
    }
  }
});

server.connection(options);

if (!process.env.SNAPBOOK_NPM_TEST_PROCESS) {
  var async = require('async');
  async.mapSeries(['blipp', 'good'], function(item, callback) {
    require('./plugins/'+item)(server);
    callback(null, item);
  }, function(err, results) {
    server.route(Routes.endpoints);
  });
} else {
  server.route(Routes.endpoints);
}

// !-- FOR TESTS
module.exports = server;
// --!