'use strict';

const ServerWrapper = require('../commons/server-wrapper');
const Helpers = require('../commons/helpers')(__filename);
const DatabaseSetup = require('./database');

ServerWrapper.init()
	.then(DatabaseSetup)
	.then(server => {
		Helpers.logAndClose(server)('Did finished setup.');
	})
	.catch(Helpers.errorAndClose());
