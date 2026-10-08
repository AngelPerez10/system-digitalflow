/**
 * Alta / edición de contrato como asistente de 4 pasos con la hoja en vivo.
 *
 *   1 Cliente → 2 Servicio → 3 Prestador → 4 Revisión
 *
 * Cada paso entra deslizándose en la dirección del avance; a la derecha, la
 * carátula del PDF notarial se actualiza mientras se escribe. Solo se capturan
 * los datos variables; el texto legal lo arma el servidor. Si el contrato ya se
 * envió o tiene firmas, guardar un cambio de contenido descarta las firmas y
 * revoca el enlace (lo hace el servidor).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Lock,
  Pencil,
  Save,
  User,
  UserRound,
  Wifi,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import ClienteComboBox from "@/pages/Operacion/Mantenimiento/polizas/form/ClienteComboBox";
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
import { formatoDinero, formatoFecha, importeConLetra, numeroALetras } from "../shared/contratoFormato";
import {
  btn,
  cardShell,
  focusRing,
  heroBand,
  heroDots,
  heroGlowGold,
  input as inputClass,
  inputInvalid,
  pageWrap,
  sansStyle,
  textarea as textareaClass,
} from "../shared/contratoTokens";
import { EstadoPill, Field } from "../shared/ContratoUi";
import HojaPreview from "./HojaPreview";

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PRESTADOR_VACIO: PrestadorDatos = {
  razon_social: "",
  rfc: "",
  representante: "",
  representante_cargo: "",
  correo: "",
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

type PasoId = "cliente" | "servicio" | "prestador" | "revision";
const PASOS: { id: PasoId; label: string; desc: string; icon: ReactNode }[] = [
  { id: "cliente", label: "Cliente", desc: "Quién contrata", icon: <UserRound className="size-4" /> },
  { id: "servicio", label: "Servicio", desc: "Plan, precio y sitio", icon: <Wifi className="size-4" /> },
  { id: "prestador", label: "Prestador", desc: "Datos de la empresa", icon: <Landmark className="size-4" /> },
  { id: "revision", label: "Revisión", desc: "Confirmar y guardar", icon: <ClipboardCheck className="size-4" /> },
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
    prestador_datos: { ...PRESTADOR_VACIO, ...c.prestador_datos },
  };
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

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

function Chip({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "cot-press inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-medium ring-1 ring-inset disabled:opacity-50",
        focusRing,
        active
          ? "bg-[#17235B] text-white ring-[#17235B] dark:bg-[#4B7CFF] dark:ring-[#4B7CFF]"
          : "bg-white text-[#52525B] ring-[#E4E4E7] hover:ring-[#D3D3D8] dark:bg-[#0F172A] dark:text-[#B7C1D1] dark:ring-[#273244]",
      )}
    >
      {children}
    </button>
  );
}

function Resumen({ titulo, onEditar, filas }: { titulo: string; onEditar: () => void; filas: [string, string][] }) {
  return (
    <div className="rounded-[16px] border border-[#E7E7EA] dark:border-[#273244]">
      <div className="flex items-center justify-between border-b border-[#F0F0F2] px-4 py-2.5 dark:border-[#1F2A3C]">
        <p className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{titulo}</p>
        <button type="button" onClick={onEditar} className={cn(btn.ghost, "min-h-8! px-2.5! text-[12.5px]!")}>
          <Pencil aria-hidden /> Editar
        </button>
      </div>
      <dl className="divide-y divide-[#F4F4F5] px-4 dark:divide-[#1F2A3C]">
        {filas.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2 text-[13px]">
            <dt className="text-[#71717A] dark:text-[#8EA0B8]">{k}</dt>
            <dd className={cn("break-words", v ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#C22B2B]")}>{v || "Falta capturar"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ página */

export default function ContratoFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [values, setValues] = useState<ContratoFormValues>(VALORES_INICIALES);
  const [original, setOriginal] = useState<Contrato | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [clienteLabel, setClienteLabel] = useState("");
  const [paso, setPaso] = useState(0);
  const [dir, setDir] = useState<"next" | "back">("next");
  const [verHoja, setVerHoja] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (id) {
          const c = await getContrato(id);
          if (!vivo) return;
          setOriginal(c);
          setValues(valoresDesde(c));
          setClienteLabel(c.cliente_razon_social);
        } else {
          const p = await getPrestadorDefaults();
          if (vivo) setValues((v) => ({ ...v, prestador_datos: { ...PRESTADOR_VACIO, ...p } }));
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

  const set = <K extends keyof ContratoFormValues>(key: K, value: ContratoFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };
  const setPrestador = (key: keyof PrestadorDatos, value: string) =>
    setValues((v) => ({ ...v, prestador_datos: { ...v.prestador_datos, [key]: value } }));

  const onCliente = async (clienteId: string, label: string) => {
    setClienteLabel(label);
    if (!clienteId) {
      set("cliente", null);
      return;
    }
    set("cliente", Number(clienteId));
    try {
      const res = await fetchApi(`/api/clientes/${clienteId}/`, { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      setValues((v) => ({ ...v, ...desdeCliente(data), cliente: Number(clienteId) }));
    } catch {
      /* se puede capturar a mano */
    }
  };

  const cerrado = original?.estado === "completado" || original?.estado === "cancelado";
  const firmasEnRiesgo = Boolean(original && (original.firmado_prestador_at || original.firmado_cliente_at || original.enlace_activo));
  const esFisica = values.cliente_tipo_persona === "fisica";
  const precio = Number(values.precio_mensual) || 0;
  const vigencia = Number(values.vigencia_meses) || 0;
  const letra = useMemo(() => (precio > 0 ? importeConLetra(precio) : ""), [precio]);
  const p = values.prestador_datos;

  /* --------------------------------------------------------- validación por paso */

  const erroresDe = (pasoId: PasoId): Record<string, string> => {
    const e: Record<string, string> = {};
    if (pasoId === "cliente") {
      if (!values.cliente_razon_social.trim()) e.cliente_razon_social = "Obligatorio.";
      if (!values.cliente_correo.trim()) e.cliente_correo = "Se usa para enviar el código de verificación al firmar.";
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.cliente_correo.trim())) e.cliente_correo = "Correo no válido.";
      if (!esFisica && !values.cliente_representante.trim()) e.cliente_representante = "Obligatorio en persona moral.";
    }
    if (pasoId === "servicio") {
      if (!(Number(values.plan_mbps) > 0)) e.plan_mbps = "Indica los Mbps.";
      if (!(precio > 0)) e.precio_mensual = "Indica la mensualidad.";
      if (!(vigencia > 0)) e.vigencia_meses = "Indica la vigencia.";
      if (!values.domicilio_instalacion.trim()) e.domicilio_instalacion = "Obligatorio.";
    }
    if (pasoId === "prestador") {
      if (!p.razon_social.trim()) e["p-razon_social"] = "Obligatorio.";
      if (!p.correo.trim()) e["p-correo"] = "Necesario para enviar a firma.";
    }
    return e;
  };
  const completos = PASOS.map((s) => s.id !== "revision" && Object.keys(erroresDe(s.id)).length === 0);

  const irA = (i: number) => {
    if (i === paso) return;
    setDir(i > paso ? "next" : "back");
    setPaso(i);
    window.requestAnimationFrame(() => tituloRef.current?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const siguiente = () => {
    const e = erroresDe(PASOS[paso].id);
    if (Object.keys(e).length) {
      setErrors((prev) => ({ ...prev, ...e }));
      const primero = document.getElementById(Object.keys(e)[0].startsWith("p-") ? Object.keys(e)[0] : `f-${Object.keys(e)[0]}`);
      primero?.focus();
      return;
    }
    irA(Math.min(paso + 1, PASOS.length - 1));
  };

  const guardar = async () => {
    const todos = { ...erroresDe("cliente"), ...erroresDe("servicio"), ...erroresDe("prestador") };
    if (Object.keys(todos).length) {
      setErrors(todos);
      setToast("Faltan datos: revisa los pasos marcados.");
      const idx = PASOS.findIndex((s) => Object.keys(erroresDe(s.id)).length > 0);
      if (idx >= 0) irA(idx);
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

  const campo = (key: keyof ContratoFormValues, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      {...props}
      id={`f-${key}`}
      value={(values[key] as string | number | null) ?? ""}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={Boolean(errors[key]) || undefined}
      aria-describedby={errors[key] ? `f-${key}-error` : undefined}
      className={cn(inputClass, errors[key] && inputInvalid, props.className)}
      disabled={cerrado || props.disabled}
    />
  );

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center" style={sansStyle}>
        <Loader2 className="size-6 animate-spin text-[#1B5CFF]" aria-label="Cargando" />
      </div>
    );
  }

  const pasoActual = PASOS[paso];
  const anim = dir === "next" ? "cot-step-next" : "cot-step-back";

  /* --------------------------------------------------------- contenido de cada paso */

  const contenido: Record<PasoId, ReactNode> = {
    cliente: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ClienteComboBox
            required={false}
            label="Prellenar desde contactos (opcional)"
            clienteId={values.cliente ? String(values.cliente) : ""}
            extraOption={values.cliente ? { value: String(values.cliente), label: clienteLabel } : null}
            error=""
            onClienteChange={(cid, label) => void onCliente(cid, label)}
          />
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">Tipo de persona</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de persona">
            {(["moral", "fisica"] as const).map((t) => {
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
                    "cot-press flex items-center gap-3 rounded-[14px] border p-3.5 text-left",
                    focusRing,
                    activo
                      ? "border-[#1B5CFF] bg-[#F5F8FF] ring-4 ring-[rgba(27,92,255,0.10)] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40"
                      : "border-[#E4E4E7] bg-white hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#0F172A]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors",
                      activo ? "bg-[#1B5CFF] text-white" : "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]",
                    )}
                  >
                    {t === "moral" ? <Building2 className="size-4" aria-hidden /> : <User className="size-4" aria-hidden />}
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                      {t === "moral" ? "Persona moral" : "Persona física"}
                    </span>
                    <span className="block text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                      {t === "moral" ? "Empresa con representante legal" : "Firma a título personal"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Field label={esFisica ? "Nombre completo" : "Razón social"} htmlFor="f-cliente_razon_social" required error={errors.cliente_razon_social} full>
          {campo("cliente_razon_social", { maxLength: 255, placeholder: esFisica ? "Como aparece en su INE" : "Ej. SEGADI LOGISTIC & TRANSPORT S. DE R.L. DE C.V." })}
        </Field>
        <Field label="RFC" htmlFor="f-cliente_rfc" error={errors.cliente_rfc}>
          {campo("cliente_rfc", { maxLength: 13, className: "uppercase font-mono", autoCapitalize: "characters" })}
        </Field>
        <Field label="Régimen fiscal" htmlFor="f-cliente_regimen_fiscal" error={errors.cliente_regimen_fiscal} hint="Ej. 624. Coordinados">
          {campo("cliente_regimen_fiscal", { maxLength: 120 })}
        </Field>
        <Field label="Domicilio fiscal" htmlFor="f-cliente_domicilio_fiscal" error={errors.cliente_domicilio_fiscal} full>
          <textarea
            id="f-cliente_domicilio_fiscal"
            value={values.cliente_domicilio_fiscal}
            onChange={(e) => set("cliente_domicilio_fiscal", e.target.value)}
            className={cn(textareaClass, "min-h-[76px]")}
            disabled={cerrado}
          />
        </Field>
        {!esFisica && (
          <Field label="Representante legal" htmlFor="f-cliente_representante" required error={errors.cliente_representante} full>
            {campo("cliente_representante", { maxLength: 255 })}
          </Field>
        )}
        <Field label="Clave de elector (INE)" htmlFor="f-cliente_clave_elector" error={errors.cliente_clave_elector} hint="18 caracteres">
          {campo("cliente_clave_elector", { maxLength: 18, className: "uppercase font-mono" })}
        </Field>
        <Field label="CURP" htmlFor="f-cliente_curp" error={errors.cliente_curp} hint={esFisica ? "Del cliente" : "Del representante"}>
          {campo("cliente_curp", { maxLength: 18, className: "uppercase font-mono" })}
        </Field>
        <Field label="Correo oficial del cliente" htmlFor="f-cliente_correo" required error={errors.cliente_correo} hint="Recibe los avisos del contrato y el código para firmar." full>
          {campo("cliente_correo", { type: "email", autoComplete: "off", maxLength: 254 })}
        </Field>
      </div>
    ),
    servicio: (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Ancho de banda simétrico" htmlFor="f-plan_mbps" required error={errors.plan_mbps} full>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-40">
              {campo("plan_mbps", { type: "number", min: 1, inputMode: "numeric", className: "pr-14 tabular-nums" })}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA]">Mbps</span>
            </div>
            {PLANES_RAPIDOS.map((m) => (
              <Chip key={m} active={Number(values.plan_mbps) === m} disabled={cerrado} onClick={() => set("plan_mbps", m)}>
                {m >= 1000 ? `${m / 1000} Gbps` : m}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Mensualidad (antes de IVA)" htmlFor="f-precio_mensual" required error={errors.precio_mensual} full>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#A1A1AA]">$</span>
            {campo("precio_mensual", {
              type: "number",
              min: 0,
              step: "0.01",
              inputMode: "decimal",
              placeholder: "8000.00",
              className: "h-14! pl-8 pr-16 text-[22px]! font-semibold tabular-nums tracking-[-0.4px]",
            })}
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#A1A1AA]">MXN</span>
          </div>
          {letra ? (
            <p key={letra} className="cot-fade mt-1.5 text-[12.5px] italic text-[#52525B] [font-family:Calibri,Carlito,'Segoe_UI',Arial,sans-serif] dark:text-[#B7C1D1]">
              {letra} + IVA
            </p>
          ) : null}
        </Field>
        <Field label="Vigencia forzosa" htmlFor="f-vigencia_meses" required error={errors.vigencia_meses} hint={vigencia > 0 ? `${numeroALetras(vigencia)} (${vigencia}) meses` : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-32">
              {campo("vigencia_meses", { type: "number", min: 1, max: 120, inputMode: "numeric", className: "pr-14 tabular-nums" })}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA]">meses</span>
            </div>
            {VIGENCIAS_RAPIDAS.map((m) => (
              <Chip key={m} active={vigencia === m} disabled={cerrado} onClick={() => set("vigencia_meses", m)}>
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Fecha de firma" htmlFor="f-fecha_firma" error={errors.fecha_firma}>
          {campo("fecha_firma", { type: "date" })}
        </Field>
        <Field label="Domicilio de instalación" htmlFor="f-domicilio_instalacion" required error={errors.domicilio_instalacion} full>
          <textarea
            id="f-domicilio_instalacion"
            value={values.domicilio_instalacion}
            onChange={(e) => set("domicilio_instalacion", e.target.value)}
            className={cn(textareaClass, "min-h-[76px]", errors.domicilio_instalacion && inputInvalid)}
            placeholder="Calle, número, colonia, C.P., municipio"
            aria-invalid={Boolean(errors.domicilio_instalacion) || undefined}
            disabled={cerrado}
          />
        </Field>
        <Field label="Ciudad de firma" htmlFor="f-ciudad_firma" error={errors.ciudad_firma} full>
          {campo("ciudad_firma", { maxLength: 120 })}
        </Field>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-[#E7E7EA] sm:col-span-2 dark:bg-[#273244]">
          {[
            ["IVA 16 %", formatoDinero(precio * 0.16)],
            ["Mensualidad con IVA", formatoDinero(precio * 1.16)],
            ["Plazo forzoso + IVA", formatoDinero(precio * vigencia)],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#FAFAFA] px-3 py-2.5 dark:bg-[#0F172A]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#71717A] dark:text-[#8EA0B8]">{k}</p>
              <p key={v} className="cot-flash mt-0.5 text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
    prestador: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <p className="rounded-[12px] bg-[#FAFAFA] px-3.5 py-2.5 text-[13px] text-[#52525B] sm:col-span-2 dark:bg-[#0F172A] dark:text-[#B7C1D1]">
          Vienen prellenados con los datos de la empresa. Solo cámbialos si son distintos para este contrato.
        </p>
        {PRESTADOR_CAMPOS.map(([key, label, full]) => (
          <Field key={key} label={label} htmlFor={`p-${key}`} required={key === "correo" || key === "razon_social"} error={errors[`p-${key}`]} full={full}>
            <input
              id={`p-${key}`}
              value={p[key]}
              onChange={(e) => {
                setPrestador(key, e.target.value);
                if (errors[`p-${key}`]) setErrors((x) => ({ ...x, [`p-${key}`]: "" }));
              }}
              className={cn(inputClass, ["clabe", "cuenta_bancaria", "rfc"].includes(key) && "font-mono", errors[`p-${key}`] && inputInvalid)}
              type={key === "correo" ? "email" : "text"}
              disabled={cerrado}
              maxLength={255}
            />
          </Field>
        ))}
      </div>
    ),
    revision: (
      <div className="space-y-3">
        <Resumen
          titulo="Cliente"
          onEditar={() => irA(0)}
          filas={[
            [esFisica ? "Nombre" : "Razón social", values.cliente_razon_social],
            ["RFC", values.cliente_rfc],
            ...(!esFisica ? ([["Representante", values.cliente_representante]] as [string, string][]) : []),
            ["Correo", values.cliente_correo],
          ]}
        />
        <Resumen
          titulo="Servicio"
          onEditar={() => irA(1)}
          filas={[
            ["Plan", Number(values.plan_mbps) > 0 ? `${values.plan_mbps} Mbps simétricos` : ""],
            ["Mensualidad", precio > 0 ? `${formatoDinero(precio)} + IVA` : ""],
            ["Vigencia", vigencia ? `${vigencia} meses` : ""],
            ["Instalación", values.domicilio_instalacion],
            ["Firma", `${values.ciudad_firma}, ${formatoFecha(values.fecha_firma)}`],
          ]}
        />
        <Resumen
          titulo="Prestador"
          onEditar={() => irA(2)}
          filas={[
            ["Razón social", p.razon_social],
            ["Representante", p.representante],
            ["Correo oficial", p.correo],
          ]}
        />
      </div>
    ),
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
      <div className={cn(pageWrap, "pb-28")}>
        <PageMeta title={`${editando ? "Editar" : "Nuevo"} contrato | Sistema Grupo Intrax GPS`} description="Contrato de Internet Dedicado" />
        {toast && <Alert variant="error" title="Revisa el contrato" message={toast} showLink={false} onClose={() => setToast("")} />}

        {/* ============================ Encabezado + pasos ============================ */}
        <header className="cot-rise overflow-hidden rounded-[24px] border border-[#E4E4E7] bg-white dark:border-[#273244] dark:bg-[#111827]" style={{ "--cot-i": 0 } as CSSProperties}>
          <div className={cn(heroBand, "px-5 pb-6 pt-4 sm:px-8")}>
            <div className={heroGlowGold} aria-hidden />
            <div className={heroDots} aria-hidden />
            <nav aria-label="Migas de pan" className="relative flex min-w-0 items-center gap-1 text-[13px] text-white/60">
              <Link
                to={original ? `/contratos/${original.id}` : "/contratos"}
                className="cot-press -ml-1.5 mr-1 inline-flex size-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Volver"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
              <Link to="/contratos" className="rounded px-0.5 transition-colors hover:text-white">
                Contratos
              </Link>
              <ChevronRight className="size-3.5 text-white/30" aria-hidden />
              {original ? (
                <>
                  <Link to={`/contratos/${original.id}`} className="rounded px-0.5 font-mono text-[12px] transition-colors hover:text-white">
                    {original.folio}
                  </Link>
                  <ChevronRight className="size-3.5 text-white/30" aria-hidden />
                </>
              ) : null}
              <span className="truncate px-0.5 font-medium text-white/90">{editando ? "Editar" : "Nuevo"}</span>
            </nav>
            <div className="relative mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.8px] text-white sm:text-[30px] sm:tracking-[-1px]">
                {editando ? "Editar contrato" : "Nuevo contrato"}
              </h1>
              {original ? <EstadoPill estado={original.estado} className="bg-white/10! text-white! ring-white/20!" /> : null}
            </div>
            <p className="relative mt-1 text-[14px] text-white/65">Internet Dedicado · plantilla oficial con formato notarial</p>
          </div>

          <nav aria-label="Pasos del contrato" className="relative">
            <div className="h-0.5 bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden>
              <div className="cot-bar h-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" style={{ transform: `scaleX(${(paso + 1) / PASOS.length})` }} />
            </div>
            <ol className="grid grid-cols-4 gap-1 p-1.5">
              {PASOS.map((s, i) => {
                const actual = i === paso;
                const hecho = completos[i] && !actual;
                return (
                  <li key={s.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => irA(i)}
                      aria-current={actual ? "step" : undefined}
                      className={cn(
                        "cot-press flex w-full min-w-0 items-center gap-2.5 rounded-[12px] px-2 py-2 text-left sm:px-3",
                        focusRing,
                        actual ? "bg-[#EEF3FF] dark:bg-[#1B2A63]/50" : "hover:bg-[#F4F4F5] dark:hover:bg-[#1B2539]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-300",
                          actual
                            ? "bg-[#1B5CFF] text-white"
                            : hecho
                              ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                              : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]",
                        )}
                        aria-hidden
                      >
                        {hecho ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className={cn("block truncate text-[13px] font-semibold", actual ? "text-[#1244D1] dark:text-[#C9D7FF]" : "text-[#09090B] dark:text-[#F8FAFC]")}>
                          {s.label}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">{s.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        {firmasEnRiesgo && !cerrado && (
          <div className="cot-fade flex gap-3 rounded-[14px] border border-[#F0D7A3] bg-[#FFF8EB] p-4 text-[14px] text-[#8A5D0F] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.1)] dark:text-[#F2C27A]" role="status">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              Este contrato ya se envió a firma o tiene firmas. Si cambias su contenido, <strong>las firmas se descartan</strong> y el enlace
              actual deja de funcionar.
            </p>
          </div>
        )}
        {cerrado && (
          <div className="cot-fade flex items-center gap-3 rounded-[14px] border border-[#E4E4E7] bg-[#FAFAFA] p-4 text-[14px] text-[#52525B] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#B7C1D1]">
            <Lock className="size-4 shrink-0" aria-hidden /> Este contrato está {original?.estado_display.toLowerCase()} y ya no se puede editar.
          </div>
        )}

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          {/* ============================ Paso actual ============================ */}
          <section className={cn(cardShell, "cot-rise min-w-0 overflow-hidden")} style={{ "--cot-i": 1 } as CSSProperties} aria-labelledby="paso-titulo">
            <div key={pasoActual.id} className={anim}>
              <header className="flex items-start gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C] sm:px-7">
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                  {pasoActual.icon}
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
                    Paso {paso + 1} de {PASOS.length}
                  </p>
                  <h2 id="paso-titulo" ref={tituloRef} tabIndex={-1} className="text-[19px] font-semibold tracking-[-0.3px] text-[#09090B] outline-none dark:text-[#F8FAFC]">
                    {pasoActual.id === "revision" ? "Revisa antes de guardar" : pasoActual.label}
                  </h2>
                </div>
              </header>
              <div className="px-5 py-6 sm:px-7">{contenido[pasoActual.id]}</div>
            </div>
          </section>

          {/* ============================ Hoja en vivo ============================ */}
          <aside className="cot-rise min-w-0 lg:sticky lg:top-24" style={{ "--cot-i": 2 } as CSSProperties}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Hoja en vivo</p>
              <button type="button" className={cn(btn.ghost, "min-h-8! px-2.5! text-[12.5px]! lg:hidden")} onClick={() => setVerHoja((v) => !v)} aria-expanded={verHoja}>
                {verHoja ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                {verHoja ? "Ocultar" : "Ver hoja"}
              </button>
            </div>
            <div className={cn("rounded-[20px] bg-[#E9EBF0] p-5 dark:bg-[#0B1220] sm:p-7", !verHoja && "hidden lg:block")}>
              <HojaPreview values={values} folio={original?.folio} className="mx-auto max-w-[360px]" />
            </div>
          </aside>
        </div>
      </div>

      {/* ============================ Navegación del asistente ============================ */}
      {!cerrado && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4E4E7] bg-white/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md dark:border-[#273244] dark:bg-[#111827]/90 lg:pl-[calc(18.125rem+1rem)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
            <button type="button" onClick={() => (paso === 0 ? navigate(original ? `/contratos/${original.id}` : "/contratos") : irA(paso - 1))} className={btn.secondary}>
              <ArrowLeft aria-hidden />
              {paso === 0 ? "Cancelar" : "Atrás"}
            </button>
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              {PASOS.map((s, i) => (
                <span key={s.id} className={cn("h-1.5 rounded-full transition-colors duration-300", i === paso ? "w-6 bg-[#1B5CFF]" : completos[i] ? "w-1.5 bg-[#04724D]" : "w-1.5 bg-[#D4D4D8]")} />
              ))}
            </div>
            {pasoActual.id === "revision" ? (
              <button type="button" onClick={() => void guardar()} disabled={saving} className={btn.primary}>
                {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear contrato"}
              </button>
            ) : (
              <button type="button" onClick={siguiente} className={btn.primary}>
                Siguiente <ArrowRight aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
