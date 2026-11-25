// Metro configuration.
//
// Production web builds use Expo's tree shaking (unused exports are dropped — e.g. only the icons
// and date functions the app imports end up in the bundle). It's switched on by
// EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1 EXPO_UNSTABLE_TREE_SHAKING=1 in `npm run build:web`, and
// needs ES module import support, turned on here for web only (phone builds keep the defaults).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.transformer.getTransformOptions = async (_entryPoints, options) => ({
  transform: options?.platform === "web" ? { experimentalImportSupport: true, inlineRequires: true } : {},
});

// Optional native animation libraries the app never uses directly. They're only installed because
// expo-router depends on them, and react-native-gesture-handler (drag & drop) loads them in a
// try/catch "if available". On web that pulled ~700 KB into the bundle for nothing, so web gets a
// stand-in that reports "not installed". Phones are unaffected.
const NOT_ON_WEB = new Set(["react-native-reanimated", "react-native-worklets"]);
const stub = path.resolve(__dirname, "src/lib/web-stubs/not-on-web.js");
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && NOT_ON_WEB.has(moduleName)) return { type: "sourceFile", filePath: stub };
  return (resolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
