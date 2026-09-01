import { Platform } from 'react-native';
import {
  animationDurationMs,
  fadeAnimation,
  pushAnimation,
  sheetAnimation,
} from '../navMotion';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

describe('navMotion', () => {
  it('con reducir movimiento solo usa fade corto', () => {
    expect(pushAnimation(true)).toBe('fade');
    expect(sheetAnimation(true)).toBe('fade');
    expect(fadeAnimation(true)).toBe('fade');
    expect(animationDurationMs('push', true)).toBe(180);
  });

  it('en Android el push es ios_from_right (suave, familiar)', () => {
    expect(Platform.OS).toBe('android');
    expect(pushAnimation(false)).toBe('ios_from_right');
    expect(sheetAnimation(false)).toBe('fade_from_bottom');
    expect(animationDurationMs('sheet', false)).toBe(240);
  });
});
