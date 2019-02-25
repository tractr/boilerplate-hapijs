'use strict';

const Crypto = require('crypto');
const Bcrypt = require('bcrypt');

const ITERATIONS = 1000;
const KEY_LENGTH = 256;
const HASH_ALGORITHM = 'sha512';
const SALT_LENGTH = 256;

module.exports = {
	/**
	 * Generate a hash from a password
	 *
	 * @param {string} password
	 *  The password to hash
	 * @param {string} salt
	 *  The salt to hash with
	 * @return {string}
	 */
	generate: (password, salt) => Crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM).toString('hex'),

	/**
	 * Generate a random salt
	 *
	 * @param {number} length
	 *  The salt length
	 * @return {string}
	 */
	salt: (length = SALT_LENGTH) => Crypto.randomBytes(Math.floor(length / 2)).toString('hex'),

	/**
	 * Crypt a password with Bcrypt
	 *
	 * @param {string} password
	 *  The password to hash
	 * @return {string}
	 */
	bcrypt: password => {
		const salt = Bcrypt.genSaltSync();

		return Bcrypt.hashSync(password, salt);
	}
};
