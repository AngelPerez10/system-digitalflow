/**
 * Tokens de estilo de los modales de cliente (sin componentes, para que
 * Fast Refresh funcione en `FormUi.tsx`). Mismo lenguaje que el resto de la
 * app: marino + dorado, azul eléctrico como único acento de acción.
 */

export const formFont = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

const btnShape = {
  md: "h-11 px-5 text-[14px]",
  sm: "h-9 px-4 text-[13px]",
} as const;

const btnBase = (size: keyof typeof btnShape) =>
  `cot-press inline-flex items-center justify-center gap-2 rounded-[10px] font-medium tracking-[-0.1px] disabled:cursor-not-allowed max-sm:w-full ${btnShape[size]}`;

const primaryTone = `border border-[#1B5CFF] bg-[#1B5CFF] font-semibold text-white hover:border-[#1244D1] hover:bg-[#1244D1] disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] ${focusRing}`;
const secondaryTone = `border border-[#E7E7EA] bg-white text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] ${focusRing}`;
const dangerTone =
  "border border-[#C22B2B] bg-[#C22B2B] font-semibold text-white hover:bg-[#A82424] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)]";

export const btnPrimary = `${btnBase("md")} ${primaryTone}`;
export const btnSecondary = `${btnBase("md")} ${secondaryTone}`;
export const btnDanger = `${btnBase("md")} ${dangerTone}`;

/** Botones compactos (acciones dentro de una tarjeta de la libreta). */
export const btnSmPrimary = `${btnBase("sm")} ${primaryTone}`;
export const btnSmSecondary = `${btnBase("sm")} ${secondaryTone}`;
export const btnSmDanger = `${btnBase("sm")} ${dangerTone}`;

export const btnLink = `rounded-[6px] px-1.5 py-1 text-[12.5px] font-semibold text-[#1244D1] underline-offset-2 hover:underline disabled:opacity-60 dark:text-[#7FA2FF] ${focusRing}`;

export const iconBtn = `cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC] ${focusRing}`;

export const iconDangerBtn = `cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#6E6E77] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-[rgba(248,113,113,0.12)] dark:hover:text-[#F87171] ${focusRing}`;


/* --------------------------------------------------------------------------
   Estructura del modal
   -------------------------------------------------------------------------- */

export const modalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#FAFAFA] p-4 dark:bg-[#0d1420] sm:p-6";

export const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-white px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-[#273244] dark:bg-[#111827] sm:px-6";

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

export const selectClass =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const inputClass =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const textareaClass =
  "w-full resize-none rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

/** Contenedor del teléfono (código de país + dígitos) alineado a los inputs. */
export const phoneShellClass =
  "flex h-11 w-full items-stretch overflow-hidden rounded-[10px] border border-[#E7E7EA] bg-white transition-colors focus-within:border-[#1B5CFF] focus-within:ring-4 focus-within:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:focus-within:border-[#4B7CFF] dark:focus-within:ring-[rgba(75,124,255,0.28)]";

/** Botón píldora secundario (p. ej. «Elegir en el mapa», «Copiar de datos básicos»). */
export const subtleBtn = `cot-press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[rgba(27,92,255,0.08)] px-3 text-[12.5px] font-medium text-[#1244D1] hover:bg-[rgba(27,92,255,0.14)] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF] dark:hover:bg-[rgba(75,124,255,0.22)] ${focusRing}`;
