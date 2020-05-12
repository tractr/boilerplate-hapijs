'use strict';

/**
 * This plugin is used to manage cookies session
 *
 * It assumes there is a MongoDB collection called 'user' with properties:
 *  - email
 *  - name
 *  - role
 *
 * To restrict the access to a route for authenticated users, add to the config:

 config: {
    auth: 'session'
 }

 * To restrict the access to a route for authenticated admins, add to the config:

 config: {
    auth: {
        strategy: 'session',
        scope: 'role-admin'
    }
 }
 
 *
 * To restrict login to specific conditions, you can pass a validation function this plugin like this:
 * 
 * {
 *   validation: (user) => user.email_confirmed,
 *   cookies: {...}
 * }
 *
 */

const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const MongoDB = require('mongodb');
const RandomString = require('randomstring');

const OptionsSchema = Joi.object({
	prefix: Joi.string().default(''),
	session: Joi.object({
		validation: Joi.func().default(() => true),
		cache: Joi.string().default('main_cache'),
		token_length: Joi.number().default(64),
		cookie: Joi.object({
			ttl: Joi.number().required(),
			cookie: Joi.string().required(),
			password: Joi.string().required(),
			isSecure: Joi.boolean().required(),
			isSameSite: Joi.string()
				.allow(false)
				.required(),
			redirectTo: Joi.boolean().default(false),
			clearInvalid: Joi.boolean().default(true)
		}).required()
	}).required()
});
const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, OptionsSchema);
	settings.session.cookie.validateFunc = validateFunc;

	// Define strategy and add handlers to server
	server.auth.strategy('session', 'cookie', settings.session.cookie);
	const sessionsBucket = server.cache({
		cache: settings.session.cache,
		shared: true,
		expiresIn: settings.session.cookie.ttl,
		segment: 'sessions'
	});

	/**
	 * Create service that will be available server wide.
	 * @type {{create: create}}
	 */
	const service = {
		/**
		 * Create a session for a given user
		 *
		 * @param {object} request
		 * @param {object} user
		 * @return {object}
		 * 	The data inserted in the session
		 */
		create: async (request, user) => {
			// Check if the is allowed to connect
			if (!settings.session.validation(user)) {
				throw Boom.forbidden('User is not validated');
			}

			// Create new session id and data
			const sessionId = RandomString.generate(settings.session.token_length);
			const sessionData = {
				_id: user._id,
				// @context user:unified-names
				name: user.name,
				// @context user:separate-names
				// first_name: user.first_name,
				// last_name: user.last_name,
				email: user.email,
				role: user.role
			};

			// Insert session in cache engine
			await sessionsBucket.set(sessionId, sessionData, settings.session.cookie.ttl);

			// Set cookie in response header
			try {
				request.cookieAuth.set({ sessionId });
			} catch (err) {
				throw Boom.boomify(err, { message: 'Session error' });
			}

			return sessionData;
		}
	};
	server.decorate('server', 'session', service);

	// Append a new route for logging
	server.route([
		{
			method: 'DELETE',
			path: `${settings.prefix}/session`,
			config: {
				description: 'Route to logout from a session.',
				tags: ['session', 'logout'],
				auth: 'session'
			},
			handler: handlerLogout
		},
		{
			method: 'GET',
			path: `${settings.prefix}/session`,
			config: {
				description: 'Route to retrieve current user id.',
				tags: ['session', 'current'],
				auth: 'session'
			},
			handler: handlerCurrent
		}
	]);

	/**
	 * Logout the user
	 *
	 * @param request
	 * @param h
	 */
	async function handlerLogout(request, h) {
		const { credentials } = request.auth;

		// If nothing to logout, leave
		if (!(credentials && credentials.sessionId)) {
			throw Boom.unauthorized('Not logged in');
		}

		await sessionsBucket.drop(credentials.sessionId);

		return h.response().code(204);
	}

	/**
	 * Returns the current user id
	 *
	 * @param request
	 */
	function handlerCurrent(request) {
		return {
			_id: request.auth.credentials._id,
			// @context user:unified-names
			name: request.auth.credentials.name,
			// @context user:separate-names
			// first_name: request.auth.credentials.first_name,
			// last_name: request.auth.credentials.last_name,
			email: request.auth.credentials.email,
			role: request.auth.credentials.role
		};
	}

	/**
	 * Validate cookie function and get user data
	 *
	 * @param request
	 * @param session
	 */
	async function validateFunc(request, session) {
		const { sessionId } = session;
		const cached = await sessionsBucket.get(sessionId);

		if (!cached) {
			return {
				credentials: null,
				valid: false
			};
		}

		// Convert MongoDB id
		if (typeof cached._id === 'string') {
			cached._id = new MongoDB.ObjectId(cached._id);
		}

		// Add session id
		cached.sessionId = sessionId;

		// Add the scopes
		cached.scope = [`user-${cached._id}`];
		if (cached.role) cached.scope.push(`role-${cached.role}`);

		return {
			credentials: cached,
			valid: true
		};
	}
};

exports.plugin = {
	register,
	name: 'session',
	version: '1.0.0',
	description: 'Session management via cookies',
	dependencies: 'hapi-auth-cookie'
};
