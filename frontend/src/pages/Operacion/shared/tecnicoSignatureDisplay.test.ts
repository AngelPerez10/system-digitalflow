import { describe, expect, it } from "vitest";
import {
  pickTecnicoSignatureDisplayUrl,
  shouldClearFetchedSignature,
  toHttpsImageUrl,
} from "./tecnicoSignatureDisplay";

describe("pickTecnicoSignatureDisplayUrl", () => {
  it("queda vacío sin técnico asignado aunque haya URLs", () => {
    expect(
      pickTecnicoSignatureDisplayUrl({
        tecnicoAsignadoId: null,
        fetchedProfileUrl: "https://res.cloudinary.com/demo/s.png",
        storedOrdenUrl: "https://res.cloudinary.com/demo/orden.png",
      }),
    ).toBe("");
  });

  it("prefiere la URL del perfil y cae a la de la orden si el fetch se vació", () => {
    expect(
      pickTecnicoSignatureDisplayUrl({
        tecnicoAsignadoId: 7,
        fetchedProfileUrl: "",
        storedOrdenUrl: "http://res.cloudinary.com/demo/ordenes/firmas/x.png",
      }),
    ).toBe("https://res.cloudinary.com/demo/ordenes/firmas/x.png");
  });

  it("usa el perfil cuando ya llegó (más fresco que el stamp de la orden)", () => {
    expect(
      pickTecnicoSignatureDisplayUrl({
        tecnicoAsignadoId: 7,
        fetchedProfileUrl: "https://res.cloudinary.com/demo/perfil.png",
        storedOrdenUrl: "https://res.cloudinary.com/demo/vieja.png",
      }),
    ).toBe("https://res.cloudinary.com/demo/perfil.png");
  });
});

describe("shouldClearFetchedSignature", () => {
  it("no limpia al rehidratar la misma orden (listado → detalle, mismo técnico)", () => {
    expect(shouldClearFetchedSignature(12, 12)).toBe(false);
  });

  it("limpia al cambiar de técnico o al desasignar", () => {
    expect(shouldClearFetchedSignature(12, 99)).toBe(true);
    expect(shouldClearFetchedSignature(12, null)).toBe(true);
  });
});

describe("toHttpsImageUrl", () => {
  it("sube http a https para no mezclar contenido en el canvas", () => {
    expect(toHttpsImageUrl("http://res.cloudinary.com/x.png")).toBe(
      "https://res.cloudinary.com/x.png",
    );
  });
});
