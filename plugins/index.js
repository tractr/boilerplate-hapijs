'use strict';

const Configs = require('../configs');

const plugins = [
	// @plugin logging:start
	{
		plugin: require('@hapi/good'),
		options: Configs.Logging
	},
	// @plugin logging:end

	// @plugin admin-flag:start
	{
		plugin: require('./admin-flag')
	},
	// @plugin admin-flag:end

	// @plugin mailjet:start
	{
		plugin: require('./mailjet'),
		options: Configs.Mailjet
	},
	// @plugin mailjet:end

	// @plugin geocoder:start
	{
		plugin: require('./geocoder'),
		options: Configs.Geocoder
	},
	// @plugin geocoder:end

	// @plugin s3:start
	{
		plugin: require('./s3'),
		options: Configs.S3
	},
	// @plugin s3:end

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
	}
	// @plugin password-auth:end
];

if (Configs.Server.app.documentation.enable) {
	plugins.push(require('@hapi/vision'));
	plugins.push(require('@hapi/inert'));
	plugins.push(require('lout'));
}

module.exports = plugins;
