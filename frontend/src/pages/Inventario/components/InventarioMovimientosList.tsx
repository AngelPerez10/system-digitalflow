import { inventarioEmptyPanelClass, movimientoChipClass } from "../shared/inventarioStyles";
import type { InventarioItem, InventarioMovimiento } from "../shared/inventarioTypes";
import { CloseIcon, HistoryIcon } from "./inventarioIcons";

function formatFecha(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

/** Título corto: usa datos embebidos en el movimiento (paginación no trae toda la tabla). */
function tituloMovimiento(mov: InventarioMovimiento, filterItem: InventarioItem | null): string {
  const item =
    filterItem && filterItem.id === mov.item
      ? filterItem
      : {
          modelo: mov.item_modelo,
          marca: mov.item_marca,
          nombre: mov.item_nombre,
          codigo_barras: mov.item_codigo_barras,
        };
  const modelo = (item.modelo || "").trim();
  const marca = (item.marca || "").trim();
  if (modelo) return marca ? `${marca} · ${modelo}` : modelo;
  const nombre = (item.nombre || "").trim();
  if (!nombre) return item.codigo_barras || `Ítem #${mov.item}`;
  const corto = nombre.includes(" / ") ? nombre.split(" / ")[0]!.trim() : nombre;
  return corto || item.codigo_barras || `Ítem #${mov.item}`;
}

function MovimientoIcon({ tipo }: { tipo: InventarioMovimiento["tipo"] }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tipo === "entrada" ? <path d="M12 5v14m0 0 5-5m-5 5-5-5" /> : <path d="M12 19V5m0 0L7 10m5-5 5 5" />}
    </svg>
  );
}

type InventarioMovimientosListProps = {
  movimientos: InventarioMovimiento[];
  loading: boolean;
  filterItem: InventarioItem | null;
  onClearFilter: () => void;
};

export default function InventarioMovimientosList({
  movimientos,
  loading,
  filterItem,
  onClearFilter,
}: InventarioMovimientosListProps) {
  return (
    <div className="space-y-3">
      {filterItem ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#ff801f]/30 bg-[#fff7ed] px-3 py-2 text-sm dark:border-[#fb923c]/30 dark:bg-[#fb923c]/10">
          <span className="text-[#57534e] dark:text-[#b7c1d1]">
            Filtrando por{" "}
            <strong className="font-medium text-[#1c1917] dark:text-[#f8fafc]">
              {filterItem.nombre.trim() || filterItem.modelo || filterItem.codigo_barras}
            </strong>
          </span>
          <button
            type="button"
            className="ml-auto inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#9a3412] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:text-[#fdba74]"
            onClick={onClearFilter}
          >
            <CloseIcon className="h-3.5 w-3.5" />
            Ver todos
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
          Últimos movimientos registrados. Haz clic en un producto de la tabla para filtrar.
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-[#57534e] dark:text-[#b7c1d1]" role="status" aria-live="polite">
          Cargando historial…
        </p>
      ) : movimientos.length === 0 ? (
        <div className={inventarioEmptyPanelClass}>
          <span
            className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff801f]/15 text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]"
            aria-hidden="true"
          >
            <HistoryIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]">
            {filterItem
              ? "Este ítem aún no tiene movimientos."
              : "Aún no hay movimientos registrados."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#f0e9dd] dark:divide-[#273244]">
          {movimientos.map((mov) => {
            const titulo = tituloMovimiento(mov, filterItem);
            const entrada = mov.tipo === "entrada";
            const quien = mov.usuario_nombre?.trim() || "Usuario desconocido";
            return (
              <li key={mov.id} className="flex items-center gap-3 py-2.5">
                <span className={movimientoChipClass(mov.tipo)}>
                  <MovimientoIcon tipo={mov.tipo} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]"
                    title={mov.item_nombre || titulo}
                  >
                    {titulo}
                  </p>
                  <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
                    {entrada ? "Entrada" : "Salida"} · {formatFecha(mov.creado_en)} · {quien}
                    {mov.nota?.trim() ? ` · ${mov.nota.trim()}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    entrada
                      ? "text-[#047857] dark:text-[#6ee7b7]"
                      : "text-[#b45309] dark:text-[#fcd34d]"
                  }`}
                >
                  {entrada ? "+" : "−"}
                  {mov.cantidad}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
