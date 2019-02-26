'use strict';

const Fs = require('fs');
const MongoId = require('mongodb').ObjectId;
const Helpers = require('../commons/helpers')(__filename);
const ModelsFilePath = `${__dirname}/../../models.json`;
const Chain = [(p, fn) => p.then(fn), Promise.resolve()];
const ModelsIds = {};
const TempId = new MongoId();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const PopulationFactor = 50;
const Lorem = require('./lorem');

/**
 * Returns a random element of the array
 *
 * @param a
 * @return {*}
 */
const pickOne = a => a[randomNumber(0, a.length)];

/**
 * Upper case first letter only
 *
 * @param {string} value
 * @returns {string}
 */
const upperCaseFirstLetter = value => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Returns all ids in a collection
 *
 * @param server
 * @param collection
 * @return {Promise<[MongoId]>}
 */
const getAllIds = async (server, collection) => {
	// Use cache
	if (typeof ModelsIds[collection] !== 'undefined') {
		return ModelsIds[collection];
	}

	const results = (await server.db
		.collection(collection)
		.find({})
		.project({ _id: 1 })
		.toArray()).map(r => r._id);

	// Keep in cache
	ModelsIds[collection] = results;

	return results;
};

/**
 * Returns a random sentence
 *
 * @param {boolean} short
 *  Should return a short word - Default: false
 * @returns {string}
 */
const generateString = (short = false) => {
	const words = [pickOne(Lorem)];
	if (randomNumber(0, 2) >= 1) words.push(pickOne(Lorem));
	if (!short && randomNumber(0, 3) >= 2) words.push(pickOne(Lorem));

	return words.map(w => upperCaseFirstLetter(w)).join(' ');
};

/**
 * Generate an item with random value
 *
 * @param field
 */
const generateField = field => {
	// Primary ?
	if (field.primary) return undefined;
	// Nullable ?
	if (field.nullable && randomNumber(0, 2) >= 1) return null;

	if (field.type === 'number') {
		if (field.subtype === 'latitude') return randomLatitude();
		if (field.subtype === 'longitude') return randomLongitude();

		return randomNumber();
	} else if (field.type === 'datetime') return Date.now() + randomNumber(-2, 2) * DAY;
	else if (field.type === 'string') {
		if (field.subtype === 'email') {
			const name = generateString(true)
				.toLowerCase()
				.split(' ')
				.join('.');
			const domain = pickOne(['gmail.com', 'hotmail.com', 'tractr.net']);

			return `${name}.${randomString(8)}@${domain}`;
		} else if (field.subtype === 'password') {
			return randomString();
		} else if (field.subtype === 'text') {
			return `${generateString()}\n${generateString()}`;
		} else if (field.subtype === 'rich') {
			return `<h2>${generateString()}</h2>\n<p>${generateString()} ${generateString()}.</p>\n<p>${generateString()}.</p>`;
		} else if (field.unique) {
			return `${generateString()} ${generateString()}`;
		}

		return generateString();
	} else if (field.type === 'boolean') return pickOne([false, true]);
	else if (field.type === 'entity') return TempId;

	return null;
};

/**
 * Generate an item with random value
 *
 * @param model
 */
const generateItem = model =>
	model.fields.reduce((object, current) => {
		const value = generateField(current);
		if (typeof value !== 'undefined') {
			object[current.name] = value;
		}

		return object;
	}, {});

/**
 * Generate a random string
 *
 * @param {Number} length
 * @returns {String}
 * @private
 */
function randomString(length = 12) {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < length; i++) {
		text += possible.charAt(randomNumber(0, possible.length));
	}

	return text;
}
/**
 * Generate a random latitude
 *
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 * @private
 */
function randomNumber(min = 0, max = 1000) {
	return Math.floor(Math.random() * (max - min)) + min;
}
/**
 * Generate a random latitude
 *
 * @returns {Number}
 * @private
 */
function randomLatitude() {
	const factor = 1000;

	return randomNumber(-90 * factor, 90 * factor) / factor;
}
/**
 * Generate a random longitude
 *
 * @returns {Number}
 * @private
 */
function randomLongitude() {
	const factor = 1000;

	return randomNumber(-180 * factor, 180 * factor) / factor;
}

/**
 * Populate database
 *
 * @param {Server} server
 * @return {Promise<Server>}
 */
module.exports = async server => {
	Helpers.log(server)('Start database population.');

	// Get models files content
	const modelsContent = Fs.readFileSync(ModelsFilePath);
	const models = JSON.parse(modelsContent);

	await models
		.map(m => {
			const insert = [];
			const total = randomNumber(PopulationFactor, 2 * PopulationFactor);
			for (let i = 0; i < total; i++) {
				insert.push(generateItem(m));
			}

			return () => server.db.collection(m.collection).insertMany(insert);
		})
		.reduce(...Chain);

	await models
		.map(m => async () => {
			// Get all items
			const items = await server.db
				.collection(m.collection)
				.find({})
				.toArray();

			// Get all ids of references
			const ids = {};
			const promises = m.fields.reduce((array, current) => {
				if (current.reference) {
					const p = getAllIds(server, current.reference).then(results => {
						ids[current.reference] = results;
					});
					array.push(p);
				}

				return array;
			}, []);

			const results = await Promise.all(promises);

			if (!results.length) return;

			// For each item
			await items
				.map(i => {
					// Prepare set object
					const set = {};
					m.fields.map(f => {
						if (f.reference) {
							if (f.multiple) {
								const min = f.nullable ? 0 : 1;
								const max = f.nullable ? 3 : 4;
								const l = randomNumber(min, max);
								set[f.name] = [];
								for (let i = 0; i < l; i++) {
									set[f.name].push(pickOne(ids[f.reference]));
								}
							} else {
								set[f.name] = pickOne(ids[f.reference]);
							}
						}
					});

					return () => server.db.collection(m.collection).findOneAndUpdate({ _id: i._id }, { $set: set });
				})
				.reduce(...Chain);
		})
		.reduce(...Chain);

	Helpers.log(server)('Did finished database population.');

	return server;
};
