/**
 * Tokens visuales de Gestión de usuarios (clases Tailwind).
 *
 * Tipografía idéntica a Productos (ProductosYServicios/ProductosPage):
 * Geist, títulos de banda 26/32 bold, cuerpo y campos 15 px, etiquetas 13 px
 * medium, botones 15 px medium. Los diálogos se montan en un portal fuera
 * del contenedor de la página, por eso cada cascarón declara `fontSans`.
 */

export const sansStyle = { fontFamily: 'Geist, Outfit, system-ui, sans-serif' } as const;

/** Misma familia que `sansStyle`, como clase (para portales: diálogos, avisos). */
export const fontSans = '[font-family:Geist,Outfit,system-ui,sans-serif]';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]';

/* --- Tipografía --------------------------------------------------------- */

export const heroHeadingClass =
  'text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]';

export const heroBodyClass = 'text-[15px] leading-[22px] tracking-[-0.1px] text-white/70';

export const heroEyebrowClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55';

export const cardTitleClass = 'text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]';

export const cardDescClass = 'mt-1 text-[14px] leading-[20px] text-[#6E6E77] dark:text-[#8EA0B8]';

export const labelClass = 'mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]';

export const hintClass = 'mt-1.5 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]';

export const eyebrowClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]';

/* --- Campos ------------------------------------------------------------- */

export const inputClass =
  'h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-[#6E6E77] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]';

export const searchInputClass = `${inputClass} pl-10 pr-10`;

export const selectClass = `${inputClass} cursor-pointer pr-8`;

/* --- Superficies -------------------------------------------------------- */

export const cardShellClass =
  'rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]';

/** Cascarón de los diálogos grandes (alta/edición y permisos). */
export const formModalShellClass = `${fontSans} max-h-[min(94dvh,880px)] overflow-hidden rounded-t-[20px] border border-[#E4E4E7] bg-white! p-0 shadow-[0_32px_64px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:max-w-2xl sm:rounded-[20px]`;

/* --- Botones (mismas medidas que Productos) ----------------------------- */

const btnBase = `cot-press inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-medium tracking-[-0.1px] disabled:cursor-not-allowed [&_svg]:size-4 ${focusRing}`;

export const btn = {
  primary: `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] text-white hover:border-[#1244D1] hover:bg-[#1244D1] disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0]`,
  secondary: `${btnBase} border border-[#E7E7EA] bg-white text-[#09090B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]`,
  ghost: `${btnBase} border border-transparent bg-transparent text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.07)] disabled:opacity-50 dark:text-[#7EA0FF] dark:hover:bg-[rgba(75,124,255,0.12)]`,
  dangerGhost: `${btnBase} border border-transparent bg-transparent text-[#C22B2B] hover:bg-[#FEF2F2] disabled:opacity-50 dark:text-[#F87171] dark:hover:bg-[#3F1518]`,
  danger: `${btnBase} border border-[#C22B2B] bg-[#C22B2B] text-white hover:border-[#A82424] hover:bg-[#A82424] disabled:opacity-60 dark:border-[#DC3E3E] dark:bg-[#DC3E3E] dark:hover:bg-[#C22B2B]`,
} as const;

/** Botón compacto (barra de herramientas, dentro de paneles). */
export const btnSm = 'h-10 px-4 text-[14px]';

export const iconBtn = `cot-press inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-transparent text-[#6E6E77] hover:border-[#E7E7EA] hover:bg-white hover:text-[#09090B] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#8EA0B8] dark:hover:border-[#273244] dark:hover:bg-[#151E32] dark:hover:text-[#F8FAFC] [&_svg]:size-[18px] ${focusRing}`;
