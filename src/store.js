const crypto = require("crypto");
const { CacheFs } = require("./cacheFs.js");
const { IndexFs } = require("./indexFs.js");

const hashKey = string =>
	crypto
		.createHash("md5")
		.update(string)
		.digest("hex");

class Store {
	constructor(options = {}) {
		if (!options.cacheDir) {
			throw Error("You must provide cacheDir as an absolute path.");
		}
		this._cacheFs = new CacheFs(options);
		this._indexFs = new IndexFs(options);
	}

	async add(key, ...values) {
		if (!key || values.length === 0) {
			console.error(
				`You must provide a key and value to add: \`add [KEY] [VALUE]\`.`
			);
			return;
		}
		const index = await this._indexFs.index;
		if (index[key]) {
			console.error(
				`Key '${key}' already exists. If you'd like to replace, it, please use \`remove ${key}\` first.`
			);
			return;
		}

		const hash = hashKey(key);

		await Promise.all([
			this._cacheFs.writeCacheFile(hash, values.join(" ")),
			this._indexFs.add(key, hash).then(() => this._indexFs.write())
		]);
	}

	async get(...keys) {
		if (keys.length < 1) {
			console.error(`You must provide keys to get: \`get [KEY]\`.`);
			return;
		}
		const cacheFiles = await Promise.all(
			keys.map(async key => {
				const fileData = await this._cacheFs.readCacheFile(hashKey(key));
				return {
					key,
					fileData
				};
			})
		);
		cacheFiles
			.sort(({ fileData: a }, { fileData: b }) => Boolean(b) - Boolean(a))
			.forEach(writeKeyResult);
	}

	async list() {
		const index = await this._indexFs.index;
		Object.keys(index).forEach(k => console.log(k));
	}

	async remove(...keys) {
		if (keys.length < 1) {
			console.error(`You must provide keys to remove: \`remove [KEY]\`.`);
			return;
		}
		const cacheDeletions = Promise.all(
			keys.map(key => this._cacheFs.deleteCacheFile(hashKey(key)))
		);

		keys.forEach(key => this._indexFs.remove(key));

		await Promise.all([cacheDeletions, this._indexFs.write()]);
	}
}

function writeKeyResult({ key, fileData }) {
	if (fileData === null) {
		console.error(
			`Key '${key}' does not exist. Please use \`add ${key} [VALUE]\` first.`
		);
	} else {
		console.log(`Value for key "${key}":`);
		console.log(fileData.toString());
		console.log();
	}
}

module.exports = { Store };
