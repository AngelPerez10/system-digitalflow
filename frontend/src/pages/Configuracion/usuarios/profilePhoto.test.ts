import { describe, expect, it } from 'vitest';
import { centerSquareCrop, validateProfilePhotoFile } from './profilePhoto';

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('validateProfilePhotoFile', () => {
  it('acepta JPG, PNG y WebP', () => {
    expect(validateProfilePhotoFile(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validateProfilePhotoFile(file('a.png', 'image/png'))).toBeNull();
    expect(validateProfilePhotoFile(file('a.webp', 'image/webp'))).toBeNull();
  });

  it('rechaza HEIC con un mensaje específico', () => {
    expect(validateProfilePhotoFile(file('IMG_1.HEIC', ''))).toMatch(/HEIC/);
    expect(validateProfilePhotoFile(file('x', 'image/heic'))).toMatch(/HEIC/);
  });

  it('rechaza otros formatos y archivos de más de 10 MB', () => {
    expect(validateProfilePhotoFile(file('a.gif', 'image/gif'))).toMatch(/JPG, PNG o WebP/);
    expect(validateProfilePhotoFile(file('a.pdf', 'application/pdf'))).toMatch(/JPG, PNG o WebP/);
    expect(validateProfilePhotoFile(file('a.jpg', 'image/jpeg', 11 * 1024 * 1024))).toMatch(/10 MB/);
  });
});

describe('centerSquareCrop', () => {
  it('recorta al centro el lado sobrante', () => {
    expect(centerSquareCrop(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
    expect(centerSquareCrop(600, 1000)).toEqual({ sx: 0, sy: 200, side: 600 });
    expect(centerSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });
});
