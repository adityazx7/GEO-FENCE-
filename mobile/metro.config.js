const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the workspace root (parent directory)
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to look for modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Intercept `convex/server` imports and route them to our proxy
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'convex/server') {
    return {
      filePath: path.resolve(projectRoot, 'convex-server-proxy.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
