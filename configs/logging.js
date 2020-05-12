'use strict';

module.exports = {
	ops: false,
	reporters: {
		console: [
			{
				module: '@hapi/good-squeeze',
				name: 'Squeeze',
				args: [
					{
						log: '*',
						response: '*',
						request: '*',
						error: '*'
					}
				]
			},
			{
				module: '@hapi/good-console'
			},
			'stdout'
		]
	}
};
