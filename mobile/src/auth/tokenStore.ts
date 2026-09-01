import * as SecureStore from 'expo-secure-store';

/**
 * Access en memoria + SecureStore; refresh **solo** en SecureStore
 * (Keystore en Android / Keychain en iOS). Nunca AsyncStorage sin cifrar.
 */
const ACCESS_KEY = 'digitalflow.access';
const REFRESH_KEY = 'digitalflow.refresh';

export interface TokenPair {
  access: string;
  refresh: string;
}

let accessInMemory: string | null = null;

async function readKey(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value && value.length > 0 ? value : null;
  } catch (error) {
    // Almacén corrupto o no disponible: tratar como sesión ausente, no reventar.
    console.warn('[auth] No se pudo leer el almacén seguro', (error as Error)?.name);
    return null;
  }
}

export const tokenStore = {
  getAccess(): string | null {
    return accessInMemory;
  },

  async save(tokens: TokenPair): Promise<void> {
    accessInMemory = tokens.access;
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.access);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh);
  },

  /** Tras rotar el refresh: guardar ambos sin pasar por el login. */
  async updateAccess(access: string, refresh?: string): Promise<void> {
    accessInMemory = access;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },

  async getRefresh(): Promise<string | null> {
    return readKey(REFRESH_KEY);
  },

  /** Rehidrata el access en memoria al arrancar la app. */
  async restore(): Promise<TokenPair | null> {
    const [access, refresh] = await Promise.all([readKey(ACCESS_KEY), readKey(REFRESH_KEY)]);
    if (!refresh) {
      accessInMemory = null;
      return null;
    }
    accessInMemory = access;
    return { access: access ?? '', refresh };
  },

  async clear(): Promise<void> {
    accessInMemory = null;
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
    ]);
  },
};
