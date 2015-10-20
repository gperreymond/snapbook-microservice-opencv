'use-strict';

exports.alive = {
  auth: false,
  handler: function(request, reply) {
    reply({alive:true});
  }
};