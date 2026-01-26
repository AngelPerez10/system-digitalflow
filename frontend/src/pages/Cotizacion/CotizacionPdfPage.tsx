import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";

export default function CotizacionPdfPage() {
  const params = useParams();
  const cotizacionId = params.id;
  const navigate = useNavigate();

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("cotizacion.pdf");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "error", title: "", message: "" });

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const token = getToken();
      if (!token) {
        if (isMounted) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin sesión",
            message: "Inicia sesión para ver el PDF de la cotización.",
          });
          setLoading(false);
        }
        return;
      }

      if (!cotizacionId) {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID de la cotización." });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const resp = await fetch(apiUrl(`/api/cotizaciones/${cotizacionId}/pdf/`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (!resp.ok) {
          let msg = `No se pudo generar el PDF (HTTP ${resp.status}).`;
          try {
            const ct = resp.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const data = await resp.json();
              msg = (data as any)?.detail || msg;
            } else {
              msg = (await resp.text()) || msg;
            }
          } catch {}

          setAlert({ show: true, variant: "error", title: "Error", message: msg });
          setPdfObjectUrl(null);
          return;
        }

        const ct = (resp.headers.get("content-type") || "").toLowerCase();

        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);

        const isPdf = ct.includes("application/pdf");
        const nextFilename = m?.[1]
          ? String(m[1])
          : (isPdf ? `Cotizacion_${cotizacionId}.pdf` : `Cotizacion_${cotizacionId}.html`);
        setFilename(nextFilename);

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setPdfObjectUrl(url);
      } catch {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo cargar la información." });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [cotizacionId]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageMeta title="PDF Cotización" description="Vista de PDF de Cotización" />

      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 shadow-theme-xs"
              aria-label="Regresar a cotizaciones"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="hidden sm:inline">Cotizaciones</span>
                <span className="hidden sm:inline">/</span>
                <span className="font-medium text-gray-700 dark:text-gray-200 truncate">PDF Cotización</span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug truncate">
                PDF de la Cotización
              </h1>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={loading} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 dark:border-t-brand-500 animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generando PDF</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preparando documento...</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-brand-600 dark:bg-brand-500 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
          </div>
        </div>
      </Modal>

      {alert.show && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-xs border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-linear-to-r from-red-50 via-transparent to-transparent dark:from-red-900/25 dark:via-gray-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shadow-theme-xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M7 15h10" />
                    <path d="M7 18h7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">Vista de PDF de la Cotización</h2>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                    Archivo: <span className="font-medium text-gray-800 dark:text-gray-200">{filename}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Revisa, descarga o abre el documento en una vista dedicada.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <a
                  href={pdfObjectUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-disabled={!pdfObjectUrl}
                  onClick={(e) => {
                    if (!pdfObjectUrl) e.preventDefault();
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">Abrir en nueva pestaña</span>
                  <span className="sm:hidden">Abrir</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (!pdfObjectUrl) return;
                    const a = document.createElement("a");
                    a.href = pdfObjectUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  disabled={!pdfObjectUrl}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs sm:text-sm font-semibold text-white shadow-theme-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-brand-600 dark:border-t-brand-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cargando PDF...</p>
                </div>
              </div>
            ) : pdfObjectUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800">
                <iframe title="PDF Preview" src={pdfObjectUrl} className="w-full h-[70vh] sm:h-[calc(100vh-280px)] min-h-[420px]" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No hay PDF disponible</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">No se pudo cargar el documento</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
