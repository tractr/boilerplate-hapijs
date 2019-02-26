'use strict';

const CatboxRedis = require('catbox-redis');

const SECOND = 1000;

module.exports = {
	port: 3000,
	routes: {
		json: { space: 4 },
		response: { emptyStatusCode: 204 },
		timeout: {
			server: 20 * SECOND,
			socket: 20 * SECOND + 1
		},
		payload: {
			timeout: 19 * SECOND,
			allow: ['application/json']
		},
		cors: { credentials: true }
	},
	debug: { request: ['error'] },
	app: {
		env: process.env.NODE_ENV,
		documentation: {
			enable: true
		}
	},
	cache: {
		name: 'main_cache',
		engine: CatboxRedis,
		host: 'redis'
	}
};
