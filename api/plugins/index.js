'use strict';

const Configs = require('../configs');

const plugins = [

	// @plugin logging:start
	{
		plugin: require('good'),
		options: Configs.Logging
	},
	// @plugin logging:end
	
	// @plugin admin-flag:start
	{
		plugin: require('./admin-flag')
	},
	// @plugin admin-flag:end
	
	// @plugin session:start
	require('hapi-auth-cookie'),
	{
		plugin: require('./session'),
		options: { session: Configs.Session }
	},
	// @plugin session:end

	// @plugin password-auth:start
	{
		plugin: require('./password-auth')
	},
	// @plugin password-auth:end
];

if (Configs.Server.app.documentation.enable) {
	plugins.push(require('vision'));
	plugins.push(require('inert'));
	plugins.push(require('lout'));
}

module.exports = plugins;
