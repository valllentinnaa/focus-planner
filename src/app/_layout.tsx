import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/data/auth";
import { CACHE_MAX_AGE, persister } from "@/lib/query-cache";
import { hideOpeningLoader } from "@/lib/opening-loader";
import { registerShareWorker } from "@/lib/share-inbox";
import { DragProvider } from "@/components/drag";
import { UpdateBanner } from "@/components/update-banner";
import { colors } from "@/theme/tokens";
import { FONT_WAIT_MS, FONTS } from "@/theme/fonts";
import { isDarkNative } from "@/theme/theme";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: "(app)" };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  // Web: show the app after FONT_WAIT_MS even if fonts are still loading (slow connection).
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    if (FONT_WAIT_MS === null) return;
    const t = setTimeout(() => setFontWaitOver(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const fontsReady = fontsLoaded || !!fontError || fontWaitOver;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 1 } },
      }),
  );

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);
  // Web: lets the installed app appear in Android's Share menu (shares go to the Clipboard).
  useEffect(registerShareWorker, []);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: CACHE_MAX_AGE,
            // Only Google Calendar data is kept on the device between launches.
            dehydrateOptions: { shouldDehydrateQuery: (q) => q.queryKey[0] === "gcal" && q.state.status === "success" },
          }}
        >
          <AuthProvider>
            <DragProvider>
              <StatusBar style={isDarkNative ? "light" : "dark"} />
              <RootStack />
              <UpdateBanner />
            </DragProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const wasSignedIn = useRef(false);
  // Signing out wipes cached data (incl. calendar events kept on the device).
  useEffect(() => {
    if (loading) return;
    if (wasSignedIn.current && !session) {
      qc.clear();
      persister.removeClient();
    }
    wasSignedIn.current = !!session;
  }, [session, loading, qc]);
  // Web: the oyster opening loader fades out once we know who's signed in (and it has opened).
  useEffect(() => {
    if (!loading) hideOpeningLoader();
  }, [loading]);
  if (loading) return null;
  const signedIn = !!session;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="(app)" />
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
      {/* Shared wishlists are public: open signed in or not. */}
      <Stack.Screen name="w/[token]" />
      <Stack.Screen name="join/[token]" />
      <Stack.Screen name="u/[token]" />
    </Stack>
  );
}
