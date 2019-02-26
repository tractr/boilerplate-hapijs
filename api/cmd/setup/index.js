'use strict';

const ServerWrapper = require('../inc/server-wrapper');
const Helpers = require('../inc/helpers')(__filename);
const DatabaseSetup = require('./database');

ServerWrapper.init()
	.then(DatabaseSetup)
	.then(server => {
		Helpers.logAndClose(server)('Did finished setup.');
	})
	.catch(Helpers.errorAndClose());
