import { ClienteSimplifiedFormFields } from "@/components/clientes/ClienteSimplifiedFormFields";
import { ClienteMapPickerModal } from "@/components/clientes/ClienteMapPickerModal";
import { emptyFormData, modalPanelClass, modalSectionTitleClass, modalTabBaseClass, selectLikeClassName } from "@/components/clientes/clienteFormShared";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CatalogOption,
  type NuevaFacturaCfdiPayload,
  type SicarClienteOption,
  type SicarSerieOption,
  formDataFromSicarCliente,
  mapSicarClienteRow,
  payloadFromFacturaForm,
} from "./facturaCfdiFormTypes";

const MODAL_TITLE_ID = "nueva-factura-cfdi-title";
const MAP_CONTAINER_ID = "nueva-factura-cfdi-leaflet-map";
const CLIENTE_SEARCH_DEBOUNCE_MS = 300;

type FacturaModalTab = "general" | "more" | "comprobante";

const FACTURA_TABS: { id: FacturaModalTab; label: string }[] = [
  { id: "general", label: "Datos Básicos" },
  { id: "more", label: "Datos Facturación" },
  { id: "comprobante", label: "Comprobante" },
];

const actionButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-w-[8.5rem] sm:w-auto";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (result: { fcf_id?: number; uuid?: string; serie_folio?: string }) => void;
};

export default function NuevaFacturaCfdiModal({ isOpen, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi("/api/cotizaciones-sicar/catalogos/", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      setSeries(Array.isArray(data?.series) ? data.series : []);
      setFormaPagoOpts(Array.isArray(data?.forma_pago) ? data.forma_pago : []);
      setMetodoPagoOpts(Array.isArray(data?.metodo_pago) ? data.metodo_pago : []);
      setUsoCfdiOpts(Array.isArray(data?.uso_cfdi) ? data.uso_cfdi : []);
      if (Array.isArray(data?.series) && data.series.length > 0) {
        setScfId(Number(data.series[0].scf_id) || 2);
      }
    } catch {
      setError("No se pudieron cargar los catálogos SICAR.");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchClientes = useCallback(async (q: string) => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetchApi(`/api/cotizaciones-sicar/clientes/?${params.toString()}`, { method: "GET" });
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
        const res = await fetchApi(`/api/cotizaciones-sicar/clientes/${cliId}/`, { method: "GET" });
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

  const selectedSerie = useMemo(
    () => series.find((s) => s.scf_id === scfId) ?? null,
    [series, scfId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente?.cli_id) {
      setError("Selecciona un cliente de SICAR.");
      return;
    }
    setSaving(true);
    setError("");
    const payload: NuevaFacturaCfdiPayload = {
      cli_id: selectedCliente.cli_id,
      scf_id: scfId,
      forma_pago: formaPago,
      metodo_pago: metodoPago,
      ...payloadFromFacturaForm(formData),
      conceptos: [],
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
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:rounded-2xl"
      >
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 pr-14 dark:border-[#334155] dark:bg-[#111827]">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c]">
            Ventas · SICAR
          </p>
          <h2 id={MODAL_TITLE_ID} className="mt-1 text-lg font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            Nueva factura CFDI
          </h2>
          <p className="mt-1 text-sm text-[#57534e] dark:text-[#94a3b8]">
            Captura el receptor y datos del comprobante para timbrar en SICAR.
          </p>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          {error ? (
            <div
              className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-[#57534e] dark:text-[#cbd5e1]" role="status">
              Cargando catálogos…
            </p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div
                className="inline-grid grid-cols-3 gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]/80"
                role="tablist"
                aria-label="Secciones de la factura"
              >
                {FACTURA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${modalTabBaseClass} border whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-[#ff801f]/30 bg-[#ff801f] text-black shadow-sm"
                        : "border-transparent bg-transparent text-gray-700 hover:bg-white dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "comprobante" ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-[#ecdcc8] bg-gradient-to-br from-[#fff8f1] via-[#fffdfa] to-[#f5efe6] p-4 dark:border-[#334155] dark:from-[#1a2332] dark:via-[#111a2b] dark:to-[#0f172a] sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c]">
                          Resumen
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          {selectedSerie?.serie || "Sin serie"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#94a3b8]">
                          Folio inicial SICAR: {selectedSerie?.folioIni ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex max-w-full items-center rounded-full border border-[#ff801f]/25 bg-white/80 px-3 py-1 text-xs font-medium text-[#9a3412] dark:border-[#fb923c]/30 dark:bg-[#0f172a]/60 dark:text-[#fdba74]">
                          {formaPago.split("-")[0]?.trim() || formaPago}
                        </span>
                        <span className="inline-flex max-w-full items-center rounded-full border border-[#e7ded0] bg-white/80 px-3 py-1 text-xs font-medium text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a]/60 dark:text-[#cbd5e1]">
                          {metodoPago.split("-")[0]?.trim() || metodoPago}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${modalPanelClass} space-y-5`}>
                    <p className={modalSectionTitleClass}>Serie y foliado</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div>
                        <Label>Serie CFDI</Label>
                        <select
                          className={selectLikeClassName}
                          value={scfId}
                          onChange={(e) => setScfId(Number(e.target.value))}
                        >
                          {series.map((s) => (
                            <option key={s.scf_id} value={s.scf_id}>
                              {s.serie ? `${s.serie} · folio ${s.folioIni}` : `(serie #${s.scf_id})`}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#78716c] dark:text-[#94a3b8]">
                          La serie determina el prefijo del folio fiscal (ej. IMA-5199).
                        </p>
                      </div>
                      {selectedSerie?.serie ? (
                        <div className="rounded-xl border border-dashed border-[#ecdcc8] bg-[#fcfaf6] px-4 py-3 text-center dark:border-[#334155] dark:bg-[#0f172a]/50">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b7b69] dark:text-[#8ea0b8]">
                            Próximo folio
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                            {selectedSerie.serie}-…
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={`${modalPanelClass} space-y-5`}>
                    <p className={modalSectionTitleClass}>Condiciones de pago</p>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-[#ecdcc8]/80 bg-[#fcfaf6]/80 p-4 dark:border-[#334155] dark:bg-[#111827]/40">
                        <Label>Forma de pago</Label>
                        <select
                          className={`${selectLikeClassName} mt-1.5`}
                          value={formaPago}
                          onChange={(e) => setFormaPago(e.target.value)}
                        >
                          {formaPagoOpts.map((o) => (
                            <option key={o.clave} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#78716c] dark:text-[#94a3b8]">
                          Medio con el que se liquida el comprobante (catálogo SAT c_FormaPago).
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#ecdcc8]/80 bg-[#fcfaf6]/80 p-4 dark:border-[#334155] dark:bg-[#111827]/40">
                        <Label>Método de pago</Label>
                        <select
                          className={`${selectLikeClassName} mt-1.5`}
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value)}
                        >
                          {metodoPagoOpts.map((o) => (
                            <option key={o.clave} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#78716c] dark:text-[#94a3b8]">
                          PUE = pago en una sola exhibición · PPD = parcialidades o diferido.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                    placeholder: "Buscar cliente por nombre o RFC...",
                    disabled: saving,
                  }}
                />
              )}

              <footer className="sticky bottom-0 z-20 -mx-4 mt-1 border-t border-[#e7ded0] bg-[#fcfaf6]/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(28,25,23,0.18)] backdrop-blur-sm dark:border-[#334155] dark:bg-[#0f172a]/95 sm:-mx-5 sm:px-5 sm:py-4">
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
                    disabled={saving}
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
          )}
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
