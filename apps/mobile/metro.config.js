const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Ensure shared package is resolved
    disableHierarchicalLookup: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
