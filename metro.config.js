const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite en web requiere que Metro pueda resolver archivos .wasm.
config.resolver.assetExts.push('wasm');

module.exports = config;
