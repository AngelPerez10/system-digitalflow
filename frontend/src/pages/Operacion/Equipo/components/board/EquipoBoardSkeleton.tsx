/** Esqueleto de la lista mientras llega la primera carga (reserva el espacio, sin saltos). */
const bar = "rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]";

export function EquipoBoardSkeleton({ desktop }: { desktop: boolean }) {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex gap-2 rounded-[16px] border border-[#E4E4E7] bg-white p-2 dark:border-[#273244] dark:bg-[#111827]">
        {Array.from({ length: desktop ? 8 : 4 }, (_, i) => (
          <span key={i} className={`h-11 flex-1 rounded-[11px]! ${bar}`} />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, r) => (
        <div key={r} className="overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white dark:border-[#273244] dark:bg-[#111827]" style={{ opacity: 1 - r * 0.2 }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`size-9 shrink-0 ${bar}`} />
            <span className="flex-1 space-y-2">
              <span className={`block h-3 w-32 ${bar}`} />
              <span className={`block h-2.5 w-20 ${bar}`} />
            </span>
          </div>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-t border-[#F2F2F4] px-5 py-4 dark:border-[#1B2436]">
              <span className={`size-8 shrink-0 rounded-[9px]! ${bar}`} />
              <span className={`h-3 w-24 ${bar}`} />
              <span className={`h-3 flex-1 ${bar}`} />
              <span className={`hidden h-3 w-20 sm:block ${bar}`} />
              <span className={`hidden h-5 w-24 md:block ${bar}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
