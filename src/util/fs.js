const { promisify } = require("util");
const fs = require("fs");
const { READ_WRITE_OPTIONS } = require("../constants/fs.js");
const readFileAsync = promisify(fs.readFile);

/**
 * Reads a file and returns the result. If the file does not exist, returns the given
 * default value
 */
async function readFileOrDefault(path, defaultValue = null) {
	try {
		return await readFileAsync(path, READ_WRITE_OPTIONS);
	} catch (e) {
		// If we haven't created the index yet, just return an empty object, and write it at the end
		if (e.code === "ENOENT") {
			return defaultValue;
		}
		throw e;
	}
}

module.exports = { readFileOrDefault };
