'use strict';

const Helpers = require('../commons/helpers')(__filename);

/**
 * Used to dry-test the command launcher
 */

const ServerWrapper = require('../commons/server-wrapper');

ServerWrapper.init()
	.then(server => {
		Helpers.log(server)(`Did create server with id ${server.info.id}.`);
		Helpers.logAndClose(server)('Close server.');
	})
	.catch(Helpers.errorAndClose());
