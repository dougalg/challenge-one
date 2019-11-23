const COMMANDS = require("./constants/commands.js");

const VALID_COMMANDS = Object.values(COMMANDS).join('", "');

/**
 * Handles passing args from the user to the actual store module
 *
 * @param {Store} store - A Store instance
 * @param {Args} param1 - Parsed user params, consisting of a command and args for that comman
 */
async function run(store, { cmd, cmdArgs }) {
	if (!cmd) {
		console.error(
			`You must specify a command. Valid options are: "${VALID_COMMANDS}".`
		);
		return;
	}
	switch (cmd) {
		case COMMANDS.ADD:
			await store.add(...cmdArgs);
			break;
		case COMMANDS.GET:
			await store.get(...cmdArgs);
			break;
		case COMMANDS.LIST:
			await store.list(...cmdArgs);
			break;
		case COMMANDS.REMOVE:
			await store.remove(...cmdArgs);
			break;
		default:
			console.error(
				`"${cmd}" is not a valid command. Please use one of "${VALID_COMMANDS}".`
			);
			break;
	}
}

function parseArgs(args = []) {
	// Skip the first two args (nodejs executable, this filename) and extract the
	// rest for the app
	const [, , cmd, ...cmdArgs] = args;
	return {
		cmd,
		cmdArgs
	};
}

module.exports = {
	parseArgs,
	run
};
