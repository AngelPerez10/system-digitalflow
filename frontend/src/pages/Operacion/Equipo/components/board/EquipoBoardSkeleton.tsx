/** Esqueleto del tablero mientras llega la primera carga (reserva el espacio, sin saltos). */
const bar = "rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]";

export function EquipoBoardSkeleton({ desktop }: { desktop: boolean }) {
  if (!desktop) {
    return (
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-[16px] border border-[#E4E4E7] bg-white p-4 dark:border-[#273244] dark:bg-[#111827]" style={{ opacity: 1 - i * 0.15 }}>
            <div className="flex items-center gap-3">
              <span className={`size-9 ${bar}`} />
              <span className="flex-1 space-y-2">
                <span className={`block h-3 w-32 ${bar}`} />
                <span className={`block h-2.5 w-20 ${bar}`} />
              </span>
            </div>
            <span className={`mt-4 block h-14 rounded-[10px]! ${bar}`} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E4E4E7] bg-white dark:border-[#273244] dark:bg-[#111827]" aria-hidden>
      <div className="grid grid-cols-[13rem_repeat(7,minmax(0,1fr))] border-b border-[#E4E4E7] dark:border-[#273244] xl:grid-cols-[15rem_repeat(7,minmax(0,1fr))]">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-3.5">
            <span className={`h-3 ${i === 0 ? "w-20" : "w-10"} ${bar}`} />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }, (_, r) => (
        <div
          key={r}
          className="grid grid-cols-[13rem_repeat(7,minmax(0,1fr))] border-t border-[#EDEDF0] first:border-t-0 dark:border-[#1F2A3C] xl:grid-cols-[15rem_repeat(7,minmax(0,1fr))]"
          style={{ opacity: 1 - r * 0.14 }}
        >
          <div className="flex items-center gap-3 px-3.5 py-4">
            <span className={`size-9 shrink-0 ${bar}`} />
            <span className="flex-1 space-y-2">
              <span className={`block h-3 w-24 ${bar}`} />
              <span className={`block h-2.5 w-16 ${bar}`} />
            </span>
          </div>
          {Array.from({ length: 7 }, (_, c) => (
            <div key={c} className="p-1.5">
              {(r + c) % 3 === 0 ? <span className={`block h-16 rounded-[10px]! ${bar}`} /> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
