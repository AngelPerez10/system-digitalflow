import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useNavigate } from "react-router-dom";

const COTIZACIONES_STORAGE_KEY = "cotizaciones";

interface CotizacionRow {
  id: string;
  folio: string;
  fecha: string; // YYYY-MM-DD
  vencimiento: string; // YYYY-MM-DD
  creadaPor: string;
  cliente: string;
  correo?: string;
  monto: string; // formatted currency
  pdfUrl?: string;
}

export default function CotizacionesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [rows, setRows] = useState<CotizacionRow[]>([]);

  const formatMoney = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(COTIZACIONES_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        const mapped: CotizacionRow[] = list.map((x: any) => ({
          id: String(x?.id ?? ""),
          folio: String(x?.folio ?? ""),
          fecha: String(x?.fecha ?? ""),
          vencimiento: String(x?.vencimiento ?? ""),
          creadaPor: String(x?.creadaPor ?? "—"),
          cliente: String(x?.cliente ?? "—"),
          correo: undefined,
          monto: formatMoney(Number(x?.total ?? 0)),
          pdfUrl: undefined,
        }));
        setRows(mapped);
      } catch {
        setRows([]);
      }
    };

    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === COTIZACIONES_STORAGE_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const shownList = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.folio.toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        (r.correo || "").toLowerCase().includes(q) ||
        r.creadaPor.toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />
      <PageBreadcrumb pageTitle="Cotizaciones" />

      <div className="grid gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Cotizaciones</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{rows.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Cotizaciones</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/cotizacion/nueva")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva Cotización
          </button>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Folio</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Fecha</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Vencimiento</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/5 text-gray-700 dark:text-gray-300">Creada por</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Cliente</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Monto</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">PDF</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-1/6 text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                {shownList.map((r, idx) => (
                  <TableRow key={r.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-2 py-1.5 w-1/12 whitespace-nowrap">{r.folio}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{formatDMY(r.fecha)}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{formatDMY(r.vencimiento)}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/5 whitespace-nowrap">{r.creadaPor}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white">{r.cliente}</span>
                        {r.correo && <span className="text-[11px] text-gray-500 dark:text-gray-400">{r.correo}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{r.monto}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6">
                      {r.pdfUrl ? (
                        <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400 text-xs">
                          Abrir PDF
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center w-1/6">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => navigate(r.id ? `/cotizacion/${r.id}/editar` : "/cotizacion/nueva")}
                          className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { }}
                          className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                          title="Eliminar"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!shownList.length && (
                  <TableRow>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2 text-center text-sm text-gray-500">Sin cotizaciones</TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}
