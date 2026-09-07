import * as SecureStore from 'expo-secure-store';
import { deleteSecureValue, readSecureValue } from './secureStore';

/** Portal elegido antes del login — define a dónde entra tras restaurar sesión. */
export type PortalAcceso = 'tecnico' | 'cliente';

const KEY = 'digitalflow.portal';

let enMemoria: PortalAcceso | null = null;

async function read(): Promise<PortalAcceso | null> {
  const raw = await readSecureValue(KEY);
  return raw === 'tecnico' || raw === 'cliente' ? raw : null;
}

export const portalAcceso = {
  /**
   * Portal recordado, o `null` si el usuario aún no elige. `null` no equivale a
   * «técnico»: `app/index.tsx` lo usa para decidir entre mandar al login recordado
   * o a la pantalla de bienvenida.
   */
  get(): PortalAcceso | null {
    return enMemoria;
  },

  async restore(): Promise<PortalAcceso | null> {
    enMemoria = await read();
    return enMemoria;
  },

  async set(portal: PortalAcceso): Promise<void> {
    enMemoria = portal;
    await SecureStore.setItemAsync(KEY, portal);
  },

  /** Olvida la elección: la bienvenida vuelve a salir en el próximo arranque. */
  async clear(): Promise<void> {
    enMemoria = null;
    await deleteSecureValue(KEY);
  },
};
