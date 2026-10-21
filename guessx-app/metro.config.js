const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedApi = path.resolve(workspaceRoot, "packages/guessx-api");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders || []), sharedApi];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@takelow/api": sharedApi,
};
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
