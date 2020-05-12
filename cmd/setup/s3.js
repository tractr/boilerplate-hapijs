'use strict';

const Helpers = require('../inc/helpers')(__filename);

/**
 * Ensure the bucket exists
 *
 * @param {Server} server
 * @return {Promise<Server>}
 */
module.exports = async server => {
	Helpers.log(server)('Setup S3 bucket.');

	if (await server.s3.makeBucket()) {
		Helpers.log(server)('Did create bucket.');
	}

	Helpers.log(server)('Did finished S3 bucket setup.');

	return server;
};
