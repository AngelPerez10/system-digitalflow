import { fetchApi } from "@/config/api";
import {
  getCatalogsCache,
  setCatalogsCache,
  CATALOGS_TTL_MS,
  type WialonCatalogsCache,
} from "./wialonCache";

export async function fetchWialonCatalogs(): Promise<WialonCatalogsCache> {
  const current = getCatalogsCache();
  if (current && Date.now() - current.loadedAt < CATALOGS_TTL_MS) {
    return current;
  }
  const [catRes, usersRes] = await Promise.all([
    fetchApi("/api/wialon/catalogos/unidades/", { method: "GET", cache: "no-store" as RequestCache }),
    fetchApi("/api/wialon/usuarios-acceso/", { method: "GET", cache: "no-store" as RequestCache }),
  ]);
  const catData = await catRes.json().catch(() => null);
  const usersData = await usersRes.json().catch(() => null);
  const hwTypes =
    catRes.ok && Array.isArray(catData?.hw_types)
      ? (catData.hw_types as WialonCatalogsCache["hwTypes"])
      : (current?.hwTypes ?? []);
  const accessUsers =
    usersRes.ok && Array.isArray(usersData?.users)
      ? (usersData.users as WialonCatalogsCache["accessUsers"])
      : (current?.accessUsers ?? []);
  // No cachear un catálogo vacío por fallo temporal: reintentar en el próximo open.
  const loadedOk = (catRes.ok || hwTypes.length > 0) && (usersRes.ok || accessUsers.length > 0);
  const next: WialonCatalogsCache = {
    hwTypes,
    accessUsers,
    loadedAt: loadedOk ? Date.now() : 0,
  };
  setCatalogsCache(next);
  return next;
}
