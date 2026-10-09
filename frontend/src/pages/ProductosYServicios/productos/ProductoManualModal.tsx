/**
 * Alta / edición de producto manual con la anatomía de Proyectos y Órdenes:
 * encabezado marino vivo, riel de pasos a la izquierda (chips en celular),
 * secciones blancas sobre lienzo gris y pie fijo con Anterior / Siguiente / Guardar.
 *
 * Pasos: 1) Producto · 2) Proveedor y costo · 3) Precios (utilidad 1–4 + IVA).
 * La subida de imagen y el guardado viven en la página.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Check,
  CircleAlert,
  ImagePlus,
  ListChecks,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/form/SearchableSelect";
import { Modal } from "@/components/ui/modal";
import { resolveMediaUrl } from "@/config/api";
import { btn, fieldLabel, focusRing, fontSans, input, requiredMark, textarea } from "./productosStyles";
import { precioKey, utilidadKey, type ManualForm, type ProveedorOpcion } from "./manualForm";
import {
  conIva,
  NIVELES_PRECIO,
  numeroCampo,
  precioDesdeUtilidad,
  textoDinero,
  textoPorcentaje,
  utilidadDesdePrecio,
  type NivelPrecio,
} from "./precioUtilidad";

export type { ManualForm, ProveedorOpcion };

type Paso = "producto" | "proveedor" | "precios";
const PASOS: { id: Paso; label: string; hint: string; icon: typeof Package }[] = [
  { id: "producto", label: "Producto", hint: "Imagen, marca, modelo y stock", icon: Package },
  { id: "proveedor", label: "Proveedor y costo", hint: "A quién se compró y en cuánto", icon: Truck },
  { id: "precios", label: "Precios", hint: "Utilidad de los precios 1 a 4", icon: BadgePercent },
];
const ORDEN: Paso[] = PASOS.map((p) => p.id);

/** Paso al que pertenece un error de guardado (para llevar ahí al usuario). */
function pasoDeError(error: string): Paso | null {
  if (!error) return null;
  if (/proveedor|costo/i.test(error)) return "proveedor";
  if (/precio|utilidad/i.test(error)) return "precios";
  return "producto";
}

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dinero = (n: number | null) => (n == null ? "—" : mxn.format(n));
const invalidClass = "border-[#C22B2B] focus:border-[#C22B2B] focus:ring-[rgba(194,43,43,0.18)] dark:border-[#F87171]";

type Props = {
  open: boolean;
  editing: boolean;
  titleId: string;
  form: ManualForm;
  setForm: Dispatch<SetStateAction<ManualForm>>;
  error: string;
  clearError: () => void;
  saving: boolean;
  uploading: boolean;
  dropzone: {
    getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
    getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
    isDragActive: boolean;
  };
  /** Contactos dados de alta como proveedor; solo se muestra el nombre. */
  proveedores: ProveedorOpcion[];
  proveedoresLoading: boolean;
  proveedoresError: string;
  /** Proveedor guardado, por si ya no viene en la lista. */
  proveedorGuardado?: ProveedorOpcion | null;
  onClose: () => void;
  onSave: () => void;
};

/* ------------------------------------------------------------------ piezas */

function Seccion({
  titulo,
  descripcion,
  icon,
  children,
  order = 0,
}: {
  titulo: string;
  descripcion: string;
  icon: ReactNode;
  children: ReactNode;
  order?: number;
}) {
  return (
    <section
      className="cot-rise rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]"
      style={{ "--cot-i": order } as CSSProperties}
    >
      <header className="flex items-start gap-3 border-b border-[#F0F0F2] px-4 py-3.5 dark:border-[#1F2A3C] sm:px-5">
        <span
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(27,92,255,0.10)] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF] [&_svg]:size-4"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">{titulo}</h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{descripcion}</p>
        </div>
      </header>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function Opcional() {
  return <span className="ml-1 font-normal text-[#A1A1AA] dark:text-[#64748B]">(opcional)</span>;
}

/** Campo numérico con prefijo/sufijo dentro del campo (como en Cotización). */
function CampoNumero({
  id,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  disabled,
  invalid,
  describedBy,
  step = "0.01",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  step?: string;
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#A1A1AA] dark:text-[#64748B]">{prefix}</span>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${input} tabular-nums ${prefix ? "pl-7" : ""} ${suffix ? "pr-12" : ""} ${invalid ? invalidClass : ""}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA] dark:text-[#64748B]">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

export default function ProductoManualModal({
  open,
  editing,
  titleId,
  form,
  setForm,
  error,
  clearError,
  saving,
  uploading,
  dropzone,
  proveedores,
  proveedoresLoading,
  proveedoresError,
  proveedorGuardado = null,
  onClose,
  onSave,
}: Props) {
  const baseId = useId().replace(/:/g, "");
  const tabId = (p: Paso) => `${baseId}-tab-${p}`;
  const panelId = `${baseId}-panel`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paso, setPaso] = useState<Paso>("producto");
  const [dir, setDir] = useState<"" | "cot-step-next" | "cot-step-back">("");

  // Cada apertura empieza en el primer paso.
  useEffect(() => {
    if (open) {
      setPaso("producto");
      setDir("");
    }
  }, [open]);

  // Un error de guardado lleva al paso donde está el campo.
  useEffect(() => {
    const destino = pasoDeError(error);
    if (destino) setPaso(destino);
  }, [error]);

  const ir = (next: Paso) => {
    if (next === paso) return;
    setDir(ORDEN.indexOf(next) > ORDEN.indexOf(paso) ? "cot-step-next" : "cot-step-back");
    setPaso(next);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
  };

  const set = <K extends keyof ManualForm>(k: K, v: ManualForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  /* ---- números: costo ⇄ utilidad ⇄ precio ---- */
  const costo = numeroCampo(form.costo);
  const costoValido = costo != null && costo > 0;

  const cambiarCosto = (v: string) => {
    setForm((p) => {
      const nuevo = numeroCampo(v);
      const next: ManualForm = { ...p, costo: v };
      for (const n of NIVELES_PRECIO) {
        const u = numeroCampo(p[utilidadKey(n)]);
        const pr = numeroCampo(p[precioKey(n)]);
        // Con utilidad capturada se conserva el %; si solo hay precio, se recalcula el %.
        if (u != null) {
          const precio = precioDesdeUtilidad(nuevo, u);
          if (precio != null) next[precioKey(n)] = textoDinero(precio);
        } else if (pr != null) {
          next[utilidadKey(n)] = textoPorcentaje(utilidadDesdePrecio(nuevo, pr));
        }
      }
      return next;
    });
  };
  const cambiarUtilidad = (n: NivelPrecio, v: string) => {
    if (error && /precio|utilidad/i.test(error)) clearError();
    setForm((p) => {
      const precio = precioDesdeUtilidad(numeroCampo(p.costo), numeroCampo(v));
      return { ...p, [utilidadKey(n)]: v, ...(precio != null ? { [precioKey(n)]: textoDinero(precio) } : {}) };
    });
  };
  const cambiarPrecio = (n: NivelPrecio, v: string) => {
    if (error && /precio|utilidad/i.test(error)) clearError();
    setForm((p) => {
      const u = utilidadDesdePrecio(numeroCampo(p.costo), numeroCampo(v));
      return { ...p, [precioKey(n)]: v, [utilidadKey(n)]: u != null ? textoPorcentaje(u) : "" };
    });
  };

  /* ---- proveedor ---- */
  const errorProveedor = Boolean(error && /proveedor/i.test(error));
  const proveedorOptions = useMemo((): SearchableSelectOption[] => {
    const opts = proveedores.map((p) => ({ value: String(p.id), label: p.nombre || "Proveedor sin nombre" }));
    if (proveedorGuardado && !opts.some((o) => o.value === String(proveedorGuardado.id))) {
      opts.push({ value: String(proveedorGuardado.id), label: proveedorGuardado.nombre || "Proveedor actual" });
    }
    return opts;
  }, [proveedores, proveedorGuardado]);
  const sinProveedores = !proveedoresLoading && !proveedoresError && proveedorOptions.length === 0;
  const proveedorNombre = proveedorOptions.find((o) => o.value === form.proveedor)?.label ?? "";

  /* ---- estado de pasos ---- */
  const errorPaso = pasoDeError(error);
  const precio1 = numeroCampo(form.precio);
  const hecho: Record<Paso, boolean> = {
    producto: Boolean(form.producto.trim() && form.marca.trim() && form.modelo.trim() && form.stock.trim()),
    proveedor: costoValido,
    precios: precio1 != null && precio1 > 0,
  };
  const errorModelo = Boolean(error && /modelo/i.test(error));

  const idx = ORDEN.indexOf(paso);
  const actual = PASOS[idx];
  const isFirst = idx === 0;
  const isLast = idx === ORDEN.length - 1;
  const saveLabel = saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar producto";

  const onStepKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: Paso) => {
    const i = ORDEN.indexOf(current);
    const last = ORDEN.length - 1;
    const map: Record<string, number> = {
      ArrowDown: i === last ? 0 : i + 1,
      ArrowRight: i === last ? 0 : i + 1,
      ArrowUp: i === 0 ? last : i - 1,
      ArrowLeft: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = ORDEN[map[e.key]];
    ir(next);
    requestAnimationFrame(() => {
      [document.getElementById(tabId(next)), document.getElementById(`${tabId(next)}-m`)]
        .find((el) => el && el.getClientRects().length > 0)
        ?.focus();
    });
  };

  const marcador = (p: Paso, i: number, active: boolean) =>
    errorPaso === p ? (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#B42323] ring-1 ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]">
        <CircleAlert className="size-3.5" aria-hidden />
      </span>
    ) : hecho[p] && !active ? (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#04724D] text-white dark:bg-[#22A06B]">
        <Check className="cot-tick size-3.5" strokeWidth={3} aria-hidden />
      </span>
    ) : (
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-200 ${
          active ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]" : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]"
        }`}
      >
        {i + 1}
      </span>
    );
  const estadoSr = (p: Paso) => (errorPaso === p ? " (tiene errores)" : hecho[p] ? " (completo)" : "");

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !saving && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className={`${fontSans} flex h-[min(94dvh,52rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:h-[min(92dvh,52rem)] sm:w-[min(96vw,64rem)] sm:max-w-none sm:rounded-[22px]`}
    >
      {/* Encabezado vivo: refleja lo que se va capturando. */}
      <header className="cot-sheen relative shrink-0 overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3.5 px-5 pb-4 pr-16 pt-5 sm:px-6">
          <span
            className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/25 sm:inline-flex"
            aria-hidden
          >
            {editing ? <Pencil className="size-5" /> : <PackagePlus className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Catálogo propio · {editing ? "Editar producto" : "Nuevo producto"}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-[20px] font-semibold leading-tight tracking-[-0.5px] sm:text-[22px]" title={form.producto}>
              {form.producto.trim() || (editing ? "Producto sin nombre" : "Nuevo producto manual")}
            </h2>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-white/70">
              {form.marca.trim() || form.modelo.trim() ? (
                <>
                  <span className="truncate">{form.marca.trim() || "Sin marca"}</span>
                  <span aria-hidden className="text-white/30">
                    ·
                  </span>
                  <span className="truncate font-mono text-[12px] text-white/85">{form.modelo.trim() || "Sin modelo"}</span>
                </>
              ) : (
                <span>Aparece junto a SYSCOM y TVC, y primero en la búsqueda.</span>
              )}
              {proveedorNombre ? (
                <span key={proveedorNombre} className="cot-pop inline-flex h-6 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[12px] font-medium text-white/85 ring-1 ring-inset ring-white/15">
                  <Truck className="size-3" aria-hidden />
                  {proveedorNombre}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar ventana"
            className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Riel de pasos (escritorio). */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-[#F0F0F2] bg-[#FAFAFA] p-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 md:flex">
          <div role="tablist" aria-orientation="vertical" aria-label="Secciones del producto" className="flex flex-col gap-1">
            {PASOS.map((p, i) => {
              const active = paso === p.id;
              return (
                <button
                  key={p.id}
                  id={tabId(p.id)}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={panelId}
                  tabIndex={active ? 0 : -1}
                  disabled={saving}
                  onClick={() => ir(p.id)}
                  onKeyDown={(e) => onStepKeyDown(e, p.id)}
                  className={`cot-press flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left disabled:cursor-not-allowed ${focusRing} ${
                    active
                      ? "bg-white shadow-[0_1px_2px_rgba(9,9,11,0.06)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244]"
                      : "hover:bg-white/60 dark:hover:bg-white/3"
                  }`}
                >
                  {marcador(p.id, i, active)}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[14px] font-semibold tracking-[-0.1px] ${
                        active ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#3F3F46] dark:text-[#D6DEEA]"
                      }`}
                    >
                      {p.label}
                    </span>
                    <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{p.hint}</span>
                  </span>
                  <span className="sr-only">{estadoSr(p.id)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (saving || uploading) return;
            // Enter en un alta avanza de paso; en el último paso (o al editar) guarda.
            if (!isLast && !editing) ir(ORDEN[idx + 1]);
            else onSave();
          }}
        >
          {/* Chips de pasos (celular). */}
          <div className="shrink-0 border-b border-[#F0F0F2] px-3 py-2.5 dark:border-[#1F2A3C] md:hidden">
            <div
              role="tablist"
              aria-label="Secciones del producto"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {PASOS.map((p, i) => {
                const active = paso === p.id;
                return (
                  <button
                    key={p.id}
                    id={`${tabId(p.id)}-m`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={panelId}
                    tabIndex={active ? 0 : -1}
                    disabled={saving}
                    onClick={() => ir(p.id)}
                    onKeyDown={(e) => onStepKeyDown(e, p.id)}
                    className={`cot-press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13px] font-semibold ${focusRing} ${
                      active
                        ? "border-[#D7E3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#4B7CFF]/40 dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                        : "border-[#E4E4E7] bg-white text-[#3F3F46] dark:border-[#273244] dark:bg-[#111827] dark:text-[#D6DEEA]"
                    }`}
                  >
                    {marcador(p.id, i, active)}
                    {p.label}
                    <span className="sr-only">{estadoSr(p.id)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] dark:bg-[#0B1220]">
            <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-5 lg:p-6">
              {error ? (
                <div
                  id="manual-form-error"
                  role="alert"
                  className="cot-fade flex items-start gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B42323] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]"
                >
                  <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Revisa el formulario</p>
                    <p className="mt-0.5 text-[13px]">{error}</p>
                  </div>
                </div>
              ) : null}

              <div key={paso} id={panelId} role="tabpanel" aria-labelledby={tabId(paso)} className={`space-y-4 ${dir}`}>
                <div className="hidden items-center gap-3 px-1 pt-1 sm:flex">
                  <span
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#7EA0FF] dark:ring-[#273244]"
                    aria-hidden
                  >
                    <actual.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]">
                      Paso {idx + 1} de {ORDEN.length}
                    </p>
                    <p className="text-[20px] font-semibold leading-tight tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">{actual.label}</p>
                  </div>
                </div>

                {/* ============================ 1. Producto ============================ */}
                {paso === "producto" ? (
                  <>
                    <Seccion titulo="Datos del producto" descripcion="Así aparece en el catálogo y en las cotizaciones." icon={<Package />} order={0}>
                      <div className="grid gap-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
                        <div>
                          <span className={fieldLabel}>Imagen</span>
                          {form.imagen_url ? (
                            <div className="cot-fade space-y-2">
                              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-[#E7E7EA] bg-white p-3 dark:border-[#273244] dark:bg-[#0F172A]">
                                <img src={resolveMediaUrl(form.imagen_url)} alt="Imagen del producto" className="h-full w-full object-contain" />
                              </div>
                              <button type="button" onClick={() => set("imagen_url", "")} className={`${btn.secondary} h-10 w-full text-[13px]`}>
                                <Trash2 aria-hidden />
                                Quitar imagen
                              </button>
                            </div>
                          ) : (
                            <div
                              {...dropzone.getRootProps()}
                              className={`flex aspect-square max-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-3 text-center transition-[border-color,background-color] duration-150 sm:max-h-none ${focusRing} ${
                                dropzone.isDragActive
                                  ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]"
                                  : "border-[#D4D4D8] bg-[#FAFAFA] hover:border-[#1B5CFF]/50 dark:border-[#3A4661] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF]/50"
                              }`}
                            >
                              <input {...dropzone.getInputProps()} aria-label="Subir imagen del producto" />
                              {uploading ? (
                                <Loader2 className="size-7 animate-spin text-[#1B5CFF]" aria-hidden />
                              ) : (
                                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]">
                                  <ImagePlus className="size-5" aria-hidden />
                                </span>
                              )}
                              <p className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                {uploading ? "Subiendo…" : dropzone.isDragActive ? "Suelta aquí" : "Arrastra o haz clic"}
                              </p>
                              <p className="text-[11.5px] text-[#6E6E77] dark:text-[#8EA0B8]">PNG, JPG, WebP o SVG</p>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 space-y-4">
                          <div>
                            <label className={fieldLabel} htmlFor="manual-producto">
                              Producto<span className={requiredMark}>*</span>
                            </label>
                            <input
                              id="manual-producto"
                              value={form.producto}
                              onChange={(e) => set("producto", e.target.value)}
                              placeholder="Nombre del producto"
                              className={input}
                              autoComplete="off"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className={fieldLabel} htmlFor="manual-marca">
                                Marca<span className={requiredMark}>*</span>
                              </label>
                              <input id="manual-marca" value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Marca" className={input} autoComplete="off" />
                            </div>
                            <div>
                              <label className={fieldLabel} htmlFor="manual-modelo">
                                Modelo<span className={requiredMark}>*</span>
                              </label>
                              <input
                                id="manual-modelo"
                                value={form.modelo}
                                onChange={(e) => {
                                  if (errorModelo) clearError();
                                  set("modelo", e.target.value);
                                }}
                                placeholder="Modelo"
                                className={`${input} font-mono ${errorModelo ? invalidClass : ""}`}
                                aria-invalid={errorModelo || undefined}
                                aria-describedby={errorModelo ? "manual-form-error" : undefined}
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <label className={fieldLabel} htmlFor="manual-stock">
                                Stock<span className={requiredMark}>*</span>
                              </label>
                              <CampoNumero id="manual-stock" value={form.stock} onChange={(v) => set("stock", v)} placeholder="0" step="1" suffix="pzas" />
                            </div>
                            <div>
                              <label className={fieldLabel} htmlFor="manual-sat-key">
                                Clave SAT
                                <Opcional />
                              </label>
                              <input
                                id="manual-sat-key"
                                value={form.sat_key}
                                onChange={(e) => set("sat_key", e.target.value)}
                                placeholder="Ej. 43201500"
                                inputMode="numeric"
                                autoComplete="off"
                                className={`${input} font-mono tracking-wide`}
                                aria-describedby="manual-sat-key-hint"
                              />
                              <p id="manual-sat-key-hint" className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                Clave de producto/servicio para CFDI.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Seccion>
                    <Seccion titulo="Características" descripcion="Una por renglón; se muestran en la ficha del producto." icon={<ListChecks />} order={1}>
                      <label className="sr-only" htmlFor="manual-caracteristicas">
                        Características
                      </label>
                      <textarea
                        id="manual-caracteristicas"
                        value={form.caracteristicas}
                        onChange={(e) => set("caracteristicas", e.target.value)}
                        placeholder="Una característica por renglón"
                        rows={4}
                        className={textarea}
                      />
                    </Seccion>
                  </>
                ) : null}

                {/* ============================ 2. Proveedor y costo ============================ */}
                {paso === "proveedor" ? (
                  <>
                    <Seccion titulo="Proveedor" descripcion="Solo aparecen los contactos dados de alta como proveedor." icon={<Truck />} order={0}>
                      <SearchableSelect
                        id="manual-proveedor"
                        label="Proveedor (opcional)"
                        value={form.proveedor}
                        onChange={(v) => {
                          if (errorProveedor) clearError();
                          set("proveedor", v);
                        }}
                        options={proveedorOptions}
                        loading={proveedoresLoading}
                        disabled={sinProveedores}
                        invalid={errorProveedor}
                        placeholder={proveedoresLoading ? "Cargando proveedores…" : sinProveedores ? "No hay proveedores en Contactos" : "Busca un proveedor…"}
                        emptyMessage="Ningún proveedor coincide. Solo aparecen los dados de alta en Contactos."
                        clearOptionLabel="Sin proveedor"
                        describedBy={proveedoresError ? "manual-proveedor-hint" : undefined}
                      />
                      {proveedoresError ? (
                        <p id="manual-proveedor-hint" className="mt-1.5 text-[12.5px] text-[#B42323] dark:text-[#F87171]" role="alert">
                          {proveedoresError}
                        </p>
                      ) : null}
                    </Seccion>

                    <Seccion
                      titulo="Costo e IVA"
                      descripcion="Cuánto nos costó el producto, sin IVA. Es la base de la utilidad de cada precio."
                      icon={<Wallet />}
                      order={1}
                    >
                      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <div>
                          <label className={fieldLabel} htmlFor="manual-costo">
                            Costo unitario
                          </label>
                          <CampoNumero id="manual-costo" value={form.costo} onChange={cambiarCosto} prefix="$" suffix="MXN" placeholder="0.00" describedBy="manual-costo-hint" />
                          <p id="manual-costo-hint" className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            Si cambias el costo, los precios con utilidad capturada se recalculan.
                          </p>
                        </div>
                        <div>
                          <span className={fieldLabel} id="manual-iva-label">
                            IVA
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={form.aplica_iva}
                            aria-labelledby="manual-iva-label manual-iva-text"
                            onClick={() => set("aplica_iva", !form.aplica_iva)}
                            className={`cot-press flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-left ${focusRing} ${
                              form.aplica_iva
                                ? "border-[#D7E3FF] bg-[#EEF3FF] dark:border-[#4B7CFF]/40 dark:bg-[#1B2A63]/60"
                                : "border-[#E7E7EA] bg-white hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#111827]"
                            }`}
                          >
                            <span
                              className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ${
                                form.aplica_iva ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#D4D4D8] dark:bg-[#3A4661]"
                              }`}
                              aria-hidden
                            >
                              <span
                                className={`absolute left-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(9,9,11,0.2)] transition-transform duration-200 motion-reduce:transition-none ${
                                  form.aplica_iva ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </span>
                            <span id="manual-iva-text" className="min-w-0">
                              <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                                {form.aplica_iva ? "Aplica IVA (16 %)" : "Sin IVA"}
                              </span>
                              <span className="block text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                {form.aplica_iva ? "Precios sin IVA; también se muestran con IVA." : "Exento o tasa 0 %."}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </Seccion>
                  </>
                ) : null}

                {/* ============================ 3. Precios ============================ */}
                {paso === "precios" ? (
                  <Seccion
                    titulo="Precios de venta"
                    descripcion={
                      costoValido
                        ? `Utilidad sobre el costo de ${dinero(costo)}. Escribe el % o el precio y el otro se calcula.`
                        : "Sin costo capturado: escribe los precios directamente. Para calcular por utilidad, captura el costo en el paso 2."
                    }
                    icon={<BadgePercent />}
                    order={0}
                  >
                    <div className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-3 px-1 pb-2 text-[12px] font-medium text-[#A1A1AA] dark:text-[#64748B] sm:grid">
                      <span>Lista</span>
                      <span>Utilidad</span>
                      <span>Precio sin IVA</span>
                      <span className="text-right">{form.aplica_iva ? "Con IVA" : "Ganancia"}</span>
                    </div>
                    <ul className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-[#F0F0F2] dark:sm:divide-[#1F2A3C]">
                      {NIVELES_PRECIO.map((n, i) => {
                        const pk = precioKey(n);
                        const uk = utilidadKey(n);
                        const precio = numeroCampo(form[pk]);
                        const ganancia = costoValido && precio != null ? precio - (costo ?? 0) : null;
                        const perdida = ganancia != null && ganancia < 0;
                        const errorPrecio1 = n === 1 && Boolean(error && /precio/i.test(error));
                        return (
                          <li
                            key={n}
                            className="cot-rise grid grid-cols-2 gap-3 rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] p-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:px-1 sm:py-3 dark:sm:bg-transparent"
                            style={{ "--cot-i": i + 1 } as CSSProperties}
                          >
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                                Precio {n}
                                {n === 1 ? <span className={requiredMark}>*</span> : null}
                              </p>
                              <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{n === 1 ? "Lista principal" : "Opcional"}</p>
                            </div>
                            <div>
                              <label className="mb-1 block text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8] sm:sr-only" htmlFor={`manual-${uk}`}>
                                Utilidad del precio {n}
                              </label>
                              <CampoNumero
                                id={`manual-${uk}`}
                                value={form[uk]}
                                onChange={(v) => cambiarUtilidad(n, v)}
                                suffix="%"
                                placeholder={costoValido ? "0" : "—"}
                                disabled={!costoValido}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8] sm:sr-only" htmlFor={`manual-${pk}`}>
                                Precio {n} sin IVA
                              </label>
                              <CampoNumero
                                id={`manual-${pk}`}
                                value={form[pk]}
                                onChange={(v) => cambiarPrecio(n, v)}
                                prefix="$"
                                placeholder="0.00"
                                invalid={errorPrecio1 || perdida}
                                describedBy={perdida ? `manual-${pk}-perdida` : errorPrecio1 ? "manual-form-error" : undefined}
                              />
                            </div>
                            <div className="col-span-2 flex items-baseline justify-between gap-2 sm:col-span-1 sm:block sm:text-right">
                              <span className="text-[12px] text-[#71717A] dark:text-[#8EA0B8] sm:hidden">{form.aplica_iva ? "Con IVA" : "Ganancia"}</span>
                              <span className="text-right">
                                <span key={`${precio}-${form.aplica_iva}`} className="cot-flash block text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                                  {form.aplica_iva ? dinero(conIva(precio)) : dinero(ganancia)}
                                </span>
                                {form.aplica_iva && ganancia != null ? (
                                  <span
                                    id={perdida ? `manual-${pk}-perdida` : undefined}
                                    className={`block text-[12px] tabular-nums ${perdida ? "text-[#B42323] dark:text-[#F87171]" : "text-[#04724D] dark:text-[#22A06B]"}`}
                                  >
                                    {perdida ? "Pérdida de " : "Ganancia "}
                                    {dinero(Math.abs(ganancia))}
                                  </span>
                                ) : perdida ? (
                                  <span id={`manual-${pk}-perdida`} className="block text-[12px] text-[#B42323] dark:text-[#F87171]">
                                    Debajo del costo
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Seccion>
                ) : null}
              </div>
            </div>
          </div>

          <footer
            className={`grid shrink-0 gap-2 border-t border-[#F0F0F2] bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:flex sm:items-center sm:px-5 sm:pb-3 ${
              !isLast && editing ? "grid-cols-[2.75rem_1fr_1fr]" : "grid-cols-[2.75rem_1fr]"
            }`}
          >
            <button
              type="button"
              disabled={saving}
              onClick={isFirst ? onClose : () => ir(ORDEN[idx - 1])}
              className={`${btn.secondary} px-0 sm:px-4`}
              aria-label={isFirst ? "Cancelar" : "Paso anterior"}
              title={isFirst ? "Cancelar" : "Paso anterior"}
            >
              {isFirst ? <X aria-hidden /> : <ArrowLeft aria-hidden />}
              <span className="hidden sm:inline">{isFirst ? "Cancelar" : "Anterior"}</span>
            </button>

            <span className="hidden flex-1 text-center text-[12.5px] text-[#71717A] dark:text-[#8EA0B8] lg:block" aria-hidden>
              Paso {idx + 1} de {ORDEN.length} · {actual.label}
            </span>

            {!isLast ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => ir(ORDEN[idx + 1])}
                className={`${editing ? btn.secondary : btn.primary} px-3 sm:ml-auto lg:ml-0`}
              >
                Siguiente
                <ArrowRight aria-hidden />
              </button>
            ) : null}
            {editing || isLast ? (
              <button
                type="submit"
                disabled={saving || uploading}
                aria-busy={saving || undefined}
                className={`${btn.primary} px-3 ${isLast ? "sm:ml-auto lg:ml-0" : ""}`}
              >
                {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                <span className="sm:hidden">{saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}</span>
                <span className="hidden sm:inline">{saveLabel}</span>
              </button>
            ) : null}
          </footer>
        </form>
      </div>
    </Modal>
  );
}
