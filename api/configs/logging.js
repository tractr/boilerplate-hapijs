'use strict';

module.exports = {
	ops: false,
	reporters: {
		console: [
			{
				module: 'good-squeeze',
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
				module: 'good-console'
			},
			'stdout'
		]
	}
};
