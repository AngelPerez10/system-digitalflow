import * as Notifications from 'expo-notifications';
import { registrarDispositivoPush, darDeBajaDispositivoPush } from '../registrarPush';
import { registrarPushDevice, darDeBajaPushDevice } from '../pushApi';
import { guardarPushToken, leerPushToken, borrarPushToken } from '../pushTokenStore';

jest.mock('../pushDisponible', () => ({
  pushRemotoDisponible: () => true,
}));

let mockEsDispositivo = true;
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockEsDispositivo;
  },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-123' } } } },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('../pushApi', () => ({
  registrarPushDevice: jest.fn().mockResolvedValue(undefined),
  darDeBajaPushDevice: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../pushTokenStore', () => ({
  guardarPushToken: jest.fn().mockResolvedValue(undefined),
  leerPushToken: jest.fn(),
  borrarPushToken: jest.fn().mockResolvedValue(undefined),
}));

const mockNotif = Notifications as jest.Mocked<typeof Notifications>;

beforeEach(() => {
  jest.clearAllMocks();
  mockEsDispositivo = true;
  mockNotif.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' } as never);
});

describe('registrarDispositivoPush', () => {
  it('registra el token cuando el permiso ya está concedido', async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await registrarDispositivoPush();

    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(registrarPushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]', 'android');
    expect(guardarPushToken).toHaveBeenCalledWith('ExponentPushToken[abc]');
  });

  it('pide permiso si aún no se ha decidido y luego registra', async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    await registrarDispositivoPush();

    expect(mockNotif.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(registrarPushDevice).toHaveBeenCalled();
  });

  it('no hace nada si el usuario negó el permiso', async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mockNotif.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);

    await registrarDispositivoPush();

    expect(mockNotif.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registrarPushDevice).not.toHaveBeenCalled();
  });

  it('no vuelve a pedir permiso si ya fue denegado (canAskAgain false)', async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await registrarDispositivoPush();

    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(registrarPushDevice).not.toHaveBeenCalled();
  });

  it('no registra en un emulador (!Device.isDevice)', async () => {
    mockEsDispositivo = false;

    await registrarDispositivoPush();

    expect(mockNotif.getPermissionsAsync).not.toHaveBeenCalled();
    expect(registrarPushDevice).not.toHaveBeenCalled();
  });

  it('un fallo del backend no propaga la excepción', async () => {
    mockNotif.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    (registrarPushDevice as jest.Mock).mockRejectedValueOnce(new Error('500'));

    await expect(registrarDispositivoPush()).resolves.toBeUndefined();
  });
});

describe('darDeBajaDispositivoPush', () => {
  it('da de baja el token guardado y lo borra', async () => {
    (leerPushToken as jest.Mock).mockResolvedValue('ExponentPushToken[abc]');

    await darDeBajaDispositivoPush();

    expect(darDeBajaPushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(borrarPushToken).toHaveBeenCalled();
  });

  it('no llama al backend si no hay token guardado', async () => {
    (leerPushToken as jest.Mock).mockResolvedValue(null);

    await darDeBajaDispositivoPush();

    expect(darDeBajaPushDevice).not.toHaveBeenCalled();
  });

  it('un fallo de red no propaga', async () => {
    (leerPushToken as jest.Mock).mockResolvedValue('ExponentPushToken[abc]');
    (darDeBajaPushDevice as jest.Mock).mockRejectedValueOnce(new Error('sin red'));

    await expect(darDeBajaDispositivoPush()).resolves.toBeUndefined();
  });
});
