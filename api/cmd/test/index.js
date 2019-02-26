'use strict';

const Helpers = require('../inc/helpers')(__filename);

/**
 * Used to dry-test the command launcher
 */

const ServerWrapper = require('../inc/server-wrapper');

ServerWrapper.init()
	.then(server => {
		Helpers.log(server)(`Did create server with id ${server.info.id}.`);
		Helpers.logAndClose(server)('Close server.');
	})
	.catch(Helpers.errorAndClose());
