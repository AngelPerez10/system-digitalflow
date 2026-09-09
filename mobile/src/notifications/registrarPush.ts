import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { IS_DEV } from '@/config/env';
import { darDeBajaPushDevice, registrarPushDevice, type PushPlatform } from './pushApi';
import { pushRemotoDisponible } from './pushDisponible';
import { borrarPushToken, guardarPushToken, leerPushToken } from './pushTokenStore';

type Notificaciones = typeof import('expo-notifications');

/** Require diferido: el import estático tira en Expo Go Android (SDK 53+). */
function cargarNotificaciones(): Notificaciones | null {
  if (!pushRemotoDisponible()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa; el import top-level revienta Expo Go
  return require('expo-notifications') as Notificaciones;
}

export const CANAL_ORDENES = 'ordenes';

/** El `projectId` de EAS es obligatorio para `getExpoPushTokenAsync` en SDK 53+. */
function resolverProjectId(): string | null {
  const extra = Constants.expoConfig?.extra ?? (Constants.manifest2 as { extra?: unknown })?.extra;
  const eas = (extra as { eas?: { projectId?: string } } | undefined)?.eas;
  return eas?.projectId ?? null;
}

async function asegurarCanalAndroid(Notifications: Notificaciones): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ORDENES, {
    name: 'Órdenes disponibles',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#1B5CFF',
    sound: 'default',
  });
}

/**
 * Pide permiso (solo si aún no se decidió), obtiene el Expo push token y lo
 * registra en el backend. Idempotente: se puede llamar en cada inicio de sesión.
 *
 * Silenciosa ante fallos: un técnico sin permiso concedido, sin red, en Expo Go
 * Android o en un emulador (`!Device.isDevice`) sigue usando la app, solo que
 * sin avisos.
 */
export async function registrarDispositivoPush(): Promise<void> {
  try {
    const Notifications = cargarNotificaciones();
    if (!Notifications) return;
    if (!Device.isDevice) return; // el push remoto no funciona en simulador/emulador

    await asegurarCanalAndroid(Notifications);

    const actual = await Notifications.getPermissionsAsync();
    let concedido = actual.granted;
    if (!concedido && actual.canAskAgain) {
      const pedido = await Notifications.requestPermissionsAsync();
      concedido = pedido.granted;
    }
    if (!concedido) return;

    const projectId = resolverProjectId();
    if (!projectId) {
      if (IS_DEV) console.warn('[push] Falta extra.eas.projectId en app.json');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    const plataforma: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registrarPushDevice(token, plataforma);
    await guardarPushToken(token);
  } catch (error) {
    if (IS_DEV) console.warn('[push] No se pudo registrar el dispositivo', (error as Error)?.message);
  }
}

/** Da de baja el token guardado (se llama en el logout). Best-effort. */
export async function darDeBajaDispositivoPush(): Promise<void> {
  try {
    const token = await leerPushToken();
    if (!token) return;
    await darDeBajaPushDevice(token);
    await borrarPushToken();
  } catch {
    /* el backend también limpia tokens muertos por DeviceNotRegistered */
  }
}
