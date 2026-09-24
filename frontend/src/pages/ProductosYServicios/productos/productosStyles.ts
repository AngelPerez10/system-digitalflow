/**
 * Tokens visuales de Productos.
 *
 * Mismo sistema que Inventario, Gestión de usuarios y Cotizaciones: marino +
 * dorado sobre lienzo blanco, azul eléctrico (#1B5CFF) como único acento de
 * acción, líneas de 1 px, tipografía Geist. Los diálogos viven en un portal,
 * por eso su cascarón declara `fontSans`.
 */

export const sansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;
export const fontSans = "[font-family:Geist,Outfit,system-ui,sans-serif]";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

export const cardShell =
  "rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

export const heroHeading =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

export const fieldLabel = "mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

export const requiredMark = "ml-0.5 text-[#C22B2B] dark:text-[#F87171]";

export const input =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

export const textarea = `${input} h-auto min-h-[110px] resize-y py-2.5`;

export const select = `${input} cursor-pointer pr-8`;

const btnBase = `cot-press inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-medium tracking-[-0.1px] disabled:cursor-not-allowed [&_svg]:size-4 ${focusRing}`;

export const btn = {
  primary: `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] text-white hover:border-[#1244D1] hover:bg-[#1244D1] disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0]`,
  secondary: `${btnBase} border border-[#E7E7EA] bg-white text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]`,
  ghost: `${btnBase} border border-transparent bg-transparent text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.07)] disabled:opacity-50 dark:text-[#7EA0FF] dark:hover:bg-[rgba(75,124,255,0.12)]`,
  danger: `${btnBase} border border-[#C22B2B] bg-[#C22B2B] text-white hover:border-[#A82424] hover:bg-[#A82424] disabled:opacity-60`,
} as const;

export const iconBtn = `cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[#E7E7EA] bg-white text-[#6E6E77] hover:border-[#D3D3D8] hover:text-[#09090B] disabled:opacity-40 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC] [&_svg]:size-4 ${focusRing}`;

/** Cascarón de diálogos (hoja inferior en móvil). */
export const modalShell = `${fontSans} flex max-h-[min(94dvh,900px)] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.4)] dark:border-[#273244] dark:bg-[#111827]! sm:rounded-[20px]`;

export const modalHeader = "relative shrink-0 overflow-hidden bg-[#17235B] px-5 pb-5 pt-5 pr-16 dark:bg-[#1B2A63] sm:px-6";
export const modalEyebrow = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
export const modalTitle = "mt-1 text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";
export const modalSubtitle = "mt-1 text-[14px] leading-[20px] text-white/70";
export const modalFooter =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-end sm:px-6";
export const modalClose =
  "absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40";
