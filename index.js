// eslint: disable
// node
var fs = require("fs");
var path = require("path");
// vendors
var merge = require("merge-deep");
var PluginUtils = require("rollup-pluginutils");
var JSHINT = require("jshint");
var CLI = require("jshint/src/cli");
// var minimatch = require("minimatch");
// var shjs = require("shelljs");
var reporter = require("jshint-stylish");
// locals
var PluginName = "jshint";
var defaultOptions = {
  useJshintrc: true,
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
/**
 * Checks whether we should ignore a file or not.
 *
 * @param {string} fp       a path to a file
 * @param {array}  patterns a list of patterns for files to ignore
 *
 * @return {boolean} 'true' if file should be ignored, 'false' otherwise.
 */
function isIgnored(fp, patterns) {
  return patterns.some(function(ip) {
    if (minimatch(path.resolve(fp), ip, { nocase: true, dot: true })) {
      return true;
    }
    if (path.resolve(fp) === ip) {
      return true;
    }
    if (
      shjs.test("-d", fp) &&
      ip.match(/^[^\/\\]*[\/\\]?$/) &&
      fp.match(new RegExp("^" + ip + ".*"))
    ) {
      return true;
    }
  });
}
// module
function jshint(userOptions) {
  var options = merge({}, defaultOptions, userOptions || {});
  var filter = PluginUtils.createFilter(
    options.include,
    options.exclude || /node_modules/
  );
  var jshintrcOptions = {};
  if (options.useJshintrc) {
    var pathToJshintrc = path.join(process.cwd(), ".jshintrc");
    if (fs.existsSync(pathToJshintrc)) {
      jshintrcOptions = merge(
        {},
        {
          include: options.include,
          exclude: options.exclude
        },
        CLI.loadConfig(pathToJshintrc)
      );
    } else {
      throw Error("No file in expected path: " + pathToJshintrc);
    }
  }
  // console.debug('Plugin options are', options);
  return {
    name: PluginName,
    transform: function(code, id) {
      var file = normalizePath(id);
      // var ignored = isIgnored(file, jshintrcOptions.exclude);
      var filtered = !filter(id);
      if (filtered) {
        return null;
      }
      var success = false;
      var report = {
        errors: [],
        unused: [],
        implieds: [],
        globals: []
      };
      console.debug("Verify", jshintrcOptions, id);
      if (fs.existsSync(file)) {
        var jshintArgs = [];
        jshintArgs.push(file);
        var jshintOpts = merge(
          {},
          {
            args: jshintArgs,
            reporter: options.reporter.reporter
          },
          jshintrcOptions
        );
        success = CLI.run(jshintOpts);
      } else {
        var withoutIssues = JSHINT.JSHINT(code, jshintrcOptions);
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
