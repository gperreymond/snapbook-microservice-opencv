"use strict";

var Good = require('good');

var options = {
  reporters: [{
    reporter: require('good-console'),
    events: { log: '*', response: '*' }
  }] 
};

var GoodProvision = function(server) {
  server.register({
    register: Good,
    options: options
  }, function (err) {
    
    if (err) return console.log(err);
    console.log('GoodProvision', 'registered');
    
  });
};

module.exports = GoodProvision;