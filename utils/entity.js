'use strict';

const ArrayUnique = require('array-unique');

module.exports = {
	/**
	 * Helpers to retrieve entities from database based on ids.
	 * If the property is not defined, ignore the conversion.
	 * This will perform only one request by collection.
	 *
	 * @param {MongoClient} db
	 * @param {Object} entity
	 *  The entity containing the ids to convert.
	 * @param {Object[]} relations
	 *  An array of object formatted as:
	 *  {col: 'user', prop: 'owners', projection: {}, multiple: true}
	 * @return {Promise<void>}
	 */
	populate: async (db, entity, relations) => {
		await module.exports.populateList(db, [entity], relations);
	},

	/**
	 * Helpers to load related entities in a list
	 * This will perform only one request by collection
	 *
	 * @param {MongoClient} db
	 * @param {Object[]} entities
	 *  The entity containing the ids to convert.
	 * @param {Object[]} relations
	 *  An array of object formatted as:
	 *  {col: 'user', prop: 'owners', projection: {}, multiple: true}
	 * @return {Promise<void>}
	 */
	populateList: async (db, entities, relations) => {
		// Init collections buckets (input and output)
		const toLoad = {};
		const loaded = {};
		relations.forEach(relation => {
			toLoad[relation.col] = [];
			loaded[relation.col] = {};
		});

		// For each entities, add the ids to load for each buckets
		entities.forEach(entity => {
			relations.forEach(relation => {
				const { prop, col, multiple } = relation;

				if (multiple) {
					if (entity[prop] && entity[prop].length) {
						toLoad[col] = toLoad[col].concat(entity[prop]);
					}
				} else {
					if (entity[prop]) {
						toLoad[col].push(entity[prop]);
					}
				}
			});
		});

		// Get entities from collections
		await Promise.all(
			Object.keys(toLoad).map(async col => {
				// Remove duplicates
				ArrayUnique(toLoad[col]);

				// If empty, leave
				if (toLoad[col].length === 0) {
					return;
				}
				// Find first relation and get its projection.
				// firstRelation cannot be null.
				const firstRelation = relations.find(relation => relation.col === col);
				const options = firstRelation.projection ? { projection: firstRelation.projection } : {};
				// Load entities and filter null
				const list = (await db
					.collection(col)
					.find({ _id: { $in: toLoad[col] } }, options)
					.toArray()).filter(x => x);

				// Place all entities in the loaded object
				list.forEach(item => {
					loaded[col][item._id.toString()] = item;
				});
			})
		);

		// Replace ids by items
		entities.forEach(entity => {
			relations.forEach(relation => {
				const { prop, col, multiple } = relation;

				if (multiple) {
					if (entity[prop] && entity[prop].length) {
						entity[prop] = entity[prop].map(id => loaded[col][id.toString()] || id);
					}
				} else {
					if (entity[prop]) {
						const id = entity[prop];
						entity[prop] = loaded[col][id.toString()] || id;
					}
				}
			});
		});
	},

	/**
	 * Perform a mongodb-like projection on an entity.
	 * This can be useful when we need to filter properties on an already fetched object.
	 * For instance, it only supports { key: false }
	 *
	 * @param {Object} entity
	 * @param {Object} projection
	 */
	project: (entity, projection) => {
		Object.keys(entity).forEach(key => {
			if (projection[key] === false) {
				delete entity[key];
			}
		});
	}
};
