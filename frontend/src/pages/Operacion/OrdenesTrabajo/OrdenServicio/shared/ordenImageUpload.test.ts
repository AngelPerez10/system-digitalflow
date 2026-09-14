import { describe, expect, it } from "vitest";
import {
  collectOrdenImageFiles,
  formatOrdenPhotoProgress,
  isHeicLikeFile,
  isLikelyImageFile,
  isLowVarianceRgba,
  looksLikeHeicBuffer,
  ordenImageProcessErrorMessage,
  ordenImageRejectMessage,
  scaledImageSize,
} from "./ordenImageUpload";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

function rgbaFill(pixels: number, r: number, g: number, b: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return data;
}

describe("ordenImageUpload", () => {
  it("acepta JPG aunque el MIME venga vacío (cámara Android)", () => {
    expect(isLikelyImageFile(file("foto.JPG", ""))).toBe(true);
    expect(isLikelyImageFile(file("nota.txt", ""))).toBe(false);
  });

  it("detecta HEIC por extensión y por MIME", () => {
    expect(isHeicLikeFile(file("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicLikeFile(file("foto.jpg", "image/heic"))).toBe(true);
    expect(isHeicLikeFile(file("foto.jpg", "image/jpeg"))).toBe(false);
  });

  it("detecta HEIC por cabecera aunque el MIME diga jpeg", () => {
    const heicHeader = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(looksLikeHeicBuffer(heicHeader.buffer)).toBe(true);
    expect(looksLikeHeicBuffer(jpegHeader.buffer)).toBe(false);
  });

  it("marca como plano un canvas blanco (drawImage fallido en Android)", () => {
    expect(isLowVarianceRgba(rgbaFill(400, 255, 255, 255))).toBe(true);
    const noisy = new Uint8ClampedArray(400 * 4);
    for (let i = 0; i < 400; i++) {
      const o = i * 4;
      noisy[o] = (i * 17) % 256;
      noisy[o + 1] = (i * 41) % 256;
      noisy[o + 2] = (i * 73) % 256;
      noisy[o + 3] = 255;
    }
    expect(isLowVarianceRgba(noisy)).toBe(false);
  });

  it("escala el borde largo a 1280 sin deformar", () => {
    expect(scaledImageSize(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(scaledImageSize(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it("separa HEIC y deja JPG para el lote", () => {
    const jpg = file("a.jpg", "image/jpeg");
    const heic = file("b.heic", "");
    const { files, heicFiles } = collectOrdenImageFiles([jpg], [heic], 5);
    expect(files).toEqual([jpg]);
    expect(heicFiles).toEqual([heic]);
  });

  it("explica HEIC en español de México", () => {
    expect(ordenImageRejectMessage("IMG.heic")).toMatch(/HEIC/);
  });

  it("el error genérico no asume iPhone (los técnicos usan Android)", () => {
    expect(ordenImageRejectMessage("foto.bmp")).not.toMatch(/iPhone/);
    expect(ordenImageProcessErrorMessage(file("IMG_1234.jpg", "image/jpeg"))).toMatch(/cámara/);
  });

  it("respeta el cupo al armar el lote", () => {
    const a = file("a.jpg", "image/jpeg");
    const b = file("b.jpg", "image/jpeg");
    const c = file("c.jpg", "image/jpeg");
    const { files } = collectOrdenImageFiles([a, b, c], [], 2);
    expect(files).toEqual([a, b]);
  });

  it("anuncia el progreso de subida", () => {
    expect(formatOrdenPhotoProgress({ done: 0, total: 5 })).toBe("Procesando foto 1 de 5");
    expect(formatOrdenPhotoProgress({ done: 4, total: 5 })).toBe("Procesando foto 5 de 5");
  });
});
