import * as SecureStore from 'expo-secure-store';
import { portalAcceso } from '../portalAcceso';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mocked = SecureStore as jest.Mocked<typeof SecureStore>;
const KEY = 'digitalflow.portal';

describe('portalAcceso', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mocked.getItemAsync.mockResolvedValue(null);
    mocked.setItemAsync.mockResolvedValue(undefined);
    mocked.deleteItemAsync.mockResolvedValue(undefined);
    await portalAcceso.clear();
    jest.clearAllMocks();
  });

  it('sin elección previa devuelve null (no "tecnico")', async () => {
    await expect(portalAcceso.restore()).resolves.toBeNull();
    expect(portalAcceso.get()).toBeNull();
  });

  it('guarda la elección y la deja disponible en memoria al instante', async () => {
    await portalAcceso.set('cliente');
    expect(mocked.setItemAsync).toHaveBeenCalledWith(KEY, 'cliente');
    expect(portalAcceso.get()).toBe('cliente');
  });

  it('rehidrata la elección guardada al abrir la app', async () => {
    mocked.getItemAsync.mockResolvedValue('tecnico');
    await expect(portalAcceso.restore()).resolves.toBe('tecnico');
    expect(portalAcceso.get()).toBe('tecnico');
  });

  it('un valor almacenado inválido se trata como sin elección', async () => {
    mocked.getItemAsync.mockResolvedValue('supervisor');
    await expect(portalAcceso.restore()).resolves.toBeNull();
    expect(portalAcceso.get()).toBeNull();
  });

  it('un almacén ilegible no rompe el arranque', async () => {
    mocked.getItemAsync.mockRejectedValue(new Error('Keystore corrupto'));
    await expect(portalAcceso.restore()).resolves.toBeNull();
  });

  it('clear() olvida la elección y borra la clave', async () => {
    await portalAcceso.set('tecnico');
    await portalAcceso.clear();
    expect(mocked.deleteItemAsync).toHaveBeenCalledWith(KEY);
    expect(portalAcceso.get()).toBeNull();
  });

  it('clear() no propaga un fallo del almacén', async () => {
    mocked.deleteItemAsync.mockRejectedValue(new Error('sin permiso'));
    await portalAcceso.set('cliente');
    await expect(portalAcceso.clear()).resolves.toBeUndefined();
    expect(portalAcceso.get()).toBeNull();
  });
});
