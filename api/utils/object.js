'use strict';

module.exports = {
	/**
	 * Returns a nested property of an object
	 *
	 * @param {Object} object
	 * @param {string} path
	 * @param {string} separator
	 *  Default: '.'
	 * @return {*}
	 *  If not found, returns undefined
	 */
	nested: (object, path, separator = '.') => {
		try {
			return path
				.replace('[', separator)
				.replace(']', '')
				.split(separator)
				.reduce((obj, property) => obj[property], object);
		} catch (err) {
			return undefined;
		}
	}
};
