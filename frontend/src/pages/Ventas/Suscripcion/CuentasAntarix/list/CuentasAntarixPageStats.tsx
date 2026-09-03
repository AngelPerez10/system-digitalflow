/**
 * Hero pills — métricas inline dentro de la banda navy,
 * igual que FacturasCfdiPage y CotizacionesPage.
 */
type Props = {
  activeView: "cuentas" | "unidades";
  totalUsers: number;
  activeUsers: number;
  shownUsers: number;
  totalUnits: number;
  activeUnits: number;
  shownUnits: number;
  loading: boolean;
  unitIndexLoading: boolean;
};

export default function CuentasAntarixPageStats({
  activeView,
  totalUsers,
  activeUsers,
  shownUsers,
  totalUnits,
  activeUnits,
  shownUnits,
  loading,
  unitIndexLoading,
}: Props) {
  const isUnits = activeView === "unidades";
  const isLoading = isUnits ? unitIndexLoading : loading;

  const pills: { label: string; value: number | string; gold: boolean }[] = isUnits
    ? [
        { label: "Total unidades", value: isLoading && totalUnits === 0 ? "—" : totalUnits, gold: false },
        { label: "Activas", value: isLoading && totalUnits === 0 ? "—" : activeUnits, gold: true },
        { label: "Mostrando", value: isLoading && totalUnits === 0 ? "—" : shownUnits, gold: false },
      ]
    : [
        { label: "Total usuarios", value: isLoading ? "—" : totalUsers, gold: false },
        { label: "Activos", value: isLoading ? "—" : activeUsers, gold: true },
        { label: "Mostrando", value: isLoading ? "—" : shownUsers, gold: false },
      ];

  return (
    <div
      className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto"
      role="group"
      aria-label="Resumen de cuentas"
    >
      {pills.map((item) => (
        <div
          key={item.label}
          className="inline-flex h-[3.25rem] items-center gap-3 rounded-[16px] bg-white/10 px-4"
        >
          <span
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 ${
              item.gold ? "text-[#E6A23C]" : "text-white/80"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              {item.label.startsWith("Activ") ? (
                <>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" />
                </>
              ) : item.label === "Mostrando" ? (
                <>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                  <path d="M20 22a8 8 0 1 0-16 0" />
                </>
              )}
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
              {item.label}
            </p>
            <p className="text-[18px] font-semibold tabular-nums leading-none text-white">
              {typeof item.value === "number"
                ? item.value.toLocaleString("es-MX")
                : item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
