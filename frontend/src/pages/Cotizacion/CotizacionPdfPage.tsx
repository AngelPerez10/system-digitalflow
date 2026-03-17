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
  const [loadingProgress, setLoadingProgress] = useState(8);
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
          } catch { }

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
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(8);

    const interval = window.setInterval(() => {
      setLoadingProgress((p) => {
        // avanza rápido al inicio y luego desacelera, sin llegar a 100 hasta terminar
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [loading]);

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

      <Modal isOpen={loading} onClose={() => { }} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-7 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-linear-to-r from-brand-500/18 via-blue-500/10 to-brand-500/18 blur-2xl"></div>
              <div className="relative flex items-center justify-center w-[80px] h-[80px] rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-gray-900/70 shadow-theme-md">
                <div className="absolute inset-0 rounded-2xl border border-gray-100/70 dark:border-white/5" />
                <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 border-r-blue-500 dark:border-t-brand-400 dark:border-r-blue-300 animate-spin" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-gray-200/80 dark:border-gray-600/80" />
                  <div className="relative flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-brand-700 dark:text-brand-300"
                      viewBox="0 0 512 512"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105z" />
                      <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                      <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                      <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generando PDF</h3>
            <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>

            <div className="mt-5 w-full">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Progreso</span>
                <span className="tabular-nums">{Math.min(99, Math.max(0, Math.round(loadingProgress)))}%</span>
              </div>
              <div className="mt-2 w-full rounded-full h-2.5 overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-white/10">
                <div
                  className="h-full bg-linear-to-r from-brand-600 via-blue-600 to-brand-600 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                />
              </div>

              <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                Generando archivo de cotización…
              </div>
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
                    Archivo: <span className="font-normal text-gray-800 dark:text-gray-200">{filename}</span>
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