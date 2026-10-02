import { describe, expect, it } from "vitest";
import { isGoogleMapsLink } from "./clienteLinks";

describe("isGoogleMapsLink", () => {
  it("acepta enlaces reales de Google Maps", () => {
    expect(isGoogleMapsLink("https://www.google.com/maps?q=29.07,-110.95")).toBe(true);
    expect(isGoogleMapsLink("https://google.com/maps/place/x")).toBe(true);
    expect(isGoogleMapsLink("https://maps.app.goo.gl/abc123")).toBe(true);
  });

  it("rechaza dominios que solo terminan en google.com", () => {
    expect(isGoogleMapsLink("https://evilgoogle.com/maps")).toBe(false);
    expect(isGoogleMapsLink("https://google.com.evil.io/maps")).toBe(false);
  });

  it("rechaza esquemas no http(s) y rutas que no son de mapas", () => {
    expect(isGoogleMapsLink("javascript:alert(1)")).toBe(false);
    expect(isGoogleMapsLink("https://www.google.com/search?q=/maps")).toBe(false);
    expect(isGoogleMapsLink("")).toBe(false);
    expect(isGoogleMapsLink(null)).toBe(false);
  });
});
