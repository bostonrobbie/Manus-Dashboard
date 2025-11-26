const { loadConfig, register } = require("./lib/index.js");

const config = loadConfig();

if (config.resultType === "success") {
  register({
    absoluteBaseUrl: config.absoluteBaseUrl,
    compiledBaseUrl: config.compiledBaseUrl,
    paths: config.paths,
  });
} else {
  // Fallback to default resolution when configuration cannot be loaded.
  console.warn(`[tsconfig-paths] ${config.message ?? "Unable to load configuration"}`);
}
