const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Permite que o Metro resolva arquivos .mjs (necessário para lucide-react-native v1+)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "mjs",
];

module.exports = config;
