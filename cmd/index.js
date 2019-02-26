'use strict';
/* eslint no-console: 0 */

const Command = process.argv[2];

// Check if arg is defined
if (!Command) {
	console.error('You must defined a command to execute.');
	process.exit(1);
}

// Require path. If the path is wrong, an error will be displayed.
try {
	require(`./${Command}`);
} catch (e) {
	console.error(e);
	process.exit(1);
}
