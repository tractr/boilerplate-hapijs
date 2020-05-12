'use strict';

/**
 * This plugin is used to manage password login.
 *
 * It assumes there is a MongoDB collection called 'user' with properties:
 *  - email
 *  - password
 *
 * The config of the plugin is:
 *
 * {
 *      prefix: '/v1', // The routes prefix
 * }
 *
 */

const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const Bcrypt = require('bcrypt');

const OptionsSchema = Joi.object({
	prefix: Joi.string().default('')
});

const Schema = Joi.object().keys({
	email: Joi.string()
		.email()
		.lowercase()
		.required(),
	password: Joi.string().required()
});

const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, OptionsSchema);

	// Append a new route for logging
	server.route([
		{
			method: 'POST',
			path: `${settings.prefix}/password/login`,
			config: {
				validate: { payload: Schema },
				description: 'Route to create a new session with a username and password.',
				notes: 'The password is check using Bcrypt.',
				tags: ['password', 'login']
			},
			handler: async (request, h) => {
				// Get email and hash password
				const errorInvalid = Boom.unauthorized('User not found or wrong password');
				const { email, password } = request.payload;

				// Get user from database
				const user = await request.server.db.collection('user').findOne({ email });

				// Check if an user was found
				if (!user) {
					throw errorInvalid;
				}

				// Compare password
				const valid = await Bcrypt.compare(password, user.password);
				if (!valid) {
					throw errorInvalid;
				}

				// Create session
				const sessionData = await request.server.session.create(request, user);

				return h.response(sessionData).code(201);
			}
		},
		{
			method: 'PATCH',
			path: `${settings.prefix}/password/change`,
			config: {
				validate: {
					payload: {
						old_password: Joi.string().required(),
						new_password: Joi.string()
							.trim()
							.min(6)
							.required()
					}
				},
				description: "Route to change the user's password",
				tags: ['password', 'change'],
				auth: { strategy: 'session' }
			},
			handler: async (request, h) => {
				// Get passwords
				const { old_password, new_password } = request.payload;

				// Get user from database
				const user = await request.server.db.collection('user').findOne({ _id: request.auth.credentials._id });

				// Check if an user was found
				if (!user) {
					throw Boom.unauthorized('User not found');
				}

				// Compare password
				const valid = await Bcrypt.compare(old_password, user.password);
				if (!valid) {
					throw Boom.forbidden('Wrong password');
				}

				// Update password in database
				const updates = {
					$set: {
						password: request.server.utils.Hash.bcrypt(new_password)
					}
				};
				await server.db.collection('user').findOneAndUpdate({ _id: request.auth.credentials._id }, updates);

				return h.response().code(204);
			}
		}
	]);
};

exports.plugin = {
	register,
	name: 'password-auth',
	version: '1.0.0',
	description: 'Password authentication',
	dependencies: ['session']
};
