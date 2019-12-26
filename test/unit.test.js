// jshint ignore: start
const Plugin = require("../index");

test("Plugin definition", () => {
  expect(typeof Plugin).toBe("object");
  expect(Plugin).toHaveProperty("jshint");
  expect(Plugin.jshint).toBeInstanceOf(Function);
  expect(Plugin.jshint()).toHaveProperty("name");
  expect(Plugin.jshint().name).toEqual("jshint");
});

describe("Robustness", () => {
  test("Plugin without options", () => {
    const instance = Plugin.jshint({});
    const sample = `
      'use strict';
      var x = 23;
      var y = 4;
      z = x + 4;
    `;
    expect(() => {
      instance.transform(sample, "no-id1");
    }).toThrowError("Errors were found");
  });
  test("Plugin with options", () => {
    const instance = Plugin.jshint({
      throwOnError: false
    });
    const sample = `
    function myFunction() {
      'use strict';
      var x = 23;
      var y = 4;
      return x + y;
    }
    `;
    const result = instance.transform(sample, "no-id2");
    expect(result).toBe(null);
  });
});

describe("Happy path", () => {
  test("Plugin without options", () => {
    const instance = Plugin.jshint({});
    const sample = `
    function anonymous() {
      'use strict';
      var x = 23;
      var y = 4;
      var s = x + y;
      return s;
    }
    `;
    const result = instance.transform(sample, "no-id3");
    expect(result).toBe(null);
  });
});
