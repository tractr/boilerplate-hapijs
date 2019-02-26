'use strict';

const ServerWrapper = require('../commons/server-wrapper');
const Helpers = require('../commons/helpers')(__filename);
const admin = require('./admin');

ServerWrapper.init()
	.then(async server => {
		const collection = server.db.collection('user');

		// Check if exists
		if (await collection.findOne({ email: admin.email })) {
			Helpers.logAndClose(server)('Admin already exists. Skip creation.');
		}

		// Hash password
		admin.password = server.utils.Hash.bcrypt(admin.password);

		await collection.insertOne(admin, { w: 'majority' });

		Helpers.logAndClose(server)(`Admin ${admin.email} created.`);
	})
	.catch(Helpers.errorAndClose());
