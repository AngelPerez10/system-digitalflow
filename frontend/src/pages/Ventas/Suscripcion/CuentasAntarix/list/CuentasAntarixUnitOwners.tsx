/**
 * Cuentas a las que está asignada una unidad: la primera con su inicial y
 * nombre, y «+N» con el resto (lista completa en el `title`). «Sin cuenta»
 * en ámbar cuando no tiene ninguna. Si la unidad está compartida, se omite
 * «antarixgps» (la cuenta que crea todas); si es la única, sí se muestra.
 */
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAA_TONE } from "../shared/cuentasAntarixTonos";
import { accountInitial } from "../shared/wialonAccountUtils";
import type { WialonUnitSearchEntry } from "../shared/wialonTypes";

/** Cuenta que crea todas las demás: no se lista si la unidad está compartida con alguien más. */
const CUENTA_CREADORA = "antarixgps";

function esCreadora(u: WialonUnitSearchEntry["users"][number]): boolean {
  return [u.name, u.user_id].some((v) => String(v || "").trim().toLowerCase() === CUENTA_CREADORA);
}

export function CaaUnitOwners({ users }: { users: WialonUnitSearchEntry["users"] }) {
  const todas = users ?? [];
  const visibles = todas.length > 1 && todas.some((u) => !esCreadora(u)) ? todas.filter((u) => !esCreadora(u)) : todas;
  const nombres = visibles.map((u) => u.name || u.user_id || `ID ${u.wialon_id}`).filter(Boolean);
  if (nombres.length === 0) {
    return (
      <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset", CAA_TONE.sinUnidades)}>
        <UserRound className="size-3.5" aria-hidden />
        Sin cuenta
      </span>
    );
  }
  const [primera, ...resto] = nombres;
  return (
    <span className="flex min-w-0 items-center gap-2" title={nombres.join(" · ")}>
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[10.5px] font-bold text-[#1244D1] ring-1 ring-inset ring-[#CFDCFF] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF] dark:ring-[#2C3F7A]"
        aria-hidden
      >
        {accountInitial(primera)}
      </span>
      <span className="min-w-0 truncate text-[12.5px] font-medium text-[#27272A] dark:text-[#E2E8F0]">{primera}</span>
      {resto.length > 0 ? (
        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[#F4F4F5] px-1.5 text-[11px] font-semibold tabular-nums text-[#52525B] dark:bg-white/[0.07] dark:text-[#B7C1D1]">
          +{resto.length}
        </span>
      ) : null}
    </span>
  );
}
