import { cn } from "@/lib/utils";
import type { WialonUserRow } from "../../shared/wialonTypes";
import { accountKey } from "../../shared/wialonAccountUtils";
import {
  WialonStatusBadge,
  wialonDossierHeadingClass,
  wialonDossierZoneClass,
  wialonEyebrowClass,
  wialonUiBadge,
  wialonUiCaption,
} from "../chrome/WialonModalChrome";

type Props = {
  mirrors: WialonUserRow[];
  currentUser: WialonUserRow | null;
  onOpenUser?: (row: WialonUserRow) => void;
};

export default function WialonMirrorAccountsPanel({ mirrors, currentUser, onOpenUser }: Props) {
  const countLabel =
    mirrors.length === 1 ? "1 cuenta espejo" : `${mirrors.length} cuentas espejo`;

  return (
    <section className={wialonDossierZoneClass} aria-labelledby="wialon-mirrors-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={wialonEyebrowClass}>Jerarquía</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 id="wialon-mirrors-heading" className={wialonDossierHeadingClass}>
              Cuentas espejo
            </h3>
            <span
              className={cn(
                wialonUiBadge,
                "bg-[#F1F5FF] text-[#1244D1] ring-1 ring-[#1B5CFF]/25 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF] dark:ring-[#1B5CFF]/30",
              )}
            >
              {countLabel}
            </span>
          </div>
          <p className={cn("mt-1 max-w-xl", wialonUiCaption)}>
            Cuentas hijas creadas por este usuario o que cuelgan de su cuenta padre
          </p>
        </div>
      </div>

      {mirrors.length === 0 ? (
        <div
          className={cn(
            "rounded-2xl border border-[#E7E7EA]/90 px-5 py-7 text-center dark:border-[#273244]",
            "bg-[#FAFAFA]/90 dark:bg-[#0f172a]/55",
          )}
        >
          <div
            className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B5CFF]/12 text-[#1B5CFF] ring-1 ring-[#1B5CFF]/20 dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF] dark:ring-[#4B7CFF]/25"
            aria-hidden
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="3" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-medium tracking-[-0.02em] text-[#09090B] dark:text-[#f8fafc]">
            Sin cuentas espejo
          </p>
          <p className={cn("mx-auto mt-1.5 max-w-sm", wialonUiCaption)}>
            Cuando este usuario cree cuentas hijas, aparecerán aquí para abrirlas en un toque.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="list">
          {mirrors.map((row, index) => {
            const initial = (row.name || row.user_id || "?").slice(0, 1).toUpperCase();
            const createdBySelf =
              (row.creator_id != null &&
                currentUser?.wialon_id != null &&
                Number(row.creator_id) === Number(currentUser.wialon_id)) ||
              accountKey(row.creator) === accountKey(currentUser?.user_id) ||
              accountKey(row.creator) === accountKey(currentUser?.name);
            const active = row.status === "Activo";
            const blocked = row.status === "Bloqueado";

            return (
              <li key={row.wialon_id}>
                <button
                  type="button"
                  onClick={() => onOpenUser?.(row)}
                  disabled={!onOpenUser}
                  aria-label={`Abrir cuenta espejo ${row.name || row.user_id}`}
                  className={cn(
                    "group relative flex w-full overflow-hidden rounded-2xl border text-left transition-[border-color,background-color,transform] duration-200 motion-reduce:transition-none",
                    "border-[#E7E7EA]/95 bg-[#ffffff] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]",
                    "hover:border-[#1B5CFF]/50 hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40",
                    "disabled:cursor-default dark:border-[#273244] dark:bg-[#0f172a]/70 dark:shadow-none dark:hover:border-[#4B7CFF]/45 dark:hover:bg-[#09090B]/40",
                    onOpenUser && "active:scale-[0.99] motion-reduce:active:scale-100",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      active ? "bg-[#1B5CFF]" : blocked ? "bg-rose-400" : "bg-[#A1A1AA]",
                    )}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#1B5CFF]/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none dark:bg-[#4B7CFF]/15"
                    aria-hidden
                  />

                  <div className="relative flex w-full gap-3 p-3.5 pl-4 sm:p-4 sm:pl-5">
                    {/* Twin avatars (espejo) */}
                    <div className="relative h-12 w-12 shrink-0" aria-hidden>
                      <span className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebe6df] text-sm text-[#6E6E77] ring-1 ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#273244]">
                        {(currentUser?.name || currentUser?.user_id || "·")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <span className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B5CFF] text-sm font-medium text-white shadow-sm ring-2 ring-[#ffffff] dark:ring-[#0f172a]">
                        {initial}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium tracking-[-0.015em] text-[#09090B] dark:text-[#f8fafc]">
                            {row.name || "Sin nombre"}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">
                            {row.user_id || "—"}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-xs tabular-nums text-[#1B5CFF]/80 dark:text-[#4B7CFF]/70"
                          aria-hidden
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <WialonStatusBadge status={row.status} />
                        <span
                          className={cn(
                            wialonUiBadge,
                            createdBySelf
                              ? "bg-[#F1F5FF] text-[#1244D1] ring-1 ring-[#1B5CFF]/20 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF] dark:ring-[#1B5CFF]/25"
                              : "bg-[#FAFAFA] text-[#52525B] ring-1 ring-[#E7E7EA] dark:bg-[#243048] dark:text-[#cbd5e1] dark:ring-[#273244]",
                          )}
                        >
                          {createdBySelf ? "Creada aquí" : "Cuenta hija"}
                        </span>
                        <span
                          className={cn(
                            wialonUiBadge,
                            "bg-[#FAFAFA] text-[#52525B] ring-1 ring-[#E7E7EA] dark:bg-[#111827] dark:text-[#B7C1D1] dark:ring-[#273244]",
                          )}
                        >
                          {row.assigned_units} und.
                        </span>
                        {row.dealer_rights === "Sí" ? (
                          <span
                            className={cn(
                              wialonUiBadge,
                              "bg-[#F1F5FF] text-[#1244D1] ring-1 ring-[#1B5CFF]/25 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF]",
                            )}
                          >
                            Distribuidor
                          </span>
                        ) : null}
                      </div>

                      {onOpenUser ? (
                        <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B5CFF] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-[#4B7CFF]">
                          Abrir cuenta
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
