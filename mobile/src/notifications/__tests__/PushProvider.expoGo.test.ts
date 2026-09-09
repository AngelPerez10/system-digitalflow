/**
 * PushProvider no debe importar expo-notifications en estático: en Expo Go
 * Android eso tira al evaluar el módulo y Expo Router pierde todas las rutas.
 */
import { PushProvider, usePush } from '../PushProvider';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('PushProvider en Expo Go Android', () => {
  it('se puede importar sin tirar', () => {
    expect(typeof PushProvider).toBe('function');
    expect(typeof usePush).toBe('function');
  });
});
