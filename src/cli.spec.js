const { parseArgs, run } = require("./cli.js");

describe("parseArgs", function() {
	const emptyCases = [[], ["a"], ["a", "b"]];

	emptyCases.forEach(testCase => {
		describe(`called with an array containing ${testCase.length} elements`, function() {
			let result;

			beforeAll(function() {
				result = parseArgs();
			});

			it("returns cmd as undefined", function() {
				expect(result.cmd).toEqual(undefined);
			});

			it("returns cmdArgs as an empty array", function() {
				expect(result.cmdArgs).toEqual([]);
			});
		});
	});

	describe("called with an array with three values", function() {
		const args = [0, 1, "a"];
		let result;

		beforeAll(function() {
			result = parseArgs(args);
		});

		it("returns cmd as the third value", function() {
			expect(result.cmd).toEqual(args[2]);
		});

		it("returns cmdArgs as an empty array", function() {
			expect(result.cmdArgs).toEqual([]);
		});
	});

	describe("called with an array with four values", function() {
		const args = [0, 1, "a", "b"];
		let result;

		beforeAll(function() {
			result = parseArgs(args);
		});

		it("returns cmd as an array containing the fourth value", function() {
			expect(result.cmd).toEqual(args[2]);
		});

		it("returns cmdArgs as an array with the final item", function() {
			expect(result.cmdArgs).toEqual(["b"]);
		});
	});

	describe("called with an array with greater than four values", function() {
		const args = [0, 1, "a", "b", "c"];
		let result;

		beforeAll(function() {
			result = parseArgs(args);
		});

		it("returns cmd as an array containing the fourth value", function() {
			expect(result.cmd).toEqual(args[2]);
		});

		it("returns cmdArgs with the final 2 values", function() {
			expect(result.cmdArgs).toEqual(["b", "c"]);
		});
	});
});

describe("run", function() {
	describe("with an empty cmd", function() {
		const expectedLog =
			'You must specify a command. Valid options are: "add", "list", "get", "remove".';

		it("logs a console error listing valid commands", async function() {
			errorSpy = jest.spyOn(global.console, "error").mockImplementation();
			await run({}, {});
			expect(errorSpy.mock.calls.length).toEqual(1);
			expect(errorSpy.mock.calls[0].length).toEqual(1);
			expect(errorSpy.mock.calls[0][0]).toEqual(expectedLog);
			jest.restoreAllMocks();
		});
	});
	describe("with a non-valid cmd", function() {
		const expectedLog =
			'"someTest" is not a valid command. Please use one of "add", "list", "get", "remove".';

		beforeEach(async function() {
			errorSpy = jest.spyOn(global.console, "error").mockImplementation();
			await run({}, { cmd: "someTest" });
		});

		it("logs a console error listing valid commands", async function() {
			expect(errorSpy.mock.calls.length).toEqual(1);
			expect(errorSpy.mock.calls[0].length).toEqual(1);
			expect(errorSpy.mock.calls[0][0]).toEqual(expectedLog);
		});
	});
	describe("valid commands", function() {
		let mockStore;
		let cmdArgs = ["a", "b"];

		beforeEach(function() {
			mockStore = {
				add: jest.fn(),
				get: jest.fn(),
				list: jest.fn(),
				remove: jest.fn()
			};
		});

		const cases = [
			{
				toCall: "add",
				toNotCall: ["get", "list", "remove"]
			},
			{
				toCall: "get",
				toNotCall: ["add", "list", "remove"]
			},
			{
				toCall: "list",
				toNotCall: ["add", "get", "remove"]
			},
			{
				toCall: "remove",
				toNotCall: ["add", "get", "list"]
			}
		];

		cases.forEach(function({ toCall, toNotCall }) {
			describe(toCall, function() {
				beforeEach(function() {
					run(mockStore, { cmd: toCall, cmdArgs });
				});

				it(`calls the ${toCall} spy`, function() {
					expect(mockStore[toCall]).toHaveBeenCalledWith(...cmdArgs);
				});

				toNotCall.forEach(function(theCmd) {
					it(`does not call ${theCmd}`, function() {
						expect(mockStore[theCmd]).toHaveBeenCalledTimes(0);
					});
				});
			});
		});
	});
});
