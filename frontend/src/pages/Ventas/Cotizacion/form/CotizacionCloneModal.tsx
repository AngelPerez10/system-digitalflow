import { useId } from "react";
import { ChevronRight, Copy, Info, Search, SearchX, UserRound, Users, X } from "lucide-react";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { formatDMY, formatMoney } from "../shared/cotizacionFormUtils";
import type { Cliente, CloneCotizacionRow } from "../shared/cotizacionFormTypes";
import { AppModal, AppModalHeader, AppSpinner } from "@/components/ui/modal-kit/ModalKit";

export type CotizacionCloneModalProps = {
  open: boolean;
  /** Cierre solicitado (el padre aplica el guard de `pickingId` y limpia el sub-estado). */
  onClose: () => void;
  /** id de la cotización que se está clonando ahora mismo (bloquea la UI). */
  pickingId: number | null;
  /** Clona la cotización `id` hacia el formulario. */
  onPick: (id: number) => void;

  clienteMode: "mismo" | "otro";
  /** El padre cambia el modo y, al volver a "mismo", limpia el cliente destino. */
  onClienteModeChange: (mode: "mismo" | "otro") => void;

  targetCliente: Cliente | null;
  /** Elige cliente destino de la lista (el padre fija nombre en el input y vacía opciones). */
  onPickTargetCliente: (cliente: Cliente) => void;
  /** Quita el cliente destino elegido. */
  onClearTargetCliente: () => void;

  clienteSearch: string;
  onClienteSearchChange: (value: string) => void;
  clienteOptions: Cliente[];
  clienteLoading: boolean;
  clienteDebounced: string;

  search: string;
  onSearchChange: (value: string) => void;
  searchDebounced: string;
  listLoading: boolean;
  rows: CloneCotizacionRow[];
};

const searchInputClass =
  "block min-h-11 w-full rounded-[10px] border border-[#E4E4E7] bg-white py-2 pl-10 pr-10 text-[15px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D4D4D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus:border-[#4B7CFF] [&::-webkit-search-cancel-button]:hidden";

const MODOS = [
  {
    value: "mismo" as const,
    label: "Mismo cliente",
    hint: "Conserva cliente y contacto",
    Icon: UserRound,
  },
  {
    value: "otro" as const,
    label: "Otro cliente",
    hint: "Copia partidas y textos",
    Icon: Users,
  },
];

/**
 * Modal "Clonar desde existente". Presentacional: toda la lógica de negocio
 * (búsqueda, selección de cliente destino, `handleClonePick`) vive en el
 * padre; aquí solo se pinta la vista y se emiten callbacks.
 */
export function CotizacionCloneModal({
  open,
  onClose,
  pickingId,
  onPick,
  clienteMode,
  onClienteModeChange,
  targetCliente,
  onPickTargetCliente,
  onClearTargetCliente,
  clienteSearch,
  onClienteSearchChange,
  clienteOptions,
  clienteLoading,
  clienteDebounced,
  search,
  onSearchChange,
  searchDebounced,
  listLoading,
  rows,
}: CotizacionCloneModalProps) {
  const titleId = useId();
  const descId = useId();
  const modoId = useId();
  const picking = pickingId != null;
  const faltaDestino = clienteMode === "otro" && !targetCliente;
  const buscando = searchDebounced.length >= 1;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      busy={picking}
      size="lg"
      labelledBy={titleId}
      describedBy={descId}
      className="h-[min(90vh,820px)]"
    >
      <AppModalHeader
        icon={<Copy className="size-5" strokeWidth={1.9} />}
        tone="info"
        eyebrow="Nueva cotización"
        title="Clonar desde una existente"
        titleId={titleId}
        description="Copia partidas, textos y opciones de otra cotización para no empezar de cero."
        descriptionId={descId}
        onClose={onClose}
        closeDisabled={picking}
        divided
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Controles */}
        <div className="shrink-0 space-y-4 px-6 pt-5">
          <fieldset disabled={picking}>
            <legend id={modoId} className="mb-2 text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]">
              ¿Para qué cliente?
            </legend>
            <div role="radiogroup" aria-labelledby={modoId} className="grid grid-cols-2 gap-2">
              {MODOS.map(({ value, label, hint, Icon }) => {
                const active = clienteMode === value;
                return (
                  <label
                    key={value}
                    className={`relative flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-[#1B5CFF]/40 ${
                      active
                        ? "border-[#1B5CFF] bg-[#F7F9FF] dark:border-[#4B7CFF] dark:bg-[#151E32]"
                        : "border-[#E4E4E7] bg-white hover:border-[#D4D4D8] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="clone-cliente-mode"
                      className="sr-only"
                      checked={active}
                      onChange={() => onClienteModeChange(value)}
                    />
                    <span
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active
                          ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                          : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]"
                      }`}
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{label}</span>
                      <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {clienteMode === "otro" && (
              <div className="cot-fade mt-3">
                {targetCliente ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#BBD0FF] bg-[#F7F9FF] px-3.5 py-2.5 dark:border-[#3A4A6B] dark:bg-[#151E32]">
                    <span
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[12px] font-semibold text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                      aria-hidden
                    >
                      {(targetCliente.nombre || "?").trim().slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        {targetCliente.nombre}
                      </p>
                      <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        Se usará su contacto principal, si tiene.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearTargetCliente}
                      className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-3 text-[13px] font-semibold text-[#1B5CFF] transition-colors hover:bg-[#EEF3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#9BB6FF] dark:hover:bg-[#1B2A63]"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <label htmlFor="clone-cliente-search" className="sr-only">
                      Buscar cliente destino
                    </label>
                    <Search
                      className="pointer-events-none absolute left-3.5 top-[22px] size-4 -translate-y-1/2 text-[#A1A1AA]"
                      aria-hidden
                    />
                    <input
                      id="clone-cliente-search"
                      type="search"
                      value={clienteSearch}
                      onChange={(e) => onClienteSearchChange(e.target.value)}
                      placeholder="Busca el cliente destino por nombre o teléfono"
                      className={searchInputClass}
                      autoComplete="off"
                    />
                    {(clienteLoading || clienteDebounced.length >= 1) && (
                      <div
                        className="cot-pop custom-scrollbar mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-[#E4E4E7] bg-white p-1 shadow-[0_12px_28px_-16px_rgba(9,9,11,0.3)] dark:border-[#273244] dark:bg-[#111827]"
                        role="status"
                        aria-live="polite"
                      >
                        {clienteLoading && (
                          <p className="flex items-center gap-2 px-3 py-3 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                            <AppSpinner className="size-3.5" />
                            Buscando clientes…
                          </p>
                        )}
                        {!clienteLoading && clienteOptions.length === 0 && (
                          <p className="px-3 py-3 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                            Sin clientes con «{clienteDebounced}».
                          </p>
                        )}
                        {!clienteLoading && clienteOptions.length > 0 && (
                          <ul>
                            {clienteOptions.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => onPickTargetCliente(c)}
                                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#F4F7FF] focus-visible:bg-[#F4F7FF] focus-visible:outline-none dark:hover:bg-[#1B2539] dark:focus-visible:bg-[#1B2539]"
                                >
                                  <span
                                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[11px] font-semibold text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]"
                                    aria-hidden
                                  >
                                    {(c.nombre || "?").trim().slice(0, 1).toUpperCase()}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                      {c.nombre}
                                    </span>
                                    {c.telefono ? (
                                      <span className="block text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                                        {c.telefono}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <div className="relative">
            <label htmlFor="clone-cotizacion-search" className="mb-2 block text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]">
              Cotización a copiar
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]"
                aria-hidden
              />
              <input
                id="clone-cotizacion-search"
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Folio (ej. 42) o nombre del cliente"
                autoFocus
                className={searchInputClass}
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
              {buscando ? "Resultados" : "Más recientes"}
            </span>
            {!listLoading && rows.length > 0 && (
              <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]">
                {rows.length}
              </span>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="relative mt-2 min-h-0 flex-1 border-t border-[#F0F0F2] dark:border-[#1F2A3C]">
          <div className="custom-scrollbar absolute inset-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {faltaDestino && !listLoading && rows.length > 0 && (
              <p className="mb-2 flex items-center gap-2 rounded-lg bg-[#FFF8EB] px-3 py-2 text-[12px] font-medium text-[#8A5A10] dark:bg-[rgba(230,162,60,0.10)] dark:text-[#F0C675]">
                <Info className="size-3.5 shrink-0" aria-hidden />
                Elige primero el cliente destino para poder copiar.
              </p>
            )}

            {listLoading && (
              <ul className="space-y-1" aria-label="Cargando cotizaciones" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-3">
                    <span className="h-9 w-16 shrink-0 animate-pulse rounded-lg bg-[#F0F0F2] dark:bg-[#1B2539]" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-3/5 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1B2539]" />
                      <span className="block h-2.5 w-2/5 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#172033]" />
                    </span>
                    <span className="h-3 w-16 animate-pulse rounded bg-[#F0F0F2] dark:bg-[#1B2539]" />
                  </li>
                ))}
              </ul>
            )}

            {!listLoading && rows.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#64748B]">
                  <SearchX className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-[14px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
                  {buscando ? "Sin coincidencias" : "Aún no hay cotizaciones"}
                </p>
                <p className="mt-1 max-w-64 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                  {buscando ? "Prueba con otro folio o parte del nombre del cliente." : "Cuando existan, aparecerán aquí."}
                </p>
              </div>
            )}

            {!listLoading && rows.length > 0 && (
              <ul className="space-y-1">
                {rows.map((row) => {
                  const esteCargando = pickingId === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={picking || faltaDestino}
                        onClick={() => onPick(row.id)}
                        className={`group flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed ${
                          esteCargando
                            ? "border-[#BBD0FF] bg-[#F7F9FF] dark:border-[#3A4A6B] dark:bg-[#151E32]"
                            : "border-transparent enabled:hover:border-[#E4E4E7] enabled:hover:bg-[#FAFAFA] disabled:opacity-50 dark:enabled:hover:border-[#273244] dark:enabled:hover:bg-[#0F172A]/60"
                        }`}
                      >
                        <span className="inline-flex h-9 min-w-16 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FF] px-2 font-mono text-[12px] font-semibold tabular-nums text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                          {formatDocumentFolio(FOLIO_SERIE.cotizacion, row.idx)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                            {row.cliente}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                            {row.fecha && <span className="tabular-nums">{formatDMY(row.fecha)}</span>}
                            {row.fecha && row.contacto && row.contacto !== "—" && <span aria-hidden>·</span>}
                            {row.contacto && row.contacto !== "—" && <span className="truncate">{row.contacto}</span>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                          {formatMoney(row.total)}
                        </span>
                        {esteCargando ? (
                          <AppSpinner className="size-4 shrink-0 text-[#1B5CFF]" />
                        ) : (
                          <ChevronRight
                            className="size-4 shrink-0 text-[#D4D4D8] transition-transform duration-150 group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-[#71717A] dark:text-[#3A4661]"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {picking && (
            <div className="cot-fade pointer-events-none absolute inset-x-0 bottom-4 flex justify-center" role="status">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#17235B] px-4 py-2 text-[13px] font-medium text-white shadow-lg dark:bg-[#1B2A63]">
                <AppSpinner className="size-3.5" />
                Copiando cotización…
              </span>
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}
