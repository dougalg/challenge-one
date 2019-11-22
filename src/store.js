const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

const INDEX_FILENAME = "index";
const CACHE_DIR = "cache";
const READ_WRITE_OPTIONS = { encoding: "utf8" };
const DEFAULT_INDEX = JSON.stringify({});

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
		this._cacheDirRoot = options.cacheDir;
		this._cacheDir = path.join(this._cacheDirRoot, CACHE_DIR);
		this._indexFilePath = path.join(this._cacheDirRoot, INDEX_FILENAME);
	}

	async add(key, ...values) {
		if (!key || values.length === 0) {
			console.error(
				`You must provide a key and value to add: \`add [KEY] [VALUE]\`.`
			);
			return;
		}
		const index = await this._getIndex();
		if (index[key]) {
			console.error(
				`Key '${key}' already exists. If you'd like to replace, it, please use \`remove ${key}\` first.`
			);
			return;
		}
		const hash = hashKey(key);
		index[key] = hash;

		await Promise.all([
			this._writeCacheFile(hash, values.join(" ")),
			this._writeIndex(index)
		]);
	}

	async get(...keys) {
		if (keys.length < 1) {
			console.error(`You must provide keys to get: \`get [KEY]\`.`);
			return;
		}
		const cacheFiles = await Promise.all(
			keys.map(this._readCacheFile.bind(this))
		);
		cacheFiles
			.sort(({ fileData: a }, { fileData: b }) => Boolean(b) - Boolean(a))
			.forEach(writeKeyResult);
	}

	async list() {
		const index = await this._getIndex();
		Object.keys(index).forEach(k => console.log(k));
	}

	async remove(...keys) {
		if (keys.length < 1) {
			console.error(`You must provide keys to remove: \`remove [KEY]\`.`);
			return;
		}
		const cacheDeletions = Promise.all(
			keys.map(hashKey).map(this._deleteCacheFile.bind(this))
		);
		const index = await this._getIndex();

		keys.forEach(key => {
			delete index[key];
		});

		await Promise.all([cacheDeletions, this._writeIndex(index)]);
	}

	_pathToCacheFile(hash) {
		return path.join(this._cacheDir, hash);
	}

	async _initCache() {
		await mkdirAsync(this._cacheDir, { recursive: true });
	}

	async _deleteCacheFile(hash) {
		try {
			await unlinkAsync(this._pathToCacheFile(hash));
		} catch (e) {
			if (e.code === "ENOENT") {
				return;
			}
			throw e;
		}
	}

	async _writeCacheFile(hash, contents) {
		await writeFileAsync(
			this._pathToCacheFile(hash),
			contents,
			READ_WRITE_OPTIONS
		);
	}

	async _readCacheFile(key) {
		const hash = hashKey(key);
		const fileData = await readFileOrDefault(this._pathToCacheFile(hash), null);
		return {
			key,
			fileData
		};
	}

	async _writeIndex(index) {
		await writeFileAsync(
			this._indexFilePath,
			JSON.stringify(index),
			READ_WRITE_OPTIONS
		);
	}

	async _getIndex() {
		await this._initCache();
		const data = await readFileOrDefault(this._indexFilePath, DEFAULT_INDEX);
		return JSON.parse(data);
	}
}

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
