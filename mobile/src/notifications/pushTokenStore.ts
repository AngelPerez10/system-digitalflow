import * as SecureStore from 'expo-secure-store';

/**
 * Guarda el último Expo push token registrado. No es un secreto (es una
 * dirección de entrega, no una credencial), pero se usa SecureStore porque ya
 * es dependencia y evita sumar AsyncStorage solo para esto.
 *
 * Sirve para poder dar de baja el token exacto en el logout aunque la app se
 * haya reiniciado entre el registro y el cierre de sesión.
 */
const KEY = 'push_expo_token';

export async function leerPushToken(): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function guardarPushToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, token);
  } catch {
    // Si no se puede persistir, el registro igual funciona esta sesión.
  }
}

export async function borrarPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* best-effort */
  }
}
