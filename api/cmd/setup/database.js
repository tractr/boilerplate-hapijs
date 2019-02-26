'use strict';

const Fs = require('fs');
const Helpers = require('../inc/helpers')(__filename);
const IndexesFilePath = `${__dirname}/indexes.json`;
const Chain = [(p, fn) => p.then(fn), Promise.resolve()];

/**
 * Create a collection if not exists
 *
 * @param server
 * @param collections
 * @param collection
 * @return {Promise<void>}
 */
const createCollection = async (server, collections, collection) => {
	// If collection already exists, leave
	if (collections.some(e => e.name === collection)) {
		return;
	}

	// Create collection
	Helpers.log(server)(`Create collection ${collection}.`);

	await server.db.createCollection(collection);
};

/**
 * Create indexes for a collection
 *
 * @param server
 * @param collection
 * @param indexes
 * @return {Promise<void>}
 */
const createIndexes = async (server, collection, indexes) => {
	// Get collection
	const col = server.db.collection(collection);

	// For each index, create a promise and chain them
	await Object.keys(indexes)
		.map(key => async () => {
			if (await col.indexExists(key)) {
				return;
			}

			const index = indexes[key];
			const options = Object.assign({}, index.options || {}, {
				background: true,
				name: key
			});

			// Create index
			Helpers.log(server)(`Creating index ${key} on collection ${collection}`);

			await col.createIndex(index.fields, options);
		})
		.reduce(...Chain);
};

/**
 * Create collections and indexes if not exist
 *
 * @param {Server} server
 * @return {Promise<Server>}
 */
module.exports = async server => {
	Helpers.log(server)('Start database setup.');

	// Get indexes files content
	const collectionsContent = Fs.readFileSync(IndexesFilePath);
	const indexes = JSON.parse(collectionsContent);

	// Get current collections
	const collections = await server.db.listCollections().toArray();

	// Create and run promise chain for collections creation
	await Object.keys(indexes)
		.map(collection => () => createCollection(server, collections, collection))
		.reduce(...Chain);

	// Create and run promise chain for indexes creation
	await Object.keys(indexes)
		.map(collection => () => createIndexes(server, collection, indexes[collection]))
		.reduce(...Chain);

	Helpers.log(server)('Did finished database setup.');

	return server;
};
