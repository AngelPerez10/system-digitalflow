import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Alert from "../../components/ui/alert/Alert";
import { Modal } from "../../components/ui/modal";
import { apiUrl } from "../../config/api";

export default function OrdenPdfPage() {
  const params = useParams();
  const ordenId = params.id;

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("orden.pdf");
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
            message: "Inicia sesión para ver el PDF de la orden.",
          });
          setLoading(false);
        }
        return;
      }

      if (!ordenId) {
        if (isMounted) {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se encontró el ID de la orden." });
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const resp = await fetch(apiUrl(`/api/ordenes/${ordenId}/pdf/`), {
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

        const dispo = resp.headers.get("content-disposition") || "";
        const m = dispo.match(/filename="?([^";]+)"?/i);
        const nextFilename = m?.[1] ? String(m[1]) : `Orden_Servicio_${ordenId}.pdf`;
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
  }, [ordenId]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageMeta title="PDF Orden de Servicio" description="Vista de PDF de Orden de Servicio" />
      
      {/* Header con breadcrumb */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <PageBreadcrumb pageTitle="PDF Orden de Servicio" />
        </div>
      </div>

      {/* Modal de carga */}
      <Modal isOpen={loading} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 dark:border-t-brand-500 animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Generando PDF
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Preparando documento con fotos y firmas...
            </p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-brand-600 dark:bg-brand-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Alertas */}
      {alert.show && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
          
          {/* Header con acciones */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M7 15h10" />
                    <path d="M7 18h7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Orden de Servicio
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {filename}
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={pdfObjectUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  aria-disabled={!pdfObjectUrl}
                  onClick={(e) => {
                    if (!pdfObjectUrl) e.preventDefault();
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline">Abrir en nueva pestaña</span>
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Descargar
                </button>
              </div>
            </div>
          </div>

          {/* Visor de PDF */}
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
                <iframe
                  title="PDF Preview"
                  src={pdfObjectUrl}
                  className="w-full h-[calc(100vh-280px)] min-h-[600px]"
                />
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
