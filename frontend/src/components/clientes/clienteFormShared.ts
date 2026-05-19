import { formatPhoneE164, parsePhoneToForm } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import type { Cliente } from "@/types/cliente";

export type ClienteTipo = "EMPRESA" | "PERSONA_FISICA" | "PROVEEDOR";

export const TIPO_OPTIONS: { value: ClienteTipo; label: string }[] = [
  { value: "EMPRESA", label: "Empresa" },
  { value: "PERSONA_FISICA", label: "Persona física" },
  { value: "PROVEEDOR", label: "Proveedor" },
];

export const selectLikeClassName =
  "h-10 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] outline-none transition-colors focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

export const modalPanelClass =
  "rounded-2xl border border-[#ecdcc8] bg-[#fffdfa] p-4 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)] dark:border-[#334155] dark:bg-[#0f172a]/80 sm:p-5";

export const modalSectionTitleClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b7b69] dark:text-[#8ea0b8]";

export const modalTextareaClass =
  "w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-sm text-[#1c1917] shadow-theme-xs outline-none transition-colors placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20 resize-none";

export const modalTabBaseClass =
  "rounded-xl px-3.5 py-2.5 [font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif] text-xs font-medium leading-[1.6] tracking-[0.12px] transition-all";

const trimOrEmpty = (value: unknown) => String(value ?? "").trim();

const toNumberOr = (value: unknown, fallback: number | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getNoClienteLabelByTipo = (tipo?: ClienteTipo) => {
  if (tipo === "EMPRESA") return "No. de Empresa";
  if (tipo === "PERSONA_FISICA") return "No. de Persona";
  if (tipo === "PROVEEDOR") return "No. de Proveedor";
  return "No. de Cliente";
};

export const emptyFormData = (fixedTipo?: ClienteTipo) => ({
  no_cliente: "",
  clave: "",
  representante: "",
  nombre: "",
  telefono_pais: "MX",
  telefono: "",
  celular: "",
  direccion: "",
  correo: "",
  calle: "",
  numero_exterior: "",
  interior: "",
  colonia: "",
  codigo_postal: "",
  ciudad: "",
  pais: "México",
  estado: "",
  localidad: "",
  municipio: "",
  rfc: "",
  curp: "",
  rfc_fiscal: "",
  idcif: "",
  razon_social: "",
  curp_fiscal: "",
  regimen_fiscal: "",
  uso_cfdi: "",
  aplica_retenciones: false,
  desglosar_ieps: false,
  numero_precio: "1",
  limite_credito: "",
  dias_credito: "",
  notas: "",
  descuento_pct: null as number | null,
  portal_web: "",
  nombre_facturacion: "",
  numero_facturacion: "",
  domicilio_facturacion: "",
  calle_envio: "",
  numero_envio: "",
  colonia_envio: "",
  codigo_postal_envio: "",
  pais_envio: "México",
  estado_envio: "",
  ciudad_envio: "",
  tipo: fixedTipo || "EMPRESA",
  is_prospecto: false,
});

export const buildClientePayload = (
  formData: Record<string, unknown>,
  fixedTipo?: ClienteTipo
): Record<string, unknown> => ({
  clave: trimOrEmpty(formData.clave),
  representante: trimOrEmpty(formData.representante),
  nombre: trimOrEmpty(formData.nombre),
  telefono: formatPhoneE164(
    String(formData.telefono_pais || "MX"),
    String(formData.telefono || "")
  ),
  celular: trimOrEmpty(formData.celular),
  direccion: trimOrEmpty(formData.direccion),
  correo: trimOrEmpty(formData.correo),
  calle: trimOrEmpty(formData.calle),
  numero_exterior: trimOrEmpty(formData.numero_exterior),
  interior: trimOrEmpty(formData.interior),
  colonia: trimOrEmpty(formData.colonia),
  codigo_postal: trimOrEmpty(formData.codigo_postal),
  ciudad: trimOrEmpty(formData.ciudad),
  pais: trimOrEmpty(formData.pais),
  estado: trimOrEmpty(formData.estado),
  localidad: trimOrEmpty(formData.localidad),
  municipio: trimOrEmpty(formData.municipio),
  rfc: trimOrEmpty(formData.rfc),
  curp: trimOrEmpty(formData.curp),
  notas: trimOrEmpty(formData.notas),
  aplica_retenciones: !!formData.aplica_retenciones,
  desglosar_ieps: !!formData.desglosar_ieps,
  numero_precio: trimOrEmpty(formData.numero_precio || "1"),
  limite_credito: toNumberOr(formData.limite_credito, 0),
  dias_credito: toNumberOr(formData.dias_credito, 0),
  descuento_pct: toNumberOr(formData.descuento_pct, null),
  portal_web: trimOrEmpty(formData.portal_web),
  nombre_facturacion: trimOrEmpty(formData.razon_social || formData.nombre_facturacion),
  numero_facturacion: trimOrEmpty(formData.rfc_fiscal || formData.numero_facturacion),
  domicilio_facturacion: trimOrEmpty(formData.domicilio_facturacion),
  idcif: trimOrEmpty(formData.idcif),
  curp_fiscal: trimOrEmpty(formData.curp_fiscal || formData.curp),
  regimen_fiscal: trimOrEmpty(formData.regimen_fiscal),
  uso_cfdi: trimOrEmpty(formData.uso_cfdi),
  calle_envio: trimOrEmpty(formData.calle_envio),
  numero_envio: trimOrEmpty(formData.numero_envio),
  colonia_envio: trimOrEmpty(formData.colonia_envio),
  codigo_postal_envio: trimOrEmpty(formData.codigo_postal_envio),
  pais_envio: trimOrEmpty(formData.pais_envio),
  estado_envio: trimOrEmpty(formData.estado_envio),
  ciudad_envio: trimOrEmpty(formData.ciudad_envio),
  tipo: fixedTipo || String(formData.tipo || "EMPRESA"),
  is_prospecto: !!formData.is_prospecto,
});

export const formDataFromCliente = (cliente: Cliente, fixedTipo?: ClienteTipo) => {
  const phoneParsed = parsePhoneToForm(cliente.telefono);
  return {
    ...emptyFormData(fixedTipo),
    no_cliente: cliente.idx != null ? String(cliente.idx) : "",
    clave: cliente.clave || "",
    representante: cliente.representante || "",
    celular: cliente.celular || "",
    nombre: cliente.nombre || "",
    telefono_pais: phoneParsed.phoneCountry,
    telefono: phoneParsed.phoneNational,
    direccion: cliente.direccion || "",
    correo: cliente.correo || "",
    calle: cliente.calle || "",
    numero_exterior: cliente.numero_exterior || "",
    interior: cliente.interior || "",
    colonia: cliente.colonia || "",
    codigo_postal: cliente.codigo_postal || "",
    ciudad: cliente.ciudad || "",
    pais: cliente.pais || "México",
    estado: cliente.estado || "",
    localidad: cliente.localidad || "",
    municipio: cliente.municipio || "",
    rfc: cliente.rfc || "",
    curp: cliente.curp || "",
    notas: cliente.notas || "",
    descuento_pct: cliente.descuento_pct ?? null,
    limite_credito: cliente.limite_credito ?? "",
    dias_credito: cliente.dias_credito ?? "",
    portal_web: cliente.portal_web || "",
    nombre_facturacion: cliente.nombre_facturacion || "",
    numero_facturacion: cliente.numero_facturacion || "",
    razon_social: cliente.nombre_facturacion || "",
    rfc_fiscal: cliente.numero_facturacion || cliente.rfc || "",
    idcif: cliente.idcif || "",
    curp_fiscal: cliente.curp_fiscal || cliente.curp || "",
    regimen_fiscal: cliente.regimen_fiscal || "",
    uso_cfdi: cliente.uso_cfdi || "",
    domicilio_facturacion: cliente.domicilio_facturacion || "",
    calle_envio: cliente.calle_envio || "",
    numero_envio: cliente.numero_envio || "",
    colonia_envio: cliente.colonia_envio || "",
    codigo_postal_envio: cliente.codigo_postal_envio || "",
    pais_envio: cliente.pais_envio || "México",
    estado_envio: cliente.estado_envio || "",
    ciudad_envio: cliente.ciudad_envio || "",
    tipo: fixedTipo || cliente.tipo || "EMPRESA",
    is_prospecto: cliente.is_prospecto || false,
    numero_precio: cliente.numero_precio || "1",
    aplica_retenciones: cliente.aplica_retenciones || false,
    desglosar_ieps: cliente.desglosar_ieps || false,
  };
};

export const validateClienteForm = (formData: Record<string, unknown>) => {
  const missing: string[] = [];
  if (!trimOrEmpty(formData.nombre)) missing.push("Nombre");
  const tel = String(formData.telefono || "").replace(/\D/g, "");
  if (tel.length !== 10) missing.push("Teléfono (10 dígitos)");
  return { ok: missing.length === 0, missing };
};

export const isGoogleMapsLink = (value: string | null | undefined) => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith("http://") || s.startsWith("https://"))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    const href = u.href.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host.endsWith("google.com") && href.includes("/maps")) return true;
    return false;
  } catch {
    return false;
  }
};

export const formatApiErrors = (txt: string) => {
  if (!txt) return "";
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
          if (typeof v === "string") return `${k}: ${v}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .join("\n");
    }
  } catch {
    // ignore
  }
  return txt;
};
