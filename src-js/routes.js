"use strict";

var Controller = require('./controllers');

exports.endpoints = [
  { method: 'GET', path: '/alive', config: Controller.alive},
  { method: 'POST', path: '/compare', config: Controller.compare},
  { method: 'POST', path: '/compute', config: Controller.compute}
];