import { emptyFormData } from "@/components/clientes/clienteFormShared";
import { estadosMX, paisOptions } from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";
import type { ApiCotizacionItem } from "@/pages/Ventas/Cotizacion/cotizacionFormTypes";

export type SicarSerieOption = {
  scf_id: number;
  serie: string;
  folioIni: number;
  emp_id: number;
  next_folio?: number;
};

export type CatalogOption = { clave: string; label: string };

export type SicarClienteOption = {
  cli_id: number;
  clave?: string;
  nombre: string;
  representante?: string;
  rfc: string;
  curp?: string;
  codigoPostal: string;
  usoCfdi?: string;
  domicilio?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  localidad?: string;
  pais?: string;
  noExt?: string;
  noInt?: string;
  telefono?: string;
  celular?: string;
  mail?: string;
  comentario?: string;
  limite?: number | string;
  precio?: number | string;
  diasCredito?: number | string;
  idCIF?: string;
  rgf_id?: number | null;
  regClaveC?: string;
  regimenDescripcion?: string;
};

export type FacturaConceptoForm = {
  clave?: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  clave_prod_serv?: string;
  clave_unidad?: string;
  precio_sin: number;
  tasa_iva?: number;
};

export type CotizacionOrigen = "digitalflow" | "sicar";

export type NuevaFacturaCfdiPayload = {
  cli_id: number;
  scf_id: number;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  nombre_c?: string;
  rfc_c?: string;
  cod_pos_c?: string;
  domicilio_c?: string;
  colonia_c?: string;
  ciudad_c?: string;
  estado_c?: string;
  telefono_c?: string;
  regimen_c?: string;
  conceptos: FacturaConceptoForm[];
};

const USO_CFDI_FALLBACK: Record<string, string> = {
  G01: "G01-Adquisición de mercancías",
  G02: "G02-Devoluciones, descuentos o bonificaciones",
  G03: "G03-Gastos en general",
  I01: "I01-Construcciones",
  I02: "I02-Mobilario y equipo de oficina por inversiones",
  I03: "I03-Equipo de transporte",
  I04: "I04-Equipo de computo y accesorios",
  I08: "I08-Otra maquinaria y equipo",
  D01: "D01-Honorarios médicos, dentales y gastos hospitalarios",
  D02: "D02-Gastos médicos por incapacidad o discapacidad",
  D03: "D03-Gastos funerales",
  D04: "D04-Donativos",
  D05: "D05-Intereses reales efectivamente pagados por créditos hipotecarios",
  D06: "D06-Aportaciones voluntarias al SAR",
  D07: "D07-Primas por seguros de gastos médicos",
  D08: "D08-Gastos de transportación escolar obligatoria",
  D09: "D09-Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones",
  D10: "D10-Pagos por servicios educativos",
  P01: "P01-Por definir",
  S01: "S01-Sin efectos fiscales",
  CP01: "CP01-Pagos",
  CN01: "CN01-Nómina",
};

const trim = (value: unknown) => String(value ?? "").trim();

const phoneDigits = (value: unknown) => trim(value).replace(/\D/g, "");

/** Primer valor no vacío entre alias SICAR (cliente, factura receptor, etc.). */
const pickSicarPhone = (raw: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const digits = phoneDigits(raw[key]);
    if (digits) return digits;
  }
  return "";
};

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function normalizeSicarPais(value: unknown): string {
  const raw = trim(value);
  if (!raw) return "México";
  const folded = fold(raw);
  if (folded === "mexico" || folded === "mx" || folded === "mex") return "México";
  if (folded === "estados unidos" || folded === "usa" || folded === "us") return "Estados Unidos";
  if (folded === "canada") return "Canadá";
  const hit = paisOptions.find((p) => fold(p) === folded);
  return hit || raw;
}

export function normalizeSicarEstado(value: unknown, pais = "México"): string {
  const raw = trim(value);
  if (!raw) return "";
  const paisNorm = normalizeSicarPais(pais);
  if (paisNorm !== "México") return raw;

  const target = fold(raw);
  const exact = estadosMX.find((estado) => fold(estado) === target);
  if (exact) return exact;

  const compact = target.replace(/\s/g, "");
  const compactHit = estadosMX.find((estado) => fold(estado).replace(/\s/g, "") === compact);
  if (compactHit) return compactHit;

  if (raw === raw.toUpperCase() && !raw.includes(" ")) {
    const titled = raw.charAt(0) + raw.slice(1).toLowerCase();
    const titledHit = estadosMX.find((estado) => fold(estado) === fold(titled));
    if (titledHit) return titledHit;
  }

  return raw;
}

export function formatRegimenFiscal(clave?: string, descripcion?: string): string {
  const c = trim(clave);
  const d = trim(descripcion);
  if (c && d) {
    if (d.toLowerCase().startsWith(c.toLowerCase())) return d.includes("-") ? d : `${c}-${d}`;
    return `${c}-${d}`;
  }
  return d || c;
}

export function resolveUsoCfdiLabel(code: unknown, catalog: CatalogOption[] = []): string {
  const raw = trim(code);
  if (!raw) return "";
  if (raw.includes("-")) return raw;
  const upper = raw.toUpperCase();
  const fromCatalog = catalog.find((o) => o.clave.toUpperCase() === upper || o.label.toUpperCase().startsWith(upper));
  if (fromCatalog) return fromCatalog.label;
  return USO_CFDI_FALLBACK[upper] || raw;
}

export function mapSicarClienteRow(raw: Record<string, unknown>): SicarClienteOption {
  return {
    cli_id: Number(raw.cli_id ?? 0),
    clave: trim(raw.clave) || undefined,
    nombre: trim(raw.nombre),
    representante: trim(raw.representante) || undefined,
    rfc: trim(raw.rfc),
    curp: trim(raw.curp) || undefined,
    codigoPostal: trim(raw.codigoPostal),
    usoCfdi: trim(raw.usoCfdi) || undefined,
    domicilio: trim(raw.domicilio) || undefined,
    colonia: trim(raw.colonia) || undefined,
    ciudad: trim(raw.ciudad) || undefined,
    estado: trim(raw.estado) || undefined,
    localidad: trim(raw.localidad) || undefined,
    pais: trim(raw.pais) || undefined,
    noExt: trim(raw.noExt) || undefined,
    noInt: trim(raw.noInt) || undefined,
    telefono: pickSicarPhone(raw, ["telefono", "telefonoC"]) || undefined,
    celular: pickSicarPhone(raw, ["celular"]) || undefined,
    mail: trim(raw.mail) || undefined,
    comentario: trim(raw.comentario) || undefined,
    limite: raw.limite as number | string | undefined,
    precio: raw.precio as number | string | undefined,
    diasCredito: raw.diasCredito as number | string | undefined,
    idCIF: trim(raw.idCIF) || undefined,
    rgf_id: raw.rgf_id != null && raw.rgf_id !== "" ? Number(raw.rgf_id) : null,
    regClaveC: trim(raw.regClaveC) || undefined,
    regimenDescripcion: trim(raw.regimenDescripcion) || undefined,
  };
}

type FormMapOptions = {
  usoCfdiCatalog?: CatalogOption[];
};

export function formDataFromSicarCliente(
  c: SicarClienteOption,
  options: FormMapOptions = {}
): Record<string, unknown> {
  const pais = normalizeSicarPais(c.pais);
  const estado = normalizeSicarEstado(c.estado, pais);
  return {
    ...emptyFormData(),
    no_cliente: c.cli_id ? String(c.cli_id) : "",
    clave: c.clave || "",
    nombre: c.nombre || "",
    representante: c.representante || "",
    rfc: c.rfc || "",
    curp: c.curp || "",
    curp_fiscal: c.curp || "",
    rfc_fiscal: c.rfc || "",
    razon_social: c.nombre || "",
    codigo_postal: c.codigoPostal || "",
    direccion: c.domicilio || "",
    colonia: c.colonia || "",
    ciudad: c.ciudad || "",
    estado,
    localidad: c.localidad || "",
    pais,
    numero_exterior: c.noExt || "",
    interior: c.noInt || "",
    telefono: phoneDigits(c.telefono),
    celular: phoneDigits(c.celular),
    correo: c.mail || "",
    notas: c.comentario || "",
    limite_credito: c.limite != null && c.limite !== "" ? String(c.limite) : "",
    dias_credito: c.diasCredito != null && c.diasCredito !== "" ? String(c.diasCredito) : "",
    numero_precio: c.precio != null && c.precio !== "" ? String(c.precio) : "1",
    idcif: c.idCIF || "",
    regimen_fiscal: formatRegimenFiscal(c.regClaveC, c.regimenDescripcion),
    uso_cfdi: resolveUsoCfdiLabel(c.usoCfdi, options.usoCfdiCatalog),
  };
}

export function payloadFromFacturaForm(formData: Record<string, unknown>) {
  const nombre = trim(formData.razon_social) || trim(formData.nombre);
  const rfc = trim(formData.rfc_fiscal) || trim(formData.rfc);
  const telefono = phoneDigits(formData.telefono) || phoneDigits(formData.celular);
  const pais = normalizeSicarPais(formData.pais);
  return {
    uso_cfdi: trim(formData.uso_cfdi) || "G03-Gastos en general",
    nombre_c: nombre,
    rfc_c: rfc,
    cod_pos_c: trim(formData.codigo_postal),
    domicilio_c: trim(formData.direccion),
    colonia_c: trim(formData.colonia),
    ciudad_c: trim(formData.ciudad),
    estado_c: normalizeSicarEstado(formData.estado, pais),
    telefono_c: telefono,
    regimen_c: trim(formData.regimen_fiscal) || "601-General de Ley Personas Morales",
  };
}

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** Convierte líneas de cotización DigitalFlow a conceptos CFDI (precio sin IVA). */
export function conceptosFromDigitalFlowItems(
  items: ApiCotizacionItem[],
  ivaPct = 16
): FacturaConceptoForm[] {
  const ivaFactor = 1 + ivaPct / 100;
  return items
    .map((it) => {
      const cantidad = Number(it.cantidad) || 0;
      if (cantidad <= 0) return null;
      const descPct = Number(it.descuento_pct) || 0;
      const factor = 1 - descPct / 100;
      const hasProducto = Boolean(String(it.producto_externo_id || "").trim());
      const lista = Number(it.precio_lista) || 0;
      const precioSin = roundMoney(
        hasProducto ? (lista / ivaFactor) * factor : lista * factor
      );
      const nombre = trim(it.producto_nombre);
      const desc = trim(it.producto_descripcion) || nombre;
      if (!desc) return null;
      return {
        clave: trim(it.producto_externo_id) || (it.id ? String(it.id) : undefined),
        descripcion: desc,
        cantidad,
        unidad: trim(it.unidad) || "E48",
        precio_sin: precioSin,
        tasa_iva: ivaPct / 100,
      };
    })
    .filter((row): row is FacturaConceptoForm => row != null);
}

/** Convierte detallecot SICAR a conceptos CFDI. */
export function conceptosFromSicarDetalle(
  lines: Array<Record<string, unknown>>,
  tasaIva = 0.16
): FacturaConceptoForm[] {
  return lines
    .map((line) => {
      const cantidad = Number(line.cantidad) || 0;
      if (cantidad <= 0) return null;
      const descripcion = trim(line.descripcion);
      if (!descripcion) return null;
      return {
        clave: trim(line.clave) || undefined,
        descripcion,
        cantidad,
        unidad: trim(line.unidad) || trim(line.unidadVenta) || "E48",
        clave_prod_serv: trim(line.claveProdServ) || undefined,
        clave_unidad: trim(line.unidadVenta) || trim(line.unidad) || undefined,
        precio_sin: roundMoney(Number(line.precioSin) || 0),
        tasa_iva: tasaIva,
      };
    })
    .filter((row): row is FacturaConceptoForm => row != null);
}

export function sumConceptosSubtotal(conceptos: FacturaConceptoForm[]): number {
  return roundMoney(
    conceptos.reduce((acc, c) => acc + c.cantidad * c.precio_sin, 0)
  );
}
