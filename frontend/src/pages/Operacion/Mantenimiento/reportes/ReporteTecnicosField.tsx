/**
 * Selector de técnicos del reporte (multiselección con foto de perfil).
 *
 * Mismo patrón que los técnicos asignados de Proyectos: los elegidos se listan como
 * tarjetas con foto y botón de quitar; «Agregar técnicos…» despliega en línea un
 * buscador y la lista con casillas.
 *
 * El reporte guarda los técnicos en un solo texto (`tecnico_nombre`), así que el valor
 * es la lista de nombres separada por comas («Ana Pérez, Luis Gómez»). Los nombres que
 * coinciden con un usuario muestran su foto; los que no (texto libre de reportes
 * anteriores) se muestran con iniciales y se pueden quitar. Solo lectura (`disabled`):
 * se ven los técnicos sin poder cambiarlos.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, SearchX, UserPlus, X } from "lucide-react";
import type { Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { Avatar } from "../../Proyectos/shared/ProyectoUi";
import { focusRing, input } from "../../Proyectos/shared/proyectoTokens";
import { joinTecnicos, splitTecnicos, usuarioDisplayName } from "./reporteTecnicos";

type Opcion = { id: number; nombre: string; avatarUrl: string };

type Props = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  usuarios: Usuario[];
  /** Solo lectura: muestra los técnicos sin permitir cambiarlos. */
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function ReporteTecnicosField({ id, value, onChange, usuarios, disabled = false, loading = false, invalid = false, describedBy }: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const opciones = useMemo<Opcion[]>(
    () =>
      usuarios
        .map((u) => ({ id: u.id, nombre: usuarioDisplayName(u), avatarUrl: String(u.avatar_url || "") }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [usuarios]
  );
  const porNombre = useMemo(() => new Map(opciones.map((o) => [o.nombre.toLowerCase(), o])), [opciones]);

  const seleccionados = useMemo(() => splitTecnicos(value), [value]);
  const seleccionSet = useMemo(() => new Set(seleccionados.map((n) => n.toLowerCase())), [seleccionados]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? opciones.filter((o) => o.nombre.toLowerCase().includes(q)) : opciones;
  }, [opciones, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    requestAnimationFrame(() => searchRef.current?.focus());
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // No cerrar el modal del reporte: solo la lista.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const toggle = (nombre: string) => {
    const key = nombre.toLowerCase();
    onChange(joinTecnicos(seleccionSet.has(key) ? seleccionados.filter((n) => n.toLowerCase() !== key) : [...seleccionados, nombre]));
  };

  const quitar = (nombre: string) => {
    onChange(joinTecnicos(seleccionados.filter((n) => n.toLowerCase() !== nombre.toLowerCase())));
  };

  return (
    <div ref={rootRef} className="min-w-0">
      {!disabled ? (
        <>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            className={`cot-press flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-dashed px-3.5 text-left text-[14px] font-medium ${focusRing} ${
              open
                ? "border-[#1B5CFF] bg-[#F5F8FF] text-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40 dark:text-[#C9D7FF]"
                : invalid
                  ? "border-[#C22B2B] text-[#C22B2B]"
                  : "border-[#D4D4D8] text-[#52525B] hover:border-[#BFD3FF] hover:text-[#1244D1] dark:border-[#3A4661] dark:text-[#B7C1D1] dark:hover:text-[#C9D7FF]"
            }`}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-describedby={describedBy}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <UserPlus className="size-4 shrink-0" aria-hidden />
              {loading ? "Cargando técnicos…" : seleccionados.length > 0 ? "Agregar otro técnico" : "Agregar técnicos…"}
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>

          {open ? (
            <div className="cot-pop mt-1.5 overflow-hidden rounded-2xl border border-[#E7E7EA] bg-white shadow-[0_12px_32px_-16px_rgba(9,9,11,0.3)] dark:border-[#273244] dark:bg-[#111827]">
              <div className="flex items-center justify-between gap-3 border-b border-[#F0F0F2] bg-[#FAFAFB] px-3.5 py-2 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {search.trim() ? `${filtradas.length} resultado${filtradas.length === 1 ? "" : "s"}` : `${opciones.length} disponibles`}
                </p>
                {seleccionados.length > 0 ? (
                  <button type="button" onClick={() => onChange("")} className={`rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-[#1244D1] hover:bg-[rgba(27,92,255,0.08)] dark:text-[#7EA0FF] dark:hover:bg-[rgba(75,124,255,0.14)] ${focusRing}`}>
                    Limpiar · {seleccionados.length}
                  </button>
                ) : null}
              </div>
              <div className="relative border-b border-[#F0F0F2] p-2 dark:border-[#1F2A3C]">
                <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className={`${input} h-10! pl-9`}
                  aria-label="Buscar técnicos"
                  aria-controls={listboxId}
                />
              </div>
              <ul id={listboxId} role="listbox" aria-multiselectable aria-label="Técnicos" className="custom-scrollbar max-h-64 overflow-y-auto p-1.5">
                {filtradas.length === 0 ? (
                  <li className="cot-fade flex flex-col items-center gap-1.5 px-3 py-6 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                    <SearchX className="size-5 text-[#A1A1AA]" aria-hidden />
                    {loading ? "Cargando…" : usuarios.length === 0 ? "No se pudo cargar la lista de técnicos." : "Sin resultados"}
                  </li>
                ) : (
                  filtradas.map((o, idx) => {
                    const checked = seleccionSet.has(o.nombre.toLowerCase());
                    return (
                      <li key={o.id} role="option" aria-selected={checked} className="cot-fade" style={idx < 8 ? { animationDelay: `${idx * 20}ms` } : undefined}>
                        <button
                          type="button"
                          className={`group/opt relative flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 ${
                            checked
                              ? "bg-[#F5F8FF] font-medium text-[#1244D1] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]"
                              : "text-[#18181B] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/4"
                          }`}
                          onClick={() => toggle(o.nombre)}
                        >
                          <span aria-hidden className={`absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#1B5CFF] transition-transform duration-200 dark:bg-[#4B7CFF] ${checked ? "scale-y-100" : "scale-y-0"}`} />
                          <Avatar person={{ id: o.id, nombre: o.nombre, avatar_url: o.avatarUrl }} />
                          <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
                          <span
                            className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                              checked ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]" : "border-[#D3D3D8] group-hover/opt:border-[#A1A1AA] dark:border-[#3A4661]"
                            }`}
                            aria-hidden
                          >
                            {checked ? <Check className="cot-tick size-3" strokeWidth={3} /> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {seleccionados.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5" aria-label="Técnicos asignados">
          {seleccionados.map((nombre) => {
            const o = porNombre.get(nombre.toLowerCase());
            return (
              <li
                key={nombre}
                className="cot-pop group/card flex min-h-14 items-center gap-3 rounded-2xl border border-[#E7E7EA] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[#C9D7FF] hover:shadow-[0_6px_16px_-10px_rgba(27,92,255,0.35)] dark:border-[#273244] dark:bg-[#0F172A]/70 dark:shadow-none dark:hover:border-[#3A4F8F]"
              >
                <Avatar person={{ id: o?.id ?? null, nombre, avatar_url: o?.avatarUrl }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold tracking-[-0.1px] text-[#09090B] dark:text-[#F8FAFC]">{nombre}</p>
                  <p className="flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                    <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                    Técnico asignado
                  </p>
                </div>
                {!disabled ? (
                  <button
                    type="button"
                    className={`cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#A1A1AA] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171] ${focusRing}`}
                    aria-label={`Quitar a ${nombre}`}
                    onClick={() => quitar(nombre)}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : disabled ? (
        <p id={id} className="rounded-2xl border border-dashed border-[#E4E4E7] px-3 py-3 text-[13px] text-[#71717A] dark:border-[#273244] dark:text-[#8EA0B8]">
          Sin técnico asignado.
        </p>
      ) : null}

    </div>
  );
}
