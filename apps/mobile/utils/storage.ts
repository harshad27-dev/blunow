import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const canUseLocalStorage = () =>
  typeof globalThis !== "undefined" && "localStorage" in globalThis;

export const storage = {
  get: async (key: string) => {
    if (Platform.OS === "web" && canUseLocalStorage()) {
      return globalThis.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  set: async (key: string, value: string) => {
    if (Platform.OS === "web" && canUseLocalStorage()) {
      globalThis.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  delete: async (key: string) => {
    if (Platform.OS === "web" && canUseLocalStorage()) {
      globalThis.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
