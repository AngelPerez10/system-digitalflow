import { describe, expect, it } from "vitest";
import { parseMarcaPayload } from "./marcaApi";

describe("parseMarcaPayload", () => {
  it("acepta un logo https", () => {
    expect(
      parseMarcaPayload({
        nombre: "Acme GPS",
        logo_url: "https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png",
      }),
    ).toEqual({
      nombre: "Acme GPS",
      logo_url: "https://res.cloudinary.com/demo/image/upload/v1/marca/logo/x.png",
    });
  });

  it("no expone logos data:", () => {
    expect(
      parseMarcaPayload({
        nombre: "Acme GPS",
        logo_url: "data:image/png;base64,AAAA",
      }),
    ).toEqual({ nombre: "Acme GPS", logo_url: "" });
  });
});
