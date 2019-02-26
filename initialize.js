'use strict';

const Hapi = require('hapi');
const MongoClient = require('mongodb').MongoClient;

/**
 * Init configs
 */
module.exports = async (Configs, silent = false) => {
	// Connect to mongodb
	const { url, options } = Configs.Database.connection;
	const dbClient = await MongoClient.connect(url, options);

	// Get flatten routes
	const GroupedRoutes = require('./routes');
	const Routes = Object.keys(GroupedRoutes).reduce((p, c) => p.concat(GroupedRoutes[c]), []);

	// Get Plugins and utils
	const Utils = require('./utils');
	const Plugins = require('./plugins');

	// Hapi server definition
	const Server = new Hapi.Server(Configs.Server);

	// Make db, utils and config globally accessible
	Server.decorate('server', 'db', dbClient.db(Configs.Database.name));
	Server.decorate('server', 'utils', Utils);
	Server.decorate('server', 'configs', Configs);

	await Server.register(Plugins);

	// Log startup
	if (!silent) {
		Server.log(['booting'], `Connection id   : ${Server.info.id}`);
		Server.log(['booting'], `Connection port : ${Server.info.port}`);
		Server.log(['booting'], `Node.js version : ${process.version}`);
		Server.log(['booting'], `Environment     : ${process.env.NODE_ENV}`);
	}

	// Append routes
	Server.route(Routes);

	// Log routes
	if (!silent) {
		// Display available routes
		const table = Server.table();
		const routes = table
			.sort((a, b) => a.path.localeCompare(b.path))
			.map(route => `${route.method.toUpperCase()}\t${route.path}`)
			.join('\n');
		Server.log(['booting'], `Loaded ${table.length} routes:\n${routes}`);
	}

	return Server;
};
