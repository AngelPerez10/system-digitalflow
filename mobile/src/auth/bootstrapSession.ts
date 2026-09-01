import { NetworkError, SessionExpiredError, toUserMessage } from '@/api/errors';
import type { ModulePermissions, SessionUser } from '@/types/api';
import type { TokenPair } from './tokenStore';

/**
 * Tope del arranque. Sin esto, un servidor que no responde (IP equivocada, VPN,
 * puerto cerrado) o un almacén seguro que no contesta dejarían la app en
 * «Restaurando sesión…» indefinidamente.
 */
export const BOOTSTRAP_TIMEOUT_MS = 8000;

export class TiempoAgotadoError extends Error {
  constructor() {
    super('El servidor no respondió a tiempo.');
    this.name = 'TiempoAgotadoError';
  }
}

export type BootstrapResult =
  | { status: 'signedIn'; user: SessionUser; permissions: ModulePermissions }
  | { status: 'signedOut'; notice: string | null; borrarTokens: boolean };

export interface BootstrapDeps {
  restore: () => Promise<TokenPair | null>;
  fetchMe: () => Promise<SessionUser>;
  fetchPermissions: () => Promise<ModulePermissions>;
  timeoutMs?: number;
}

export function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TiempoAgotadoError()), ms);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Rehidrata la sesión guardada. **Siempre resuelve**: cualquier fallo se traduce
 * a `signedOut` con un motivo en español, nunca a una promesa colgada.
 *
 * Un fallo de red no le cuesta la sesión al técnico (`borrarTokens: false`); los
 * tokens solo se borran cuando el servidor los rechazó de verdad.
 */
export async function bootstrapSession(deps: BootstrapDeps): Promise<BootstrapResult> {
  const timeoutMs = deps.timeoutMs ?? BOOTSTRAP_TIMEOUT_MS;
  try {
    const tokens = await conTiempoLimite(deps.restore(), timeoutMs);
    if (!tokens) return { status: 'signedOut', notice: null, borrarTokens: false };

    const [user, permissions] = await conTiempoLimite(
      Promise.all([deps.fetchMe(), deps.fetchPermissions()]),
      timeoutMs,
    );
    return { status: 'signedIn', user, permissions };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      return {
        status: 'signedOut',
        notice: 'Tu sesión expiró. Inicia sesión de nuevo.',
        borrarTokens: true,
      };
    }
    if (error instanceof NetworkError || error instanceof TiempoAgotadoError) {
      return {
        status: 'signedOut',
        notice: `No se pudo contactar al servidor. Revise la red. (${toUserMessage(error)})`,
        borrarTokens: false,
      };
    }
    return {
      status: 'signedOut',
      notice: `No se pudo validar la sesión. ${toUserMessage(error)}`,
      borrarTokens: true,
    };
  }
}
