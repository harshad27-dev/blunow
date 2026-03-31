// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the project root (apps/mobile) and the monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so Metro can resolve hoisted packages
config.watchFolders = [monorepoRoot];

// 2. Tell Metro where to look for node_modules:
//    - First check the local app node_modules
//    - Then fall back to the monorepo root node_modules (hoisted packages)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
