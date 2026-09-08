import { useMemo, useState } from "react";
import { resolveMediaUrl } from "@/config/api";
import type { OrdenCalificacionCliente } from "../../shared/ordenesPageTypes";
import { formatIsoDateTime } from "../../shared/ordenesPageUtils";

export type OrdenCalificacionTabProps = {
  panelId: string;
  labelledBy: string;
  calificacion?: OrdenCalificacionCliente | null;
  /** Nombre del técnico calificado, para dar contexto. */
  tecnicoNombre?: string | null;
  /** Foto de perfil del técnico asignado. */
  tecnicoAvatarUrl?: string | null;
};

const LEYENDA: Record<number, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Regular",
  4: "Bien",
  5: "Excelente",
};

function inicialesDeNombre(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Avatar circular; el nombre al lado cubre a11y (foto/iniciales decorativos). */
function TecnicoAvatar({
  nombre,
  avatarUrl,
}: {
  nombre?: string | null;
  avatarUrl?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const src = useMemo(() => {
    const raw = (avatarUrl || "").trim();
    return raw ? resolveMediaUrl(raw) : "";
  }, [avatarUrl]);
  const label = (nombre || "").trim() || "Técnico";
  const iniciales = inicialesDeNombre(label) || "?";
  const showPhoto = Boolean(src) && !broken;

  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-[#E7E7EA] bg-[#EEF3FF] dark:border-[#273244] dark:bg-[#1A2748]">
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[13px] font-semibold tracking-wide text-[#1B5CFF] dark:text-[#8BB0FF]"
          aria-hidden
        >
          {iniciales}
        </span>
      )}
    </div>
  );
}

function Estrellas({ valor }: { valor: number }) {
  const n = Math.max(0, Math.min(5, Math.round(valor)));
  return (
    <div className="flex items-center gap-1" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-6 w-6 ${i <= n ? "text-[#F5A623]" : "text-[#E7E7EA] dark:text-[#273244]"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.5l2.72 5.51 6.08.88-4.4 4.29 1.04 6.06L12 16.98l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88L12 2.5z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Pestaña de solo lectura (solo admin) con la calificación y el comentario que
 * el cliente dejó en el portal.
 * El técnico no ve la calificación: el backend no la envía a cuentas no-staff.
 */
export function OrdenCalificacionTab({
  panelId,
  labelledBy,
  calificacion,
  tecnicoNombre,
  tecnicoAvatarUrl,
}: OrdenCalificacionTabProps) {
  const tieneTecnico = Boolean(
    (tecnicoNombre || "").trim() || (tecnicoAvatarUrl || "").trim(),
  );

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className="space-y-4 focus:outline-none"
    >
      <div className="rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 text-[12px] leading-relaxed text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a]/40 dark:text-[#B7C1D1]">
        Calificación del cliente en el portal. Visible solo para administración;
        el técnico no ve la calificación.
      </div>

      {tieneTecnico ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#E7E7EA] bg-white px-4 py-3 dark:border-[#273244] dark:bg-[#111827]">
          <TecnicoAvatar nombre={tecnicoNombre} avatarUrl={tecnicoAvatarUrl} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
              Técnico calificado
            </p>
            <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-white">
              {(tecnicoNombre || "").trim() || "Sin nombre"}
            </p>
          </div>
        </div>
      ) : null}

      {!calificacion ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#E7E7EA] px-4 py-10 text-center dark:border-[#273244]">
          <svg
            className="h-8 w-8 text-[#8EA0B8]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="M12 2.5l2.72 5.51 6.08.88-4.4 4.29 1.04 6.06L12 16.98l-5.44 2.86 1.04-6.06-4.4-4.29 6.08-.88L12 2.5z" strokeLinejoin="round" />
          </svg>
          <p className="text-[14px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
            Sin calificación todavía
          </p>
          <p className="max-w-xs text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
            El cliente aún no califica este servicio. Aparecerá aquí en cuanto lo
            haga desde el portal.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-[#E7E7EA] bg-white p-4 dark:border-[#273244] dark:bg-[#111827]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Estrellas valor={calificacion.estrellas} />
              <span className="text-[15px] font-semibold text-[#09090B] dark:text-white">
                {calificacion.estrellas}.0
                <span className="ml-1 text-[13px] font-normal text-[#6E6E77] dark:text-[#8EA0B8]">
                  · {LEYENDA[Math.round(calificacion.estrellas)] ?? ""}
                </span>
              </span>
            </div>
            {calificacion.fecha_creacion ? (
              <time
                className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]"
                dateTime={calificacion.fecha_creacion}
              >
                {formatIsoDateTime(calificacion.fecha_creacion)}
              </time>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
              Comentario del cliente
            </p>
            {calificacion.comentario?.trim() ? (
              <pre className="whitespace-pre-wrap wrap-break-word rounded-lg border border-[#E7E7EA] bg-[#FAFAFA] p-3 text-[13px] leading-relaxed text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a]/40 dark:text-[#B7C1D1]">
                {calificacion.comentario}
              </pre>
            ) : (
              <p className="rounded-lg border border-dashed border-[#E7E7EA] p-3 text-[13px] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
                El cliente no dejó comentario.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
