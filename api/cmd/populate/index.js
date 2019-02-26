'use strict';

const ServerWrapper = require('../inc/server-wrapper');
const Helpers = require('../inc/helpers')(__filename);
const Process = require('./process');

ServerWrapper.init()
	.then(Process)
	.then(server => {
		Helpers.logAndClose(server)('Did finished population.');
	})
	.catch(Helpers.errorAndClose());
