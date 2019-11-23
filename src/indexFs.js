const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const { readFileOrDefault } = require("./util/fs.js");
const { READ_WRITE_OPTIONS } = require("./constants/fs.js");

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const INDEX_FILENAME = "index";
const DEFAULT_INDEX = JSON.stringify({});

/**
 * A simple low-level interface for working with the index file. Used to keep a
 * list of all the valid keys and their associated hashes.
 *
 * TODO: Consider replacing the Object{ key: hash } with an array of keys
 * TODO: Extract out similarities with cacheFs
 */
class IndexFs {
	constructor(options = {}) {
		this._cacheDirRoot = options.cacheDir;
		this._indexFilePath = path.join(this._cacheDirRoot, INDEX_FILENAME);
	}

	async add(key, hash) {
		await this._loadIndex();
		this._index[key] = hash;
	}

	async remove(key) {
		await this._loadIndex();
		delete this._index[key];
	}

	async write() {
		await this._loadIndex();
		await writeFileAsync(
			this._indexFilePath,
			JSON.stringify(this._index),
			READ_WRITE_OPTIONS
		);
	}

	get index() {
		return this._loadIndex().then(() => this._index);
	}

	async _loadIndex() {
		if (!this._index) {
			await this._initCacheDir();
			const data = await readFileOrDefault(this._indexFilePath, DEFAULT_INDEX);
			this._index = JSON.parse(data);
		}
		return this._index;
	}

	async _initCacheDir() {
		await mkdirAsync(this._cacheDirRoot, { recursive: true });
	}
}

module.exports = { IndexFs };
