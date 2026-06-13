const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

// Resolve packages from monorepo root (where pnpm hoists them)
config.resolver.nodeModulesPaths = [
    path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
