const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const { READ_WRITE_OPTIONS } = require("./constants/fs.js");
const { readFileOrDefault } = require("./util/fs.js");

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

const CACHE_DIR = "cache";

/**
 * A simple low-level interface for working with the cache files
 *
 * TODO: Extract out similarities with indexFs
 */
class CacheFs {
	constructor(options = {}) {
		this._cacheDir = path.join(options.cacheDir, CACHE_DIR);
	}

	async _initCacheDir() {
		await mkdirAsync(this._cacheDir, { recursive: true });
	}

	_pathToCacheFile(hash) {
		return path.join(this._cacheDir, hash);
	}

	async deleteCacheFile(hash) {
		try {
			await unlinkAsync(this._pathToCacheFile(hash));
		} catch (e) {
			if (e.code === "ENOENT") {
				return;
			}
			throw e;
		}
	}

	async writeCacheFile(hash, contents) {
		await this._initCacheDir();
		await writeFileAsync(
			this._pathToCacheFile(hash),
			contents,
			READ_WRITE_OPTIONS
		);
	}

	async readCacheFile(hash) {
		await this._initCacheDir();
		return readFileOrDefault(this._pathToCacheFile(hash), null);
	}
}

module.exports = { CacheFs };
