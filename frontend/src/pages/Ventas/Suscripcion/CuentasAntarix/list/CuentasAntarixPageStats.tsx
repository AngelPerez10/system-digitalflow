/**
 * Hero pills — métricas inline dentro de la banda navy,
 * igual que FacturasCfdiPage y CotizacionesPage.
 * En móvil: rejilla de 3 columnas a ancho completo; en lg: pastillas sueltas.
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
      className="grid w-full shrink-0 grid-cols-3 gap-1.5 sm:gap-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center"
      role="group"
      aria-label="Resumen de cuentas"
    >
      {pills.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col items-start gap-1.5 rounded-2xl bg-white/10 px-2.5 py-2.5 sm:inline-flex sm:h-13 sm:flex-row sm:items-center sm:gap-3 sm:rounded-3xl sm:px-4 sm:py-0"
        >
          <span
            className={`hidden size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 sm:inline-flex ${
              item.gold ? "text-[#E6A23C]" : "text-white/80"
            }`}
            aria-hidden
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
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55 sm:text-[10px] sm:tracking-widest">
              {item.label}
            </p>
            <p className="mt-0.5 text-[16px] font-semibold tabular-nums leading-none text-white sm:mt-0 sm:text-[18px]">
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
