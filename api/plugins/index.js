'use strict';

const Configs = require('../configs');

const plugins = [
	{
		plugin: require('good'),
		options: Configs.Logging
	}
];

if (Configs.Server.app.documentation.enable) {
	plugins.push(require('vision'));
	plugins.push(require('inert'));
	plugins.push(require('lout'));
}

module.exports = plugins;
