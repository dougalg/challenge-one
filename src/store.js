const crypto = require("crypto");
const { CacheFs } = require("./cacheFs.js");
const { IndexFs } = require("./indexFs.js");

const hashKey = string =>
	crypto
		.createHash("md5")
		.update(string)
		.digest("hex");

/**
 * Handles the high-level details of each possible action, including
 * giving responses to user the based on input and state, and calling into the
 * interfaces for cache and index as appropriate
 */
class Store {
	constructor(options = {}) {
		if (!options.cacheDir) {
			throw Error("You must provide cacheDir as an absolute path.");
		}
		this._cacheFs = new CacheFs(options);
		this._indexFs = new IndexFs(options);
	}

	/**
	 * Add a key and value to the store
	 *
	 * @param {String} key - A single key to add to the store. Must not match an existing key in the store
	 * @param  {...String} values - An array of strings which will be concatenated with spaces
	 */
	async add(key, ...values) {
		if (!key || values.length === 0) {
			/**
			 * Might want to consider a better error handling interface, eg: throwing a custom
			 * error here and handling it with a nice console log wrapper and a non-zero exit
			 * code, but in a higher/separate part of the codebase
			 */
			console.error(
				"You must provide a key and value to add: `store add [KEY] [VALUE]`."
			);
			return;
		}
		const index = await this._indexFs.index;

		if (index[key]) {
			console.error(
				`Key '${key}' already exists. If you'd like to replace, it, please use \`store remove ${key}\` first.`
			);
			return;
		}

		const hash = hashKey(key);

		await Promise.all([
			this._cacheFs.writeCacheFile(hash, values.join(" ")),
			this._indexFs.add(key, hash).then(() => this._indexFs.write())
		]);
	}

	/**
	 * Returns the value for a *single* key. In future, might add support for multiple
	 * keys, but the interface would need to depend on user needs
	 *
	 * @param {String} key - The key for which you'd like to retrieve a value.
	 */
	async get(key) {
		if (!key) {
			console.error("You must provide a key to get: `store get [KEY]`.");
			return;
		}
		const fileData = await this._cacheFs.readCacheFile(hashKey(key));
		writeKeyResult({
			key,
			fileData
		});
	}

	/**
	 * Lists all keys in the store
	 */
	async list() {
		const index = await this._indexFs.index;
		/**
		 * TODO: Replace console.log with an interface. This will make tests more
		 * robust an easier to debug.
		 */
		Object.keys(index).forEach(k => console.log(k));
	}

	/**
	 * Removes any number of keys and their associated values from the store.
	 * Non-existent keys are ignored
	 *
	 * @param  {...String} keys - The keys of the items to remove
	 */
	async remove(...keys) {
		if (keys.length < 1) {
			console.error("You must provide keys to remove: `store remove [KEY]`.");
			return;
		}
		const cacheDeletions = Promise.all(
			keys.map(key => this._cacheFs.deleteCacheFile(hashKey(key)))
		);

		await Promise.all(keys.map(key => this._indexFs.remove(key)));

		await Promise.all([cacheDeletions, this._indexFs.write()]);
	}
}

function writeKeyResult({ key, fileData }) {
	if (fileData === null) {
		console.error(
			`Key '${key}' does not exist. Please use \`store add ${key} [VALUE]\` first.`
		);
	} else {
		console.log(fileData.toString());
	}
}

module.exports = { Store };
