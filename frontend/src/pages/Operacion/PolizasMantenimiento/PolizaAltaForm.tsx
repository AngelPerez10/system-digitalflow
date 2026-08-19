import { useEffect, useId, useState, type FormEvent } from "react";
import { CalendarDays, FileText, UserRound } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import SearchableSelect from "@/components/form/SearchableSelect";
import { fetchClientesCatalog } from "@/components/clientes/fetchClientesCatalog";
import { erpSectionLabelClass, erpSelectFieldClass } from "@/layout/erpPageStyles";
import { listCotizacionesDeCliente, type CotizacionOption } from "./list/polizaApi";
import { clienteNombreFromOptionLabel, clienteToSelectOption, mergeClienteOptions } from "./list/polizaClienteOptions";
import { EMPTY_POLIZA_VALUES, TIPO_CCTV } from "./list/polizaDemoData";
import type { PolizaAltaValues } from "./list/polizaListTypes";

function CheckDot({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px]">
      <span
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-[#ff801f] bg-[#ff801f] text-[#1c1917]"
            : "border-[#d6d3d1] bg-transparent text-transparent"
        }`}
        aria-hidden
      >
        <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className={done ? "text-[#1c1917] dark:text-[#f8fafc]" : "text-[#78716c] dark:text-[#94a3b8]"}>
        {label}
        <span className="sr-only">{done ? ", completo" : ", pendiente"}</span>
      </span>
    </li>
  );
}

type SelectOption = { value: string; label: string };

type Props = {
  embedded?: boolean;
  formId?: string;
  folio: string;
  folioIsPreview?: boolean;
  initialValues?: PolizaAltaValues;
  extraClienteOption?: SelectOption | null;
  extraCotizacionOption?: SelectOption | null;
  onSubmit?: (values: PolizaAltaValues) => void;
};

export default function PolizaAltaForm({
  embedded = false,
  formId = "poliza-alta-form",
  folio,
  folioIsPreview = true,
  initialValues = EMPTY_POLIZA_VALUES,
  extraClienteOption = null,
  extraCotizacionOption = null,
  onSubmit,
}: Props) {
  const clienteErrorId = useId();
  const [clienteId, setClienteId] = useState(initialValues.clienteId);
  const [tipo, setTipo] = useState(initialValues.tipo || TIPO_CCTV);
  const [cotizacionId, setCotizacionId] = useState(initialValues.cotizacionId);
  const [fecha1, setFecha1] = useState(initialValues.fecha1);
  const [fecha2, setFecha2] = useState(initialValues.fecha2);
  const [fecha3, setFecha3] = useState(initialValues.fecha3);
  const [clienteError, setClienteError] = useState("");
  const [cotizacionError, setCotizacionError] = useState("");
  const [fechasError, setFechasError] = useState("");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteOptions, setClienteOptions] = useState<SelectOption[]>(
    extraClienteOption?.value ? [extraClienteOption] : []
  );
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteLoadError, setClienteLoadError] = useState("");
  const [cotizacionOptions, setCotizacionOptions] = useState<CotizacionOption[]>([]);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);

  const extraClienteValue = extraClienteOption?.value || "";
  const extraClienteLabel = extraClienteOption?.label || "";
  const extraCotizacionValue = extraCotizacionOption?.value || "";
  const extraCotizacionLabel = extraCotizacionOption?.label || "";

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingClientes(true);
      setClienteLoadError("");
      void fetchClientesCatalog(clienteQuery, clienteQuery.trim() ? 80 : 200)
        .then((rows) => {
          if (cancelled) return;
          const mapped = rows
            .filter((c) => c && c.id != null)
            .map((c) => clienteToSelectOption(c));
          setClienteOptions(
            mergeClienteOptions(mapped, extraClienteValue ? { value: extraClienteValue, label: extraClienteLabel } : null)
          );
        })
        .catch(() => {
          if (cancelled) return;
          setClienteLoadError("No se pudieron cargar Empresa, Personas ni Proveedores.");
          setClienteOptions(
            extraClienteValue ? [{ value: extraClienteValue, label: extraClienteLabel }] : []
          );
        })
        .finally(() => {
          if (!cancelled) setLoadingClientes(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [clienteQuery, extraClienteValue, extraClienteLabel]);

  useEffect(() => {
    let cancelled = false;
    if (!clienteId) {
      setCotizacionOptions([]);
      return undefined;
    }
    setLoadingCotizaciones(true);
    void listCotizacionesDeCliente(clienteId)
      .then((rows) => {
        if (cancelled) return;
        const extras =
          extraCotizacionValue && !rows.some((row) => row.value === extraCotizacionValue)
            ? [{ value: extraCotizacionValue, label: extraCotizacionLabel || extraCotizacionValue }]
            : [];
        setCotizacionOptions([...extras, ...rows]);
      })
      .catch(() => {
        if (!cancelled) setCotizacionOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCotizaciones(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clienteId, extraCotizacionValue, extraCotizacionLabel]);

  const fechasListas = Boolean(fecha1 && fecha2 && fecha3);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let hasError = false;
    if (!clienteId) {
      setClienteError("Elige un cliente para armar el expediente.");
      hasError = true;
    } else {
      setClienteError("");
    }
    if (!cotizacionId) {
      setCotizacionError("Liga una cotización DigitalFlow.");
      hasError = true;
    } else {
      setCotizacionError("");
    }
    if (!fecha1 || !fecha2 || !fecha3) {
      setFechasError("Indica las tres visitas del año.");
      hasError = true;
    } else {
      setFechasError("");
    }
    if (hasError) return;
    onSubmit?.({
      clienteId,
      clienteNombre: clienteNombreFromOptionLabel(
        clienteOptions.find((c) => c.value === clienteId)?.label || extraClienteLabel || ""
      ),
      tipo,
      cotizacionId,
      fecha1,
      fecha2,
      fecha3,
    });
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate
      className={
        embedded
          ? "overflow-hidden rounded-[1.15rem] border border-[#e4dcd0] bg-[#faf8f4] dark:border-[#273244] dark:bg-[#111827]"
          : "overflow-hidden rounded-[1.35rem] border border-[#e4dcd0] bg-[#faf8f4] shadow-[0_40px_80px_-48px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111827]"
      }
    >
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          className="relative border-b border-[#e4dcd0] bg-[#f3eee6] px-5 py-6 dark:border-[#273244] dark:bg-[#0c1322] lg:border-b-0 lg:border-r"
          aria-label="Resumen de la póliza"
        >
          <p className={erpSectionLabelClass}>Folio</p>
          <p className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-[1.85rem] leading-none tracking-[-0.03em] text-[#1c1917] dark:text-[#f8fafc]">
            {folio}
          </p>
          <p className="mt-2 text-[12px] text-[#78716c] dark:text-[#94a3b8]">
            {folioIsPreview
              ? `El siguiente número al guardar será ${folio.replace(/^[A-Z]+-/, "")}. Aún no se asigna.`
              : "Folio de esta póliza."}
          </p>
          <div className="mt-6 h-px bg-[#e4dcd0] dark:bg-[#273244]" aria-hidden />
          <ul className="mt-5 space-y-2.5" aria-label="Campos del expediente">
            <CheckDot done={Boolean(clienteId)} label="Cliente" />
            <CheckDot done={Boolean(tipo)} label="Tipo de servicio" />
            <CheckDot done={Boolean(cotizacionId)} label="Cotización" />
            <CheckDot done={fechasListas} label="Tres visitas" />
          </ul>
        </aside>

        <div className={embedded ? "p-5 sm:p-7" : "p-6 sm:p-9"}>
          {embedded ? null : (
            <>
              <p className={erpSectionLabelClass}>Expediente</p>
              <h2 id="poliza-alta-heading" className="mt-2 text-lg font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                Nueva póliza
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#57534e] dark:text-[#b7c1d1]">
                Elige cliente, tipo de servicio, cotización y las tres visitas.
              </p>
            </>
          )}

          <fieldset className={embedded ? "min-w-0 space-y-7" : "mt-8 min-w-0 space-y-8"}>
            <legend className="sr-only">Datos de la póliza de mantenimiento</legend>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[#78716c] dark:text-[#94a3b8]">
                <UserRound className="size-4" strokeWidth={1.75} aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Cliente</span>
              </div>
              <SearchableSelect
                id="poliza-elegir-cliente"
                label="Elegir cliente"
                required
                value={clienteId}
                onChange={(v) => {
                  setClienteId(v);
                  setCotizacionId("");
                  if (v) setClienteError("");
                }}
                onSearchChange={setClienteQuery}
                options={clienteOptions}
                placeholder={
                  loadingClientes
                    ? "Buscando contactos…"
                    : "Buscar empresa, persona o proveedor"
                }
                filterLocally={false}
                invalid={Boolean(clienteError)}
                describedBy={clienteError ? clienteErrorId : undefined}
              />
              {clienteError ? (
                <p id={clienteErrorId} className="mt-2 text-sm text-[#c64545]" role="alert">
                  {clienteError}
                </p>
              ) : clienteLoadError ? (
                <p className="mt-2 text-sm text-[#c64545]" role="alert">
                  {clienteLoadError}
                </p>
              ) : !loadingClientes && clienteOptions.length === 0 ? (
                <p className="mt-2 text-sm text-[#78716c] dark:text-[#94a3b8]">
                  No hay contactos para mostrar. Revísalos en Contactos: Empresa, Personas o Proveedores.
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#78716c] dark:text-[#94a3b8]">
                  Incluye empresas, personas y proveedores. Escribe el nombre para buscar más allá de la primera página.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="poliza-tipo-servicio"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
              >
                Tipo de servicio <span className="text-red-500">*</span>
              </label>
              <select
                id="poliza-tipo-servicio"
                value={tipo}
                onChange={() => setTipo(TIPO_CCTV)}
                className={`${erpSelectFieldClass} mt-1.5`}
              >
                <option value={TIPO_CCTV}>Videovigilancia CCTV</option>
              </select>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[#78716c] dark:text-[#94a3b8]">
                <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Cotización</span>
              </div>
              <SearchableSelect
                label="Ligar con cotización"
                required
                value={cotizacionId}
                onChange={(v) => {
                  setCotizacionId(v);
                  if (v) setCotizacionError("");
                }}
                options={cotizacionOptions}
                placeholder={
                  !clienteId
                    ? "Elige un cliente primero"
                    : loadingCotizaciones
                      ? "Cargando cotizaciones…"
                      : cotizacionOptions.length
                        ? "Buscar folio"
                        : "Sin cotizaciones de este cliente"
                }
                disabled={!clienteId}
                filterLocally
              />
              {cotizacionError ? (
                <p className="mt-2 text-sm text-[#c64545]" role="alert">
                  {cotizacionError}
                </p>
              ) : null}
              {clienteId && !loadingCotizaciones && cotizacionOptions.length === 0 ? (
                <p className="mt-2 text-sm text-[#78716c] dark:text-[#94a3b8]">
                  No hay cotizaciones DigitalFlow para este cliente. Revísalas en Ventas → Cotización.
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[#78716c] dark:text-[#94a3b8]">
                <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  Planificación
                </span>
              </div>
              <p className="mb-4 text-sm text-[#57534e] dark:text-[#b7c1d1]">
                Tres visitas al año, cada cuatro meses.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <DatePicker
                  id="poliza-fecha-visita-1"
                  label="1.er mantenimiento"
                  placeholder="Elegir fecha"
                  defaultDate={fecha1 || undefined}
                  onChange={(_dates, value) => {
                    setFecha1(value || "");
                    if (value) setFechasError("");
                  }}
                />
                <DatePicker
                  id="poliza-fecha-visita-2"
                  label="2.º mantenimiento"
                  placeholder="Elegir fecha"
                  defaultDate={fecha2 || undefined}
                  onChange={(_dates, value) => {
                    setFecha2(value || "");
                    if (value) setFechasError("");
                  }}
                />
                <DatePicker
                  id="poliza-fecha-visita-3"
                  label="3.er mantenimiento"
                  placeholder="Elegir fecha"
                  defaultDate={fecha3 || undefined}
                  onChange={(_dates, value) => {
                    setFecha3(value || "");
                    if (value) setFechasError("");
                  }}
                />
              </div>
              {fechasError ? (
                <p className="mt-2 text-sm text-[#c64545]" role="alert">
                  {fechasError}
                </p>
              ) : null}
            </div>
          </fieldset>
        </div>
      </div>
    </form>
  );
}
