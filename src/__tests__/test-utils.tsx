// Shared setup for screen tests. Screens run in demo mode (no Supabase env in tests), so data goes
// through the AsyncStorage-backed fake database — no network.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { AuthProvider } from "@/data/auth";

export async function renderScreen(ui: ReactElement) {
  await AsyncStorage.clear();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}
