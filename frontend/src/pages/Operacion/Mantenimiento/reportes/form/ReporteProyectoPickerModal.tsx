import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronRight, FolderKanban, Lock, Search } from "lucide-react";
import { displayProyectoFolio } from "../../../Proyectos/shared/proyectoFormUtils";
import { formatFechaCorta } from "../../../Proyectos/shared/proyectoListUtils";
import { PickerTabs, ProyectoPickerShell } from "../../../Proyectos/form/fields/ProyectoPickerShell";
import { AvatarStack, EstadoPill } from "../../../Proyectos/shared/ProyectoUi";
import { btn, focusRing, input } from "../../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../../Proyectos/shared/proyectoTypes";

export type ProyectoOcupadoInfo = { id: number; folio: string };

type Props = {
  open: boolean;
  onClose: () => void;
  proyectos: ProyectoRow[];
  loading: boolean;
  /** Proyectos que ya tienen reporte, por id de proyecto. */
  ocupados: Record<string, ProyectoOcupadoInfo>;
  /** Aviso si no se pudo consultar qué proyectos están en uso. */
  ocupadosError: string;
  /** Proyecto ya vinculado a este reporte (se resalta). */
  selectedId: string;
  onSelect: (row: ProyectoRow) => void;
};

type Vista = "disponibles" | "ocupados" | "todos";

function haystack(p: ProyectoRow): string {
  return `${displayProyectoFolio(p.folio)} ${p.folio} ${p.cliente}`.toLowerCase();
}

/**
 * Selector de proyecto del reporte — mismo patrón que «Vincular cotización» de Proyectos:
 * hoja inferior en móvil, búsqueda fija y los proyectos que ya tienen reporte bloqueados
 * con el folio donde están en uso.
 */
export function ReporteProyectoPickerModal({ open, onClose, proyectos, loading, ocupados, ocupadosError, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  // Por defecto solo los que se pueden usar; los que ya tienen reporte quedan a un clic.
  const [vista, setVista] = useState<Vista>("disponibles");

  useEffect(() => {
    if (!open) {
      setSearch("");
      setVista("disponibles");
    }
  }, [open]);

  const esLibre = (p: ProyectoRow) => !ocupados[String(p.id)] || String(p.id) === selectedId;
  const libres = useMemo(() => proyectos.filter(esLibre).length, [proyectos, ocupados, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const conReporte = proyectos.length - libres;

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    const porVista = vista === "todos" ? proyectos : proyectos.filter((p) => (vista === "disponibles" ? esLibre(p) : !esLibre(p)));
    const lista = q ? porVista.filter((p) => haystack(p).includes(q)) : porVista;
    // El proyecto ya vinculado a este reporte va primero.
    return [...lista].sort((a, b) => Number(String(b.id) === selectedId) - Number(String(a.id) === selectedId));
  }, [proyectos, search, vista, ocupados, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProyectoPickerShell
      open={open}
      onClose={onClose}
      icon={<FolderKanban />}
      eyebrow="Reporte · Proyectos"
      title="Vincular proyecto"
      description={
        <>
          Cada proyecto tiene un solo reporte. Los que ya tienen uno aparecen bloqueados.
          {!loading && proyectos.length > 0 ? (
            <span className="ml-1 font-semibold text-[#1244D1] dark:text-[#9BB6FF]">
              {libres} {libres === 1 ? "disponible" : "disponibles"}
            </span>
          ) : null}
        </>
      }
      toolbar={
        <>
        <PickerTabs<Vista>
          label="Mostrar proyectos"
          value={vista}
          options={[
            { id: "disponibles", label: `Disponibles · ${libres}` },
            { id: "ocupados", label: `Con reporte · ${conReporte}` },
            { id: "todos", label: "Todos" },
          ]}
          onChange={setVista}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
          <label htmlFor="reporte-proyecto-buscar" className="sr-only">
            Buscar proyecto
          </label>
          <input
            id="reporte-proyecto-buscar"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Folio o cliente…"
            className={`${input} pl-10`}
            autoComplete="off"
            autoFocus
          />
        </div>
        </>
      }
      footer={
        <button type="button" className={btn.secondary} onClick={onClose}>
          Cancelar
        </button>
      }
    >
      <ul className="space-y-1" role="listbox" aria-label="Proyectos" aria-busy={loading || undefined}>
        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-3" aria-hidden style={{ opacity: 1 - i * 0.18 }}>
              <span className="block h-4 w-24 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
              <span className="block h-4 flex-1 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
            </li>
          ))
        ) : filtrados.length === 0 ? (
          <li className="px-3 py-10 text-center text-[14px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
            {search.trim()
              ? "Sin resultados para la búsqueda."
              : vista === "disponibles"
                ? "Todos los proyectos ya tienen su reporte. Revisa la pestaña «Con reporte»."
                : vista === "ocupados"
                  ? "Ningún proyecto tiene reporte todavía."
                  : "No hay proyectos."}
          </li>
        ) : (
          <>
            {ocupadosError ? (
              <li className="mb-1 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#9F1F1F] dark:bg-[#3F1518] dark:text-[#FCA5A5]" role="alert">
                {ocupadosError}
              </li>
            ) : null}
            {filtrados.map((p, i) => {
              const folio = displayProyectoFolio(p.folio);
              const uso = ocupados[String(p.id)];
              const actual = String(p.id) === selectedId;
              const bloqueado = Boolean(uso) && !actual;
              const tecnicos = (p.draft?.tecnicos ?? []).map((t) => ({ id: t.id, nombre: t.nombre, avatar_url: t.avatar_url }));
              const fecha = p.draft?.fechasInicio?.[0] || p.fecha;
              return (
                <li key={p.id} className="cot-rise" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={actual}
                    disabled={bloqueado}
                    aria-disabled={bloqueado || undefined}
                    aria-label={bloqueado ? `Proyecto ${folio} no disponible: en uso en ${uso.folio}` : `Seleccionar proyecto ${folio}`}
                    onClick={() => {
                      if (!bloqueado) onSelect(p);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left transition-colors duration-150 ${focusRing} ${
                      bloqueado ? "cursor-not-allowed opacity-60" : actual ? "bg-[#F5F8FF] dark:bg-[#1B2A63]/40" : "hover:bg-[#F5F8FF] dark:hover:bg-[#1B2A63]/30"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio}</span>
                        <span className="truncate text-[14px] text-[#3F3F46] dark:text-[#D6DEEA]">{p.cliente || "Sin cliente"}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                        <EstadoPill estado={p.estado} size="sm" />
                        {fecha ? <span>{formatFechaCorta(fecha)}</span> : null}
                        {tecnicos.length > 0 ? <AvatarStack people={tecnicos} max={3} /> : null}
                      </span>
                      {bloqueado ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                          <Lock className="size-3" aria-hidden />
                          En uso en {uso.folio}
                        </span>
                      ) : actual ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">Vinculado a este reporte</span>
                      ) : null}
                    </span>
                    {!bloqueado ? (
                      <ChevronRight
                        className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </ProyectoPickerShell>
  );
}
