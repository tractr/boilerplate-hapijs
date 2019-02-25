'use strict';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

module.exports = {
	cookie: {
		ttl: 12 * HOUR,
		cookie: 'sid-api',
		password: 'tbqHitIyamw07d56agFjFmYqIp5IUocjhOJzCUN2c9V9ZJnnaVUptrVBwpL2JWlC',
		isSecure: false,
		isSameSite: false // Allow localhost
	}
};
