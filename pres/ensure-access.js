'use strict';

const Boom = require('boom');

/**
 * Ensure the user as access to a resource.
 * The access check is done by comparing two properties
 *
 * Add this following properties to verify the current user has access to an entity

 auth: 'session',
 pre: [
    { method: Pres.GetEntity('item', 'params.id'), assign: 'item' },
    { method: Pres.EnsureAccess('pre.item.owner') }
 ]

 *
 * Or to check against an user loaded from the id contained in the params:
 * 

 pre: [
    { method: Pres.GetEntity('user', 'params.id'), assign: 'user' },
    { method: Pres.GetEntity('item', 'payload.id'), assign: 'item' },
    { method: Pres.EnsureAccess('pre.item.owner', 'pre.user._id') }
 ]
 
 *
 * @param {string} to
 *  Path to id to check (from request object)
 *  Examples: 'pre.item.owner' or 'query.id'
 * @param from
 *  Path to id of the user to check (from request object)
 *  Examples: 'pre.user._id'
 *  By default 'auth.credentials._id'
 * @param bypass
 *  A role to bypass access verification (example: 'admin'). Tested against 'request.auth.credentials.role'
 *  Default: null.
 *  To disabled, set to null
 * @return {Function}
 */
module.exports = (to, from = 'auth.credentials._id', bypass = null) => request => {
	// Bypass ?
	if (bypass && request.auth.credentials.role === bypass) {
		request.log(['verbose'], `User can access resource. User has role '${bypass}'.`);

		return '';
	}

	// Get ids
	const nested = request.server.utils.Object.nested;
	const toId = nested(request, to);
	const fromId = nested(request, from);

	// Check if id is defined
	if (typeof toId === 'undefined' || toId === null) {
		throw Boom.internal('Access not verifiable');
	}

	// If no id, deny access
	if (typeof fromId === 'undefined' || fromId === null) {
		throw Boom.forbidden('Access denied');
	}

	if (toId instanceof Array) {
		// Check match
		if (!toId.some(id => id.toString() === fromId.toString())) {
			throw Boom.forbidden('Access denied');
		}

		request.log(['verbose'], `User can access resource. request.${from} is included in request.${to}`);
	} else {
		// Check match
		if (toId.toString() !== fromId.toString()) {
			throw Boom.forbidden('Access denied');
		}

		request.log(['verbose'], `User can access resource. request.${from} === request.${to}`);
	}

	// Let it flow
	return '';
};
