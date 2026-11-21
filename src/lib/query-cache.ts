// On-device cache for react-query. Only Google Calendar data is persisted (see app/_layout.tsx);
// it survives restarts for up to a day and is wiped on sign-out.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const CACHE_MAX_AGE = 24 * 60 * 60_000;
export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "fp.query-cache" });
