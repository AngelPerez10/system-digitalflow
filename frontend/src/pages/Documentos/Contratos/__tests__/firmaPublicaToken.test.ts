import { beforeEach, describe, expect, it, vi } from "vitest";
import { olvidarToken, tomarTokenDeUrl } from "../publico/firmaPublicaApi";

const TOKEN = "a".repeat(43);

describe("tomarTokenDeUrl", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/firmar/contrato");
  });

  it("lee el token del fragmento y lo borra de la barra de direcciones", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    const token = tomarTokenDeUrl({ hash: `#t=${TOKEN}`, pathname: "/firmar/contrato", search: "" });
    expect(token).toBe(TOKEN);
    expect(spy).toHaveBeenCalledWith(null, "", "/firmar/contrato");
    expect(sessionStorage.getItem("contrato-firma-token")).toBe(TOKEN);
  });

  it("recupera el token de la pestaña tras recargar", () => {
    tomarTokenDeUrl({ hash: `#t=${TOKEN}`, pathname: "/firmar/contrato", search: "" });
    expect(tomarTokenDeUrl({ hash: "", pathname: "/firmar/contrato", search: "" })).toBe(TOKEN);
    olvidarToken();
    expect(tomarTokenDeUrl({ hash: "", pathname: "/firmar/contrato", search: "" })).toBe("");
  });

  it("descarta tokens con formato inválido", () => {
    expect(tomarTokenDeUrl({ hash: "#t=<script>", pathname: "/firmar/contrato", search: "" })).toBe("");
    expect(sessionStorage.getItem("contrato-firma-token")).toBeNull();
  });
});
