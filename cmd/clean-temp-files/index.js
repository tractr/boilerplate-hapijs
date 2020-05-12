'use strict';

const ServerWrapper = require('../inc/server-wrapper');
const Helpers = require('../inc/helpers')(__filename);

ServerWrapper.init()
	.then(async server => {
		// Run service
		const total = await server.s3.cleanTempFiles();

		Helpers.logAndClose(server)(`Did delete ${total} temporary files from S3.`);
	})
	.catch(Helpers.errorAndClose());
