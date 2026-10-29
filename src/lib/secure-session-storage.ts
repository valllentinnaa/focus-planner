// Session storage for supabase-js on native.
// SecureStore (Keychain / Keystore) caps values at 2048 bytes, so the session JSON is encrypted
// with AES-256-CTR and kept in AsyncStorage while only the key lives in SecureStore.
// This is the pattern from Supabase's Expo guide; keep aes-js, expo-secure-store and
// react-native-get-random-values current.
import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import { Platform } from "react-native";

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey), secureOptions);
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string) {
    const hex = await SecureStore.getItemAsync(key, secureOptions);
    if (!hex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string) {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key, secureOptions);
  }
}

// On web, supabase-js uses localStorage by itself (its own default) — only override on native.
export const sessionStorage = Platform.OS === "web" ? undefined : new LargeSecureStore();
