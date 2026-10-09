/**
 * Alta / edición de contrato.
 *
 * Editor de página: banda marina con datos clave y avance, secciones numeradas
 * a la izquierda y, en pantallas grandes, un resumen fijo con la hoja en vivo.
 * En celular las acciones van en una barra inferior. El movimiento usa solo
 * `cot-*` (transform y opacity; se apaga con prefers-reduced-motion).
 * Ctrl/⌘ + S guarda. Si el contrato ya se envió o tiene firmas, guardar un
 * cambio descarta las firmas (lo hace el servidor).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  CircleAlert,
  Eye,
  FileSignature,
  FileText,
  Hash,
  Headset,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Receipt,
  Save,
  User,
  UserRound,
  Wifi,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppModal, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import "@/components/ui/modal-kit/motion.css";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  cardDescClass,
  cardShellClass,
  cardTitleClass,
  focusRing,
  fontSans,
  heroBodyClass,
  heroEyebrowClass,
  heroHeadingClass,
  hintClass,
  inputClass,
  labelClass,
  sansStyle,
} from "@/pages/Configuracion/usuarios/usuariosStyles";
import {
  ContratoApiError,
  createContrato,
  getContrato,
  getPrestadorDefaults,
  updateContrato,
  type Contrato,
  type ContratoFormValues,
  type PrestadorDatos,
} from "../shared/contratoApi";
import { formatoDinero, formatoFecha, importeConLetra } from "../shared/contratoFormato";
import { EstadoPill } from "../shared/ContratoUi";
import { heroDots, heroGlowGold } from "../shared/contratoTokens";
import ContactoPicker, { type ContactoResumen } from "./ContactoPicker";
import HojaPreview from "./HojaPreview";

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Correo oficial del prestador para avisos del contrato. */
const CORREO_OFICIAL = "soporte@sertel.mx";

const PRESTADOR_VACIO: PrestadorDatos = {
  razon_social: "",
  rfc: "",
  representante: "",
  representante_cargo: "",
  correo: CORREO_OFICIAL,
  cuenta_bancaria: "",
  clabe: "",
  telefono_soporte: "",
  telefono_emergencias: "",
  jurisdiccion: "",
};

const VALORES_INICIALES: ContratoFormValues = {
  cliente: null,
  cliente_tipo_persona: "moral",
  cliente_razon_social: "",
  cliente_rfc: "",
  cliente_regimen_fiscal: "",
  cliente_domicilio_fiscal: "",
  cliente_representante: "",
  cliente_clave_elector: "",
  cliente_curp: "",
  cliente_correo: "",
  domicilio_instalacion: "",
  plan_mbps: 100,
  precio_mensual: "",
  vigencia_meses: 36,
  fecha_firma: hoyIso(),
  ciudad_firma: "Manzanillo, Colima",
  prestador_datos: PRESTADOR_VACIO,
};

/** Campos que vienen del contacto: se vacían al quitarlo o cambiarlo por otro. */
const CLIENTE_VACIO: Pick<
  ContratoFormValues,
  | "cliente"
  | "cliente_tipo_persona"
  | "cliente_razon_social"
  | "cliente_rfc"
  | "cliente_regimen_fiscal"
  | "cliente_domicilio_fiscal"
  | "cliente_representante"
  | "cliente_clave_elector"
  | "cliente_curp"
  | "cliente_correo"
> = {
  cliente: null,
  cliente_tipo_persona: VALORES_INICIALES.cliente_tipo_persona,
  cliente_razon_social: "",
  cliente_rfc: "",
  cliente_regimen_fiscal: "",
  cliente_domicilio_fiscal: "",
  cliente_representante: "",
  cliente_clave_elector: "",
  cliente_curp: "",
  cliente_correo: "",
};

const PLANES_RAPIDOS = [50, 100, 200, 300, 500, 1000];
const VIGENCIAS_RAPIDAS = [12, 24, 36];

const PRESTADOR_CAMPOS: [keyof PrestadorDatos, string, boolean][] = [
  ["razon_social", "Razón social", true],
  ["rfc", "RFC", false],
  ["correo", "Correo oficial (notificaciones)", false],
  ["representante", "Representante legal", false],
  ["representante_cargo", "Cargo del representante", false],
  ["cuenta_bancaria", "Cuenta bancaria", false],
  ["clabe", "CLABE interbancaria", false],
  ["telefono_soporte", "Teléfono de soporte", false],
  ["telefono_emergencias", "Emergencias 24/7", false],
  ["jurisdiccion", "Jurisdicción (tribunales de)", true],
];

function valoresDesde(c: Contrato): ContratoFormValues {
  return {
    cliente: c.cliente,
    cliente_tipo_persona: c.cliente_tipo_persona,
    cliente_razon_social: c.cliente_razon_social,
    cliente_rfc: c.cliente_rfc,
    cliente_regimen_fiscal: c.cliente_regimen_fiscal,
    cliente_domicilio_fiscal: c.cliente_domicilio_fiscal,
    cliente_representante: c.cliente_representante,
    cliente_clave_elector: c.cliente_clave_elector,
    cliente_curp: c.cliente_curp,
    cliente_correo: c.cliente_correo,
    domicilio_instalacion: c.domicilio_instalacion,
    plan_mbps: c.plan_mbps,
    precio_mensual: c.precio_mensual,
    vigencia_meses: c.vigencia_meses,
    fecha_firma: c.fecha_firma,
    ciudad_firma: c.ciudad_firma,
    prestador_datos: prestadorConCorreo(c.prestador_datos),
  };
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Si el prestador no trae correo, queda el buzón oficial de notificaciones. */
function prestadorConCorreo(p?: Partial<PrestadorDatos> | null): PrestadorDatos {
  const merged: PrestadorDatos = { ...PRESTADOR_VACIO, ...p };
  if (!String(merged.correo || "").trim()) merged.correo = CORREO_OFICIAL;
  return merged;
}

/** Datos del catálogo de clientes → campos del contrato (solo los que traiga). */
function desdeCliente(raw: Record<string, unknown>): Partial<ContratoFormValues> {
  const direccion =
    str(raw.direccion) ||
    [
      [str(raw.calle), str(raw.numero_exterior)].filter(Boolean).join(" "),
      str(raw.colonia),
      str(raw.codigo_postal) && `C.P. ${str(raw.codigo_postal)}`,
      str(raw.municipio) || str(raw.ciudad),
      str(raw.estado),
    ]
      .filter(Boolean)
      .join(", ");
  const out: Partial<ContratoFormValues> = {
    cliente_razon_social: str(raw.nombre_facturacion) || str(raw.nombre),
    cliente_tipo_persona: str(raw.tipo) === "PERSONA_FISICA" ? "fisica" : "moral",
  };
  if (str(raw.rfc)) out.cliente_rfc = str(raw.rfc).toUpperCase();
  if (str(raw.curp)) out.cliente_curp = str(raw.curp).toUpperCase();
  if (str(raw.correo)) out.cliente_correo = str(raw.correo);
  if (str(raw.representante)) out.cliente_representante = str(raw.representante);
  if (str(raw.regimen_fiscal)) out.cliente_regimen_fiscal = str(raw.regimen_fiscal);
  if (direccion) out.cliente_domicilio_fiscal = direccion;
  return out;
}

/* ------------------------------------------------------------------ piezas */

/** Bloque de la forma: título y ayuda a la izquierda, campos a la derecha. */
type BloqueId = "cliente" | "fiscal" | "plan" | "instalacion" | "prestador" | "pagos";

const BLOQUES: { id: BloqueId; titulo: string; desc: string; icon: ReactNode }[] = [
  { id: "cliente", titulo: "Cliente", desc: "Quién contrata. El correo recibe los avisos y el código para firmar.", icon: <UserRound /> },
  { id: "fiscal", titulo: "Datos fiscales e identificación", desc: "Aparecen en las declaraciones del contrato. Son opcionales.", icon: <Receipt /> },
  { id: "plan", titulo: "Plan y precio", desc: "Velocidad simétrica, mensualidad antes de IVA y plazo forzoso.", icon: <Wifi /> },
  { id: "instalacion", titulo: "Instalación y firma", desc: "Dónde se instala el servicio y dónde y cuándo se firma.", icon: <MapPin /> },
  { id: "prestador", titulo: "Prestador", desc: "Viene con los datos de la empresa; cámbialos solo si este contrato es distinto.", icon: <Landmark /> },
  { id: "pagos", titulo: "Pagos y soporte", desc: "Cuentas para el pago, teléfonos de atención y tribunales competentes.", icon: <Headset /> },
];

/** Campos obligatorios de cada bloque (la clave es la de `errors`). */
const OBLIGATORIOS: Record<BloqueId, string[]> = {
  cliente: ["cliente_razon_social", "cliente_representante", "cliente_correo"],
  fiscal: [],
  plan: ["plan_mbps", "precio_mensual", "vigencia_meses"],
  instalacion: ["domicilio_instalacion"],
  prestador: ["p-razon_social", "p-correo"],
  pagos: [],
};

const PRESTADOR_A: (keyof PrestadorDatos)[] = ["razon_social", "rfc", "correo", "representante", "representante_cargo"];
const PRESTADOR_B: (keyof PrestadorDatos)[] = ["cuenta_bancaria", "clabe", "telefono_soporte", "telefono_emergencias", "jurisdiccion"];

const textareaU = `${inputClass} h-auto min-h-[88px] resize-y py-2.5 leading-relaxed`;
const inputInvalidU =
  "border-[#C22B2B]! focus:border-[#C22B2B]! focus:ring-[rgba(194,43,43,0.16)]! dark:border-[#F87171]! dark:focus:ring-[rgba(248,113,113,0.2)]!";

/** Campo con la tipografía de Gestión de usuarios: etiqueta 13 px, ayuda/errores debajo. */
function Campo({
  label,
  htmlFor,
  required,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="cot-fade mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className={hintClass}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Píldora de estado del bloque. */
function EstadoBloque({ faltan, opcional }: { faltan: number; opcional: boolean }) {
  const tono =
    opcional
      ? "bg-[#F4F4F5] text-[#52525B] ring-[#E4E4E7] dark:bg-white/6 dark:text-[#B7C1D1] dark:ring-[#273244]"
      : faltan === 0
        ? "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]"
        : "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]";
  const texto = opcional ? "Opcional" : faltan === 0 ? "Completo" : faltan === 1 ? "Falta 1 dato" : `Faltan ${faltan} datos`;
  return (
    <span key={texto} className={cn("cot-fade inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset", tono)}>
      {!opcional && faltan === 0 ? <Check className="cot-tick size-3" strokeWidth={3} aria-hidden /> : <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {texto}
    </span>
  );
}

const ETIQUETA_REQUERIDO: Record<string, string> = {
  cliente_razon_social: "Razón social",
  cliente_representante: "Representante",
  cliente_correo: "Correo del cliente",
  plan_mbps: "Velocidad",
  precio_mensual: "Mensualidad",
  vigencia_meses: "Vigencia",
  domicilio_instalacion: "Domicilio de instalación",
  "p-razon_social": "Razón social del prestador",
  "p-correo": "Correo del prestador",
};

/* ------------------------------------------------------------------ página */

export default function ContratoFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [values, setValues] = useState<ContratoFormValues>(VALORES_INICIALES);
  const [original, setOriginal] = useState<Contrato | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [contacto, setContacto] = useState<ContactoResumen | null>(null);
  const [cargandoContacto, setCargandoContacto] = useState(false);
  const [verHoja, setVerHoja] = useState(false);
  /** Último contacto pedido: descarta respuestas que llegan después de quitarlo o cambiarlo. */
  const clientePedido = useRef("");
  const guardarRef = useRef<() => void>(() => {});

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (id) {
          const c = await getContrato(id);
          if (!vivo) return;
          setOriginal(c);
          setValues(valoresDesde(c));
          if (c.cliente) {
            setContacto({ id: c.cliente, nombre: c.cliente_razon_social, correo: c.cliente_correo });
          }
        } else {
          const p = await getPrestadorDefaults();
          if (vivo) setValues((v) => ({ ...v, prestador_datos: prestadorConCorreo(p) }));
        }
      } catch (e) {
        if (vivo) setToast(e instanceof Error ? e.message : "No se pudo cargar el contrato.");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  // Ctrl/⌘ + S guarda.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        guardarRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = <K extends keyof ContratoFormValues>(key: K, value: ContratoFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };
  const setPrestador = (key: keyof PrestadorDatos, value: string) => {
    setValues((v) => ({ ...v, prestador_datos: { ...v.prestador_datos, [key]: value } }));
    setErrors((e) => {
      if (!e[`p-${key}`]) return e;
      const next = { ...e };
      delete next[`p-${key}`];
      return next;
    });
  };

  const onCliente = async (elegido: ContactoResumen | null) => {
    const clienteId = elegido ? String(elegido.id) : "";
    clientePedido.current = clienteId;
    setContacto(elegido);
    setValues((v) => ({ ...v, ...CLIENTE_VACIO, cliente: clienteId ? Number(clienteId) : null }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(CLIENTE_VACIO)) delete next[k];
      return next;
    });
    if (!clienteId) {
      setCargandoContacto(false);
      return;
    }
    setCargandoContacto(true);
    try {
      const res = await fetchApi(`/api/clientes/${clienteId}/`, { method: "GET" });
      if (!res.ok || clientePedido.current !== clienteId) return;
      const data = (await res.json()) as Record<string, unknown>;
      if (clientePedido.current !== clienteId) return;
      setValues((v) => ({ ...v, ...desdeCliente(data), cliente: Number(clienteId) }));
    } catch {
      /* se puede capturar a mano */
    } finally {
      if (clientePedido.current === clienteId) setCargandoContacto(false);
    }
  };

  const cerrado = original?.estado === "completado" || original?.estado === "cancelado";
  const firmasEnRiesgo = Boolean(original && (original.firmado_prestador_at || original.firmado_cliente_at || original.enlace_activo));
  const esFisica = values.cliente_tipo_persona === "fisica";
  const precio = Number(values.precio_mensual) || 0;
  const vigencia = Number(values.vigencia_meses) || 0;
  const letra = useMemo(() => (precio > 0 ? importeConLetra(precio) : ""), [precio]);
  const p = values.prestador_datos;

  /* --------------------------------------------------------- validación */

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!values.cliente_razon_social.trim()) e.cliente_razon_social = "Obligatorio.";
    if (!esFisica && !values.cliente_representante.trim()) e.cliente_representante = "Obligatorio en persona moral.";
    if (!values.cliente_correo.trim()) e.cliente_correo = "Se usa para enviar el código de verificación al firmar.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.cliente_correo.trim())) e.cliente_correo = "Correo no válido.";
    if (!(Number(values.plan_mbps) > 0)) e.plan_mbps = "Indica los Mbps.";
    if (!(precio > 0)) e.precio_mensual = "Indica la mensualidad.";
    if (!(vigencia > 0)) e.vigencia_meses = "Indica la vigencia.";
    if (!values.domicilio_instalacion.trim()) e.domicilio_instalacion = "Obligatorio.";
    if (!p.razon_social.trim()) e["p-razon_social"] = "Obligatorio.";
    if (!p.correo.trim()) e["p-correo"] = "Necesario para enviar a firma.";
    return e;
  };
  const pendientes = validar();
  const requeridos = [
    "cliente_razon_social",
    ...(esFisica ? [] : ["cliente_representante"]),
    "cliente_correo",
    "plan_mbps",
    "precio_mensual",
    "vigencia_meses",
    "domicilio_instalacion",
    "p-razon_social",
    "p-correo",
  ];
  const faltanTotal = Object.keys(pendientes).length;
  const faltanEn = (b: BloqueId) => OBLIGATORIOS[b].filter((k) => pendientes[k]).length;
  const idCampo = (k: string) => (k.startsWith("p-") ? k : `f-${k}`);

  const guardar = async () => {
    if (saving || cerrado) return;
    if (faltanTotal) {
      setErrors(pendientes);
      setToast(faltanTotal === 1 ? "Falta 1 dato obligatorio." : `Faltan ${faltanTotal} datos obligatorios.`);
      const primero = document.getElementById(idCampo(Object.keys(pendientes)[0]));
      primero?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      window.setTimeout(() => primero?.focus({ preventScroll: true }), reduce ? 0 : 380);
      return;
    }
    setSaving(true);
    try {
      const payload: ContratoFormValues = {
        ...values,
        plan_mbps: Number(values.plan_mbps),
        vigencia_meses: vigencia,
        precio_mensual: precio.toFixed(2),
        fecha_firma: values.fecha_firma || null,
      };
      const saved = original ? await updateContrato(original.id, payload) : await createContrato(payload);
      navigate(`/contratos/${saved.id}`, { replace: true, state: { guardado: true } });
    } catch (e) {
      if (e instanceof ContratoApiError) {
        setErrors(e.fields);
        setToast(e.message);
      } else {
        setToast("No se pudo guardar el contrato.");
      }
    } finally {
      setSaving(false);
    }
  };
  guardarRef.current = () => void guardar();

  const campo = (key: keyof ContratoFormValues, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      {...props}
      id={`f-${key}`}
      value={(values[key] as string | number | null) ?? ""}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={Boolean(errors[key]) || undefined}
      aria-describedby={errors[key] ? `f-${key}-error` : undefined}
      className={cn(inputClass, errors[key] && inputInvalidU, props.className)}
      disabled={cerrado || props.disabled}
    />
  );

  const campoPrestador = (key: keyof PrestadorDatos) => {
    const [, label, full] = PRESTADOR_CAMPOS.find(([k]) => k === key)!;
    const err = errors[`p-${key}`];
    return (
      <Campo
        key={key}
        label={label}
        htmlFor={`p-${key}`}
        required={key === "correo" || key === "razon_social"}
        error={err}
        full={full}
        hint={key === "correo" ? "Buzón oficial para los avisos de este contrato." : undefined}
      >
        <input
          id={`p-${key}`}
          value={p[key]}
          onChange={(e) => setPrestador(key, e.target.value)}
          aria-invalid={Boolean(err) || undefined}
          aria-describedby={err ? `p-${key}-error` : undefined}
          className={cn(inputClass, ["clabe", "cuenta_bancaria", "rfc"].includes(key) && "font-mono", err && inputInvalidU)}
          type={key === "correo" ? "email" : key.startsWith("telefono") ? "tel" : "text"}
          autoComplete={key === "correo" ? "off" : undefined}
          placeholder={key === "correo" ? CORREO_OFICIAL : undefined}
          disabled={cerrado}
          maxLength={255}
        />
      </Campo>
    );
  };

  const opcion = (activo: boolean, onClick: () => void, texto: string) => (
    <button
      type="button"
      onClick={onClick}
      disabled={cerrado}
      aria-pressed={activo}
      className={cn(
        "cot-press inline-flex h-10 items-center rounded-[10px] border px-3.5 text-[14px] font-medium tabular-nums transition-colors disabled:opacity-50",
        focusRing,
        activo
          ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]"
          : "border-[#E7E7EA] bg-white text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#D6DEEA] dark:hover:border-[#3A4661]",
      )}
    >
      {texto}
    </button>
  );

  const salirA = original ? `/contratos/${original.id}` : "/contratos";
  const textoGuardar = saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear contrato";

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 sm:px-5 md:px-6 lg:px-8 xl:px-10" style={sansStyle} aria-busy>
        <div className="h-4 w-40 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-[#1B2539]" />
        <div className="h-37.5 animate-pulse rounded-[24px] bg-[#E9EBF0] dark:bg-[#1B2539]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-4xl bg-[#F4F4F5] dark:bg-[#111827]" />
          ))}
        </div>
        <div className="h-160 animate-pulse rounded-[24px] bg-[#F4F4F5] dark:bg-[#111827]" />
        <span className="sr-only">Cargando contrato…</span>
      </div>
    );
  }

  /** Faltantes legibles para las acciones («Falta: Razón social, Correo…»). */
  const faltantes = requeridos.filter((k) => pendientes[k]).map((k) => ETIQUETA_REQUERIDO[k] ?? k);

  /**
   * Acciones de guardar: tarjeta blanca limpia con el botón principal en azul
   * de acción (único color de acción del sistema) y «Cancelar» con contorno.
   * Lo que falta se dice en una sola línea discreta, sin paneles extra.
   * `panel` va en el lateral (escritorio); `barra` flota abajo en pantallas chicas.
   */
  const panelAcciones = (modo: "panel" | "barra") => {
    const ok = faltanTotal === 0;
    const aviso = (
      <p
        key={ok ? "ok" : faltanTotal}
        className={cn("cot-fade flex min-w-0 items-center gap-1.5 text-[13px]", ok ? "text-[#04724D] dark:text-[#4ADE80]" : "text-[#8A5D0F] dark:text-[#F2C27A]")}
        aria-live="polite"
        title={ok ? undefined : faltantes.join(", ")}
      >
        {ok ? (
          <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />
        ) : (
          <span className="size-1.5 shrink-0 rounded-full bg-[#E6A23C]" aria-hidden />
        )}
        <span className="truncate">
          {ok ? "Todo listo para guardar" : faltanTotal === 1 ? `Falta: ${faltantes[0]}` : `Faltan ${faltanTotal} datos obligatorios`}
        </span>
      </p>
    );
    const botonGuardar = (
      <button
        type="button"
        onClick={() => void guardar()}
        disabled={saving}
        className={cn(
          "cot-press inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1B5CFF] px-6 text-[15px] font-semibold tracking-[-0.1px] text-white shadow-[0_8px_20px_-8px_rgba(27,92,255,0.6)] transition-colors hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.25)] disabled:cursor-wait disabled:opacity-80 dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] [&_svg]:size-4.5",
          modo === "panel" ? "w-full" : "flex-2 sm:flex-none",
        )}
      >
        {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        {textoGuardar}
      </button>
    );
    const botonCancelar = (
      <Link
        to={salirA}
        className={cn(
          "cot-press inline-flex h-12 items-center justify-center rounded-2xl border border-[#E4E4E7] bg-white px-5 text-[15px] font-medium text-[#3F3F46] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539]",
          modo === "panel" ? "w-full" : "flex-1 sm:flex-none",
        )}
      >
        Cancelar
      </Link>
    );

    if (modo === "barra") {
      return (
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-4xl border border-[#E7E7EA] bg-white/95 p-3 shadow-[0_18px_40px_-18px_rgba(9,9,11,0.3)] backdrop-blur-md sm:flex-row sm:items-center sm:pl-5 dark:border-[#273244] dark:bg-[#111827]/95">
          <div className="min-w-0 flex-1">{aviso}</div>
          <div className="flex gap-2">
            {botonCancelar}
            {botonGuardar}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-[#E7E7EA] bg-white p-4 shadow-[0_6px_20px_-12px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827]">
        {botonGuardar}
        <div className="mt-2">{botonCancelar}</div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F0F0F2] pt-3 dark:border-[#1F2A3C]">
          {aviso}
          <kbd className="hidden shrink-0 rounded-[6px] border border-[#E4E4E7] bg-[#FAFAFA] px-1.5 py-0.5 font-sans text-[11px] font-medium text-[#71717A] xl:inline dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#8EA0B8]">
            Ctrl S
          </kbd>
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------- bloques */

  const bloque = (b: BloqueId, indice: number, children: ReactNode) => {
    const meta = BLOQUES.find((x) => x.id === b)!;
    const opcional = OBLIGATORIOS[b].length === 0;
    const faltan = faltanEn(b);
    const listo = !opcional && faltan === 0;
    return (
      <section
        key={b}
        aria-labelledby={`b-${b}`}
        className={cn(cardShellClass, "cot-rise overflow-hidden")}
        style={{ "--cot-i": Math.min(indice, 8) } as CSSProperties}
      >
        <header className="flex items-start gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C] sm:px-6">
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
              listo
                ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                : "bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]",
            )}
            aria-hidden
          >
            {listo ? <Check key={`${b}-ok`} className="cot-tick size-4" strokeWidth={3} /> : indice}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id={`b-${b}`} className={cardTitleClass}>
                {meta.titulo}
              </h2>
              <EstadoBloque faltan={faltan} opcional={opcional} />
            </div>
            <p className={cn(cardDescClass, "mt-1")}>{meta.desc}</p>
          </div>
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5] text-[#3F3F46] sm:inline-flex dark:bg-white/6 dark:text-[#D6DEEA] [&_svg]:size-4.5" aria-hidden>
            {meta.icon}
          </span>
        </header>
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-6">{children}</div>
      </section>
    );
  };

  return (
    <>
      <PageMeta title={`${editando ? "Editar" : "Nuevo"} contrato | Sistema Grupo Intrax GPS`} description="Contrato de Internet Dedicado" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-clip">
        <div
          className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
          style={sansStyle}
        >
          {/* Migas */}
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
            <Link
              to="/contratos"
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/4 hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
            >
              Contratos
            </Link>
            {original ? (
              <>
                <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
                  /
                </span>
                <Link
                  to={`/contratos/${original.id}`}
                  className="rounded-md px-1.5 py-0.5 font-mono text-[12px] transition-colors hover:bg-black/4 hover:text-[#09090B] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
                >
                  {original.folio}
                </Link>
              </>
            ) : null}
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
              {editando ? "Editar" : "Nuevo"}
            </span>
          </nav>

          <div className="flex flex-col gap-4">
            {/* Encabezado: identidad y datos del contrato */}
            <header className="cot-rise cot-sheen relative overflow-hidden rounded-[24px] bg-[#17235B] text-white shadow-[0_18px_40px_-24px_rgba(23,35,91,0.7)] dark:bg-[#1B2A63]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(27,92,255,0.30),transparent_55%)]" aria-hidden />
              <div className={heroGlowGold} aria-hidden />
              <div className={heroDots} aria-hidden />
              <div className="relative grid gap-6 px-5 py-6 sm:px-8 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/30">
                      <FileSignature className="size-5.5" strokeWidth={1.6} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className={heroEyebrowClass}>Documentos · Contratos</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <h1 className={heroHeadingClass}>{editando ? "Editar contrato" : "Nuevo contrato"}</h1>
                        {original ? <EstadoPill estado={original.estado} className="bg-white/10! text-white! ring-white/20!" /> : null}
                      </div>
                      <p className={cn("mt-1.5 max-w-[56ch]", heroBodyClass)}>
                        Internet Dedicado con formato notarial. Captura los datos variables; el texto legal lo arma el sistema.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Datos del contrato">
                    {(
                      [
                        [<Hash key="i" />, original ? original.folio : "Folio al guardar", Boolean(original)],
                        [<UserRound key="i" />, values.cliente_razon_social.trim() || "Cliente sin capturar", Boolean(values.cliente_razon_social.trim())],
                        [<Wifi key="i" />, Number(values.plan_mbps) > 0 ? `${values.plan_mbps} Mbps simétricos` : "Plan sin definir", Number(values.plan_mbps) > 0],
                        [<CalendarDays key="i" />, values.fecha_firma ? `Firma ${formatoFecha(values.fecha_firma)}` : "Fecha de firma pendiente", Boolean(values.fecha_firma)],
                      ] as [ReactNode, string, boolean][]
                    ).map(([icon, texto, ok], k) => (
                      <li
                        key={k}
                        className={cn(
                          "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-inset [&_svg]:size-3.5 [&_svg]:shrink-0",
                          ok ? "bg-white/10 text-white ring-white/15" : "bg-transparent text-white/55 ring-white/10",
                        )}
                      >
                        {icon}
                        <span key={texto} className={cn("cot-fade truncate", k === 0 && original && "font-mono text-[12px]")} title={texto}>
                          {texto}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setVerHoja(true)}
                  className="cot-press inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl bg-white/10 px-5 text-[15px] font-medium text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:self-end [&_svg]:size-4"
                >
                  <Eye aria-hidden /> Vista previa
                </button>
              </div>
            </header>

            {firmasEnRiesgo && !cerrado && (
              <div className="cot-fade flex gap-3 rounded-3xl border border-[#F0D7A3] bg-[#FFF8EB] p-4 text-[14px] leading-5 text-[#8A5D0F] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.1)] dark:text-[#F2C27A]" role="status">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p>
                  Este contrato ya se envió a firma o tiene firmas. Si cambias su contenido, <strong>las firmas se descartan</strong> y el enlace actual deja
                  de funcionar.
                </p>
              </div>
            )}
            {cerrado && (
              <div className="cot-fade flex items-center gap-3 rounded-3xl border border-[#E7E7EA] bg-[#FAFAFA] p-4 text-[14px] text-[#52525B] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#B7C1D1]">
                <Lock className="size-4 shrink-0" aria-hidden /> Este contrato está {original?.estado_display.toLowerCase()} y ya no se puede editar.
              </div>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-6">
            <form
              className="min-w-0 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void guardar();
              }}
              noValidate
            >
              {bloque(
                "cliente",
                1,
                <>
                  <div className="sm:col-span-2">
                    <ContactoPicker value={contacto} cargando={cargandoContacto} disabled={cerrado} onChange={(c) => void onCliente(c)} />
                  </div>
                  <div className="sm:col-span-2">
                    <span id="tipo-persona-label" className={labelClass}>
                      Tipo de persona
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="tipo-persona-label">
                      {(
                        [
                          ["moral", "Persona moral", "Firma el representante legal", Building2],
                          ["fisica", "Persona física", "Firma a título personal", User],
                        ] as const
                      ).map(([t, titulo, detalle, Icon]) => {
                        const activo = values.cliente_tipo_persona === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            disabled={cerrado}
                            onClick={() => set("cliente_tipo_persona", t)}
                            className={cn(
                              "cot-press flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
                              focusRing,
                              activo
                                ? "border-[#1B5CFF] bg-[#F5F8FF] ring-4 ring-[rgba(27,92,255,0.10)] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40 dark:ring-[rgba(75,124,255,0.16)]"
                                : "border-[#E4E4E7] bg-white hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#3A4661]",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                                activo ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]" : "bg-[#F4F4F5] text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]",
                              )}
                              aria-hidden
                            >
                              <Icon className="size-4" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[14px] font-semibold tracking-[-0.1px] text-[#09090B] dark:text-[#F8FAFC]">{titulo}</span>
                              <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{detalle}</span>
                            </span>
                            <Check
                              className={cn("cot-tick ml-auto size-4 shrink-0 text-[#1B5CFF] dark:text-[#4B7CFF]", !activo && "invisible")}
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Campo label={esFisica ? "Nombre completo" : "Razón social"} htmlFor="f-cliente_razon_social" required error={errors.cliente_razon_social} full>
                    {campo("cliente_razon_social", { maxLength: 255, placeholder: esFisica ? "Como aparece en su INE" : "Ej. SEGADI LOGISTIC & TRANSPORT S. DE R.L. DE C.V." })}
                  </Campo>
                  {!esFisica && (
                    <Campo label="Representante legal" htmlFor="f-cliente_representante" required error={errors.cliente_representante}>
                      {campo("cliente_representante", { maxLength: 255, placeholder: "Quien firma por la empresa" })}
                    </Campo>
                  )}
                  <Campo label="Correo oficial" htmlFor="f-cliente_correo" required error={errors.cliente_correo} hint="Recibe los avisos y el código para firmar." full={esFisica}>
                    {campo("cliente_correo", { type: "email", autoComplete: "off", maxLength: 254, placeholder: "nombre@empresa.com" })}
                  </Campo>
                </>,
              )}

              {bloque(
                "fiscal",
                2,
                <>
                  <Campo label="RFC" htmlFor="f-cliente_rfc" error={errors.cliente_rfc}>
                    {campo("cliente_rfc", { maxLength: 13, className: "uppercase font-mono", autoCapitalize: "characters" })}
                  </Campo>
                  <Campo label="Régimen fiscal" htmlFor="f-cliente_regimen_fiscal" error={errors.cliente_regimen_fiscal} hint="Ej. 624. Coordinados">
                    {campo("cliente_regimen_fiscal", { maxLength: 120 })}
                  </Campo>
                  <Campo label="Domicilio fiscal" htmlFor="f-cliente_domicilio_fiscal" error={errors.cliente_domicilio_fiscal} full>
                    <textarea
                      id="f-cliente_domicilio_fiscal"
                      value={values.cliente_domicilio_fiscal}
                      onChange={(e) => set("cliente_domicilio_fiscal", e.target.value)}
                      className={textareaU}
                      placeholder="Calle, número, colonia, C.P., municipio y estado"
                      disabled={cerrado}
                    />
                  </Campo>
                  <Campo label="Clave de elector (INE)" htmlFor="f-cliente_clave_elector" error={errors.cliente_clave_elector} hint={esFisica ? "Del cliente · 18 caracteres" : "Del representante · 18 caracteres"}>
                    {campo("cliente_clave_elector", { maxLength: 18, className: "uppercase font-mono" })}
                  </Campo>
                  <Campo label="CURP" htmlFor="f-cliente_curp" error={errors.cliente_curp} hint="18 caracteres">
                    {campo("cliente_curp", { maxLength: 18, className: "uppercase font-mono" })}
                  </Campo>
                </>,
              )}

              {bloque(
                "plan",
                3,
                <>
                  <Campo label="Velocidad" htmlFor="f-plan_mbps" required error={errors.plan_mbps} full>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-36">
                        {campo("plan_mbps", { type: "number", min: 1, inputMode: "numeric", className: "pr-14 tabular-nums" })}
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#A1A1AA]">Mbps</span>
                      </div>
                      {PLANES_RAPIDOS.map((m) => (
                        <span key={m}>{opcion(Number(values.plan_mbps) === m, () => set("plan_mbps", m), m >= 1000 ? `${m / 1000} Gbps` : `${m}`)}</span>
                      ))}
                    </div>
                  </Campo>
                  <Campo label="Mensualidad antes de IVA" htmlFor="f-precio_mensual" required error={errors.precio_mensual} hint={letra ? `${letra} + IVA` : undefined}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[#A1A1AA]">$</span>
                      {campo("precio_mensual", {
                        type: "number",
                        min: 0,
                        step: "0.01",
                        inputMode: "decimal",
                        placeholder: "0.00",
                        className: "pl-7 pr-14 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                      })}
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA]">MXN</span>
                    </div>
                  </Campo>
                  <Campo label="Vigencia forzosa" htmlFor="f-vigencia_meses" required error={errors.vigencia_meses}>
                    <div className="flex items-center gap-2">
                      <div className="relative w-28 shrink-0">
                        {campo("vigencia_meses", { type: "number", min: 1, max: 120, inputMode: "numeric", className: "pr-12 tabular-nums" })}
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#A1A1AA]">m</span>
                      </div>
                      {VIGENCIAS_RAPIDAS.map((m) => (
                        <span key={m}>{opcion(vigencia === m, () => set("vigencia_meses", m), `${m}`)}</span>
                      ))}
                    </div>
                  </Campo>
                </>,
              )}

              {bloque(
                "instalacion",
                4,
                <>
                  <Campo label="Domicilio de instalación" htmlFor="f-domicilio_instalacion" required error={errors.domicilio_instalacion} full>
                    <textarea
                      id="f-domicilio_instalacion"
                      value={values.domicilio_instalacion}
                      onChange={(e) => set("domicilio_instalacion", e.target.value)}
                      className={cn(textareaU, errors.domicilio_instalacion && inputInvalidU)}
                      placeholder="Calle, número, colonia, C.P., municipio"
                      aria-invalid={Boolean(errors.domicilio_instalacion) || undefined}
                      aria-describedby={errors.domicilio_instalacion ? "f-domicilio_instalacion-error" : undefined}
                      disabled={cerrado}
                    />
                  </Campo>
                  <Campo label="Ciudad de firma" htmlFor="f-ciudad_firma" error={errors.ciudad_firma}>
                    {campo("ciudad_firma", { maxLength: 120 })}
                  </Campo>
                  <Campo label="Fecha de firma" htmlFor="f-fecha_firma" error={errors.fecha_firma}>
                    {campo("fecha_firma", { type: "date" })}
                  </Campo>
                </>,
              )}

              {bloque("prestador", 5, <>{PRESTADOR_A.map(campoPrestador)}</>)}
              {bloque("pagos", 6, <>{PRESTADOR_B.map(campoPrestador)}</>)}
            </form>

            <aside className="cot-rise max-lg:hidden min-w-0 lg:sticky lg:top-24" style={{ "--cot-i": 2 } as CSSProperties} aria-label="Resumen del contrato">
              <div className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-5 text-white dark:bg-[#1B2A63]">
                <div className={heroGlowGold} aria-hidden />
                <div className="relative">
                  <p className={heroEyebrowClass}>Mensualidad con IVA</p>
                  <p key={precio} className="cot-flash mt-1 text-[34px] font-semibold leading-none tracking-[-1px] text-white tabular-nums">
                    {formatoDinero(precio * 1.16)}
                  </p>
                  <p className="mt-1 text-[13px] text-white/65">{formatoDinero(precio)} + IVA · {vigencia > 0 ? `${vigencia} meses` : "sin plazo"}</p>
                  <dl className="mt-4 space-y-2 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/55">Cliente</dt>
                      <dd className="min-w-0 truncate font-medium text-white">{values.cliente_razon_social || "Sin capturar"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/55">Plan</dt>
                      <dd className="font-medium text-white tabular-nums">{Number(values.plan_mbps) > 0 ? `${values.plan_mbps} Mbps` : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/55">Notificaciones</dt>
                      <dd className="min-w-0 truncate font-medium text-white">{p.correo || CORREO_OFICIAL}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {!cerrado ? <div className="mt-4">{panelAcciones("panel")}</div> : null}
              <div className="mt-4 rounded-4xl bg-[#E9EBF0] p-4 dark:bg-[#0B1220]">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Hoja en vivo</p>
                <HojaPreview values={values} folio={original?.folio} className="mx-auto max-w-[320px]" />
              </div>
            </aside>
            </div>

            {/* Barra de acciones flotante (celular y tableta) */}
            {!cerrado ? (
              <div className="sticky bottom-3 z-30 pb-[env(safe-area-inset-bottom,0px)] lg:hidden">{panelAcciones("barra")}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Vista previa (portal: declara la tipografía) */}
      <AppModal open={verHoja} onClose={() => setVerHoja(false)} size="lg" dismissOnBackdrop labelledBy="hoja-titulo" className={cn(fontSans, "sm:max-w-160!")}>
        <AppModalHeader
          icon={<FileText className="size-5" />}
          tone="info"
          eyebrow="Vista previa"
          title="Primera hoja del contrato"
          titleId="hoja-titulo"
          description="Así se verán los datos en el documento. El texto completo lo arma el sistema al guardar."
          onClose={() => setVerHoja(false)}
          divided
        />
        <div className="custom-scrollbar max-h-[70dvh] overflow-y-auto bg-[#EEF0F4] p-6 dark:bg-[#0B1220] sm:p-8">
          <HojaPreview values={values} folio={original?.folio} className="mx-auto max-w-115" />
        </div>
      </AppModal>

      {toast && (
        <div className={fontSans}>
          <Alert variant="error" title="Revisa el contrato" message={toast} showLink={false} onClose={() => setToast("")} />
        </div>
      )}
    </>
  );
}
