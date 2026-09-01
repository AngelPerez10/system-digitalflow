import * as SecureStore from 'expo-secure-store';
import { tokenStore } from '../tokenStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mocked = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mocked.getItemAsync.mockResolvedValue(null);
    mocked.setItemAsync.mockResolvedValue(undefined);
    mocked.deleteItemAsync.mockResolvedValue(undefined);
    await tokenStore.clear();
    jest.clearAllMocks();
  });

  it('guarda ambos tokens en el almacén seguro', async () => {
    await tokenStore.save({ access: 'a1', refresh: 'r1' });
    expect(mocked.setItemAsync).toHaveBeenCalledWith('digitalflow.access', 'a1');
    expect(mocked.setItemAsync).toHaveBeenCalledWith('digitalflow.refresh', 'r1');
    expect(tokenStore.getAccess()).toBe('a1');
  });

  it('mantiene el refresh anterior si la rotación no devolvió uno nuevo', async () => {
    await tokenStore.updateAccess('a2');
    expect(mocked.setItemAsync).toHaveBeenCalledTimes(1);
    expect(mocked.setItemAsync).toHaveBeenCalledWith('digitalflow.access', 'a2');
    expect(tokenStore.getAccess()).toBe('a2');
  });

  it('persiste el par rotado cuando el backend lo entrega', async () => {
    await tokenStore.updateAccess('a3', 'r3');
    expect(mocked.setItemAsync).toHaveBeenCalledWith('digitalflow.refresh', 'r3');
  });

  it('rehidrata la sesión al abrir la app', async () => {
    mocked.getItemAsync.mockImplementation(async (key: string) =>
      key === 'digitalflow.access' ? 'a4' : 'r4',
    );
    await expect(tokenStore.restore()).resolves.toEqual({ access: 'a4', refresh: 'r4' });
    expect(tokenStore.getAccess()).toBe('a4');
  });

  it('sin refresh guardado no hay sesión que restaurar', async () => {
    mocked.getItemAsync.mockResolvedValue(null);
    await expect(tokenStore.restore()).resolves.toBeNull();
    expect(tokenStore.getAccess()).toBeNull();
  });

  it('trata un almacén ilegible como sesión ausente', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocked.getItemAsync.mockRejectedValue(new Error('Keystore corrupto'));
    await expect(tokenStore.restore()).resolves.toBeNull();
  });

  it('borra todo al cerrar sesión', async () => {
    await tokenStore.save({ access: 'a5', refresh: 'r5' });
    await tokenStore.clear();
    expect(mocked.deleteItemAsync).toHaveBeenCalledWith('digitalflow.access');
    expect(mocked.deleteItemAsync).toHaveBeenCalledWith('digitalflow.refresh');
    expect(tokenStore.getAccess()).toBeNull();
  });
});
