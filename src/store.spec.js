const STORE_OPTIONS = {
	cacheDir: "hello"
};

describe("store", function() {
	let fs;
	let Store;
	let errorSpy;
	beforeEach(function() {
		jest.mock("fs", () => {
			const fakeState = {};
			return {
				readFile: jest.fn((path, b, cb) => {
					if (fakeState[path]) {
						return cb(null, Buffer.from(fakeState[path], "utf8"));
					}
					const e = new Error();
					e.code = "ENOENT";
					throw e;
				}),
				writeFile: jest.fn((path, value, c, cb) => {
					fakeState[path] = value;
					cb();
				}),
				unlink: jest.fn((path, cb) => {
					delete fakeState[path];
					cb();
				}),
				mkdir: jest.fn((a, b, cb) => {
					cb();
				})
			};
		});
		fs = require("fs");
		Store = require("./store.js").Store;
		errorSpy = jest.spyOn(global.console, "error").mockImplementation();
	});

	afterEach(function() {
		jest.restoreAllMocks();
		jest.resetModules();
	});

	describe("construction", function() {
		it("throws an error with no cacheDir", function() {
			expect(() => new Store()).toThrow();
		});
		it("throws no error with a cacheDir", function() {
			expect(() => new Store(STORE_OPTIONS)).not.toThrow();
		});
	});

	describe("add", function() {
		describe("called with no key", function() {
			const expectedLog =
				"You must provide a key and value to add: `store add [KEY] [VALUE]`.";
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.add();
			});
			it("logs an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy.mock.calls[0].length).toEqual(1);
				expect(errorSpy.mock.calls[0][0]).toEqual(expectedLog);
			});
			it("does not create any files", function() {
				expect(fs.writeFile).toHaveBeenCalledTimes(0);
			});
		});
		describe("called with no values", function() {
			const expectedLog =
				"You must provide a key and value to add: `store add [KEY] [VALUE]`.";
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.add("testKey");
			});
			it("logs an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy.mock.calls[0].length).toEqual(1);
				expect(errorSpy.mock.calls[0][0]).toEqual(expectedLog);
			});
			it("does not create any files", function() {
				expect(fs.writeFile).toHaveBeenCalledTimes(0);
			});
		});
		// Should write the INDEX, and 'wow' files once for the first `add`
		const NUMBER_OF_WRITE_FILE_CALLS_FOR_SINGLE_ADD = 2;
		describe("called with a single value", function() {
			const key = "waeweee";
			const hash = "f2fe49769a171d40976815a60c0de0b6";
			const value = "wow";
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.add(key, value);
			});
			it("does not log an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(0);
			});
			it("creates the index and the cache file", function() {
				expect(fs.writeFile).toHaveBeenCalledTimes(
					NUMBER_OF_WRITE_FILE_CALLS_FOR_SINGLE_ADD
				);
				expect(
					[fs.writeFile.mock.calls[1][0], fs.writeFile.mock.calls[0][0]].sort()
				).toEqual(
					[
						`${STORE_OPTIONS.cacheDir}/index`,
						`${STORE_OPTIONS.cacheDir}/cache/${hash}`
					].sort()
				);
			});
			it("adds an entry to the index", function() {
				const expectedIdx = JSON.stringify({
					[key]: hash
				});
				expect(fs.writeFile.mock.calls[1][1]).toEqual(expectedIdx);
			});
			it("writes a single cache file with expected values", function() {
				expect(fs.writeFile.mock.calls[0][1]).toEqual(value);
			});
		});
		describe("called with the same value twice", function() {
			const key = "waeweee2";
			const expectedLog = `Key '${key}' already exists. If you'd like to replace, it, please use \`store remove ${key}\` first.`;
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.add(key, "wow");
				await store.add(key, "wow");
			});
			it("logs an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy.mock.calls[0].length).toEqual(1);
				expect(errorSpy.mock.calls[0][0]).toEqual(expectedLog);
			});
			it("creates only the initial files for a single add call", function() {
				expect(fs.writeFile).toHaveBeenCalledTimes(
					NUMBER_OF_WRITE_FILE_CALLS_FOR_SINGLE_ADD
				);
				expect(
					[fs.writeFile.mock.calls[0][0], fs.writeFile.mock.calls[1][0]].sort()
				).toEqual(
					[
						`${STORE_OPTIONS.cacheDir}/index`,
						`${STORE_OPTIONS.cacheDir}/cache/3bba47553c14a62189f0a8303fba2e38`
					].sort()
				);
			});
		});
		describe("called with multiple values", function() {
			const hash1 = "0cc175b9c0f1b6a831c399e269772661";
			const hash2 = "92eb5ffee6ae2fec3ad71c777531578f";
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.add("a", "wow");
				await store.add("b", "wow", "2");
			});
			it("does not log an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(0);
			});
			it("adds an entry to the index for each item", function() {
				expect(fs.writeFile).toHaveBeenCalledTimes(4);

				expect(
					[
						fs.writeFile.mock.calls[0][0],
						fs.writeFile.mock.calls[1][0],
						fs.writeFile.mock.calls[2][0],
						fs.writeFile.mock.calls[3][0]
					].sort()
				).toEqual(
					[
						`${STORE_OPTIONS.cacheDir}/index`,
						`${STORE_OPTIONS.cacheDir}/cache/${hash1}`,
						`${STORE_OPTIONS.cacheDir}/index`,
						`${STORE_OPTIONS.cacheDir}/cache/${hash2}`
					].sort()
				);
			});
			it("writes a cache file with expected values for each item", function() {
				const callData = fs.writeFile.mock.calls.map(([, data]) => data);
				expect(callData).toEqual(expect.arrayContaining(["wow", "wow 2"]));
			});
			it("adds an entry to the index", function() {
				const expectedIdx = JSON.stringify({
					a: hash1,
					b: hash2
				});
				const lastIndexWrite = expect(fs.writeFile).toHaveBeenCalledWith(
					"hello/index",
					expectedIdx,
					{ encoding: "utf8" },
					expect.any(Function)
				);
			});
		});
	});
	describe("get", function() {
		describe("with no keys", function() {
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.get();
			});

			it("logs the expected error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy).toHaveBeenNthCalledWith(
					1,
					"You must provide a key to get: `store get [KEY]`."
				);
			});
		});

		describe("a single valid key", function() {
			let logSpy;
			beforeEach(async function() {
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				const store = new Store(STORE_OPTIONS);
				await store.add("a", "test");
				await store.get("a");
			});

			it("logs the expected result", function() {
				expect(logSpy).toHaveBeenCalledTimes(1);
				expect(logSpy).toHaveBeenNthCalledWith(1, "test");
			});
		});
		describe("a single non-valid key", function() {
			const key = "a";
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.get(key);
			});

			it("logs the expected error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy).toHaveBeenNthCalledWith(
					1,
					`Key '${key}' does not exist. Please use \`store add ${key} [VALUE]\` first.`
				);
			});
		});
	});
	describe("list", function() {
		describe("when empty", function() {
			let logSpy;
			beforeEach(async function() {
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				const store = new Store(STORE_OPTIONS);
				await store.list();
			});

			it("logs no result", function() {
				expect(logSpy).toHaveBeenCalledTimes(0);
			});
		});
		describe("with a single item", function() {
			let logSpy;
			beforeEach(async function() {
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				const store = new Store(STORE_OPTIONS);
				await store.add("a", "test");
				await store.list();
			});

			it("logs the expected result", function() {
				expect(logSpy).toHaveBeenCalledTimes(1);
				expect(logSpy).toHaveBeenCalledWith("a");
			});
		});
		describe("with multiple items", function() {
			let logSpy;
			beforeEach(async function() {
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				const store = new Store(STORE_OPTIONS);
				await store.add("a", "test");
				await store.add("b", "test b");
				await store.add("c", "test c");
				await store.list();
			});

			it("logs a result for each key", function() {
				expect(logSpy).toHaveBeenCalledTimes(3);
			});

			it("logs the expected result for each key", function() {
				expect(logSpy).toHaveBeenCalledWith("a");
				expect(logSpy).toHaveBeenCalledWith("b");
				expect(logSpy).toHaveBeenCalledWith("c");
			});
		});
	});
	describe("remove", function() {
		describe("a non-existent item", function() {
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				await store.remove("random-crap");
			});

			it("does not write to log or error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(0);
				expect(logSpy).toHaveBeenCalledTimes(0);
			});
		});

		describe("with no arguments", function() {
			beforeEach(async function() {
				const store = new Store(STORE_OPTIONS);
				await store.remove();
			});

			it("raises an error", function() {
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy).toHaveBeenNthCalledWith(
					1,
					"You must provide keys to remove: `store remove [KEY]`."
				);
			});
		});

		describe("multiple existing items then attempting to get and list them", function() {
			const removedKey1 = "a";
			const removedKey2 = "あ";

			const validKey1 = "b";
			const validKey2 = "d";

			beforeEach(async function() {
				logSpy = jest.spyOn(global.console, "log").mockImplementation();
				const store = new Store(STORE_OPTIONS);
				await store.add(removedKey1, "b");
				await store.add(validKey1, "c");
				await store.add(validKey2, "ฟหดด");
				await store.add(removedKey2, "e");
				await store.remove(removedKey1, removedKey2);
				await store.get("a");
				await store.get("あ");
				await store.list();
			});

			it("raises an error for each item", function() {
				expect(errorSpy).toHaveBeenCalledTimes(2);
				expect(errorSpy).toHaveBeenNthCalledWith(
					1,
					`Key '${removedKey1}' does not exist. Please use \`store add ${removedKey1} [VALUE]\` first.`
				);
				expect(errorSpy).toHaveBeenNthCalledWith(
					2,
					`Key '${removedKey2}' does not exist. Please use \`store add ${removedKey2} [VALUE]\` first.`
				);
			});

			it("does not list any of the removed keys", function() {
				expect(logSpy).toHaveBeenCalledTimes(2);
				expect(logSpy).toHaveBeenNthCalledWith(1, validKey1);
				expect(logSpy).toHaveBeenNthCalledWith(2, validKey2);
			});
		});
	});
});
