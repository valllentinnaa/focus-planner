jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Screen tests: no native router, icons or header chrome.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("lucide-react-native", () => new Proxy({ __esModule: true }, { get: (t, k) => (k in t ? t[k] : () => null) }));
jest.mock("expo-router", () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    __esModule: true,
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    usePathname: () => "/",
    // Expo Router's <Link> renders a Text on web/native; a Text keeps plain-string children valid.
    Link: ({ children, style }) => require("react").createElement(require("react-native").Text, { style }, children),
    Stack: () => null,
  };
});
// Keep the header's helpers (useIsPhone, …); only the header and bottom bar render nothing.
jest.mock("@/components/app-header", () => ({
  ...jest.requireActual("@/components/app-header"),
  AppHeader: () => null,
  BottomNav: () => null,
}));

// expo-crypto's native randomUUID isn't available under Jest; use Node's.
jest.mock("expo-crypto", () => ({ ...jest.requireActual("expo-crypto"), randomUUID: () => require("crypto").randomUUID() }));
