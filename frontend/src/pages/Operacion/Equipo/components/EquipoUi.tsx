/**
 * Piezas visuales compartidas del tablero Equipo (avatar, status de orden,
 * selector «Mover a…»).
 */
import { useState } from "react";
import { ArrowRightLeft, CalendarClock, Inbox } from "lucide-react";
import { resolveMediaUrl } from "@/config/api";
import type { EquipoDestino } from "../shared/equipoDnd";
import { ordenTone, rowActionBtn } from "../shared/equipoTokens";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

const AVATAR_SIZE = {
  xs: "size-6 text-[9.5px]",
  sm: "size-7 text-[10.5px]",
  md: "size-9 text-[12px]",
  lg: "size-11 text-[14px]",
  xl: "size-16 text-[20px]",
} as const;

/** Avatar de técnico; `id == null` pinta el ícono de la bandeja «Sin asignar». */
export function EquipoAvatar({
  id,
  nombre,
  avatarUrl,
  size = "md",
}: {
  id: number | null;
  nombre: string;
  avatarUrl?: string | null;
  size?: keyof typeof AVATAR_SIZE;
}) {
  const [broken, setBroken] = useState(false);
  const sz = AVATAR_SIZE[size];
  if (id == null) {
    return (
      <span
        className={`${sz} inline-flex shrink-0 items-center justify-center rounded-full bg-[#FFF4E0] text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)] [&_svg]:size-[45%]`}
        aria-hidden
      >
        <Inbox />
      </span>
    );
  }
  const src = avatarUrl && !broken ? resolveMediaUrl(avatarUrl) : "";
  return (
    <span
      className={`${sz} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF3FF] font-semibold text-[#17235B] ring-2 ring-white dark:bg-[#1B2A63] dark:text-[#C9D7FF] dark:ring-[#111827]`}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initials(nombre)
      )}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Status de orden (misma paleta que la tabla de Órdenes)
   -------------------------------------------------------------------------- */

export function OrdenStatusPill({ status }: { status: unknown }) {
  const t = ordenTone(status);
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ring-1 ring-inset ${t.pill}`}>
      <span className={`size-1.5 rounded-full ${t.dot}`} aria-hidden />
      {t.label}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

/** «Mover a…»: `<select>` nativo sobre un botón con ícono (teclado y táctil). */
export function MoverA({
  label,
  destinos,
  currentKey,
  onPick,
  compact = false,
}: {
  label: string;
  destinos: EquipoDestino[];
  currentKey: string;
  onPick: (to: EquipoDestino) => void;
  /** Botón de 28 px (acciones de las tarjetas del tablero). */
  compact?: boolean;
}) {
  const size = compact ? "size-7! rounded-[8px]! [&_svg]:size-3.5!" : "";
  return (
    <span className={`${rowActionBtn} ${size} relative focus-within:ring-4 focus-within:ring-[rgba(27,92,255,0.18)]`} title="Mover a otro técnico">
      <ArrowRightLeft aria-hidden />
      <select
        aria-label={label}
        value=""
        onChange={(e) => {
          const dest = destinos.find((d) => d.key === e.target.value);
          if (dest) onPick(dest);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="" disabled>
          Mover a…
        </option>
        {destinos
          .filter((d) => d.key !== currentKey)
          .map((d) => (
            <option key={d.key} value={d.key}>
              {d.nombre}
            </option>
          ))}
      </select>
    </span>
  );
}

/** «Cambiar día»: `<select>` nativo con los días de la semana (teclado y táctil). */
export function MoverDia({
  label,
  dias,
  actual,
  onPick,
}: {
  label: string;
  /** Opciones: `YYYY-MM-DD` + etiqueta visible («Mié 30»). */
  dias: { ymd: string; label: string }[];
  actual: string;
  onPick: (ymd: string) => void;
}) {
  return (
    <span
      className={`${rowActionBtn} relative size-7! rounded-[8px]! focus-within:ring-4 focus-within:ring-[rgba(27,92,255,0.18)] [&_svg]:size-3.5!`}
      title="Cambiar de día"
    >
      <CalendarClock aria-hidden />
      <select
        aria-label={label}
        value=""
        onChange={(e) => {
          if (e.target.value) onPick(e.target.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="" disabled>
          Cambiar a…
        </option>
        {dias
          .filter((d) => d.ymd !== actual)
          .map((d) => (
            <option key={d.ymd} value={d.ymd}>
              {d.label}
            </option>
          ))}
      </select>
    </span>
  );
}
