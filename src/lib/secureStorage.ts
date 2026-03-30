import CryptoJS from "crypto-js";

// Generate a unique encryption key based on browser fingerprint
const getEncryptionKey = (): string => {
  // Use a combination of browser properties to create a unique key
  const browserFingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.width + "x" + screen.height,
  ].join("|");

  // Hash the fingerprint to create a consistent key
  return CryptoJS.SHA256(browserFingerprint).toString();
};

// Additional secret key (you can change this to your own secret)
const SECRET_KEY =
  import.meta.env.VITE_STORAGE_SECRET || "lpg-flow-secure-2025";

// Combine browser fingerprint with secret for stronger encryption
const getFullEncryptionKey = (): string => {
  return CryptoJS.SHA256(getEncryptionKey() + SECRET_KEY).toString();
};

export const secureStorage = {
  /**
   * Encrypt and store data in localStorage
   */
  setItem: (key: string, value: string): void => {
    try {
      const encryptionKey = getFullEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(value, encryptionKey).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error("Error encrypting data:", error);
      throw new Error("Failed to store encrypted data");
    }
  },

  /**
   * Retrieve and decrypt data from localStorage
   */
  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const encryptionKey = getFullEncryptionKey();
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
      const value = decrypted.toString(CryptoJS.enc.Utf8);

      return value || null;
    } catch (error) {
      console.error("Error decrypting data:", error);
      // If decryption fails, remove the corrupted data
      localStorage.removeItem(key);
      return null;
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  /**
   * Clear all items from localStorage
   */
  clear: (): void => {
    localStorage.clear();
  },

  /**
   * Check if key exists in localStorage
   */
  hasItem: (key: string): boolean => {
    return localStorage.getItem(key) !== null;
  },
};

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "lpg_access_token",
  REFRESH_TOKEN: "lpg_refresh_token",
  USER_SESSION: "lpg_user_session",
} as const;
