/**
 * En Expo Go Android (SDK 53+) el paquete `expo-notifications` tira al
 * evaluarse: DevicePushTokenAutoRegistration.fx llama addPushTokenListener
 * → warnOfExpoGoPushUsage(). Este archivo NO mockea expo-notifications a
 * propósito: si registrarPush lo importa en estático, el suite ni carga.
 */
import { registrarDispositivoPush, darDeBajaDispositivoPush } from '../registrarPush';
import { registrarPushDevice, darDeBajaPushDevice } from '../pushApi';
import { leerPushToken } from '../pushTokenStore';

jest.mock('expo', () => ({
  isRunningInExpoGo: () => true,
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-123' } } } },
}));
jest.mock('../pushApi', () => ({
  registrarPushDevice: jest.fn(),
  darDeBajaPushDevice: jest.fn(),
}));
jest.mock('../pushTokenStore', () => ({
  guardarPushToken: jest.fn(),
  leerPushToken: jest.fn(),
  borrarPushToken: jest.fn(),
}));

describe('push en Expo Go Android', () => {
  it('registrarDispositivoPush no carga expo-notifications ni llama al backend', async () => {
    await expect(registrarDispositivoPush()).resolves.toBeUndefined();
    expect(registrarPushDevice).not.toHaveBeenCalled();
  });

  it('darDeBajaDispositivoPush sigue siendo best-effort sin el módulo nativo', async () => {
    (leerPushToken as jest.Mock).mockResolvedValue('ExponentPushToken[abc]');
    await expect(darDeBajaDispositivoPush()).resolves.toBeUndefined();
    expect(darDeBajaPushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]');
  });
});
