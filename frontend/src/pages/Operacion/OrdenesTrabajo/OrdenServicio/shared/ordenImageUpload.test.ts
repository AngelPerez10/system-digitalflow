import { describe, expect, it } from "vitest";
import {
  collectOrdenImageFiles,
  formatOrdenPhotoProgress,
  isHeicLikeFile,
  isLikelyImageFile,
  ordenImageRejectMessage,
} from "./ordenImageUpload";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("ordenImageUpload", () => {
  it("acepta JPG aunque el MIME venga vacío (cámara Android/iOS)", () => {
    expect(isLikelyImageFile(file("foto.JPG", ""))).toBe(true);
    expect(isLikelyImageFile(file("nota.txt", ""))).toBe(false);
  });

  it("detecta HEIC por extensión y por MIME", () => {
    expect(isHeicLikeFile(file("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicLikeFile(file("foto.jpg", "image/heic"))).toBe(true);
    expect(isHeicLikeFile(file("foto.jpg", "image/jpeg"))).toBe(false);
  });

  it("separa HEIC y deja JPG para el lote", () => {
    const jpg = file("a.jpg", "image/jpeg");
    const heic = file("b.heic", "");
    const { files, heicFiles } = collectOrdenImageFiles([jpg], [heic], 5);
    expect(files).toEqual([jpg]);
    expect(heicFiles).toEqual([heic]);
  });

  it("explica HEIC en español de México", () => {
    expect(ordenImageRejectMessage("IMG.heic")).toMatch(/Más compatible/);
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
