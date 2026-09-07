import * as SecureStore from 'expo-secure-store';

/**
 * Acceso de bajo nivel a SecureStore compartido por `tokenStore` y
 * `portalAcceso`: mismo criterio para tratar un almacén que falla al leer
 * (sesión ausente, nunca una promesa rechazada) o al borrar (best-effort).
 */
export async function readSecureValue(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value && value.length > 0 ? value : null;
  } catch (error) {
    // Almacén corrupto o no disponible: tratar como valor ausente, no reventar.
    console.warn('[auth] No se pudo leer el almacén seguro', (error as Error)?.name);
    return null;
  }
}

export async function deleteSecureValue(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Un borrado que falla no debe tumbar el logout o el cambio de perfil.
  }
}
