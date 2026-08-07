type InventarioPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  labelSingular: string;
  labelPlural: string;
};

export default function InventarioPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  labelSingular,
  labelPlural,
}: InventarioPaginationProps) {
  if (totalCount <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1 && totalCount <= pageSize) {
    // Una sola página: igual mostramos el conteo si hay filas.
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const label = totalCount === 1 ? labelSingular : labelPlural;

  return (
    <div className="border-t border-[#e7ded0] px-1 py-3 dark:border-[#334155]/80 sm:py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando{" "}
          <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
          <span className="font-medium text-gray-900 dark:text-white">{endIndex}</span> de{" "}
          <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> {label}
        </p>

        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {page > 3 ? (
                <>
                  <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                  >
                    1
                  </button>
                  {page > 4 ? <span className="px-1 text-gray-400">…</span> : null}
                </>
              ) : null}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  return Math.abs(p - page) <= 2;
                })
                .map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => onPageChange(p)}
                    aria-current={page === p ? "page" : undefined}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      page === p
                        ? "border-[#ff801f]/30 bg-[#ff801f] text-black"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {p}
                  </button>
                ))}

              {page < totalPages - 2 ? (
                <>
                  {page < totalPages - 3 ? <span className="px-1 text-gray-400">…</span> : null}
                  <button
                    type="button"
                    onClick={() => onPageChange(totalPages)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
