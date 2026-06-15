const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
    workspaceNodeModules,
    path.resolve(projectRoot, 'node_modules'),
];

// Uma única instância de React no bundle (monorepo pnpm).
config.resolver.extraNodeModules = {
    react: path.resolve(workspaceNodeModules, 'react'),
    'react-dom': path.resolve(workspaceNodeModules, 'react-dom'),
    'react-native-web': path.resolve(workspaceNodeModules, 'react-native-web'),
};

const reactSubpaths = new Set([
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-dom',
    'react-dom/client',
    'react-dom/server',
]);

const mapsWebStub = path.resolve(projectRoot, 'src/shims/react-native-maps.web.ts');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
        return {
            filePath: mapsWebStub,
            type: 'sourceFile',
        };
    }
    if (reactSubpaths.has(moduleName) && platform === 'web') {
        return {
            filePath: require.resolve(moduleName, { paths: [workspaceNodeModules] }),
            type: 'sourceFile',
        };
    }
    if (defaultResolveRequest) {
        return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
