import { ClienteSimplifiedFormFields } from "@/components/clientes/ClienteSimplifiedFormFields";
import { ClienteMapPickerModal } from "@/components/clientes/ClienteMapPickerModal";
import { emptyFormData } from "@/components/clientes/clienteFormShared";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { fetchSicarApi } from "./sicarApi";
import { fetchCotizacionDetail, searchCotizacionesLite } from "@/pages/Ventas/Cotizacion/cotizacionApi";
import { useCallback, useEffect, useMemo, useState } from "react";
import ComprobanteFiscalTab from "./ComprobanteFiscalTab";
import CotizacionFacturaTab from "./CotizacionFacturaTab";
import {
  type CatalogOption,
  type CotizacionOrigen,
  type FacturaConceptoForm,
  type NuevaFacturaCfdiPayload,
  type SicarClienteOption,
  type SicarSerieOption,
  conceptosFromDigitalFlowItems,
  conceptosFromSicarDetalle,
  formDataFromSicarCliente,
  mapSicarClienteRow,
  payloadFromFacturaForm,
} from "./facturaCfdiFormTypes";

const MODAL_TITLE_ID = "nueva-factura-cfdi-title";
const MAP_CONTAINER_ID = "nueva-factura-cfdi-leaflet-map";
const CLIENTE_SEARCH_DEBOUNCE_MS = 300;
const CLIENTE_SEARCH_MIN_CHARS = 2;
const COTIZACION_SEARCH_DEBOUNCE_MS = 300;

type FacturaModalTab = "general" | "more" | "cotizacion" | "comprobante";

const FACTURA_TABS: { id: FacturaModalTab; label: string; shortLabel: string }[] = [
  { id: "general", label: "Datos Básicos", shortLabel: "Básicos" },
  { id: "more", label: "Datos Facturación", shortLabel: "Facturación" },
  { id: "cotizacion", label: "Cotización", shortLabel: "Cotización" },
  { id: "comprobante", label: "Comprobante", shortLabel: "CFDI" },
];

const facturaTabBtnClass =
  "flex min-h-[44px] w-full items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-medium leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]/50 sm:px-3 sm:py-2.5 sm:text-sm";

const facturaTabActiveClass = "border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm";
const facturaTabIdleClass =
  "border-transparent bg-transparent text-[#57534e] hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]";

const SICAR_SERIE_FIJA = "IMA";

const actionButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-w-[8.5rem] sm:w-auto";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (result: { fcf_id?: number; uuid?: string; serie_folio?: string }) => void;
};

export default function NuevaFacturaCfdiModal({ isOpen, onClose, onCreated }: Props) {
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [series, setSeries] = useState<SicarSerieOption[]>([]);
  const [formaPagoOpts, setFormaPagoOpts] = useState<CatalogOption[]>([]);
  const [metodoPagoOpts, setMetodoPagoOpts] = useState<CatalogOption[]>([]);
  const [usoCfdiOpts, setUsoCfdiOpts] = useState<CatalogOption[]>([]);
  const [clienteSearchQuery, setClienteSearchQuery] = useState("");
  const [clientes, setClientes] = useState<SicarClienteOption[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<SicarClienteOption | null>(null);
  const [scfId, setScfId] = useState(2);
  const [formaPago, setFormaPago] = useState("99-Por definir");
  const [metodoPago, setMetodoPago] = useState("PPD-Pago en parcialidades o diferido");
  const [formData, setFormData] = useState<Record<string, unknown>>(emptyFormData());
  const [activeTab, setActiveTab] = useState<FacturaModalTab>("general");
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cotizacionOrigen, setCotizacionOrigen] = useState<CotizacionOrigen>("digitalflow");
  const [cotizacionSearchQuery, setCotizacionSearchQuery] = useState("");
  const [cotizacionOptions, setCotizacionOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCotizacionKey, setSelectedCotizacionKey] = useState("");
  const [cotizacionLabel, setCotizacionLabel] = useState<string | null>(null);
  const [conceptos, setConceptos] = useState<FacturaConceptoForm[]>([]);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [loadingCotizacionDetail, setLoadingCotizacionDetail] = useState(false);

  const resetForm = useCallback(() => {
    setError("");
    setClienteSearchQuery("");
    setClientes([]);
    setSelectedCliente(null);
    setScfId(2);
    setFormaPago("99-Por definir");
    setMetodoPago("PPD-Pago en parcialidades o diferido");
    setFormData(emptyFormData());
    setActiveTab("general");
    setShowMapModal(false);
    setSelectedLocation(null);
    setCotizacionOrigen("digitalflow");
    setCotizacionSearchQuery("");
    setCotizacionOptions([]);
    setSelectedCotizacionKey("");
    setCotizacionLabel(null);
    setConceptos([]);
    setLoadingCotizaciones(false);
    setLoadingCotizacionDetail(false);
  }, []);

  const handleConfirmMap = () => {
    if (!selectedLocation) {
      setShowMapModal(false);
      return;
    }
    const { lat, lng } = selectedLocation;
    setFormData((prev) => ({
      ...prev,
      direccion: `https://www.google.com/maps?q=${lat},${lng}`,
    }));
    setShowMapModal(false);
  };

  const loadCatalogos = useCallback(async () => {
    setLoadingCatalogos(true);
    setError("");
    try {
      const res = await fetchSicarApi("/api/cotizaciones-sicar/catalogos/", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      setSeries(Array.isArray(data?.series) ? data.series : []);
      setFormaPagoOpts(Array.isArray(data?.forma_pago) ? data.forma_pago : []);
      setMetodoPagoOpts(Array.isArray(data?.metodo_pago) ? data.metodo_pago : []);
      setUsoCfdiOpts(Array.isArray(data?.uso_cfdi) ? data.uso_cfdi : []);
      const seriesList: SicarSerieOption[] = Array.isArray(data?.series) ? data.series : [];
      const imaSerie = seriesList.find(
        (s) => String(s.serie || "").trim().toUpperCase() === SICAR_SERIE_FIJA
      );
      if (imaSerie) {
        setScfId(Number(imaSerie.scf_id));
      }
    } catch {
      setError("No se pudieron cargar los catálogos SICAR.");
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  const searchClientes = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < CLIENTE_SEARCH_MIN_CHARS) {
      setClientes([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("q", term);
      params.set("limit", "15");
      const res = await fetchSicarApi(`/api/cotizaciones-sicar/clientes/?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const items = Array.isArray(data?.items) ? data.items : [];
      setClientes(items.map((row: Record<string, unknown>) => mapSicarClienteRow(row)));
    } catch {
      setClientes([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    void loadCatalogos();
  }, [isOpen, loadCatalogos, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => void searchClientes(clienteSearchQuery), CLIENTE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [clienteSearchQuery, isOpen, searchClientes]);

  const searchCotizaciones = useCallback(
    async (q: string, origen: CotizacionOrigen) => {
      setLoadingCotizaciones(true);
      try {
        if (origen === "digitalflow") {
          if (!q.trim() && !selectedCliente) {
            setCotizacionOptions([]);
            return;
          }
          const rows = await searchCotizacionesLite(q, 20);
          setCotizacionOptions(
            rows.map((row) => ({
              value: `df-${row.id}`,
              label: `#${row.idx || row.id} · ${row.cliente} · ${row.fecha || "—"} · $${row.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
            }))
          );
          return;
        }
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (selectedCliente?.cli_id) params.set("cli_id", String(selectedCliente.cli_id));
        params.set("limit", "20");
        const res = await fetchSicarApi(`/api/cotizaciones-sicar/cotizaciones/?${params.toString()}`, {
          method: "GET",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) {
          setCotizacionOptions([]);
          return;
        }
        setCotizacionOptions(
          data.map((row: Record<string, unknown>) => {
            const cotId = Number(row.cot_id);
            const cliente = String(row.cliente_nombre || "—");
            const fecha = String(row.fecha || "").slice(0, 10);
            const total = Number(row.total ?? 0);
            return {
              value: `sicar-${cotId}`,
              label: `#${cotId} · ${cliente} · ${fecha || "—"} · $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
            };
          })
        );
      } catch {
        setCotizacionOptions([]);
      } finally {
        setLoadingCotizaciones(false);
      }
    },
    [selectedCliente?.cli_id]
  );

  useEffect(() => {
    if (!isOpen || activeTab !== "cotizacion") return;
    const t = setTimeout(
      () => void searchCotizaciones(cotizacionSearchQuery, cotizacionOrigen),
      COTIZACION_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [cotizacionSearchQuery, cotizacionOrigen, activeTab, isOpen, searchCotizaciones]);

  const clearCotizacionSelection = useCallback(() => {
    setSelectedCotizacionKey("");
    setCotizacionLabel(null);
    setConceptos([]);
  }, []);

  const handleCotizacionOrigenChange = (origen: CotizacionOrigen) => {
    setCotizacionOrigen(origen);
    setCotizacionSearchQuery("");
    clearCotizacionSelection();
    setCotizacionOptions([]);
  };

  const loadDigitalFlowCotizacion = useCallback(
    async (id: number, label: string) => {
      setLoadingCotizacionDetail(true);
      setError("");
      try {
        const detail = await fetchCotizacionDetail(id);
        if (!detail?.items?.length) {
          setError("La cotización no tiene conceptos para importar.");
          clearCotizacionSelection();
          return;
        }
        const mapped = conceptosFromDigitalFlowItems(detail.items, Number(detail.iva_pct) || 16);
        if (!mapped.length) {
          setError("No se pudieron mapear conceptos de la cotización.");
          clearCotizacionSelection();
          return;
        }
        setSelectedCotizacionKey(`df-${id}`);
        setCotizacionLabel(label);
        setConceptos(mapped);
      } catch {
        setError("No se pudo cargar la cotización de DigitalFlow.");
        clearCotizacionSelection();
      } finally {
        setLoadingCotizacionDetail(false);
      }
    },
    [clearCotizacionSelection]
  );

  const clienteOptions = useMemo(
    () =>
      clientes.map((c) => ({
        value: String(c.cli_id),
        label: c.rfc ? `${c.nombre} — ${c.rfc}` : c.nombre,
      })),
    [clientes]
  );

  const applyCliente = useCallback(
    (c: SicarClienteOption) => {
      setSelectedCliente(c);
      setFormData(formDataFromSicarCliente(c, { usoCfdiCatalog: usoCfdiOpts }));
    },
    [usoCfdiOpts]
  );

  const loadClienteDetail = useCallback(
    async (cliId: string): Promise<SicarClienteOption | null> => {
      if (!cliId) return null;
      try {
        const res = await fetchSicarApi(`/api/cotizaciones-sicar/clientes/${cliId}/`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) return null;
        return mapSicarClienteRow(data as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    []
  );

  const handleClienteSelect = (value: string) => {
    if (!value) {
      setSelectedCliente(null);
      setFormData((prev) => ({
        ...prev,
        no_cliente: "",
        clave: "",
        nombre: "",
        representante: "",
        telefono: "",
        celular: "",
      }));
      return;
    }
    const fromList = clientes.find((c) => String(c.cli_id) === value);
    if (fromList) applyCliente(fromList);
    void (async () => {
      const detail = await loadClienteDetail(value);
      if (detail) applyCliente(detail);
    })();
  };

  const loadSicarCotizacion = useCallback(
    async (cotId: number, label: string) => {
      setLoadingCotizacionDetail(true);
      setError("");
      try {
        const res = await fetchSicarApi(`/api/cotizaciones-sicar/cotizaciones/${cotId}/`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          setError(String(data?.detail || "No se pudo cargar la cotización SICAR."));
          clearCotizacionSelection();
          return;
        }
        const items = Array.isArray(data.items) ? data.items : [];
        const mapped = conceptosFromSicarDetalle(items);
        if (!mapped.length) {
          setError("La cotización SICAR no tiene conceptos para importar.");
          clearCotizacionSelection();
          return;
        }
        setSelectedCotizacionKey(`sicar-${cotId}`);
        setCotizacionLabel(label);
        setConceptos(mapped);

        const cliId = Number(data.cli_id);
        if (cliId > 0) {
          const detail = await loadClienteDetail(String(cliId));
          if (detail) applyCliente(detail);
        }
      } catch {
        setError("No se pudo cargar la cotización SICAR.");
        clearCotizacionSelection();
      } finally {
        setLoadingCotizacionDetail(false);
      }
    },
    [applyCliente, clearCotizacionSelection, loadClienteDetail]
  );

  const handleCotizacionSelect = (value: string) => {
    if (!value) {
      clearCotizacionSelection();
      return;
    }
    const option = cotizacionOptions.find((o) => o.value === value);
    const label = option?.label || value;
    if (value.startsWith("df-")) {
      const id = Number(value.slice(3));
      if (id > 0) void loadDigitalFlowCotizacion(id, label);
      return;
    }
    if (value.startsWith("sicar-")) {
      const cotId = Number(value.slice(6));
      if (cotId > 0) void loadSicarCotizacion(cotId, label);
    }
  };

  const selectedSerie = useMemo(
    () =>
      series.find((s) => String(s.serie || "").trim().toUpperCase() === SICAR_SERIE_FIJA) ??
      series.find((s) => s.scf_id === scfId) ??
      null,
    [series, scfId]
  );

  const proximoFolioLabel = useMemo(() => {
    const next = selectedSerie?.next_folio;
    if (next == null || Number.isNaN(Number(next))) return null;
    return `${SICAR_SERIE_FIJA}-${Number(next)}`;
  }, [selectedSerie]);

  const formaPagoClave = useMemo(
    () => formaPago.split("-")[0]?.trim() || formaPago,
    [formaPago]
  );
  const metodoPagoClave = useMemo(
    () => metodoPago.split("-")[0]?.trim() || metodoPago,
    [metodoPago]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente?.cli_id) {
      setError("Selecciona un cliente de SICAR.");
      return;
    }
    if (!selectedSerie?.scf_id) {
      setError(`No se encontró la serie ${SICAR_SERIE_FIJA} en SICAR.`);
      return;
    }
    if (!conceptos.length) {
      setError("Selecciona una cotización con conceptos en la pestaña Cotización.");
      setActiveTab("cotizacion");
      return;
    }
    setSaving(true);
    setError("");
    const payload: NuevaFacturaCfdiPayload = {
      cli_id: selectedCliente.cli_id,
      scf_id: selectedSerie.scf_id,
      forma_pago: formaPago,
      metodo_pago: metodoPago,
      ...payloadFromFacturaForm(formData),
      conceptos,
    };
    try {
      const res = await fetchApi("/api/cotizaciones-sicar/facturas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      onCreated?.({
        fcf_id: data?.fcf_id,
        uuid: data?.uuid,
        serie_folio: data?.serie_folio,
      });
      onClose();
    } catch {
      setError("No se pudo timbrar la factura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabelledBy={MODAL_TITLE_ID}
        className="flex max-h-[min(92dvh,100%)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:max-h-[92vh] sm:rounded-2xl"
      >
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 pr-12 dark:border-[#334155] dark:bg-[#111827] sm:px-5 sm:py-4 sm:pr-14">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c]">
            Ventas · SICAR
          </p>
          <h2
            id={MODAL_TITLE_ID}
            className="mt-1 text-base font-semibold text-[#1c1917] dark:text-[#f8fafc] sm:text-lg"
          >
            Nueva factura CFDI
          </h2>
          <p className="mt-1 text-xs text-[#57534e] dark:text-[#94a3b8] sm:text-sm">
            Captura el receptor y datos del comprobante para timbrar en SICAR.
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {error ? (
            <div className="shrink-0 px-4 pt-4 sm:px-5">
              <div
                className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                role="alert"
              >
                {error}
              </div>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
                {loadingCatalogos ? (
                  <p className="text-xs text-[#78716c] dark:text-[#94a3b8]" role="status">
                    Conectando con SICAR…
                  </p>
                ) : null}
                <div
                  className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]/80 min-[560px]:grid-cols-4"
                  role="tablist"
                  aria-label="Secciones de la factura"
                >
                  {FACTURA_TABS.map((tab) => {
                    const selected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`factura-tab-${tab.id}`}
                        aria-selected={selected}
                        aria-controls={`factura-panel-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${facturaTabBtnClass} ${selected ? facturaTabActiveClass : facturaTabIdleClass}`}
                      >
                        <span className="min-[560px]:hidden">{tab.shortLabel}</span>
                        <span className="hidden min-[560px]:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  id={`factura-panel-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`factura-tab-${activeTab}`}
                  className="min-w-0"
                >
                  {activeTab === "comprobante" ? (
                    <ComprobanteFiscalTab
                      proximoFolioLabel={proximoFolioLabel}
                      formaPago={formaPago}
                      metodoPago={metodoPago}
                      formaPagoClave={formaPagoClave}
                      metodoPagoClave={metodoPagoClave}
                      formaPagoOpts={formaPagoOpts}
                      metodoPagoOpts={metodoPagoOpts}
                      onFormaPagoChange={setFormaPago}
                      onMetodoPagoChange={setMetodoPago}
                    />
                  ) : activeTab === "cotizacion" ? (
                    <CotizacionFacturaTab
                      origen={cotizacionOrigen}
                      onOrigenChange={handleCotizacionOrigenChange}
                      selectedKey={selectedCotizacionKey}
                      options={cotizacionOptions}
                      onSearchChange={setCotizacionSearchQuery}
                      onSelect={handleCotizacionSelect}
                      loading={loadingCotizaciones}
                      loadingDetail={loadingCotizacionDetail}
                      cotizacionLabel={cotizacionLabel}
                      conceptos={conceptos}
                      disabled={saving}
                    />
                  ) : (
                    <ClienteSimplifiedFormFields
                      formData={formData}
                      setFormData={setFormData}
                      activeTab={activeTab}
                      setActiveTab={(tab) => setActiveTab(tab)}
                      hideContactMeta
                      hideTabs
                      onOpenMap={() => setShowMapModal(true)}
                      representanteSelect={{
                        value: selectedCliente ? String(selectedCliente.cli_id) : "",
                        options: clienteOptions,
                        onChange: handleClienteSelect,
                        onSearchChange: setClienteSearchQuery,
                        placeholder: "Escribe al menos 2 caracteres (nombre o RFC)…",
                        disabled: saving,
                      }}
                    />
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6]/95 px-4 py-3 dark:border-[#334155] dark:bg-[#0f172a]/95 sm:px-5 sm:py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className={`${actionButtonClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-400 disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]`}
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                    </svg>
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving || loadingCatalogos}
                    className={`${actionButtonClass} bg-[#ff801f] font-semibold text-black hover:bg-[#ff6a00] focus-visible:outline-[#ff801f] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[11rem]`}
                  >
                    {saving ? (
                      <>
                        <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 14.93-4" />
                        </svg>
                        <span>Timbrando…</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="sm:hidden">Timbrar</span>
                        <span className="hidden sm:inline">Timbrar y guardar</span>
                      </>
                    )}
                  </button>
                </div>
              </footer>
            </form>
        </div>
      </Modal>

      <ClienteMapPickerModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        mapContainerId={MAP_CONTAINER_ID}
        direccion={String(formData.direccion || "")}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        onConfirm={handleConfirmMap}
      />
    </>
  );
}
