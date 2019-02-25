'use strict';

/**
 * This plugin adds a method to the request is coming from an admin context or not
 */
const Joi = require('joi');

const OptionsSchema = Joi.object({
	prefix: Joi.string().default(''),
	path: Joi.string().default('/admin')
});

const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, OptionsSchema);

	/**
	 * Denotes if the request is an admin route or not
	 * @param request
	 * @return {Boolean}
	 */
	const fromAdmin = request => {
		const starter = `${settings.prefix}${settings.path}/`;
		return request.path.startsWith(starter);
	};

	server.decorate('request', 'fromAdmin', fromAdmin, { apply: true });
};

exports.plugin = {
	register,
	name: 'admin-flag',
	version: '1.0.0',
	description: 'Denotes is the request comes from admin'
};
