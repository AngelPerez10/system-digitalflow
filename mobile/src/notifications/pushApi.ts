import { apiClient } from '@/api/client';

export type PushPlatform = 'ios' | 'android';

/** Alta / refresco del dispositivo actual. Idempotente en el backend (upsert por token). */
export async function registrarPushDevice(
  expoToken: string,
  platform: PushPlatform,
): Promise<void> {
  await apiClient.request('/push-devices/', {
    method: 'POST',
    body: { expo_token: expoToken, platform },
  });
}

/** Baja del dispositivo (al cerrar sesión). Best-effort: si falla, no se propaga. */
export async function darDeBajaPushDevice(expoToken: string): Promise<void> {
  await apiClient.request('/push-devices/baja/', {
    method: 'POST',
    body: { expo_token: expoToken },
  });
}
