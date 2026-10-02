/**
 * Datos del formulario de cliente: estado vacío, carga desde un registro y
 * armado del payload para la API. Puro (sin red ni React).
 */
import type { Cliente } from "@/types/cliente";
import { formatPhoneE164, parsePhoneToForm } from "./clienteCatalogos";
import type { ClienteTipo } from "./clienteTipos";

/** Estado plano del formulario (lo comparten Contactos, Órdenes y Facturas CFDI). */
export type ClienteFormData = Record<string, unknown>;

const trimOrEmpty = (value: unknown) => String(value ?? "").trim();

const toNumberOr = (value: unknown, fallback: number | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  idcif: "",
  razon_social: "",
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
  contacto_id: null as number | null,
  contacto_nombre: "",
  contacto_correo: "",
  contacto_telefono: "",
  contacto_puesto: "",
});

const pickPrincipalContacto = (cliente: Cliente) => {
  const list = Array.isArray(cliente.contactos) ? cliente.contactos : [];
  return list.find((c) => c.is_principal) || list[0] || null;
};
export const buildClientePayload = (
  formData: Record<string, unknown>,
  fixedTipo?: ClienteTipo,
  /**
   * Al editar, el domicilio ya lo administra la libreta de direcciones
   * (`ClienteDireccionesManager`), que sincroniza estos mismos campos del
   * lado del backend cuando se guarda la dirección predeterminada. No
   * reenviarlos aquí evita pisar esos cambios con el `formData` desactualizado
   * que trae el modal desde que se abrió.
   */
  isEditing = false
): Record<string, unknown> => ({
  clave: trimOrEmpty(formData.clave),
  representante: trimOrEmpty(formData.representante).toUpperCase(),
  nombre: trimOrEmpty(formData.nombre).toUpperCase(),
  telefono: formatPhoneE164(
    String(formData.telefono_pais || "MX"),
    String(formData.telefono || "")
  ),
  celular: trimOrEmpty(formData.celular),
  correo: trimOrEmpty(formData.correo),
  ...(isEditing
    ? {}
    : {
        direccion: trimOrEmpty(formData.direccion),
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
      }),
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
  // RFC único en el formulario (Datos generales); se reutiliza aquí para el campo fiscal del backend.
  numero_facturacion: trimOrEmpty(formData.rfc),
  domicilio_facturacion: trimOrEmpty(formData.domicilio_facturacion),
  idcif: trimOrEmpty(formData.idcif),
  // CURP único en el formulario (Datos generales); se reutiliza aquí para el campo fiscal del backend.
  curp_fiscal: trimOrEmpty(formData.curp),
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
    representante: (cliente.representante || "").toUpperCase(),
    celular: cliente.celular || "",
    nombre: (cliente.nombre || "").toUpperCase(),
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
    idcif: cliente.idcif || "",
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
    ...(() => {
      const ct = pickPrincipalContacto(cliente);
      return {
        contacto_id: ct?.id ?? null,
        contacto_nombre: String(ct?.nombre_apellido || "").trim().toUpperCase(),
        contacto_correo: String(ct?.correo || "").trim(),
        contacto_telefono: String(ct?.celular || "").trim(),
        contacto_puesto: String(ct?.area_puesto || "").trim(),
      };
    })(),
  };
};
