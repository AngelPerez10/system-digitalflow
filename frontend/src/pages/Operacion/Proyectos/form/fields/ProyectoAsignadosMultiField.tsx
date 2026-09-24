import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Crown, Search, X } from "lucide-react";
import { normalizeAuxiliaresAsignados, normalizeTecnicosAsignados } from "../../shared/proyectoFormUtils";
import { Avatar } from "../../shared/ProyectoUi";
import { fieldLabel, focusRing, input } from "../../shared/proyectoTokens";
import type { ProyectoPersonaAsignada, ProyectoTecnicoAsignado } from "../../shared/proyectoTypes";

type Opcion = { value: string; label: string; avatarUrl?: string };

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

/**
 * Multi-select de técnicos (uno responsable) o auxiliares.
 * La lista se despliega en línea para no quedar recortada por la tarjeta.
 */
export function ProyectoAsignadosMultiField(props: Props) {
  const {
    mode,
    label = mode === "tecnicos" ? "Técnicos" : "Auxiliares",
    options,
    disabled = false,
    excludeIds = [],
    placeholder = mode === "tecnicos" ? "Agregar técnicos…" : "Agregar auxiliares…",
  } = props;

  const listboxId = useId();
  const labelId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const exclude = useMemo(() => new Set(excludeIds.filter((id) => Number.isFinite(id))), [excludeIds]);

  const tecnicos = useMemo(
    () => (mode === "tecnicos" ? normalizeTecnicosAsignados(props.value) : []),
    [mode, props.value]
  );
  const auxiliares = useMemo(
    () => (mode === "auxiliares" ? normalizeAuxiliaresAsignados(props.value) : []),
    [mode, props.value]
  );

  const selected = mode === "tecnicos" ? tecnicos : auxiliares;
  const selectedIds = useMemo(() => new Set(selected.map((p) => Number(p.id))), [selected]);

  const ordered = useMemo(
    () =>
      mode === "tecnicos"
        ? [...tecnicos].sort((a, b) => Number(b.responsable) - Number(a.responsable))
        : auxiliares,
    [mode, tecnicos, auxiliares]
  );

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
      // No cerrar el modal del proyecto: solo la lista.
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
          {
            id,
            nombre: opt.label,
            responsable: current.length === 0,
            avatar_url: opt.avatarUrl || "",
          },
        ])
      );
      return;
    }

    const current = normalizeAuxiliaresAsignados(props.value);
    if (selectedIds.has(id)) {
      props.onChange(current.filter((a) => a.id !== id));
      return;
    }
    props.onChange([...current, { id, nombre: opt.label, avatar_url: opt.avatarUrl || "" }]);
  };

  const markResponsable = (id: number) => {
    if (disabled || mode !== "tecnicos") return;
    props.onChange(normalizeTecnicosAsignados(props.value).map((t) => ({ ...t, responsable: t.id === id })));
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
    <div ref={rootRef} className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p id={labelId} className={fieldLabel}>
          {label}
        </p>
        <span className="text-[12px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">{selected.length}</span>
      </div>
      <p id={hintId} className="sr-only">
        {mode === "tecnicos"
          ? "Marca un responsable: su firma aparece en el PDF."
          : "Auxiliares del equipo en campo."}
      </p>

      {ordered.length > 0 ? (
        <ul
          className="mb-2 space-y-1.5"
          role={mode === "tecnicos" ? "radiogroup" : undefined}
          aria-label={mode === "tecnicos" ? "Técnico responsable" : "Auxiliares asignados"}
        >
          {ordered.map((person) => {
            const id = Number(person.id);
            const name = person.nombre || `#${id}`;
            const isResp = mode === "tecnicos" && Boolean((person as ProyectoTecnicoAsignado).responsable);
            return (
              <li
                key={id}
                className={`cot-pop flex min-h-12 items-center gap-2.5 rounded-2xl border px-2.5 py-1.5 transition-colors duration-200 ${
                  isResp
                    ? "border-[#D7E3FF] bg-[#F5F8FF] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/30"
                    : "border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60"
                }`}
              >
                <Avatar person={{ id, nombre: name, avatar_url: person.avatar_url }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{name}</p>
                  {mode === "tecnicos" ? (
                    isResp ? (
                      <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">
                        <Crown className="size-3" aria-hidden />
                        Responsable
                        <span className="sr-only" role="radio" aria-checked="true">
                          {name} es el responsable
                        </span>
                      </p>
                    ) : !disabled ? (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={false}
                        onClick={() => markResponsable(id)}
                        className="rounded-lg text-[12px] font-medium text-[#71717A] hover:text-[#1B5CFF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#8EA0B8] dark:hover:text-[#7EA0FF]"
                      >
                        Hacer responsable
                      </button>
                    ) : (
                      <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">Técnico</p>
                    )
                  ) : null}
                </div>
                {!disabled ? (
                  <button
                    type="button"
                    className={`cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#A1A1AA] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171] ${focusRing}`}
                    aria-label={`Quitar a ${name}`}
                    onClick={() => remove(id)}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : disabled ? (
        <p className="mb-2 rounded-2xl border border-dashed border-[#E4E4E7] px-3 py-3 text-[13px] text-[#71717A] dark:border-[#273244] dark:text-[#8EA0B8]">
          Sin {mode === "tecnicos" ? "técnicos" : "auxiliares"} asignados.
        </p>
      ) : null}

      {!disabled ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={`cot-press flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-dashed px-3.5 text-left text-[14px] font-medium ${focusRing} ${
              open
                ? "border-[#1B5CFF] bg-[#F5F8FF] text-[#1244D1] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40 dark:text-[#C9D7FF]"
                : "border-[#D4D4D8] text-[#52525B] hover:border-[#BFD3FF] hover:text-[#1244D1] dark:border-[#3A4661] dark:text-[#B7C1D1] dark:hover:text-[#C9D7FF]"
            }`}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-labelledby={labelId}
            aria-describedby={hintId}
            onClick={() => setOpen((v) => !v)}
          >
            {placeholder}
            <ChevronDown
              className={`size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {open ? (
            <div className="cot-pop mt-1.5 overflow-hidden rounded-2xl border border-[#E7E7EA] bg-white shadow-[0_12px_32px_-16px_rgba(9,9,11,0.3)] dark:border-[#273244] dark:bg-[#111827]">
              <div className="relative border-b border-[#F0F0F2] p-2 dark:border-[#1F2A3C]">
                <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className={`${input} h-10! pl-9`}
                  aria-label={`Buscar en ${label}`}
                  aria-controls={listboxId}
                />
              </div>
              <ul
                id={listboxId}
                role="listbox"
                aria-multiselectable
                aria-labelledby={labelId}
                className="custom-scrollbar max-h-56 overflow-y-auto p-1"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Sin resultados</li>
                ) : (
                  filtered.map((opt) => {
                    const id = Number(opt.value);
                    const checked = selectedIds.has(id);
                    return (
                      <li key={opt.value} role="option" aria-selected={checked}>
                        <button
                          type="button"
                          className={`flex min-h-11 w-full items-center gap-2.5 rounded-[9px] px-2 text-left text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 ${
                            checked
                              ? "bg-[#F5F8FF] font-medium text-[#1244D1] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]"
                              : "text-[#18181B] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/4"
                          }`}
                          onClick={() => toggle(opt)}
                        >
                          <Avatar
                            person={{ id, nombre: opt.label, avatar_url: opt.avatarUrl }}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                          <span
                            className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
                              checked
                                ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                                : "border-[#D3D3D8] dark:border-[#3A4661]"
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
    </div>
  );
}
