import { createClient } from "@supabase/supabase-js";
import { secureStorage, STORAGE_KEYS } from "./secureStorage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

// Custom storage implementation using encrypted storage
const customStorage = {
  getItem: (key: string) => {
    // Map Supabase storage keys to our secure storage
    if (key.includes("auth-token")) {
      return secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
    return secureStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    // Map Supabase storage keys to our secure storage
    if (key.includes("auth-token")) {
      secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, value);
    } else {
      secureStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (key.includes("auth-token")) {
      secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } else {
      secureStorage.removeItem(key);
    }
  },
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: customStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = () => !!supabase;
