// eslint: disable
// node
var fs = require("fs");
var path = require("path");
// vendors
var merge = require("merge-deep");
var PluginUtils = require("rollup-pluginutils");
var JSHINT = require("jshint");
var CLI = require("jshint/src/cli");
var reporter = require("jshint-stylish");
// locals
var PluginName = "jshint";
var defaultOptions = {
  useJshintrc: false,
  include: null,
  exclude: /node_modules/,
  throwOnWarning: false,
  throwOnError: true,
  fix: false,
  reporter: reporter
};
// helpers
function normalizePath(id) {
  return path
    .relative(process.cwd(), id)
    .split(path.sep)
    .join("/");
}
// module
function jshint(userOptions) {
  var options = {};
  if (typeof userOptions === "string") {
    var pathToJshintrc = path.resolve(process.cwd(), options);
    if (fs.existsSync(pathToJshintrc)) {
      options = merge({}, defaultOptions, require(pathToJshintrc));
    } else {
      throw Error("No file in expected path: " + pathToJshintrc);
    }
  } else {
    options = merge({}, defaultOptions, userOptions || {});
  }
  var filter = PluginUtils.createFilter(
    options.include,
    options.exclude || /node_modules/
  );
  // console.debug('Plugin options are', options);
  return {
    name: PluginName,
    transform: function(code, id) {
      var file = normalizePath(id);
      if (!filter(id)) {
        return null;
      }
      var success = false;
      var report = {
        errors: [],
        unused: [],
        implieds: [],
        globals: []
      };
      if (fs.existsSync(file)) {
        var jshintArgs = [];
        jshintArgs.push(file);
        var jshintOpts = merge(
          {},
          {
            args: jshintArgs,
            reporter: options.reporter.reporter
          }
        );
        success = CLI.run(jshintOpts);
      } else {
        var withoutIssues = JSHINT.JSHINT(code);
        if (!withoutIssues) {
          report = JSHINT.JSHINT.data();
        }
      }
      // Interpret
      var warningCount =
        (report.unused || []).length + (report.implieds || []).length;
      var errorCount = (report.errors || []).length;
      // console.debug('>> report', id, report, warningCount, errorCount);
      if (warningCount === 0 && errorCount === 0) {
        return null;
      }
      var hasWarnings = options.throwOnWarning && warningCount !== 0;
      var hasErrors = options.throwOnError && errorCount !== 0;
      if (hasWarnings || hasErrors) {
        success = false;
      }
      if (!success) {
        throw Error("Errors were found");
      }
      return null;
    }
  };
}

exports.jshint = jshint;
