const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add the parent directory to watch folders so we can import from the root's convex directory
config.watchFolders = [path.resolve(__dirname, '..')];

module.exports = config;
