const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for Expo monorepo
 */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

const pinnedModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(
    projectRoot,
    'node_modules/react-native-reanimated'
  ),
  'react-native-worklets': path.resolve(
    projectRoot,
    'node_modules/react-native-worklets'
  ),
  'react-native-gesture-handler': path.resolve(
    projectRoot,
    'node_modules/react-native-gesture-handler'
  ),
};

config.resolver.extraNodeModules = pinnedModules;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [name, modulePath] of Object.entries(pinnedModules)) {
    if (moduleName === name || moduleName.startsWith(`${name}/`)) {
      const target = path.join(modulePath, moduleName.slice(name.length));
      return context.resolveRequest(context, target, platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
