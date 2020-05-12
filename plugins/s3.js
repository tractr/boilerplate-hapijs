'use strict';

/**
 * This plugin manages uploads to S3 (or Minio)
 * The options of the plugins are:
 *
 * {
 *      client: {
 *          endPoint: 's3.amazonaws.com',
 *          accessKey: 'EOCHOHVUITIE1IU6EW4F',
 *          secretKey: 'ua6ooti2Aig0eiseeS8iu9wae6eax5Ap0wie5Yui',
 *          useSSL: false,
 *          port: 9000 // false to use default
 *      }, // The Minio connection (required)
 *      bucketName: 'hapijs-images', // The S3 bucket name (required),
 *      postUrl: 'http://localhost:9000', // Override postUrl returned by minio. This will be concatenated with the bucket name. False to disable. Default: false.
 *      region: 'us-east-1', // The region for automatic bucket creation during installation (useful in development)
 *      routePrefix: '/v1', // The routes prefix
 *      storagePrefix: 'images/', // The path prefix in S3. If null, storage prefix is the MIME type of the file
 *      mimeTypes: [
 *          'image/jpeg',
 *          'image/png',
 *          'image/gif'
 *      ], // The allowed mime types
 *      expiry: 5 * MINUTE, // Token expiry. In milliseconds
 *      minSize: 1024, // Min file size to be uploaded to S3
 *      maxSize: 4194304, // Max file size to be uploaded to S3 (4Mo)
 *      tempFileExpiry: 6 * HOUR, // The duration of a temp file before being deleted by a "CRON job"
 * }
 * 
 * For more information about Minio configuration: https://github.com/minio/minio-js
 * 
 * The resource uploaded to S3 are stored in a temp directory until they are really used by the model.
 * 
 * Once the model's instance is saved, you must call the method 'server.s3.moveTempFile' to avoid automatic deletion.
 * For example, for a model named image with a field uri.
 * Before insert, add this code:
 * @hook create:before-insert:image

 // Move temp file and get new path
 payload.uri = await request.server.s3.moveTempFile(payload.uri);
 
 * 
 * Once the instance is deleted, you should call the method 'server.s3.remove'
 * 
 * Insert this code after deletion

 // Remove file from s3
 request.server.s3.remove(request.pre.image.uri)
    .catch((error) => request.log(['error'], error.message));
 
 * 
 * On AWS S3, you need to create a bucket and configure it correctly.
 *
 * -------------------
 * CORS Configuration:
 * -------------------
 * 
    <?xml version="1.0" encoding="UTF-8"?>
    <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>Authorization</AllowedHeader>
    </CORSRule>
    </CORSConfiguration>
 *
 * ------------------------------------
 * Bucket Strategy (Allow public read):
 * ------------------------------------
 * 
    {
        "Version": "2012-10-17",
        "Id": "ReadAndWriteStrategy",
        "Statement": [
            {
                "Sid": "AllowPublicRead",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::bucket-name/*"
            }
        ]
    }
 *
 * -----------
 * Life Cycle:
 * -----------
 *
     Name: Clear temporary
     Scope: tmp/
     Expiration: after 1 day
     Deleted after: 1 day
     Cleanup uploads after: 1 day
 *
 * If you want to clean manually the files,
 * you could use the command "clean-temp-files" and set the option "tempFileExpiry"
 *
 * ----
 * IAM:
 * ----
 *
 * You should also create a user to allow the server to manage the bucket.
 * Here is an example of the strategy associated to the user.
 *
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowAllOnBucketFiles",
                "Effect": "Allow",
                "Action": "s3:*",
                "Resource": "arn:aws:s3:::bucket-name/*"
            },
            {
                "Sid": "AllowAllOnBucket",
                "Effect": "Allow",
                "Action": "s3:*",
                "Resource": "arn:aws:s3:::bucket-name"
            }
        ]
    }
 *
 * 
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const KILOBYTE = 1024;
const MEGABYTE = 1024 * KILOBYTE;

const Boom = require('@hapi/boom');
const UUID = require('node-uuid');
const Joi = require('@hapi/joi');
const Mime = require('mime');
const AWS = require('minio');
const Request = require('request-promise-native');

const OptionsSchema = Joi.object({
	client: Joi.object({
		endPoint: Joi.string().required(),
		accessKey: Joi.string().required(),
		secretKey: Joi.string().required(),
		useSSL: Joi.boolean().required(),
		port: Joi.number()
			.allow(false)
			.required()
	}).required(),

	bucketName: Joi.string().required(),
	region: Joi.string().default('us-east-1'),
	postUrl: Joi.string()
		.allow(false)
		.default(false),

	routePrefix: Joi.string().default(''),
	storagePrefix: Joi.string()
		.default('')
		.allow(null),
	tempPrefix: Joi.string().default('tmp/'),

	mimeTypes: Joi.array()
		.items(Joi.string())
		.default(['image/jpeg', 'image/png', 'image/gif']),

	expiry: Joi.number().default(5 * MINUTE),
	minSize: Joi.number().default(KILOBYTE),
	maxSize: Joi.number().default(4 * MEGABYTE),
	tempFileExpiry: Joi.number().default(2 * HOUR),

	cache: Joi.string().default('main_cache')
});

const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, OptionsSchema);

	// Helper to get storage prefix
	const storagePrefix = mime => (settings.storagePrefix === null ? `${mime.split('/')[0]}/` : settings.storagePrefix);

	// Init S3 & cache
	const cache = server.cache({
		cache: settings.cache,
		shared: true,
		expiresIn: SECOND,
		segment: 's3'
	});
	if (settings.client.port === false) {
		delete settings.client.port;
	}
	const S3 = new AWS.Client(settings.client);

	// Append a new route for s3 token
	server.route([
		{
			method: 'GET',
			path: `${settings.routePrefix}/s3/token`,
			config: {
				validate: {
					query: Joi.object().keys({
						mime: Joi.string()
							.valid(settings.mimeTypes)
							.required()
					})
				},
				description: 'Route to get a new upload path and token for S3.',
				notes: 'The key generation is done with an UUID v4.',
				tags: ['s3', 'token']
			},
			handler: async request => {
				// Get extension
				const extension = Mime.getExtension(request.query.mime);

				// Get object path
				const filename = await generateFilename(storagePrefix(request.query.mime), `.${extension}`);

				// Add the temp path
				const path = `${settings.tempPrefix}${filename}`;

				// Construct a new postPolicy.
				const policy = S3.newPostPolicy();
				policy.setKey(path);
				policy.setBucket(settings.bucketName);
				const expires = new Date();
				expires.setMilliseconds(settings.expiry);
				policy.setExpires(expires);
				policy.setContentType(request.query.mime);
				policy.setContentLengthRange(settings.minSize, settings.maxSize);

				const { postURL, formData } = await S3.presignedPostPolicy(policy);

				return {
					post_url: settings.postUrl ? `${settings.postUrl}/${settings.bucketName}` : postURL,
					form_data: formData
				};
			}
		}
	]);

	/**
	 * Generate a new filename for file path and avoid collisions
	 *
	 * @param {string} prefix
	 *  Default: ''
	 * @param {string} suffix
	 *  Default: ''
	 * @param {boolean} checkConflict
	 *  Default: true
	 * @return {Promise<string>}
	 */
	const generateFilename = async (prefix = '', suffix = '', checkConflict = true) => {
		// Create key
		const key = `${prefix}${UUID.v4()}${suffix}`;

		// Quick return
		if (!checkConflict) return key;

		// Try from cache
		const cached = await cache.get(key);
		if (cached) {
			server.log(['s3'], `Filename ${key} already exists. Try another one.`);

			return await generateFilename(prefix, suffix);
		}

		// Keep key for one second
		await cache.set(key, true, SECOND);

		return key;
	};

	const service = {
		/**
		 * Copy a file to S3 from an URL
		 *
		 * @param {string} url
		 * @return {Promise<string>} Returns the file URI in s3
		 */
		uploadFromUrl: async url => {
			// Get image from URL
			const options = {
				uri: url,
				encoding: null,
				resolveWithFullResponse: true
			};
			const response = await Request(options);

			// Check content type
			const mime = response.headers['content-type'];
			if (!settings.mimeTypes.includes(mime)) {
				throw new Error(`Unauthorized content type: ${mime}`);
			}

			// Get extension
			const extension = Mime.getExtension(mime);
			// Get object path
			const filename = await generateFilename(storagePrefix(mime), `.${extension}`, false);

			await S3.putObject(settings.bucketName, filename, response.body);

			return filename;
		},

		/**
		 * Delete a resource from S3
		 *
		 * @param {string} path
		 * @return {Promise<void>}
		 */
		remove: async path => {
			// Remove object
			await S3.removeObject(settings.bucketName, path).catch(error => {
				if (error.code === 'NoSuchKey') {
					throw Boom.notFound('File not found');
				}
				throw error;
			});
		},

		/**
		 * Clear all files from s3
		 *
		 * @return {Promise<void>}
		 */
		clearBucket: () => {
			return new Promise((resolve, reject) => {
				const objectsList = [];
				const objectsStream = S3.listObjects(settings.bucketName, '', true);

				objectsStream.on('data', obj => {
					objectsList.push(obj.name);
				});
				objectsStream.on('error', error => {
					reject(error);
				});
				objectsStream.on('end', async () => {
					for (const object of objectsList) {
						await S3.removeObject(settings.bucketName, object).catch(error => {
							server.log(['error', 's3'], error.toString());
						});
					}
					resolve();
				});
			});
		},

		/**
		 * Test if a resource exists on s3
		 *
		 * @param {string} path
		 * @return {Promise<boolean>}
		 */
		exists: path =>
			S3.statObject(settings.bucketName, path)
				.then(() => true)
				.catch(error => {
					if (error.code === 'NotFound') return false;
					throw error;
				}),

		/**
		 * Move a file from temp directory to permanent path
		 *
		 * @param {string} path
		 *  The old path
		 * @return {Promise<string>}
		 *  Returns the new path
		 */
		moveTempFile: async path => {
			// If the file is not a temporary, scream
			if (!path.startsWith(settings.tempPrefix)) {
				throw Boom.badData('File is not temporary');
			}

			// If does not exists, scream
			if (!(await service.exists(path))) {
				throw Boom.badData(`Resource not found in ${path}`);
			}

			// Compute new path
			const newPath = path.substr(settings.tempPrefix.length);

			// Clone object
			const conditions = new AWS.CopyConditions();
			await S3.copyObject(settings.bucketName, newPath, `/${settings.bucketName}/${path}`, conditions);
			// Remove old object
			await S3.removeObject(settings.bucketName, path);

			return newPath;
		},

		/**
		 * Ensure the bucket exists
		 *
		 * @return {Promise<boolean>}
		 */
		makeBucket: async () => {
			if (!(await S3.bucketExists(settings.bucketName))) {
				// Create Bucket
				await S3.makeBucket(settings.bucketName, settings.region);
				// Set Bucket policy
				await S3.setBucketPolicy(
					settings.bucketName,
					JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Sid: 'AllowPublicRead',
								Effect: 'Allow',
								Principal: { AWS: ['*'] },
								Action: ['s3:GetObject'],
								Resource: [`arn:aws:s3:::${settings.bucketName}/*`]
							}
						]
					})
				);
				return true;
			}
			return false;
		},

		/**
		 * Cleanup old temp files
		 *
		 * @return {Promise<number>}
		 *  Returns the number of deleted elements
		 */
		cleanTempFiles: async () => {
			const limit = new Date();
			limit.setMilliseconds(-1 * settings.tempFileExpiry);

			let counter = 0;

			await new Promise((resolve, reject) => {
				const promises = [];
				const stream = S3.listObjects(settings.bucketName, settings.tempPrefix, true);
				stream.on('data', obj => {
					// Only old files
					if (obj.lastModified < limit) {
						promises.push(S3.removeObject(settings.bucketName, obj.name));
						counter++;
					}
				});
				stream.on('end', () => {
					Promise.all(promises)
						.then(resolve)
						.catch(reject);
				});
				stream.on('error', reject);
			});

			return counter;
		}
	};

	server.decorate('server', 's3', service);
};

exports.plugin = {
	register,
	name: 's3',
	version: '1.0.0',
	description: 'Plugin for S3 storage'
};
