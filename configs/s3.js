'use strict';

const KILOBYTE = 1024;
const MEGABYTE = 1024 * KILOBYTE;

module.exports = {
	client: {
		endPoint: 'minio',
		accessKey: 'EOCHOHVUITIE1IU6EW4F',
		secretKey: 'ua6ooti2Aig0eiseeS8iu9wae6eax5Ap0wie5Yui',
		useSSL: false,
		port: 9000
	},
	bucketName: 'hapijs-files',
	postUrl: 'http://localhost:9000',
	storagePrefix: null,
	mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mp3'],
	minSize: KILOBYTE,
	maxSize: 40 * MEGABYTE
};
