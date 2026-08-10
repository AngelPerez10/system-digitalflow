import { useEffect, useId, useMemo, useRef, useState } from "react";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import {
  normalizeAuxiliaresAsignados,
  normalizeTecnicosAsignados,
} from "../../shared/proyectoFormUtils";
import type { ProyectoPersonaAsignada, ProyectoTecnicoAsignado } from "../../shared/proyectoTypes";
import { proyectoFieldLabelClass } from "../../shared/proyectoPageStyles";

type Opcion = { value: string; label: string };

type TecnicosProps = {
  mode: "tecnicos";
  label?: string;
  value: ProyectoTecnicoAsignado[];
  onChange: (next: ProyectoTecnicoAsignado[]) => void;
  options: Opcion[];
  disabled?: boolean;
  excludeIds?: number[];
  placeholder?: string;
};

type AuxiliaresProps = {
  mode: "auxiliares";
  label?: string;
  value: ProyectoPersonaAsignada[];
  onChange: (next: ProyectoPersonaAsignada[]) => void;
  options: Opcion[];
  disabled?: boolean;
  excludeIds?: number[];
  placeholder?: string;
};

type Props = TecnicosProps | AuxiliaresProps;

function initialsFromName(nombre: string): string {
  const parts = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Multi-select de técnicos (tarjeta naranja = responsable) o auxiliares.
 */
export function ProyectoAsignadosMultiField(props: Props) {
  const {
    mode,
    label = mode === "tecnicos" ? "Técnicos" : "Auxiliares",
    options,
    disabled = false,
    excludeIds = [],
    placeholder = mode === "tecnicos" ? "Buscar y agregar técnicos…" : "Buscar y agregar auxiliares…",
  } = props;

  const listboxId = useId();
  const labelId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const exclude = useMemo(() => new Set(excludeIds.filter((id) => Number.isFinite(id))), [excludeIds]);

  const tecnicos = useMemo(
    () => (mode === "tecnicos" ? normalizeTecnicosAsignados(props.value) : []),
    [mode, props.value]
  );
  const auxiliares = useMemo(
    () => (mode === "auxiliares" ? normalizeAuxiliaresAsignados(props.value) : []),
    [mode, props.value]
  );

  const selectedIds = useMemo(() => {
    if (mode === "tecnicos") return new Set(tecnicos.map((t) => Number(t.id)));
    return new Set(auxiliares.map((a) => Number(a.id)));
  }, [auxiliares, mode, tecnicos]);

  const responsable = useMemo(
    () => tecnicos.find((t) => t.responsable) || tecnicos[0] || null,
    [tecnicos]
  );

  const sortedTecnicos = useMemo(
    () => [...tecnicos].sort((a, b) => Number(b.responsable) - Number(a.responsable)),
    [tecnicos]
  );

  const triggerLabel = useMemo(() => {
    if (mode === "tecnicos") {
      if (!tecnicos.length) return placeholder;
      if (tecnicos.length === 1) return "1 técnico seleccionado";
      return `${tecnicos.length} técnicos seleccionados`;
    }
    if (!auxiliares.length) return placeholder;
    if (auxiliares.length === 1) return "1 auxiliar seleccionado";
    return `${auxiliares.length} auxiliares seleccionados`;
  }, [auxiliares.length, mode, placeholder, tecnicos.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((o) => {
      const id = Number(o.value);
      if (!Number.isFinite(id) || exclude.has(id)) return false;
      if (!q) return true;
      return o.label.toLowerCase().includes(q) || o.value.includes(q);
    });
  }, [exclude, options, search]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
    else setSearch("");
  }, [open]);

  const toggle = (opt: Opcion) => {
    if (disabled) return;
    const id = Number(opt.value);
    if (!Number.isFinite(id) || id <= 0) return;

    if (mode === "tecnicos") {
      const current = normalizeTecnicosAsignados(props.value);
      if (selectedIds.has(id)) {
        props.onChange(normalizeTecnicosAsignados(current.filter((t) => t.id !== id)));
        return;
      }
      props.onChange(
        normalizeTecnicosAsignados([
          ...current,
          { id, nombre: opt.label, responsable: current.length === 0 },
        ])
      );
      return;
    }

    const current = normalizeAuxiliaresAsignados(props.value);
    if (selectedIds.has(id)) {
      props.onChange(current.filter((a) => a.id !== id));
      return;
    }
    props.onChange([...current, { id, nombre: opt.label }]);
  };

  const markResponsable = (id: number) => {
    if (disabled || mode !== "tecnicos") return;
    props.onChange(
      normalizeTecnicosAsignados(props.value).map((t) => ({ ...t, responsable: t.id === id }))
    );
  };

  const remove = (id: number) => {
    if (disabled) return;
    if (mode === "tecnicos") {
      props.onChange(normalizeTecnicosAsignados(props.value.filter((t) => t.id !== id)));
      return;
    }
    props.onChange(props.value.filter((a) => a.id !== id));
  };

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p id={labelId} className={`${proyectoFieldLabelClass} mb-0`}>
          {label}
        </p>
        {mode === "tecnicos" && responsable ? (
          <p
            className="max-w-[55%] truncate text-[11px] font-semibold text-[#9a3412] dark:text-[#fdba74]"
            aria-live="polite"
          >
            Resp. {responsable.nombre || `#${responsable.id}`}
          </p>
        ) : null}
      </div>

      {mode === "tecnicos" ? (
        <p id={hintId} className="text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]">
          Marca <span className="font-semibold text-[#9a3412] dark:text-[#fdba74]">un</span> responsable
          (firma y referencia del proyecto).
        </p>
      ) : (
        <p id={hintId} className="text-[11px] leading-snug text-[#78716c] dark:text-[#8ea0b8]">
          Auxiliares del equipo en campo. Todos ven el proyecto.
        </p>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`${erpInputLikeClass} flex w-full items-center justify-between gap-2 text-left ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
        >
          <span
            className={
              selectedIds.size
                ? "text-[#1c1917] dark:text-[#f8fafc]"
                : "text-[#a8a29e] dark:text-[#64748b]"
            }
          >
            {triggerLabel}
          </span>
          <span className="flex items-center gap-1.5">
            {selectedIds.size > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#ff801f]/15 px-1.5 text-[10px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]">
                {selectedIds.size}
              </span>
            ) : null}
            <svg className="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {open && !disabled ? (
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable
            aria-labelledby={labelId}
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#e7ded0] bg-white p-2 shadow-lg dark:border-[#334155] dark:bg-[#0f172a]"
          >
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              className={`${erpInputLikeClass} mb-2`}
              aria-label={`Buscar en ${label}`}
            />
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[#78716c] dark:text-[#8ea0b8]">Sin resultados</p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((opt) => {
                  const id = Number(opt.value);
                  const checked = selectedIds.has(id);
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={checked}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${
                          checked
                            ? "bg-[#ff801f]/10 font-medium text-[#1c1917] dark:text-[#f8fafc]"
                            : "text-[#44403c] hover:bg-[#f5f0e8] dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]"
                        }`}
                        onClick={() => toggle(opt)}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            checked
                              ? "border-[#ff801f] bg-[#ff801f] text-white"
                              : "border-[#d6d3d1] dark:border-[#475569]"
                          }`}
                          aria-hidden
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e8] text-[10px] font-bold text-[#57534e] dark:bg-[#1e293b] dark:text-[#94a3b8]"
                          aria-hidden
                        >
                          {initialsFromName(opt.label)}
                        </span>
                        <span className="min-w-0 truncate">{opt.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {mode === "tecnicos" && sortedTecnicos.length > 0 ? (
        <ul className="space-y-2" role="radiogroup" aria-label="Técnico responsable">
          {sortedTecnicos.map((person) => {
            const id = Number(person.id);
            const name = person.nombre || `#${id}`;
            const isResp = Boolean(person.responsable);
            return (
              <li key={id}>
                <div
                  className={
                    isResp
                      ? "rounded-xl border border-[#ff801f]/45 bg-gradient-to-r from-[#fff4eb] to-[#fffdfa] p-3 shadow-sm dark:border-[#ff801f]/40 dark:from-[#ff801f]/15 dark:to-[#0f172a]"
                      : "rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/70 p-2.5 dark:border-[#334155] dark:bg-[#0f172a]/50"
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        isResp
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-[11px] font-bold text-white shadow-sm"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7ded0] text-[11px] font-bold text-[#44403c] dark:bg-[#1e293b] dark:text-[#94a3b8]"
                      }
                      aria-hidden
                    >
                      {initialsFromName(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          {name}
                        </p>
                        {isResp ? (
                          <span className="inline-flex items-center rounded-full border border-[#ff801f]/35 bg-[#ff801f]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/20 dark:text-[#fdba74]">
                            Responsable
                          </span>
                        ) : null}
                      </div>
                      {isResp ? (
                        <p className="mt-0.5 text-[11px] text-[#9a3412]/90 dark:text-[#fdba74]/90">
                          Firma y referencia del equipo
                        </p>
                      ) : !disabled ? (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={false}
                          className="mt-0.5 min-h-6 text-left text-[11px] font-semibold text-[#ff801f] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35"
                          onClick={() => markResponsable(id)}
                        >
                          Hacer responsable
                        </button>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">Técnico del equipo</p>
                      )}
                      {isResp ? (
                        <span className="sr-only" role="radio" aria-checked={true}>
                          {name} es el responsable
                        </span>
                      ) : null}
                    </div>
                    {!disabled ? (
                      <button
                        type="button"
                        className="flex h-9 w-9 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-[#78716c] transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                        aria-label={`Quitar a ${name} de técnicos`}
                        onClick={() => remove(id)}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {mode === "auxiliares" && auxiliares.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Auxiliares seleccionados">
          {auxiliares.map((person) => {
            const id = Number(person.id);
            const name = person.nombre || `#${id}`;
            return (
              <li
                key={id}
                className="flex items-center gap-2.5 rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/70 px-2.5 py-2 dark:border-[#334155] dark:bg-[#0f172a]/50"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e7ded0] text-[10px] font-bold text-[#44403c] dark:bg-[#1e293b] dark:text-[#94a3b8]"
                  aria-hidden
                >
                  {initialsFromName(name)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  {name}
                </p>
                {!disabled ? (
                  <button
                    type="button"
                    className="flex h-9 w-9 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-[#78716c] transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:hover:bg-rose-950/40"
                    aria-label={`Quitar a ${name} de auxiliares`}
                    onClick={() => remove(id)}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
