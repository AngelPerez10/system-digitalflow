import { useCallback, useEffect, useState } from "react";
import { listInventarioMovimientos } from "../shared/inventarioApi";
import type { InventarioItem, InventarioMovimiento } from "../shared/inventarioTypes";
import InventarioMovimientosList from "./InventarioMovimientosList";
import InventarioPagination from "./InventarioPagination";

const PAGE_SIZE = 10;

type InventarioItemHistorialTabProps = {
  item: InventarioItem;
  /** Se incrementa tras guardar salidas para forzar recarga. */
  refreshKey?: number;
  labelledBy: string;
  panelId: string;
};

export default function InventarioItemHistorialTab({
  item,
  refreshKey = 0,
  labelledBy,
  panelId,
}: InventarioItemHistorialTabProps) {
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listInventarioMovimientos({
          item: item.id,
          page: pageNum,
          page_size: PAGE_SIZE,
        });
        setMovimientos(data.results);
        setCount(data.count);
        const maxPage = Math.max(1, Math.ceil(data.count / PAGE_SIZE) || 1);
        if (pageNum > maxPage) setPage(maxPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
        setMovimientos([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    },
    [item.id],
  );

  useEffect(() => {
    setPage(1);
  }, [item.id]);

  useEffect(() => {
    void load(page);
  }, [load, page, refreshKey]);

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="min-h-0 space-y-3"
    >
      <p className="text-sm text-[#52525B] dark:text-[#B7C1D1]">
        Movimientos de{" "}
        <strong className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
          {item.nombre.trim() || item.modelo || item.codigo_barras}
        </strong>
        , del más reciente al más antiguo.
      </p>

      {error ? (
        <p className="text-sm text-[#C22B2B] dark:text-[#F87171]" role="alert">
          {error}
        </p>
      ) : null}

      <InventarioMovimientosList
        movimientos={movimientos}
        loading={loading}
        filterItem={item}
        onClearFilter={() => undefined}
        itemScoped
      />

      {!loading && count > 0 ? (
        <InventarioPagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={count}
          onPageChange={setPage}
          labelSingular="movimiento"
          labelPlural="movimientos"
        />
      ) : null}
    </div>
  );
}
