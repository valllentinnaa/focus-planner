// Stand-in for optional native-only modules on web (see metro.config.js). Libraries that load
// them inside try/catch (react-native-gesture-handler does for reanimated/worklets) treat this
// exactly like "not installed" and carry on without them.
throw new Error("Not included in the web build");
