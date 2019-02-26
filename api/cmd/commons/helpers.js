'use strict';
/* eslint no-console: 0 */

const Boom = require('boom');
const Path = require('path');
const SECOND = 1000;

module.exports = caller => {
	// Get cmd name
	const cmd = Path.dirname(caller)
		.split(Path.sep)
		.pop();

	/**
	 * Define logsTags
	 * @type {{verbose: [string,string,string], error: [string,string,string]}}
	 */
	const logTags = {
		verbose: ['verbose', 'command', `cmd-${cmd}`],
		error: ['error', 'command', `cmd-${cmd}`]
	};

	/**
	 * Properly close the server
	 *
	 * @param server (nullable)
	 * @param status (default = 0)
	 */
	const close = (server, status = 0) => {
		// If no errors, leave with error
		if (!server) {
			process.exit(status);
		}

		// Stop server and exit
		return server
			.stop({ timeout: 10 * SECOND })
			.then(() => {
				process.exit(status);
			})
			.catch(err => {
				// Display error if any
				error()(err);

				process.exit(1);
			});
	};

	/**
	 * Properly log error
	 *
	 * @param server (nullable)
	 */
	const error = server => err => {
		// If no errors, leave
		if (!err) return;

		// If no server just log in the console
		if (!server) {
			console.error(err);

			return;
		}

		// Get the wrapped error
		const error = Boom.boomify(err);
		// Add stack data to error
		error.data = {};
		error.data.stack = error.stack;

		// If the server is defined
		server.log(logTags.error, error);
	};

	/**
	 * Properly log error and close
	 *
	 * @param server (nullable)
	 */
	const errorAndClose = server => err => {
		// Log Error
		error(server)(err);

		// Close server and quit
		return close(server, 1);
	};

	/**
	 * Properly log message
	 *
	 * @param server (nullable)
	 */
	const log = server => message => {
		// If the server is defined
		if (server) {
			server.log(logTags.verbose, message);

			return;
		}

		// Else, just log in the console
		console.log(message);
	};

	/**
	 * Properly log message and close
	 *
	 * @param server (nullable)
	 */
	const logAndClose = server => message => {
		// Log Error
		log(server)(message);

		// Close server and quit
		return close(server, 0);
	};

	return {
		logTags,
		log,
		logAndClose,
		error,
		errorAndClose,
		close
	};
};
