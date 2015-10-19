'use strict';

module.exports = function(grunt) {
	var banner = '/*n<%= pkg.name %> <%= pkg.version %>';
	banner += '- <%= pkg.description %>n<%= pkg.repository.url %>n';
	banner += 'Built on <%= grunt.template.today("yyyy-mm-dd") %>n*/n';

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			files: ['src/**/*.js'],
			options: {
			  node: true,
				maxlen: 255,
				quotmark: 'single'
			}
		},
	});
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	
	grunt.registerTask('test', [
		'jshint'
	]);
	
};