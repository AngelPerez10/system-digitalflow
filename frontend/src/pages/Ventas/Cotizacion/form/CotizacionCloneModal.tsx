import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import { formatDMY, formatMoney } from "../shared/cotizacionFormUtils";
import { cloneModalPanelClass, cloneModalSearchInputClass } from "../shared/cotizacionFormStyles";
import type { Cliente, CloneCotizacionRow } from "../shared/cotizacionFormTypes";

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
  const clienteModeId = useId();
  const picking = pickingId != null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={!picking}
      closeOnEscape={!picking}
      ariaLabel="Clonar cotización"
      className="mx-4 flex h-[min(94vh,880px)] w-[min(96vw,36rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] sm:mx-auto sm:max-w-xl"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <header className="relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]">
          <div className="flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h2a2 2 0 0 1 2 2v2M8 3H6a2 2 0 0 0-2 2v2" />
                <path d="M8 21h8M12 17v4M9 17h6" />
                <rect x="3" y="7" width="18" height="10" rx="2" />
                <path d="M7 11h2M11 11h2M15 11h.01" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Cotización</p>
              <h3 className="mt-1 text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white">Clonar desde existente</h3>
              <p className="mt-1 text-[14px] leading-[20px] text-white/70">
                Busque por folio o cliente de origen. Puede conservar ese cliente o clonar las líneas hacia otro.
              </p>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-white px-5 py-4 dark:bg-[#111827] sm:px-6">
          <fieldset className={`${cloneModalPanelClass} shrink-0 !p-3 sm:!p-3.5`} disabled={picking}>
            <legend id={clienteModeId} className="mb-2 text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
              Cliente destino
            </legend>
            <div role="radiogroup" aria-labelledby={clienteModeId} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors ${
                  clienteMode === "mismo"
                    ? "border-[#1B5CFF]/50 bg-[#F1F5FF] dark:border-[#1B5CFF]/35 dark:bg-[#1B5CFF]/20"
                    : "border-[#E7E7EA] bg-white hover:border-[#BBD0FF] dark:border-[#273244] dark:bg-[#0f172a] dark:hover:border-[#4B7CFF]/40"
                }`}
              >
                <input
                  type="radio"
                  name="clone-cliente-mode"
                  className="mt-0.5 h-4 w-4 accent-[#1B5CFF]"
                  checked={clienteMode === "mismo"}
                  onChange={() => onClienteModeChange("mismo")}
                />
                <span>
                  <span className="block text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">Mismo cliente</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]">
                    Conserva cliente y contacto de la cotización origen.
                  </span>
                </span>
              </label>
              <label
                className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors ${
                  clienteMode === "otro"
                    ? "border-[#1B5CFF]/50 bg-[#F1F5FF] dark:border-[#1B5CFF]/35 dark:bg-[#1B5CFF]/20"
                    : "border-[#E7E7EA] bg-white hover:border-[#BBD0FF] dark:border-[#273244] dark:bg-[#0f172a] dark:hover:border-[#4B7CFF]/40"
                }`}
              >
                <input
                  type="radio"
                  name="clone-cliente-mode"
                  className="mt-0.5 h-4 w-4 accent-[#1B5CFF]"
                  checked={clienteMode === "otro"}
                  onChange={() => onClienteModeChange("otro")}
                />
                <span>
                  <span className="block text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">Otro cliente</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]">
                    Copia conceptos y textos, pero asigna otro cliente.
                  </span>
                </span>
              </label>
            </div>

            {clienteMode === "otro" && (
              <div className="mt-3">
                <label htmlFor="clone-cliente-search" className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
                  Buscar cliente destino
                </label>
                {targetCliente ? (
                  <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[#1B5CFF]/30 bg-[#F1F5FF] px-3 py-2.5 dark:border-[#1B5CFF]/25 dark:bg-[#1B5CFF]/20">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">{targetCliente.nombre}</p>
                      <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">Se usará su contacto principal, si tiene.</p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearTargetCliente}
                      className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-[#BBD0FF] bg-white px-2.5 text-xs font-semibold text-[#1B5CFF] hover:bg-[#EAF1FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/30 dark:border-[#4B7CFF]/40 dark:bg-[#111827] dark:text-[#4B7CFF]"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        id="clone-cliente-search"
                        type="search"
                        value={clienteSearch}
                        onChange={(e) => onClienteSearchChange(e.target.value)}
                        placeholder="Nombre o teléfono del cliente…"
                        className={cloneModalSearchInputClass}
                        aria-describedby="clone-cliente-hint"
                        autoComplete="off"
                      />
                    </div>
                    <p id="clone-cliente-hint" className="mt-1.5 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                      Escribe el nombre o teléfono y elige un cliente de la lista.
                    </p>
                    {(clienteLoading || clienteDebounced.length >= 1) && (
                      <div
                        className="mt-2 max-h-40 overflow-y-auto rounded-[10px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#0f172a]"
                        role="status"
                        aria-live="polite"
                      >
                        {clienteLoading && <p className="px-3 py-3 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Buscando clientes…</p>}
                        {!clienteLoading && clienteOptions.length === 0 && (
                          <p className="px-3 py-3 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Sin coincidencias.</p>
                        )}
                        {!clienteLoading && clienteOptions.length > 0 && (
                          <ul>
                            {clienteOptions.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => onPickTargetCliente(c)}
                                  className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5FF] focus:outline-none focus-visible:bg-[#F1F5FF] dark:hover:bg-white/[0.06]"
                                >
                                  <span className="block font-medium text-[#09090B] dark:text-[#f8fafc]">{c.nombre}</span>
                                  {c.telefono ? (
                                    <span className="block text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">{c.telefono}</span>
                                  ) : null}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </fieldset>

          <section className={`${cloneModalPanelClass} shrink-0 !p-3 sm:!p-3.5`}>
            <label htmlFor="clone-cotizacion-search" className="mb-1.5 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
              Buscar cotización
            </label>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M14 14 18 18" strokeLinecap="round" />
              </svg>
              <input
                id="clone-cotizacion-search"
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Folio (ej. 42) o nombre de cliente…"
                autoFocus
                className={cloneModalSearchInputClass}
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#A1A1AA] transition hover:bg-[#FAFAFA] hover:text-[#52525B] dark:hover:bg-white/[0.06] dark:hover:text-[#D3D3D8]"
                  aria-label="Limpiar búsqueda"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              )}
            </div>
          </section>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A1AA] dark:text-[#8EA0B8] sm:text-[11px]">Resultados</span>
              {!listLoading && searchDebounced.length >= 1 && rows.length > 0 && (
                <span className="tabular-nums text-[11px] font-medium text-[#A1A1AA] dark:text-[#8EA0B8]">{rows.length}</span>
              )}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
              <div className="custom-scrollbar absolute inset-0 overflow-y-auto overscroll-contain">
                {listLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-14">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7E7EA] border-t-[#1B5CFF] dark:border-[#273244] dark:border-t-[#4B7CFF]" />
                    <p className="text-sm text-[#6E6E77] dark:text-[#8ea0b8]">Buscando cotizaciones…</p>
                  </div>
                )}
                {!listLoading && searchDebounced.length < 1 && (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E7E7EA] bg-white text-[#A1A1AA] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#8EA0B8]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <path d="M12 19V5M5 12h14" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">Empiece a escribir</p>
                    <p className="max-w-[240px] text-xs leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]">
                      Escriba al menos un carácter para buscar en el directorio de cotizaciones.
                    </p>
                  </div>
                )}
                {!listLoading && searchDebounced.length >= 1 && rows.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E7E7EA] bg-white text-[#A1A1AA] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#8EA0B8]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3-3M8 11h6" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">Sin coincidencias</p>
                    <p className="max-w-[260px] text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Pruebe otro folio o parte del nombre del cliente.</p>
                  </div>
                )}
                {!listLoading && rows.length > 0 && (
                  <ul className="space-y-2.5 p-3 sm:p-3.5">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          disabled={picking || (clienteMode === "otro" && !targetCliente)}
                          onClick={() => onPick(row.id)}
                          title={clienteMode === "otro" && !targetCliente ? "Elige primero el cliente destino" : undefined}
                          className="flex w-full flex-col gap-2 rounded-[16px] border border-[#E7E7EA] bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-[1px] hover:border-[#1B5CFF]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#1B5CFF]/20 bg-[#F1F5FF] px-1.5 text-[11px] font-bold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/25 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF]">
                              {formatDocumentFolio(FOLIO_SERIE.cotizacion, row.idx)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">{row.cliente}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                                {row.contacto && row.contacto !== "—" && <span>Contacto: {row.contacto}</span>}
                                {row.fecha && <span className="tabular-nums text-[#A1A1AA] dark:text-[#8EA0B8]">{formatDMY(row.fecha)}</span>}
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg border border-[#E7E7EA] bg-[#FAFAFA] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#09090B] dark:border-[#273244] dark:bg-white/[0.06] dark:text-[#e5e7eb]">
                            {formatMoney(row.total)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {picking && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px] dark:bg-[#0f172a]/70">
                  <div className="flex items-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 py-2.5 text-sm font-medium text-[#52525B] shadow-md dark:border-[#273244] dark:bg-[#111827] dark:text-[#e5e7eb]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D3D3D8] border-t-[#1B5CFF] dark:border-[#3A4661] dark:border-t-[#4B7CFF]" />
                    Cargando cotización…
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
