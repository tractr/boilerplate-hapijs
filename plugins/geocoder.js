'use strict';

/**
 * This plugin provide a geo-coding service with caching system.
 * Geo-coding responses are cached in Redis.
 * The options of the plugins are:
 *
 * {
 *      ttl: 30 * DAY,				// Cache's time to live
 *      expose: true,               // Add routes to server
 *      prefix: '/v1',              // Routes prefix
 *      geocoder: {
 *          provider: 'google',
 *          httpAdapter: 'https',   // Default
 *          apiKey: 'YOUR_API_KEY', // for Mapquest, OpenCage, Google Premier
 *          formatter: null         // 'gpx', 'string', ...
 *      }
 * }
 *
 * For more information: https://www.npmjs.com/package/node-geocoder
 *
 * The geo-coder is available under `server.geocoder`.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const Geocoder = require('node-geocoder');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');

const OptionsSchema = Joi.object({
	cache: Joi.string().default('main_cache'),
	ttl: Joi.number().default(30 * DAY),
	expose: Joi.boolean().default(true),
	prefix: Joi.string().default(''),
	geocoder: Joi.object({
		provider: Joi.string().default('openstreetmap'),
		httpAdapter: Joi.string().default('https'),
		apiKey: Joi.string(),
		formatter: Joi.string().allow(null)
	}).required()
});
const ConvertSchema = Joi.object().keys({ address: Joi.string().required() });
const ReverseSchema = Joi.object().keys({
	latitude: Joi.number()
		.min(-90)
		.max(90)
		.required(),
	longitude: Joi.number()
		.min(-180)
		.max(180)
		.required()
});

const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, OptionsSchema);

	const geocoder = Geocoder(settings.geocoder);
	const cache = server.cache({
		cache: settings.cache,
		shared: true,
		expiresIn: settings.ttl,
		segment: 'geocoder'
	});

	/**
	 * Concatenate address parts
	 * @param {string|string[]}input
	 * @returns {string}
	 */
	const concatAddress = input => {
		return input instanceof Array
			? input
					.filter(i => i)
					.map(i => i.toString().trim())
					.join(', ')
			: input.toString().trim();
	};

	/**
	 * Get info from geocoder and cache it
	 * @param {string} address
	 * @returns {Promise<{}>}
	 */
	const getInfo = async address => {
		const cached = await cache.get(address);
		if (cached) {
			return cached;
		}

		const output = await geocoder.geocode(address).catch(() => null);

		if (!output || !output.length) {
			throw Boom.badData('Address not found');
		}

		const result = output[0];
		await cache.set(address, result, settings.ttl);
		return result;
	};

	const service = {
		/**
		 * Convert a human readable address to geo coordinates
		 * Keep the values in cache for this address
		 *
		 * @param {string|string[]} input
		 *  The address or the address parts.
		 *  The parts will be filtered and trimmed.
		 * @return {Promise.<{latitude, longitude}>}
		 */
		convert: async input => {
			const address = concatAddress(input);
			const { latitude, longitude } = await getInfo(address);
			const result = {
				latitude,
				longitude
			};

			server.log(['geocoder'], `Get location ${result.latitude},${result.longitude} from ${settings.geocoder.provider} for address "${address}"`);

			return result;
		},

		/**
		 * Get info about an address
		 * Keep the values in cache for this address
		 *
		 * @param {string|string[]} input
		 *  The address or the address parts.
		 *  The parts will be filtered and trimmed.
		 * @return {Promise.<{}>}
		 */
		info: async input => {
			const address = concatAddress(input);
			const result = await getInfo(address);

			server.log(['geocoder'], `Get info from ${settings.geocoder.provider} for address "${address}"`);

			return result;
		},

		/**
		 * Convert geo-coordinates to an address description object
		 * Keep the values in cache for this address
		 *
		 * Return example when using google API:
		 *
		 * {
		 *      administrativeLevels: {
		 *          level1long: "Auvergne-Rhône-Alpes",
		 *          level1short: "Auvergne-Rhône-Alpes",
		 *          level2long: "Rhône",
		 *          level2short: "Rhône"
		 *      },
		 *      city: "Lyon-1ER-Arrondissement",
		 *      country: "France",
		 *      countryCode: "FR",
		 *      extra: {},
		 *      formattedAddress: "3 Rue Paul Chenavard, 69001 Lyon-1ER-Arrondissement, France",
		 *      latitude: 45.7670077,
		 *      longitude: 4.8329368,
		 *      provider: "google",
		 *      streetName: "Rue Paul Chenavard",
		 *      streetNumber: "3",
		 *      zipcode: "69001"
		 * }
		 *
		 * @param {number} latitude
		 * @param {number} longitude
		 * @return {Promise.<{}>}
		 */
		reverse: async (latitude, longitude) => {
			// Try from cache
			const key = `latlon-${latitude}-${longitude}`;
			const cached = await cache.get(key);
			if (cached) {
				server.log(['geocoder'], `Get address info from cache for location ${latitude},${longitude}`);

				return cached;
			}

			const output = await geocoder
				.reverse({
					lat: latitude,
					lon: longitude
				})
				.catch(() => null);

			if (!output || !output.length) {
				throw Boom.badData('Location not found');
			}

			server.log(['geocoder'], `Get address info from ${settings.geocoder.provider} for location ${latitude},${longitude}`);

			// Push to cache
			await cache.set(key, output[0], settings.ttl);

			return output[0];
		}
	};

	server.decorate('server', 'geocoder', service);

	if (settings.expose) {
		// Append new routes for geocoder
		server.route([
			{
				method: 'GET',
				path: `${settings.prefix}/geocoder/convert`,
				config: {
					validate: { query: ConvertSchema },
					description: 'Route to convert address to geo-coordinates',
					tags: ['geocoder', 'convert']
				},
				handler: async request => await request.server.geocoder.convert(request.query.address)
			},
			{
				method: 'GET',
				path: `${settings.prefix}/geocoder/info`,
				config: {
					validate: { query: ConvertSchema },
					description: 'Route to get info about an address',
					tags: ['geocoder', 'convert']
				},
				handler: async request => await request.server.geocoder.info(request.query.address)
			},
			{
				method: 'GET',
				path: `${settings.prefix}/geocoder/reverse`,
				config: {
					validate: { query: ReverseSchema },
					description: 'Route to convert geo-coordinates to address',
					tags: ['geocoder', 'convert']
				},
				handler: async request => await request.server.geocoder.reverse(request.query.latitude, request.query.longitude)
			}
		]);
	}
};

exports.plugin = {
	register,
	name: 'geocoder',
	version: '1.0.0',
	description: 'Geo-coding and reverse geo-coding'
};
