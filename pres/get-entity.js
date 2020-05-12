'use strict';

const Boom = require('@hapi/boom');
const MongoDB = require('mongodb');

/**
 * Get the entity from an id path
 *
 * Add this following properties to the route's configs to load an entity from a param.
 * 

 pre: [
    { method: Pres.GetEntity('user', 'params.id'), assign: 'owner' }
 ]
 
 *
 * @param {string} collection
 *  The MongoDB collection containing the entity
 * @param {string} from
 *  Path to id of the entity to retrieve (from request object)
 *  Examples: 'params.id', 'query.id', 'payload.id'
 * @param {string} message404
 *  Message to send in case of 404
 *  Default: 'Entity not found'
 * @return {Function}
 */
module.exports = (collection, from, message404 = 'Entity not found') => async request => {
	// Get ids
	const nested = request.server.utils.Object.nested;
	let id = nested(request, from);

	// Check if ids are defined
	if (typeof id === 'undefined' || id === null) {
		throw Boom.internal('No entity id');
	}

	// Convert MongoDB id
	if (typeof id === 'string') {
		id = new MongoDB.ObjectId(id);
	}

	// Get entity from database
	const entity = await request.server.db.collection(collection).findOne({ _id: id });

	if (!entity) {
		throw Boom.notFound(message404);
	}

	request.log(['verbose'], `Did load entity ${collection} from database with id ${id}`);

	return entity;
};
