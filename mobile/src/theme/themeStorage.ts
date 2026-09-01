import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'digitalflow.theme';

export async function loadThemePreference(): Promise<ThemePreference | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    return null;
  } catch {
    console.warn('[theme] No se pudo leer la preferencia de tema');
    return null;
  }
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    console.warn('[theme] No se pudo guardar la preferencia de tema');
  }
}
