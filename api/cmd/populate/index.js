'use strict';

// Only for development env
require('../commons/ensure-development');

const ServerWrapper = require('../commons/server-wrapper');
const Helpers = require('../commons/helpers')(__filename);
const Process = require('./process');

ServerWrapper.init()
	.then(Process)
	.then(server => {
		Helpers.logAndClose(server)('Did finished population.');
	})
	.catch(Helpers.errorAndClose());
