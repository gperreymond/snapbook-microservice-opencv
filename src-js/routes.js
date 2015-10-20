'use-strict';

var Controller = require('./controllers');

exports.endpoints = [
  { method: 'GET', path: '/alive', config: Controller.alive}
];