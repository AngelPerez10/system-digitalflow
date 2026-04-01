import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "@/config/api";
import {
  ArrowRightIcon,
  BoxCubeIcon,
  CheckLineIcon,
  GridIcon,
  PencilIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  TrashBinIcon,
  UserCircleIcon,
} from "@/icons";

type ModuleKey =
  | "contactos"
  | "cotizacion"
  | "escritorio"
  | "operacion"
  | "productos_servicios"
  | "usuarios";

type ActivityItem = {
  id: string;
  when: string;
  actor: string;
  text: string;
  detail?: string;
  module: ModuleKey;
  viewName: string;
  viewPath: string;
};

const MAX_ITEMS = 40;
const LOCAL_HISTORY_KEY = "system_activity_log";

const toIso = (v: unknown): string => {
  if (!v) return "";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const timeAgo = (iso: string) => {
  if (!iso) return "sin fecha";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "sin fecha";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace segundos";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
};

const formatDateTime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumberWithCommas = (value: unknown) => {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("en-US");
};

const normalizeRows = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const firstNonEmpty = (...values: unknown[]) => {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
};

const displayName = (
  firstName: unknown,
  lastName: unknown,
  fallbackA?: unknown,
  fallbackB?: unknown,
  fallbackC?: unknown
) => {
  const full = `${String(firstName ?? "").trim()} ${String(lastName ?? "").trim()}`.trim();
  if (full) return full;
  return firstNonEmpty(fallbackA, fallbackB, fallbackC) || "sistema";
};

const normalizeOrderStatus = (raw: unknown) => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "Pendiente";
  if (v.includes("resuel") || v.includes("complet") || v.includes("cerrad") || v.includes("finaliz")) return "Resuelto";
  if (v.includes("proceso") || v.includes("curso") || v.includes("asign")) return "En proceso";
  if (v.includes("cancel")) return "Cancelado";
  if (v.includes("pend")) return "Pendiente";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const moduleMeta = (module: ModuleKey) => {
  if (module === "contactos") {
    return {
      Icon: UserCircleIcon,
      tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    };
  }
  if (module === "cotizacion") {
    return {
      Icon: PieChartIcon,
      tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    };
  }
  if (module === "escritorio") {
    return {
      Icon: GridIcon,
      tone: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
    };
  }
  if (module === "operacion") {
    return {
      Icon: PlugInIcon,
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }
  if (module === "productos_servicios") {
    return {
      Icon: BoxCubeIcon,
      tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    };
  }
  return {
    Icon: TableIcon,
    tone: "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
  };
};

const actionMeta = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes("elimino")) {
    return {
      Icon: TrashBinIcon,
      tone: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
    };
  }
  if (t.includes("actualizo")) {
    return {
      Icon: PencilIcon,
      tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }
  return {
    Icon: CheckLineIcon,
    tone: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300",
  };
};

export default function MonthlyTarget() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      "";

    if (!token) {
      setLoading(false);
      setError("No hay sesion activa.");
      return;
    }

    const role = (localStorage.getItem("role") || sessionStorage.getItem("role") || "").toLowerCase();
    const isSuperuser =
      (localStorage.getItem("is_superuser") || sessionStorage.getItem("is_superuser") || "").toLowerCase() === "true";
    const isAdmin = role === "admin" || isSuperuser;
    const headers = { Authorization: `Bearer ${token}` };

    const getJson = async (path: string) => {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" as RequestCache });
      if (!res.ok) return null;
      return res.json().catch(() => null);
    };

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [ordenesData, cotizacionesData, clientesData, tareasData, serviciosData, reportesData, usersData] =
          await Promise.all([
            getJson("/api/ordenes/"),
            getJson("/api/cotizaciones/"),
            getJson("/api/clientes/"),
            getJson("/api/tareas/"),
            getJson("/api/servicios/"),
            getJson("/api/ordenes/reportes-semanales/"),
            isAdmin ? getJson("/api/users/accounts/") : Promise.resolve(null),
          ]);

        const items: ActivityItem[] = [];

        for (const o of normalizeRows(ordenesData)) {
          const created = toIso(o?.fecha_creacion);
          const updated = toIso(o?.fecha_actualizacion);
          const actor = displayName(
            o?.actualizado_por_first_name || o?.creado_por_first_name || o?.tecnico_asignado_first_name,
            o?.actualizado_por_last_name || o?.creado_por_last_name || o?.tecnico_asignado_last_name,
            o?.actualizado_por_full_name,
            o?.creado_por_full_name,
            o?.tecnico_asignado_full_name
          ) || firstNonEmpty(o?.actualizado_por_username, o?.creado_por_username, o?.tecnico_asignado_username);
          const folio = String(o?.folio || o?.idx || o?.id || "-");
          const cliente = String(o?.cliente_nombre || o?.cliente?.nombre || "sin cliente");
          const tecnico = String(o?.tecnico_asignado_username || o?.tecnico_nombre || "sin técnico");
          const estado = normalizeOrderStatus(
            o?.estado ?? o?.status ?? o?.estatus ?? o?.estado_orden ?? o?.situacion
          );
          if (created) {
            items.push({
              id: `orden-create-${o?.id || folio}`,
              when: created,
              actor,
              text: `creó la orden #${folio}`,
              detail: `Cliente: ${cliente} · Técnico: ${tecnico} · Estado: ${estado}`,
              module: "operacion",
              viewName: "Ordenes de trabajo",
              viewPath: "/ordenes",
            });
          }
          if (updated && updated !== created) {
            items.push({
              id: `orden-update-${o?.id || folio}`,
              when: updated,
              actor,
              text: `actualizó la orden #${folio}`,
              detail: `Cliente: ${cliente} · Técnico: ${tecnico} · Estado: ${estado}`,
              module: "operacion",
              viewName: "Ordenes de trabajo",
              viewPath: "/ordenes",
            });
          }
        }

        for (const c of normalizeRows(cotizacionesData)) {
          const created = toIso(c?.fecha_creacion);
          const updated = toIso(c?.fecha_actualizacion);
          const creatorName = displayName(
            c?.creado_por_first_name,
            c?.creado_por_last_name,
            c?.creado_por_full_name,
            c?.creado_por_username
          );
          const updaterName = displayName(
            c?.actualizado_por_first_name,
            c?.actualizado_por_last_name,
            c?.actualizado_por_full_name,
            c?.actualizado_por_username,
            creatorName
          );
          const folio = String(c?.idx || c?.id || "-");
          const cliente = String(c?.cliente_nombre || c?.cliente?.nombre || "sin cliente");
          const total = c?.monto_total ?? c?.total ?? c?.subtotal;
          if (created) {
            items.push({
              id: `cot-create-${c?.id || folio}`,
              when: created,
              actor: creatorName,
              text: `creó la cotización #${folio}`,
              detail: `Cliente: ${cliente}${total != null ? ` · Total: $${formatNumberWithCommas(total)}` : ""}`,
              module: "cotizacion",
              viewName: "Cotizaciones",
              viewPath: "/cotizacion",
            });
          }
          if (updated && updated !== created) {
            items.push({
              id: `cot-update-${c?.id || folio}`,
              when: updated,
              actor: updaterName,
              text: `actualizó la cotización #${folio}`,
              detail: `Cliente: ${cliente}${total != null ? ` · Total: $${formatNumberWithCommas(total)}` : ""}`,
              module: "cotizacion",
              viewName: "Cotizaciones",
              viewPath: "/cotizacion",
            });
          }
        }

        for (const cl of normalizeRows(clientesData)) {
          const created = toIso(cl?.fecha_creacion);
          const updated = toIso(cl?.fecha_actualizacion);
          const name = String(cl?.nombre || `cliente-${cl?.id}`);
          const creador =
            displayName(
              cl?.creado_por_first_name || cl?.asesor_first_name || cl?.vendedor_first_name,
              cl?.creado_por_last_name || cl?.asesor_last_name || cl?.vendedor_last_name,
              cl?.creado_por_full_name,
              cl?.asesor_nombre_completo,
              cl?.vendedor_nombre_completo
            ) ||
            firstNonEmpty(
              cl?.creado_por_username,
              cl?.actualizado_por_username,
              cl?.usuario_creador,
              cl?.asesor_username,
              cl?.vendedor_username,
              cl?.owner?.username
            ) ||
            "sistema";
          const actualizador =
            displayName(
              cl?.actualizado_por_first_name || cl?.asesor_first_name || cl?.vendedor_first_name,
              cl?.actualizado_por_last_name || cl?.asesor_last_name || cl?.vendedor_last_name,
              cl?.actualizado_por_full_name,
              cl?.asesor_nombre_completo,
              cl?.vendedor_nombre_completo
            ) ||
            firstNonEmpty(
              cl?.actualizado_por_username,
              cl?.creado_por_username,
              cl?.asesor_username,
              cl?.vendedor_username,
              cl?.owner?.username
            ) ||
            creador;
          const tipo = String(cl?.tipo || cl?.tipo_cliente || "general");
          if (created) {
            items.push({
              id: `cliente-create-${cl?.id || name}`,
              when: created,
              actor: creador,
              text: `agregó cliente "${name}"`,
              detail: `Tipo: ${tipo} · ID: ${cl?.id ?? "-"}`,
              module: "contactos",
              viewName: "Contactos de negocio",
              viewPath: "/clientes",
            });
          }
          if (updated && updated !== created) {
            items.push({
              id: `cliente-update-${cl?.id || name}`,
              when: updated,
              actor: actualizador,
              text: `actualizó cliente "${name}"`,
              detail: `Tipo: ${tipo} · ID: ${cl?.id ?? "-"}`,
              module: "contactos",
              viewName: "Contactos de negocio",
              viewPath: "/clientes",
            });
          }
        }

        for (const t of normalizeRows(tareasData)) {
          const created = toIso(t?.fecha_creacion);
          const updated = toIso(t?.fecha_actualizacion);
          const creator = displayName(
            t?.creado_por_first_name,
            t?.creado_por_last_name,
            t?.creado_por_full_name,
            t?.creado_por_username,
            "usuario"
          );
          const assignee = String(t?.usuario_asignado_full_name || t?.usuario_asignado_username || "usuario");
          const title = String(t?.titulo || t?.asunto || t?.nombre || `Tarea #${t?.id ?? "-"}`);
          const status = String(t?.estado || t?.status || "sin estado");
          if (created) {
            items.push({
              id: `tarea-create-${t?.id}`,
              when: created,
              actor: creator,
              text: `creó tarea "${title}" para ${assignee}`,
              detail: `Estado: ${status} · ID: ${t?.id ?? "-"}`,
              module: "escritorio",
              viewName: "Tareas",
              viewPath: "/tareas",
            });
          }
          if (updated && updated !== created) {
            items.push({
              id: `tarea-update-${t?.id}`,
              when: updated,
              actor: creator,
              text: `actualizó tarea "${title}"`,
              detail: `Asignado a: ${assignee} · Estado: ${status} · ID: ${t?.id ?? "-"}`,
              module: "escritorio",
              viewName: "Tareas",
              viewPath: "/tareas",
            });
          }
        }

        for (const s of normalizeRows(serviciosData)) {
          const created = toIso(s?.fecha_creacion);
          const updated = toIso(s?.fecha_actualizacion);
          const name = String(s?.nombre || `servicio-${s?.id}`);
          const actor = displayName(
            s?.actualizado_por_first_name || s?.creado_por_first_name,
            s?.actualizado_por_last_name || s?.creado_por_last_name,
            s?.actualizado_por_full_name,
            s?.creado_por_full_name,
            s?.actualizado_por_username || s?.creado_por_username || "usuario"
          );
          const categoria = String(s?.categoria_nombre || s?.categoria || "sin categoría");
          const precio = s?.precio ?? s?.costo;
          if (created) {
            items.push({
              id: `servicio-create-${s?.id || name}`,
              when: created,
              actor,
              text: `agregó servicio "${name}"`,
              detail: `${categoria}${precio != null ? ` · Precio: $${precio}` : ""} · ID: ${s?.id ?? "-"}`,
              module: "productos_servicios",
              viewName: "Servicios",
              viewPath: "/servicios",
            });
          }
          if (updated && updated !== created) {
            items.push({
              id: `servicio-update-${s?.id || name}`,
              when: updated,
              actor,
              text: `actualizó servicio "${name}"`,
              detail: `${categoria}${precio != null ? ` · Precio: $${precio}` : ""} · ID: ${s?.id ?? "-"}`,
              module: "productos_servicios",
              viewName: "Servicios",
              viewPath: "/servicios",
            });
          }
        }

        for (const r of normalizeRows(reportesData)) {
          const created = toIso(r?.fecha_creacion);
          const actor = displayName(
            r?.tecnico_first_name,
            r?.tecnico_last_name,
            r?.tecnico_nombre_completo,
            r?.tecnico_nombre,
            r?.tecnico_username || "usuario"
          );
          if (created) {
            items.push({
              id: `reporte-create-${r?.id}`,
              when: created,
              actor,
              text: "generó reporte semanal",
              detail: `Semana: ${r?.semana ?? "-"} · Ordenes: ${r?.total_ordenes ?? r?.ordenes ?? "-"} · ID: ${r?.id ?? "-"}`,
              module: "operacion",
              viewName: "Reportes",
              viewPath: "/reportes",
            });
          }
        }

        if (isAdmin && Array.isArray(usersData)) {
          const permsRows = await Promise.all(
            usersData.map(async (u: any) => {
              const r = await fetch(apiUrl(`/api/users/accounts/${u.id}/permissions/`), {
                headers,
                cache: "no-store" as RequestCache,
              });
              if (!r.ok) return null;
              const d = await r.json().catch(() => null);
              const updated = toIso(d?.updated_at);
              if (!updated) return null;
              const targetName = displayName(u?.first_name, u?.last_name, u?.username, u?.email, `user-${u?.id}`);
              return {
                id: `perm-${u?.id}-${updated}`,
                when: updated,
                actor: "Sistema",
                text: `actualizó permisos de ${targetName}`,
                detail: `Usuario afectado: ${targetName}`,
                module: "usuarios" as ModuleKey,
                viewName: "Gestion de usuarios",
                viewPath: "/usuarios",
              };
            })
          );
          items.push(...(permsRows.filter(Boolean) as ActivityItem[]));
        }

        try {
          const localRaw = localStorage.getItem(LOCAL_HISTORY_KEY) || "[]";
          const localRows = JSON.parse(localRaw);
          if (Array.isArray(localRows)) {
            for (const ev of localRows) {
              const when = toIso(ev?.when);
              if (!when) continue;
              items.push({
                id: String(ev?.id || `local-${when}`),
                when,
                actor: String(ev?.actor_name || ev?.actor || "usuario"),
                text: String(ev?.text || "realizo una accion"),
                detail: typeof ev?.detail === "string" ? ev.detail : "",
                module: (ev?.module as ModuleKey) || "usuarios",
                viewName: String(ev?.viewName || "Gestion de usuarios"),
                viewPath: String(ev?.viewPath || "/usuarios"),
              });
            }
          }
        } catch {
          // ignore local malformed history
        }

        const merged = items
          .filter((x) => !!x.when)
          .sort((a, b) => (a.when < b.when ? 1 : -1))
          .slice(0, MAX_ITEMS);

        setAllItems(merged);
      } catch {
        setError("No se pudo cargar el historial global.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredItems = useMemo(() => allItems, [allItems]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 border-b border-gray-100 pb-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Historial global del sistema</h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Historial global del sistema de seguimiento de actividades.
            </p>
          </div>
        </div>
      </div>

        <div>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Cargando historial...</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No hay movimientos para este filtro.</div>
        ) : (
          <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
            {filteredItems.map((i) => {
              const mod = moduleMeta(i.module);
              const action = actionMeta(i.text);
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => navigate(i.viewPath)}
                  className="group w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left shadow-theme-xs transition hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/40 dark:hover:bg-white/[0.04]"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${mod.tone}`}>
                        <mod.Icon className="h-4 w-4" />
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {i.viewName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400">{timeAgo(i.when)}</span>
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500">{formatDateTime(i.when)}</span>
                    </div>
        </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${action.tone}`}>
                      <action.Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      <span className="font-semibold">{i.actor}</span> {i.text}
                    </p>
                    <ArrowRightIcon className="ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </div>
                  {!!i.detail && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{i.detail}</p>}
                </button>
              );
            })}
        </div>
        )}
      </div>
    </div>
  );
}
