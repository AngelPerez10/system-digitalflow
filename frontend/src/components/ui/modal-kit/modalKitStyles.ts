/** Botones de los modales de la app (ver ModalKit). */

/** Pie de modal: compacto pero ≥44px en sm+ (WCAG/touch). */
const btnBase =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold [&_svg]:size-3.5 sm:min-h-11 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[14px] sm:[&_svg]:size-4 tracking-[-0.1px] transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100";

export const appModalBtn = {
  secondary: `${btnBase} border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] focus-visible:ring-[rgba(27,92,255,0.18)] disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]`,
  primary: `${btnBase} border border-[#1B5CFF] bg-[#1B5CFF] text-white hover:border-[#1244D1] hover:bg-[#1244D1] focus-visible:ring-[rgba(27,92,255,0.25)] disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0]`,
  danger: `${btnBase} border border-[#C22B2B] bg-[#C22B2B] text-white hover:border-[#A82424] hover:bg-[#A82424] focus-visible:ring-[rgba(194,43,43,0.25)] disabled:opacity-60 dark:border-[#DC3E3E] dark:bg-[#DC3E3E] dark:hover:bg-[#C22B2B]`,
} as const;

