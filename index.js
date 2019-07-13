'use strict';
/* eslint no-console: 0 */

const Configs = require('./configs');
const Initialize = require('./initialize');

// Allows multiple EventListeners
require('events').EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(0);

// Server init
Initialize(Configs)
	.then(Server => Server.start())
	.catch(e => {
		console.error(e);
		process.exit(1);
	});
