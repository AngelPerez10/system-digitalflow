import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";

import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import {
  buildProductosQuery,
  fetchSyscom,
  fetchSyscomTipoCambio,
  getProductoImageUrl,
  type SyscomProducto,
  type SyscomProductosResponse,
} from "@/pages/ProductosYServicios/syscomCatalog";

type ClienteContacto = {
  id?: number;
  cliente?: number;
  nombre_apellido: string;
  titulo?: string;
  area_puesto?: string;
  celular?: string;
  correo?: string;
  is_principal?: boolean;
};

type Cliente = {
  id: number;
  idx: number;
  nombre: string;
  is_prospecto?: boolean;
  telefono?: string;
  direccion?: string;
  contactos?: ClienteContacto[];
};

type Concepto = {
  id: string;
  producto_externo_id: string;
  producto_nombre: string;
  producto_descripcion: string;
  unidad: string;
  thumbnail_url?: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
};

type ApiCotizacionItem = {
  id?: number;
  producto_externo_id?: string;
  producto_nombre: string;
  producto_descripcion: string;
  unidad: string;
  thumbnail_url?: string;
  cantidad: number;
  precio_lista: number;
  descuento_pct: number;
  orden?: number;
};

type SyscomPopPos = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

type CatalogoConcepto = {
  id: number;
  folio: string;
  concepto: string;
  precio1: number;
  imagen_url?: string;
};

type ProductoManualCatalogo = {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  precio: number;
  stock: number;
  imagen_url?: string;
};

type ApiCotizacion = {
  id: number;
  idx: number;
  cliente_id: number | null;
  /** Nombre desde FK (siempre que exista cliente_id); preferir sobre `cliente` guardado. */
  cliente_nombre?: string;
  cliente: string;
  prospecto: boolean;
  contacto: string;
  medio_contacto?: string;
  status?: string;
  fecha: string | null;
  subtotal: number;
  iva_pct: number;
  iva: number;
  total: number;
  texto_arriba_precios: string;
  terminos: string;
  items: ApiCotizacionItem[];
};

/** Controles: superficie inset; `text-sm` en móvil para densidad (evitar sensación de texto “grande”) */
const inputLikeClassName =
  "w-full min-h-[40px] rounded-lg border border-gray-200/90 dark:border-white/[0.08] bg-gray-50/90 dark:bg-gray-950/40 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:border-brand-500/80 focus:bg-white dark:focus:bg-gray-900/60 focus:ring-2 focus:ring-brand-500/20 dark:focus:border-brand-400 dark:focus:ring-brand-900/35 outline-none sm:min-h-[2.75rem] sm:py-2.5";

const textareaLikeClassName =
  "w-full min-h-[7rem] rounded-lg border border-gray-200/90 dark:border-white/[0.08] bg-gray-50/90 dark:bg-gray-950/40 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:border-brand-500/80 focus:bg-white dark:focus:bg-gray-900/60 focus:ring-2 focus:ring-brand-500/20 dark:focus:border-brand-400 dark:focus:ring-brand-900/35 outline-none sm:min-h-[8rem] sm:py-3";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const cardShellMutedClass =
  "overflow-hidden rounded-2xl border border-gray-200/70 bg-gray-50/50 dark:border-white/[0.06] dark:bg-gray-950/30";

const cloneModalPanelClass =
  "rounded-xl border border-gray-200/70 bg-white/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:border-white/[0.07] dark:bg-gray-900/45 dark:shadow-none sm:p-5";

const cloneModalSearchInputClass =
  "min-h-[44px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60";

/** Misma escala que inputs nativos de la página */
const inputFieldInsetClass =
  "!text-sm !bg-gray-50/90 !border-gray-200/90 dark:!bg-gray-950/40 dark:!border-white/[0.08] focus:!ring-brand-500/25";

/** Etiquetas de formulario ligeramente más pequeñas en móvil */
const labelPageClass = "!mb-1 !text-xs !font-medium sm:!mb-1.5 sm:!text-sm";

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const toNumber = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampPct = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
};

const round2 = (v: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/** Alineado con backend (Cotizacion.cliente / CotizacionItem.thumbnail_url). */
const MAX_COTIZ_CLIENTE_LEN = 255;
const MAX_COTIZ_THUMB_URL_LEN = 512;
const MAX_COTIZ_PRODUCTO_NOMBRE_LEN = 255;

const truncateStr = (v: unknown, max: number) => String(v ?? "").slice(0, max);

const formatCotizacionApiError = (data: unknown): string => {
  if (data == null || typeof data !== "object") return "No se pudo guardar la cotización.";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string" && d.detail.trim()) return d.detail;
  if (Array.isArray(d.detail) && d.detail.length) return d.detail.map(String).join(" ");
  const parts: string[] = [];
  for (const [key, val] of Object.entries(d)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) {
      parts.push(`${key}: ${val.join(", ")}`);
    } else if (val && typeof val === "object") {
      for (const [k2, v2] of Object.entries(val as Record<string, unknown>)) {
        const msg = Array.isArray(v2) ? v2.join(", ") : String(v2);
        parts.push(`${key}.${k2}: ${msg}`);
      }
    } else if (val != null) {
      parts.push(`${key}: ${String(val)}`);
    }
  }
  return parts.length ? parts.join(" | ") : JSON.stringify(data);
};

const formatMoney = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toFinite = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Precio en MXN con IVA 16%: USD × tipo de cambio × 1.16. Si viene `precio_mxn`, se usa tal cual (ya en MXN). */
const IVA_MX = 1.16;

const getSyscomPrecioListaMxnConIva = (p: SyscomProducto, tipoCambio: number | null) => {
  const directMxn = toFinite(p.precio_mxn);
  if (directMxn !== null && directMxn > 0) return Math.max(0, directMxn);

  const lista = toFinite(p.precios?.precio_lista);
  const especial = toFinite(p.precios?.precio_especial);
  const descuento = toFinite(p.precios?.precio_descuento);
  const usdBase = especial ?? lista ?? descuento;

  if (usdBase == null) return 0;
  if (!tipoCambio) {
    // Fallback sin TC: mostrar USD como número (sin conversión ni IVA aplicable).
    return Math.max(0, usdBase);
  }

  return Math.max(0, usdBase * tipoCambio * IVA_MX);
};

export default function NuevaCotizacionPage() {
  const asBool = (v: any, defaultValue: boolean) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return defaultValue;
  };

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());
  const canCotizacionesView = asBool(permissions?.cotizaciones?.view, true);
  const canCotizacionesCreate = asBool(permissions?.cotizaciones?.create, false);

  const navigate = useNavigate();
  const params = useParams();
  const editingCotizacionId = params?.id ? String(params.id) : "";

  const [hydratingFromStorage, setHydratingFromStorage] = useState(false);

  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const [previewLoading, setPreviewLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(8);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSearch, setCloneSearch] = useState("");
  const [cloneSearchDebounced, setCloneSearchDebounced] = useState("");
  const [cloneRows, setCloneRows] = useState<
    { id: number; idx: number; cliente: string; contacto: string; fecha: string; total: number }[]
  >([]);
  const [cloneListLoading, setCloneListLoading] = useState(false);
  const [clonePickingId, setClonePickingId] = useState<number | null>(null);

  const exportBusy = previewLoading || excelLoading;

  useEffect(() => {
    if (!exportBusy) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(8);
    const interval = window.setInterval(() => {
      setLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [exportBusy]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/me/permissions/'), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store' as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const p = data?.permissions || {};
        const pStr = JSON.stringify(p);
        localStorage.setItem('permissions', pStr);
        sessionStorage.setItem('permissions', pStr);
        setPermissions(p);
        window.dispatchEvent(new Event('permissions:updated'));
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('permissions:updated' as any, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('permissions:updated' as any, sync);
    };
  }, []);

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [clienteId, setClienteId] = useState<number | "">("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);

  /** Folio visible en UI al editar (modelo `idx`), no el id de base de datos. */
  const [editingCotizacionIdx, setEditingCotizacionIdx] = useState<number | null>(null);
  const [activeCotizacionId, setActiveCotizacionId] = useState<string>(editingCotizacionId || "");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);
  const isEditingRoute = !!editingCotizacionId;

  const [contactoNombre, setContactoNombre] = useState("");

  const [cantidad, setCantidad] = useState<number>(1);
  const [conceptoNombre, setConceptoNombre] = useState("");
  const [conceptoDescripcion, setConceptoDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [precioLista, setPrecioLista] = useState<number>(0);
  const [descuentoPct, setDescuentoPct] = useState<number>(0);
  const [syscomTipoCambio, setSyscomTipoCambio] = useState<number | null>(null);
  const [syscomOpen, setSyscomOpen] = useState(false);
  const [loadingSyscom, setLoadingSyscom] = useState(false);
  const [syscomProductos, setSyscomProductos] = useState<SyscomProducto[]>([]);
  const [syscomError, setSyscomError] = useState("");
  const [selectedSyscomProducto, setSelectedSyscomProducto] = useState<SyscomProducto | null>(null);
  const [selectedCatalogoConcepto, setSelectedCatalogoConcepto] = useState<CatalogoConcepto | null>(null);
  const [selectedManualProducto, setSelectedManualProducto] = useState<ProductoManualCatalogo | null>(null);
  const [catalogoConceptos, setCatalogoConceptos] = useState<CatalogoConcepto[]>([]);
  const [catalogoManualProductos, setCatalogoManualProductos] = useState<ProductoManualCatalogo[]>([]);
  const [loadingCatalogoConceptos, setLoadingCatalogoConceptos] = useState(false);
  const [catalogoConceptosError, setCatalogoConceptosError] = useState("");
  const [catalogoManualError, setCatalogoManualError] = useState("");

  const syscomInputWrapRef = useRef<HTMLDivElement>(null);
  const syscomPopRef = useRef<HTMLDivElement>(null);
  /** Evita aplicar resultados de una petición SYSCOM anterior si el usuario sigue escribiendo. */
  const syscomSearchGenRef = useRef(0);
  const [syscomPopPos, setSyscomPopPos] = useState<SyscomPopPos | null>(null);
  const [descuentoClientePct, setDescuentoClientePct] = useState<number>(0);
  const [descuentoClienteTouched, setDescuentoClienteTouched] = useState<boolean>(false);

  const [editingConceptoId, setEditingConceptoId] = useState<string | null>(null);

  const [conceptos, setConceptos] = useState<Concepto[]>([]);

  const [textoArribaPrecios, setTextoArribaPrecios] = useState(
    "A continuación cotización solicitada: "
  );
  const [terminos, setTerminos] = useState(
    "TÉRMINOS Y CONDICIONES\n\n" +
      "- Se requiere 60% de anticipo para iniciar trabajos y 40% al finalizar la instalación.\n" +
      "- No se programan trabajos sin anticipo confirmado.\n" +
      "- Precios expresados en pesos mexicanos.\n" +
      "- Vigencia de la cotización: 15 días naturales.\n" +
      "- Los equipos cuentan con 1 año de garantía por defectos de fábrica.\n" +
      "- La mano de obra y configuraciones tienen 3 meses de garantía.\n" +
      "- La garantía no aplica por mal uso, golpes, humedad, variaciones de voltaje o manipulación por terceros.\n" +
      "- La cotización incluye únicamente los conceptos especificados; trabajos adicionales se cotizan aparte.\n" +
      "- El cliente deberá proporcionar accesos, energía eléctrica y condiciones adecuadas para la instalación.\n" +
      "- Retrasos por causas externas no son responsabilidad de Grupo Intrax.\n" +
      "- Los equipos son propiedad de Grupo Intrax hasta liquidar el pago total.\n" +
      "- El anticipo no es reembolsable en caso de cancelación.\n" +
      "- La aceptación de la cotización implica conformidad con estos términos."
  );

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const MEDIO_CONTACTO_OPTIONS = useMemo(
    () => [
      { value: 'BNI', label: 'BNI' },
      { value: 'REFERIDO', label: 'Referido' },
      { value: 'WEB', label: 'Web' },
      { value: 'TIENDA_ONLINE', label: 'Tienda Online' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'INSTAGRAM', label: 'Instagram' },
      { value: 'TIKTOK', label: 'Tiktok' },
      { value: 'GOOGLE_MAPS', label: 'Google Maps' },
      { value: 'YOUTUBE', label: 'Youtube' },
      { value: 'TIENDA_FISICA', label: 'Tienda Fisica' },
      { value: 'OTRO', label: 'Otro' },
    ],
    []
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: 'AUTORIZADA', label: 'Autorizada' },
      { value: 'PENDIENTE', label: 'Pendiente' },
      { value: 'CANCELADA', label: 'Cancelada' },
    ],
    []
  );

  const [medioContacto, setMedioContacto] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDIENTE');

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((c) => c.id === clienteId) || null;
  }, [clientes, clienteId]);

  const contactosOptions = useMemo(() => {
    if (!selectedCliente?.contactos) return [];
    return selectedCliente.contactos
      .map((c) => String(c.nombre_apellido || "").trim())
      .filter(Boolean);
  }, [selectedCliente]);

  const preview = useMemo(() => {
    const qty = Math.max(0, toNumber(cantidad, 0));
    const pl = Math.max(0, toNumber(precioLista, 0));
    const desc = clampPct(toNumber(descuentoPct, 0));
    const precioConIva = pl * (1 - desc / 100);
    const pu = precioConIva / IVA_MX;
    const importe = qty * pu;
    return { qty, pl, desc, pu, importe };
  }, [cantidad, precioLista, descuentoPct]);

  const fetchClientes = async (search = "") => {
    if (!canCotizacionesView) return;
    const token = getToken();
    if (!token) return null;
    setLoadingClientes(true);
    try {
      const query = new URLSearchParams({
        search: search.trim(),
        page_size: '20',
      });
      const res = await fetch(apiUrl(`/api/clientes/?${query.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) {
        setClientes([]);
        return;
      }
      const rows = Array.isArray(data) ? data : (data.results || []);
      setClientes(rows);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClienteSearch(clienteSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  useEffect(() => {
    fetchClientes(debouncedClienteSearch);
  }, [debouncedClienteSearch]);

  const contactoPrincipalDeCliente = (cliente: Cliente) => {
    const principal = (cliente.contactos || []).find((x) => x.is_principal);
    const first = (cliente.contactos || [])[0];
    return String(principal?.nombre_apellido || first?.nombre_apellido || "").trim();
  };

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      setClienteId(cliente.id);
      setClienteSearch(String(cliente.nombre || "").trim());

      const desc = clampPct(toNumber((cliente as any)?.descuento_pct, 0));
      setDescuentoClientePct(desc);
      setDescuentoClienteTouched(false);
      setContactoNombre(contactoPrincipalDeCliente(cliente));
    } else {
      setClienteId("");
      setClienteSearch("");

      setDescuentoClientePct(0);
      setDescuentoClienteTouched(false);
      setContactoNombre("");
    }
    setClienteOpen(false);
  };

  const filteredClientes = clientes;

  const hydrateFormFromCotizacionDetail = useCallback(
    async (data: ApiCotizacion, token: string, opts: { updateIdxBadge: boolean }) => {
      if (opts.updateIdxBadge) {
        setEditingCotizacionIdx(Number.isFinite(Number(data.idx)) ? Number(data.idx) : null);
      }

      setClienteId(data.cliente_id ? Number(data.cliente_id) : "");
      const nombreDesdeApi = String(data.cliente_nombre || data.cliente || "").trim();
      setClienteSearch(nombreDesdeApi);
      setContactoNombre(String(data.contacto || ""));
      setMedioContacto(String((data as any)?.medio_contacto || ""));
      setStatus(String((data as any)?.status || "PENDIENTE"));
      setDescuentoClientePct(clampPct(toNumber((data as any)?.descuento_cliente_pct, 0)));
      setDescuentoClienteTouched(true);
      setTextoArribaPrecios(String(data.texto_arriba_precios || ""));
      {
        const incoming = String((data as any).terminos || "").trim();
        if (incoming) setTerminos(incoming);
      }

      const conceptosList: Concepto[] = Array.isArray(data.items)
        ? data.items.map((it) => ({
            id: uid(),
            producto_externo_id: String((it as any).producto_externo_id ?? ""),
            producto_nombre: String(it.producto_nombre || ""),
            producto_descripcion: String(it.producto_descripcion || ""),
            unidad: String(it.unidad || ""),
            thumbnail_url: it.thumbnail_url || undefined,
            cantidad: toNumber(it.cantidad, 0),
            precio_lista: toNumber(it.precio_lista, 0),
            descuento_pct: clampPct(toNumber(it.descuento_pct, 0)),
          }))
        : [];
      setConceptos(conceptosList);
      setEditingConceptoId(null);
      setClienteOpen(false);

      const cid = data.cliente_id ? Number(data.cliente_id) : null;
      if (cid) {
        try {
          const cr = await fetch(apiUrl(`/api/clientes/${cid}/`), {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store" as RequestCache,
          });
          const one = (await cr.json().catch(() => null)) as Cliente | null;
          if (cr.ok && one && typeof one.id === "number") {
            setClientes((prev) => {
              if (prev.some((c) => c.id === one.id)) {
                return prev.map((c) => (c.id === one.id ? { ...c, ...one } : c));
              }
              return [one, ...prev];
            });
            const n = String(one.nombre || "").trim();
            if (n && !String(nombreDesdeApi).trim()) {
              setClienteSearch(n);
            }
          }
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  useEffect(() => {
    setActiveCotizacionId(editingCotizacionId || "");
  }, [editingCotizacionId]);

  useEffect(() => {
    if (editingCotizacionId || activeCotizacionId || !canCotizacionesCreate) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    const createDraft = async () => {
      try {
        const res = await fetch(apiUrl("/api/cotizaciones/"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cliente_id: null,
            cliente: "",
            prospecto: false,
            contacto: "",
            medio_contacto: String(medioContacto || ""),
            status: String(status || "PENDIENTE"),
            fecha: todayIso,
            subtotal: 0,
            descuento_cliente_pct: 0,
            iva_pct: 0,
            iva: 0,
            total: 0,
            texto_arriba_precios: String(textoArribaPrecios || ""),
            terminos: String(terminos || ""),
            items: [],
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        const newId = String(data?.id || "").trim();
        if (newId) {
          setActiveCotizacionId(newId);
          setEditingCotizacionIdx(
            data?.idx != null && Number.isFinite(Number(data.idx)) ? Number(data.idx) : null
          );
        }
      } catch {
        // ignore: user can continue and save manually
      }
    };

    void createDraft();
    return () => {
      cancelled = true;
    };
  }, [
    editingCotizacionId,
    activeCotizacionId,
    canCotizacionesCreate,
    medioContacto,
    status,
    todayIso,
    textoArribaPrecios,
    terminos,
  ]);

  useEffect(() => {
    if (!editingCotizacionId) {
      return;
    }
    setHydratingFromStorage(true);
    const token = getToken();
    if (!token) {
      setHydratingFromStorage(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/cotizaciones/${editingCotizacionId}/`), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = (await res.json().catch(() => null)) as ApiCotizacion | null;
        if (!res.ok || !data) {
          setEditingCotizacionIdx(null);
          setAlert({
            show: true,
            variant: "warning",
            title: "Cotización no encontrada",
            message: "No se encontró la cotización. Regresando al listado.",
          });
          window.setTimeout(() => navigate("/cotizacion"), 450);
          return;
        }

        await hydrateFormFromCotizacionDetail(data, token, { updateIdxBadge: true });
      } catch {
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudo cargar la cotización.",
        });
      } finally {
        setHydratingFromStorage(false);
      }
    };

    void load();
  }, [editingCotizacionId, hydrateFormFromCotizacionDetail, navigate]);

  useEffect(() => {
    const t = window.setTimeout(() => setCloneSearchDebounced(cloneSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [cloneSearch]);

  useEffect(() => {
    if (!cloneModalOpen || !canCotizacionesView) return;
    const token = getToken();
    if (!token) return;
    if (cloneSearchDebounced.length < 1) {
      setCloneRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setCloneListLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("search", cloneSearchDebounced);
        const res = await fetch(apiUrl(`/api/cotizaciones/?${params.toString()}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setCloneRows([]);
          return;
        }
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const mapped = list
          .map((x: Record<string, unknown>) => ({
            id: Number(x?.id || 0),
            idx: Number(x?.idx || 0),
            cliente: String(x?.cliente_nombre || x?.cliente || "—"),
            contacto: String(x?.contacto || "—"),
            fecha: String(x?.fecha || ""),
            total: Number(x?.total ?? 0),
          }))
          .filter((row: { id: number }) => row.id > 0)
          .slice(0, 60);
        setCloneRows(mapped);
      } finally {
        if (!cancelled) setCloneListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cloneModalOpen, cloneSearchDebounced, canCotizacionesView]);

  const handleClonePick = async (id: number) => {
    const token = getToken();
    if (!token) return;
    setClonePickingId(id);
    setHydratingFromStorage(true);
    try {
      const res = await fetch(apiUrl(`/api/cotizaciones/${id}/`), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store" as RequestCache,
      });
      const data = (await res.json().catch(() => null)) as ApiCotizacion | null;
      if (!res.ok || !data) {
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudo cargar la cotización seleccionada.",
        });
        return;
      }
      await hydrateFormFromCotizacionDetail(data, token, { updateIdxBadge: false });
      setCloneModalOpen(false);
      setCloneSearch("");
      setCloneSearchDebounced("");
      setCloneRows([]);
      setAlert({
        show: true,
        variant: "success",
        title: "Cotización clonada",
        message: `Se copiaron los datos del folio #${data.idx}. Revisa la información y guarda como cotización nueva.`,
      });
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error",
        message: "No se pudo clonar la cotización.",
      });
    } finally {
      setHydratingFromStorage(false);
      setClonePickingId(null);
    }
  };

  useEffect(() => {
    if (hydratingFromStorage) return;
    if (!selectedCliente) {
      if (!editingCotizacionId) setContactoNombre("");
      return;
    }

    if (String(contactoNombre || "").trim()) return;

    const principal = (selectedCliente.contactos || []).find((x) => x.is_principal);
    const first = (selectedCliente.contactos || [])[0];
    const next = (principal?.nombre_apellido || first?.nombre_apellido || "").trim();
    setContactoNombre(next);
  }, [selectedCliente, hydratingFromStorage, editingCotizacionId, contactoNombre]);

  useEffect(() => {
    if (hydratingFromStorage) return;

    if (!selectedCliente) {
      if (!editingCotizacionId) {
        setDescuentoClientePct(0);
        setDescuentoClienteTouched(false);
      }
      return;
    }

    if (descuentoClienteTouched) return;

    const desc = clampPct(toNumber((selectedCliente as any)?.descuento_pct, 0));
    setDescuentoClientePct(desc);
  }, [selectedCliente, hydratingFromStorage, editingCotizacionId, descuentoClienteTouched]);

  useEffect(() => {
    if (!conceptoNombre.trim()) {
      setUnidad("");
      setPrecioLista(0);
      setSyscomProductos([]);
      setSyscomOpen(false);
    }
  }, [conceptoNombre]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchSyscomTipoCambio(token)
      .then((tc) => setSyscomTipoCambio(tc))
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    const q = conceptoNombre.trim();
    if (selectedSyscomProducto || selectedCatalogoConcepto || selectedManualProducto) {
      setSyscomOpen(false);
      setSyscomError("");
      return;
    }
    if (q.length < 2) {
      setSyscomProductos([]);
      setSyscomError("");
      setLoadingSyscom(false);
      if (!q) setSyscomOpen(false);
      return;
    }
    // Abrir panel por búsqueda local (catálogo) aunque falle/no exista token de SYSCOM.
    setSyscomOpen(true);
    const token = getToken();
    if (!token) {
      setSyscomProductos([]);
      setSyscomError("");
      return;
    }
    const runGen = ++syscomSearchGenRef.current;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSyscom(true);
      setSyscomError("");
      try {
        // Misma forma que ProductosPage al buscar por texto: busqueda + pagina + orden (sin stock).
        // Forzar stock en la API cambia el universo de resultados y deja fuera productos que sí ves en catálogo.
        const query = buildProductosQuery({
          busqueda: q,
          pagina: 1,
          orden: "relevancia",
        });
        const res = await fetchSyscom(`productos/?${query}`, token, { signal: ac.signal });
        const data: SyscomProductosResponse = await res.json().catch(() => ({}));
        if (runGen !== syscomSearchGenRef.current) return;
        if (!res.ok) {
          setSyscomProductos([]);
          setSyscomError("No se pudo consultar SYSCOM en este momento.");
          return;
        }
        const raw = (data.productos || []) as SyscomProducto[];
        const seen = new Set<string>();
        const deduped: SyscomProducto[] = [];
        for (const p of raw) {
          const id = String(p?.producto_id ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          deduped.push(p);
        }
        setSyscomProductos(deduped.slice(0, 24));
      } catch (e) {
        if (runGen !== syscomSearchGenRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSyscomProductos([]);
        setSyscomError("Error de conexión con SYSCOM.");
      } finally {
        if (runGen === syscomSearchGenRef.current) {
          setLoadingSyscom(false);
        }
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [conceptoNombre, selectedSyscomProducto, selectedCatalogoConcepto, selectedManualProducto]);

  useEffect(() => {
    if (!canCotizacionesView) {
      setCatalogoConceptos([]);
      setCatalogoConceptosError("");
      return;
    }
    const token = getToken();
    if (!token) {
      setCatalogoConceptos([]);
      setCatalogoConceptosError("");
      return;
    }
    const loadCatalogoConceptos = async () => {
      setLoadingCatalogoConceptos(true);
      setCatalogoConceptosError("");
      try {
        const res = await fetch(apiUrl("/api/conceptos/?ordering=folio"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => ({ results: [] }));
        if (!res.ok) {
          setCatalogoConceptos([]);
          setCatalogoConceptosError("No se pudieron cargar conceptos del catálogo.");
          return;
        }
        const list = Array.isArray((data as any)?.results)
          ? (data as any).results
          : Array.isArray(data)
            ? data
            : [];
        const mapped: CatalogoConcepto[] = list.map((c: any, idx: number) => ({
          id: Number(c?.id ?? idx + 1),
          folio: String(c?.folio ?? c?.idx ?? c?.id ?? idx + 1),
          concepto: String(c?.concepto ?? c?.nombre ?? "").trim(),
          precio1: Number(c?.precio1 ?? c?.precio ?? 0),
          imagen_url: String(c?.imagen_url ?? "").trim(),
        }));
        setCatalogoConceptos(mapped);
      } catch {
        setCatalogoConceptos([]);
        setCatalogoConceptosError("Error al consultar catálogo de conceptos.");
      } finally {
        setLoadingCatalogoConceptos(false);
      }
    };
    loadCatalogoConceptos();
  }, [canCotizacionesView]);

  useEffect(() => {
    if (!canCotizacionesView) {
      setCatalogoManualProductos([]);
      setCatalogoManualError("");
      return;
    }
    const token = getToken();
    if (!token) {
      setCatalogoManualProductos([]);
      setCatalogoManualError("");
      return;
    }
    const loadManualProductos = async () => {
      setCatalogoManualError("");
      try {
        const res = await fetch(apiUrl("/api/productos-manuales/?ordering=-fecha_creacion&page_size=500"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => ({ results: [] }));
        if (!res.ok) {
          setCatalogoManualProductos([]);
          setCatalogoManualError("No se pudieron cargar productos manuales.");
          return;
        }
        const list = Array.isArray((data as any)?.results)
          ? (data as any).results
          : Array.isArray(data)
            ? data
            : [];
        const mapped: ProductoManualCatalogo[] = list
          .map((p: any) => ({
            id: Number(p?.id ?? 0),
            producto: String(p?.producto ?? "").trim(),
            marca: String(p?.marca ?? "").trim(),
            modelo: String(p?.modelo ?? "").trim(),
            precio: Number(p?.precio ?? 0),
            stock: Number(p?.stock ?? 0),
            imagen_url: String(p?.imagen_url ?? "").trim(),
          }))
          .filter((p: ProductoManualCatalogo) => p.id > 0 && p.producto);
        setCatalogoManualProductos(mapped);
      } catch {
        setCatalogoManualProductos([]);
        setCatalogoManualError("Error al consultar productos manuales.");
      }
    };
    loadManualProductos();
  }, [canCotizacionesView]);

  const selectSyscomProducto = (p: SyscomProducto) => {
    setSelectedSyscomProducto(p);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setConceptoNombre(String(p.titulo || p.modelo || ""));
    setConceptoDescripcion(String([p.marca, p.modelo].filter(Boolean).join(" · ") || p.titulo || ""));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)));
    setSyscomOpen(false);
  };

  const filteredCatalogoConceptos = useMemo(() => {
    const q = conceptoNombre.trim().toLowerCase();
    const qCompact = q.replace(/\s+/g, "");
    if (!q) return [];
    return catalogoConceptos
      .filter((c) => {
        const folio = c.folio.toLowerCase();
        const folioCompact = folio.replace(/\s+/g, "");
        return (
          folio.startsWith(q) ||
          folioCompact.startsWith(qCompact) ||
          folio.includes(q) ||
          c.concepto.toLowerCase().includes(q) ||
          String(c.precio1).toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [catalogoConceptos, conceptoNombre]);

  const selectCatalogoConcepto = (c: CatalogoConcepto) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(c);
    setSelectedManualProducto(null);
    setConceptoNombre(String(c.concepto || ""));
    setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : `Folio: ${c.folio}`));
    setUnidad((u) => (u.trim() ? u : "SERV"));
    setPrecioLista(Math.max(0, toNumber(c.precio1, 0)));
    setSyscomOpen(false);
  };

  const filteredManualProductos = useMemo(() => {
    const q = conceptoNombre.trim().toLowerCase();
    if (!q) return [];
    return catalogoManualProductos
      .filter((p) =>
        p.producto.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.modelo.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
      .slice(0, 8);
  }, [catalogoManualProductos, conceptoNombre]);

  const selectManualProducto = (p: ProductoManualCatalogo) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(p);
    setConceptoNombre(String(p.producto || ""));
    setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : [p.marca, p.modelo].filter(Boolean).join(" · ")));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(Math.max(0, toNumber(p.precio, 0)));
    setSyscomOpen(false);
  };

  const showSyscomPanel = useMemo(
    () =>
      syscomOpen &&
      (loadingSyscom ||
        loadingCatalogoConceptos ||
        syscomProductos.length > 0 ||
        filteredCatalogoConceptos.length > 0 ||
        filteredManualProductos.length > 0 ||
        !!syscomError ||
        !!catalogoConceptosError ||
        !!catalogoManualError ||
        conceptoNombre.trim().length >= 2),
    [
      syscomOpen,
      loadingSyscom,
      loadingCatalogoConceptos,
      syscomProductos.length,
      filteredCatalogoConceptos.length,
      filteredManualProductos.length,
      syscomError,
      catalogoConceptosError,
      catalogoManualError,
      conceptoNombre,
    ]
  );

  const combinedConceptoOptions = useMemo(
    () => [
      ...filteredCatalogoConceptos.map((c) => ({
        key: `catalogo-${c.id}`,
        source: "catalogo" as const,
        title: c.concepto || "-",
        subtitle: `Folio: ${c.folio}`,
        price: toNumber(c.precio1, 0),
        onSelect: () => selectCatalogoConcepto(c),
      })),
      ...filteredManualProductos.map((p) => ({
        key: `manual-${p.id}`,
        source: "manual" as const,
        title: p.producto || "-",
        subtitle: [p.marca, p.modelo].filter(Boolean).join(" · ") || `Manual #${p.id}`,
        price: toNumber(p.precio, 0),
        onSelect: () => selectManualProducto(p),
      })),
      ...syscomProductos.map((p) => ({
        key: `syscom-${p.fuente || "syscom"}-${p.producto_id}`,
        source: "syscom" as const,
        title: String(p.titulo || p.modelo || "-"),
        subtitle: [p.marca, p.modelo].filter(Boolean).join(" · "),
        price: round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)),
        onSelect: () => selectSyscomProducto(p),
      })),
    ],
    [filteredCatalogoConceptos, filteredManualProductos, syscomProductos, syscomTipoCambio]
  );

  useLayoutEffect(() => {
    if (!showSyscomPanel) {
      setSyscomPopPos(null);
      return;
    }
    const el = syscomInputWrapRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const preferredMax = Math.min(288, vh * 0.42);
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const width = Math.min(Math.max(rect.width, 280), vw - margin * 2);
      let left = rect.left;
      if (left + width > vw - margin) left = Math.max(margin, vw - width - margin);

      const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

      if (openAbove) {
        const maxHeight = Math.max(120, Math.min(preferredMax, spaceAbove - 4));
        setSyscomPopPos({
          left,
          width,
          bottom: vh - rect.top + margin,
          maxHeight,
        });
      } else {
        const top = rect.bottom + margin;
        const maxHeight = Math.max(120, Math.min(preferredMax, vh - top - margin));
        setSyscomPopPos({
          left,
          width,
          top,
          maxHeight,
        });
      }
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showSyscomPanel, loadingSyscom, syscomProductos.length]);

  useEffect(() => {
    if (!showSyscomPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (syscomInputWrapRef.current?.contains(t)) return;
      if (syscomPopRef.current?.contains(t)) return;
      setSyscomOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showSyscomPanel]);

  useEffect(() => {
    if (!alert.show) return;
    const t = window.setTimeout(() => {
      setAlert((a) => ({ ...a, show: false }));
    }, 4500);
    return () => window.clearTimeout(t);
  }, [alert.show]);

  const validateClienteContacto = () => {
    const missing: string[] = [];
    if (!clienteId) missing.push("Cliente");
    if (!String(contactoNombre || "").trim()) missing.push("Contacto");
    return { ok: missing.length === 0, missing };
  };

  const resolveClienteNombre = () => {
    const fromList = String(selectedCliente?.nombre || "").trim();
    if (fromList) return fromList;
    return String(clienteSearch || "").trim();
  };

  const buildCotizacionPayload = useCallback(() => {
    const nowIso = todayIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();
    const lines = conceptos.map((c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const pu = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      const importe = toNumber(c.cantidad, 0) * pu;
      return { ...c, pu, importe };
    });
    const subtotalLineas = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    const descClientePct = clampPct(toNumber(descuentoClientePct, 0));
    const descuentoCliente = subtotalLineas * (descClientePct / 100);
    const subtotal = Math.max(0, subtotalLineas - descuentoCliente);
    const total = subtotal;
    return {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: truncateStr(clienteNombre, MAX_COTIZ_CLIENTE_LEN),
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      medio_contacto: String(medioContacto || ""),
      status: String(status || "PENDIENTE"),
      fecha: nowIso,
      subtotal: round2(subtotal),
      descuento_cliente_pct: descClientePct,
      iva_pct: 0,
      iva: 0,
      total: round2(total),
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
      items: lines.map((c, i) => ({
        producto_externo_id: truncateStr(c.producto_externo_id ?? "", 100),
        producto_nombre: truncateStr(c.producto_nombre, MAX_COTIZ_PRODUCTO_NOMBRE_LEN),
        producto_descripcion: String(c.producto_descripcion ?? ""),
        unidad: truncateStr(c.unidad, 50),
        thumbnail_url: truncateStr(c.thumbnail_url || "", MAX_COTIZ_THUMB_URL_LEN),
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        orden: i,
      })),
    };
  }, [
    todayIso,
    selectedCliente,
    clienteId,
    clienteSearch,
    contactoNombre,
    medioContacto,
    status,
    conceptos,
    descuentoClientePct,
    textoArribaPrecios,
    terminos,
  ]);

  const upsertCotizacion = useCallback(async (opts?: {
    navigateAfterSave?: boolean;
    validateRequired?: boolean;
    silent?: boolean;
    autosave?: boolean;
  }): Promise<string | null> => {
    const navigateAfterSave = !!opts?.navigateAfterSave;
    const validateRequired = opts?.validateRequired !== false;
    const silent = !!opts?.silent;
    const autosave = !!opts?.autosave;
    const p = getPermissionsFromStorage();
    const canView = asBool(p?.cotizaciones?.view, true);
    const canCreate = asBool(p?.cotizaciones?.create, false);
    const canEdit = asBool(p?.cotizaciones?.edit, false);
    const targetId = (editingCotizacionId || activeCotizacionId || "").trim();

    if (!canView) {
      if (!silent) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para ver cotizaciones.",
        });
      }
      return null;
    }

    if (targetId) {
      if (!canEdit) {
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin permiso",
            message: "No tienes permiso para editar cotizaciones.",
          });
        }
        return null;
      }
    } else {
      if (!canCreate) {
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin permiso",
            message: "No tienes permiso para crear cotizaciones.",
          });
        }
        return null;
      }
    }

    if (validateRequired) {
      const v = validateClienteContacto();
      if (!v.ok) {
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Faltan datos",
            message: `Completa: ${v.missing.join(", ")}.`,
          });
        }
        return null;
      }
      if (!conceptos.length) {
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Faltan conceptos",
            message: "Agrega al menos un producto o servicio para guardar la cotización.",
          });
        }
        return null;
      }
    }

    const token = getToken();
    if (!token) return null;
    const payload: any = buildCotizacionPayload();

    try {
      if (autosave) setIsAutoSaving(true);
      const isEdit = !!targetId;
      const res = await fetch(apiUrl(isEdit ? `/api/cotizaciones/${targetId}/` : "/api/cotizaciones/"), {
        method: isEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (!silent) {
          const msg = formatCotizacionApiError(data);
          setAlert({ show: true, variant: "error", title: "Error", message: msg });
        }
        return null;
      }

      const savedId = String(data?.id || targetId || "").trim();
      if (savedId && savedId !== activeCotizacionId) setActiveCotizacionId(savedId);
      if (data?.idx != null && Number.isFinite(Number(data.idx))) {
        setEditingCotizacionIdx(Number(data.idx));
      }
      if (autosave) {
        setLastAutoSavedAt(Date.now());
      } else if (!silent) {
        setAlert({
          show: true,
          variant: "success",
          title: isEdit ? "Cotización actualizada" : "Cotización guardada",
          message: `Folio #${data?.idx || data?.id || ""} guardado correctamente.`,
        });
      }
      if (navigateAfterSave) {
        window.setTimeout(() => navigate("/cotizacion"), 350);
      }
      return savedId || null;
    } catch {
      if (!silent) {
        setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo guardar la cotización." });
      }
      return null;
    } finally {
      if (autosave) setIsAutoSaving(false);
    }
  }, [
    editingCotizacionId,
    activeCotizacionId,
    buildCotizacionPayload,
    conceptos.length,
    navigate,
  ]);

  const handleSaveCotizacion = async (navigateAfterSave = true): Promise<string | null> =>
    upsertCotizacion({ navigateAfterSave, validateRequired: true, silent: false, autosave: false });

  useEffect(() => {
    const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
    if (!targetId || hydratingFromStorage) return;

    const timer = window.setTimeout(() => {
      void upsertCotizacion({
        navigateAfterSave: false,
        validateRequired: false,
        silent: true,
        autosave: true,
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    editingCotizacionId,
    activeCotizacionId,
    hydratingFromStorage,
    clienteId,
    clienteSearch,
    contactoNombre,
    medioContacto,
    status,
    descuentoClientePct,
    conceptos,
    textoArribaPrecios,
    terminos,
    upsertCotizacion,
  ]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
      const token = getToken();
      if (!targetId || !token) return;
      try {
        void fetch(apiUrl(`/api/cotizaciones/${targetId}/`), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildCotizacionPayload()),
          keepalive: true,
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editingCotizacionId, activeCotizacionId, buildCotizacionPayload]);

  const canAddConcepto = useMemo(() => {
    const v = validateClienteContacto();
    const qtyOk = toNumber(cantidad, 0) > 0;
    const nameOk = String(conceptoNombre || "").trim() !== "";
    const priceOk = toNumber(precioLista, 0) >= 0;
    return v.ok && qtyOk && nameOk && priceOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, contactoNombre, cantidad, conceptoNombre, precioLista]);

  const clearConceptoForm = () => {
    setEditingConceptoId(null);
    setCantidad(1);
    setConceptoNombre("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
  };

  const addConcepto = () => {
    const v = validateClienteContacto();
    if (!v.ok) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    const qty = Math.max(0, toNumber(cantidad, 0));
    const pl = Math.max(0, toNumber(precioLista, 0));
    const desc = clampPct(toNumber(descuentoPct, 0));
    const nombre = String(conceptoNombre || "").trim();
    const descripcion = String(conceptoDescripcion || "").trim();
    const productoExternoId = selectedSyscomProducto?.producto_id || (selectedManualProducto ? `manual:${selectedManualProducto.id}` : "");
    const catalogThumb = selectedCatalogoConcepto?.imagen_url?.trim();
    const manualThumb = selectedManualProducto?.imagen_url?.trim();
    const thumbnail = selectedSyscomProducto?.img_portada
      ? getProductoImageUrl(selectedSyscomProducto.img_portada) || undefined
      : manualThumb || catalogThumb || undefined;

    if (qty <= 0 || !nombre) return;

    if (editingConceptoId) {
      setConceptos((prev) =>
        prev.map((x) =>
          x.id === editingConceptoId
            ? {
              ...x,
              producto_externo_id: productoExternoId || x.producto_externo_id || "",
              producto_nombre: nombre,
              producto_descripcion: descripcion,
              unidad: String(unidad || ""),
              thumbnail_url: thumbnail || x.thumbnail_url,
              cantidad: qty,
              precio_lista: pl,
              descuento_pct: desc,
            }
            : x
        )
      );
      setEditingConceptoId(null);
    } else {
      setConceptos((prev) => [
        ...prev,
        {
          id: uid(),
          producto_externo_id: productoExternoId,
          producto_nombre: nombre,
          producto_descripcion: descripcion,
          unidad: String(unidad || ""),
          thumbnail_url: thumbnail,
          cantidad: qty,
          precio_lista: pl,
          descuento_pct: desc,
        },
      ]);
    }

    setCantidad(1);
    setConceptoNombre("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
  };

  const removeConcepto = (id: string) => {
    setConceptos((prev) => prev.filter((c) => c.id !== id));
    if (editingConceptoId === id) setEditingConceptoId(null);
  };

  const editConcepto = (id: string) => {
    const c = conceptos.find((x) => x.id === id);
    if (!c) return;
    setEditingConceptoId(id);
    setCantidad(toNumber(c.cantidad, 1));
    setConceptoNombre(String(c.producto_nombre || ""));
    setConceptoDescripcion(String(c.producto_descripcion || ""));
    setUnidad(String(c.unidad || ""));
    setPrecioLista(toNumber(c.precio_lista, 0));
    setDescuentoPct(clampPct(toNumber(c.descuento_pct, 0)));
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomError("");
    setSyscomOpen(false);
  };

  const computed = useMemo(() => {
    const lines = conceptos.map((c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const precioConIva = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      const puSinIva = precioConIva / IVA_MX;
      const importeSinIva = toNumber(c.cantidad, 0) * puSinIva;
      return { ...c, pu: puSinIva, importe: importeSinIva };
    });

    const subtotalLineasSinIva = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    /** Suma con IVA (precio Syscom); el descuento cliente se aplica sobre este monto (igual que el serializer). */
    const subtotalLineasConIva = conceptos.reduce((acc, c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const precioConIva = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      return acc + toNumber(c.cantidad, 0) * precioConIva;
    }, 0);

    const descClientePct = clampPct(toNumber(descuentoClientePct, 0));
    const descuentoCliente = subtotalLineasConIva * (descClientePct / 100);
    const totalConIva = Math.max(0, subtotalLineasConIva - descuentoCliente);
    const subtotalSinIva = round2(totalConIva / IVA_MX);
    const ivaDesglose = round2(totalConIva - subtotalSinIva);
    /** Subtotal/total guardados: monto con IVA incluido (misma convención que el backend). */
    const subtotal = totalConIva;
    const total = totalConIva;

    return {
      lines,
      subtotalLineas: subtotalLineasSinIva,
      descClientePct,
      descuentoCliente,
      subtotal,
      iva: 0,
      total,
      ivaPct: 0,
      totalConIva,
      subtotalSinIva,
      ivaDesglose,
    };
  }, [conceptos, descuentoClientePct]);

  /** Cliente, contacto y al menos un concepto (misma regla que validateClienteContacto + líneas) */
  const canGuardarCotizacion = useMemo(() => {
    if (!clienteId) return false;
    if (!String(contactoNombre || "").trim()) return false;
    if (!computed.lines.length) return false;
    return true;
  }, [clienteId, contactoNombre, computed.lines.length]);

  const resetAll = () => {
    setClienteId("");
    setClienteSearch("");
    setClienteOpen(false);
    setDebouncedClienteSearch("");
    setContactoNombre("");

    setMedioContacto('');
    setStatus('PENDIENTE');

    setCantidad(1);
    setConceptoNombre("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
    setDescuentoClientePct(0);
    setDescuentoClienteTouched(false);

    setEditingConceptoId(null);

    setConceptos([]);
    setTextoArribaPrecios("A continuación cotización solicitada:");
    setTerminos(
      "TÉRMINOS Y CONDICIONES\n\n" +
        "- Se requiere 60% de anticipo para iniciar trabajos y 40% al finalizar la instalación.\n" +
        "- No se programan trabajos sin anticipo confirmado.\n" +
        "- Precios expresados en pesos mexicanos.\n" +
        "- Vigencia de la cotización: 15 días naturales.\n" +
        "- Los equipos cuentan con 1 año de garantía por defectos de fábrica.\n" +
        "- La mano de obra y configuraciones tienen 3 meses de garantía.\n" +
        "- La garantía no aplica por mal uso, golpes, humedad, variaciones de voltaje o manipulación por terceros.\n" +
        "- La cotización incluye únicamente los conceptos especificados; trabajos adicionales se cotizan aparte.\n" +
        "- El cliente deberá proporcionar accesos, energía eléctrica y condiciones adecuadas para la instalación.\n" +
        "- Retrasos por causas externas no son responsabilidad de Grupo Intrax.\n" +
        "- Los equipos son propiedad de Grupo Intrax hasta liquidar el pago total.\n" +
        "- El anticipo no es reembolsable en caso de cancelación.\n" +
        "- La aceptación de la cotización implica conformidad con estos términos."
    );
  };

  const handlePreviewPdf = async () => {
    if (previewLoading || excelLoading) return;

    const token = getToken();
    if (!token) {
      setAlert({ show: true, variant: "error", title: "Sin sesión", message: "Inicia sesión para ver el PDF." });
      return;
    }

    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para ver la vista previa.",
      });
      return;
    }

    const v = validateClienteContacto();
    if (!v.ok) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    const nowIso = todayIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || "",
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      medio_contacto: String(medioContacto || ''),
      status: String(status || 'PENDIENTE'),
      fecha: nowIso,
      subtotal: round2(toNumber(computed.subtotal, 0)),
      descuento_cliente_pct: clampPct(toNumber(descuentoClientePct, 0)),
      iva_pct: 0,
      iva: 0,
      total: round2(toNumber(computed.total, 0)),
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
      items: computed.lines.map((c, i) => ({
        producto_externo_id: c.producto_externo_id || "",
        producto_nombre: c.producto_nombre,
        producto_descripcion: c.producto_descripcion,
        unidad: c.unidad,
        thumbnail_url: c.thumbnail_url || "",
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        orden: i,
      })),
    };

    try {
      setPreviewLoading(true);
      sessionStorage.setItem("cotizacion:pdf-preview-payload", JSON.stringify(payload));
      navigate(`/cotizacion/PREVIEW/pdf?preview=1&t=${Date.now()}`);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo preparar la vista previa." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (previewLoading || excelLoading) return;

    const token = getToken();
    if (!token) {
      setAlert({ show: true, variant: "error", title: "Sin sesión", message: "Inicia sesión para descargar el Excel." });
      return;
    }

    const cotizacionPk = String(editingCotizacionId || activeCotizacionId || "").trim();
    if (!cotizacionPk) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Guarda la cotización",
        message: "Para descargar el Excel, primero guarda la cotización para generar su folio.",
      });
      return;
    }

    try {
      setExcelLoading(true);
      const resp = await fetch(apiUrl(`/api/cotizaciones/${cotizacionPk}/excel/`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        let msg = `No se pudo generar el Excel (HTTP ${resp.status}).`;
        try {
          const ct = resp.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await resp.json();
            msg = (data as { detail?: string })?.detail || msg;
          } else {
            msg = (await resp.text()) || msg;
          }
        } catch {
          /* ignore */
        }
        setAlert({ show: true, variant: "error", title: "Error", message: msg });
        return;
      }

      const dispo = resp.headers.get("content-disposition") || "";
      const m = dispo.match(/filename="?([^";]+)"?/i);
      const filename = m?.[1] ? String(m[1]) : `Cotizacion_${cotizacionPk}.xlsx`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo descargar el Excel." });
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-5 px-3 pb-8 pt-5 text-sm sm:space-y-8 sm:px-5 sm:pb-12 sm:pt-8 sm:text-base md:px-6 lg:px-8">
      <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />

      <Modal isOpen={exportBusy} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-7 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="relative flex items-center justify-center w-[76px] h-[76px] rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50 dark:bg-gray-900/80">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 dark:border-t-brand-400 animate-spin" />
                  <div className="relative flex items-center justify-center">
                    {excelLoading ? (
                      <svg className="h-8 w-8 text-emerald-700 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M8.5 13h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M8.5 16.5H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M8.5 10H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
              {excelLoading ? "Generando Excel" : "Generando vista previa"}
            </h3>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>

            <div className="mt-6 w-full">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Progreso</span>
                <span className="tabular-nums font-medium">{Math.min(99, Math.max(0, Math.round(loadingProgress)))}%</span>
              </div>
              <div className="mt-2 w-full rounded-full h-2 overflow-hidden bg-gray-100 dark:bg-gray-800/80 border border-gray-200/60 dark:border-white/[0.06]">
                <div
                  className="h-full bg-brand-600 dark:bg-brand-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                />
              </div>
              <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                {excelLoading ? "Preparando archivo XLSX…" : "Generando archivo de cotización…"}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cloneModalOpen}
        onClose={() => {
          if (clonePickingId != null) return;
          setCloneModalOpen(false);
        }}
        closeOnBackdropClick={clonePickingId == null}
        closeOnEscape={clonePickingId == null}
        className="mx-4 flex max-h-[min(90vh,640px)] w-[min(96vw,28rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/75 p-0 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:mx-auto sm:max-w-lg"
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className="relative shrink-0 border-b border-gray-200/60 bg-gray-50/80 px-5 py-5 pr-12 dark:border-white/[0.06] dark:bg-gray-950/40 sm:px-6 sm:pr-14">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-brand-500/80 dark:bg-brand-400/70" aria-hidden />
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/12 bg-white text-brand-700 shadow-sm dark:border-brand-400/15 dark:bg-gray-900/60 dark:text-brand-300 sm:h-11 sm:w-11">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                  <path d="M16 3h2a2 2 0 0 1 2 2v2M8 3H6a2 2 0 0 0-2 2v2" strokeLinecap="round" />
                  <path d="M8 21h8M12 17v4M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="7" width="18" height="10" rx="2" strokeLinejoin="round" />
                  <path d="M7 11h2M11 11h2M15 11h.01" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Cotización</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Clonar desde existente</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
                  Busque por <span className="font-medium text-gray-800 dark:text-gray-200">cliente</span> o{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">folio</span>. Al elegir una fila se copian cliente, contacto,
                  descuentos, conceptos y textos al borrador actual.
                </p>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-gray-50/40 px-5 py-5 dark:bg-gray-950/25 sm:px-6">
            <section className={cloneModalPanelClass}>
              <label htmlFor="clone-cotizacion-search" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm">
                Buscar cotización
              </label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M14 14 18 18" strokeLinecap="round" />
                </svg>
                <input
                  id="clone-cotizacion-search"
                  type="search"
                  value={cloneSearch}
                  onChange={(e) => setCloneSearch(e.target.value)}
                  placeholder="Folio (ej. 42) o nombre de cliente…"
                  autoFocus
                  className={cloneModalSearchInputClass}
                />
              </div>
            </section>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Resultados</span>
                {!cloneListLoading && cloneSearchDebounced.length >= 1 && cloneRows.length > 0 && (
                  <span className="tabular-nums text-[11px] font-medium text-gray-400 dark:text-gray-500">{cloneRows.length}</span>
                )}
              </div>
              <div className="relative min-h-[12rem] flex-1 overflow-hidden rounded-xl border border-gray-200/80 bg-white/60 dark:border-white/[0.08] dark:bg-gray-900/40">
                <div className="custom-scrollbar max-h-[min(48vh,320px)] overflow-y-auto overscroll-contain sm:max-h-[min(50vh,340px)]">
                  {cloneListLoading && (
                    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Buscando cotizaciones…</p>
                    </div>
                  )}
                  {!cloneListLoading && cloneSearchDebounced.length < 1 && (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200/80 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-gray-950/50 dark:text-gray-500">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <path d="M12 19V5M5 12h14" strokeLinecap="round" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Empiece a escribir</p>
                      <p className="max-w-[240px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        Escriba al menos un carácter para buscar en el directorio de cotizaciones.
                      </p>
                    </div>
                  )}
                  {!cloneListLoading && cloneSearchDebounced.length >= 1 && cloneRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200/80 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-gray-950/50 dark:text-gray-500">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3-3M8 11h6" strokeLinecap="round" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin coincidencias</p>
                      <p className="max-w-[260px] text-xs text-gray-500 dark:text-gray-400">Pruebe otro folio o parte del nombre del cliente.</p>
                    </div>
                  )}
                  {!cloneListLoading && cloneRows.length > 0 && (
                    <ul className="space-y-2 p-3 sm:p-3.5">
                      {cloneRows.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            disabled={clonePickingId != null}
                            onClick={() => void handleClonePick(row.id)}
                            className="flex w-full flex-col gap-2 rounded-xl border border-gray-200/80 bg-white p-3.5 text-left shadow-sm transition-all hover:border-brand-300/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-gray-900/55 dark:hover:border-brand-500/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/[0.1] text-sm font-bold tabular-nums text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
                                #{row.idx}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.cliente}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  {row.contacto && row.contacto !== "—" && <span>Contacto: {row.contacto}</span>}
                                  {row.fecha && (
                                    <span className="tabular-nums text-gray-400 dark:text-gray-500">{formatDMY(row.fecha)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-lg border border-gray-200/80 bg-gray-50/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-100">
                              {formatMoney(row.total)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {clonePickingId != null && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px] dark:bg-gray-950/50">
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md dark:border-white/[0.1] dark:bg-gray-900 dark:text-gray-200">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600 dark:border-gray-600 dark:border-t-brand-400" />
                      Cargando cotización…
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {showSyscomPanel &&
        syscomPopPos &&
        createPortal(
          <div
            ref={syscomPopRef}
            role="listbox"
            aria-label="Resultados de conceptos"
            style={{
              position: "fixed",
              zIndex: 2147483646,
              left: syscomPopPos.left,
              width: syscomPopPos.width,
              maxHeight: syscomPopPos.maxHeight,
              ...(syscomPopPos.top != null ? { top: syscomPopPos.top } : { bottom: syscomPopPos.bottom }),
            }}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white/98 shadow-2xl shadow-gray-900/20 ring-1 ring-black/[0.06] backdrop-blur-md dark:border-white/[0.12] dark:bg-gray-900/98 dark:shadow-black/50 dark:ring-white/[0.08]"
          >
            <div className="shrink-0 border-b border-gray-100/90 bg-gradient-to-r from-brand-50/95 to-transparent px-3 py-2 dark:border-white/[0.06] dark:from-brand-950/50 dark:to-transparent">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">Resultados combinados</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Conceptos internos, productos manuales y Syscom</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5 custom-scrollbar">
              {loadingCatalogoConceptos && (
                <div className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden />
                  Cargando conceptos...
                </div>
              )}
              {!loadingCatalogoConceptos && !!catalogoConceptosError && (
                <div className="mb-1 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {catalogoConceptosError}
                </div>
              )}
              {!!catalogoManualError && (
                <div className="mb-1 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {catalogoManualError}
                </div>
              )}
              {loadingSyscom && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden />
                  Buscando en Syscom…
                </div>
              )}
              {!loadingSyscom && !!syscomError && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{syscomError}</div>
              )}
              {!loadingSyscom &&
                !loadingCatalogoConceptos &&
                !syscomError &&
                !catalogoConceptosError &&
                combinedConceptoOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    onClick={opt.onSelect}
                    className="group mb-1 flex w-full rounded-xl px-2 py-2 text-left transition-colors last:mb-0 hover:bg-brand-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-gray-900 group-hover:text-brand-900 dark:text-gray-100 dark:group-hover:text-brand-100">
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-white/[0.08]">
                            {opt.source === "catalogo" ? "Concepto" : opt.source === "manual" ? "Manual" : "Syscom"}
                          </span>
                          {opt.subtitle || "Sin detalle"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-brand-500/10 px-2 py-1 text-xs font-semibold tabular-nums text-brand-700 dark:bg-brand-400/15 dark:text-brand-300">
                        {formatMoney(opt.price)}
                      </span>
                    </div>
                  </button>
                ))}
              {!loadingSyscom && !loadingCatalogoConceptos && !syscomError && !catalogoConceptosError && !catalogoManualError && combinedConceptoOptions.length === 0 && conceptoNombre.trim().length >= 2 && (
                <div className="rounded-lg px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">Sin resultados en catálogos</div>
              )}
            </div>
          </div>,
          document.body
        )}

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canCotizacionesView ? (
        <div className="py-10 text-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">No tienes permiso para ver Cotizaciones.</div>
      ) : (
        <>

          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              Inicio
            </Link>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              /
            </span>
            <Link
              to="/cotizacion"
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              Cotizaciones
            </Link>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              /
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {isEditingRoute ? "Editar" : "Nueva"}
            </span>
          </nav>

          <header className={`flex flex-col gap-4 ${cardShellClass} p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6`}>
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
                <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
                    Cotización
                  </p>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                  <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">
                    {isEditingRoute ? "Editar cotización" : "Nueva cotización"}
                  </h1>
                  {!!(isEditingRoute || activeCotizacionId) && (
                    <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                      {isEditingRoute ? "Edición" : "Borrador"} · #
                      {editingCotizacionIdx != null ? editingCotizacionIdx : (activeCotizacionId || editingCotizacionId)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                  {isEditingRoute
                    ? "Ajusta cliente, conceptos y totales; guarda los cambios o revisa el PDF antes de enviar."
                    : "Define el cliente, agrega productos o servicios y revisa el resumen antes de guardar o generar la vista previa. Se guarda automáticamente como borrador."}
                </p>
                {!!lastAutoSavedAt && (
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {isAutoSaving ? "Guardando cambios..." : `Autosave: ${new Date(lastAutoSavedAt).toLocaleTimeString("es-MX")}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
              <button
                type="button"
                onClick={() => navigate("/cotizacion")}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-white/[0.04] sm:w-auto sm:min-h-0"
                aria-label="Regresar a cotizaciones"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 19 3 12l7-7" />
                  <path d="M3 12h18" />
                </svg>
                <span className="hidden sm:inline">Volver al listado</span>
                <span className="sm:hidden">Volver</span>
              </button>
            </div>
          </header>

          <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-8">
              <ComponentCard
                title="Datos del cliente"
                desc="Busca por nombre o teléfono y completa contacto, descuento y estado."
                className={cardShellClass.replace(/^overflow-hidden\b/, "overflow-visible")}
                compact
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400 sm:text-xs">Cliente</label>
                      <div className={`relative ${clienteOpen ? "z-[100]" : "z-0"}`}>
                        <div className="relative">
                          <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                          <input
                            value={
                              clienteSearch ||
                              (clienteId ? clientes.find((c) => c.id === clienteId)?.nombre || "" : "")
                            }
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              setClienteOpen(true);
                            }}
                            onFocus={() => setClienteOpen(true)}
                            placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente por nombre o teléfono..."}
                            disabled={loadingClientes}
                            className="block min-h-[40px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2 pl-8 pr-20 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:focus:bg-gray-900/60 sm:min-h-[44px] sm:py-2.5"
                          />
                          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                            {(!!clienteId || clienteSearch.trim().length > 0) && (
                              <button
                                type="button"
                                onClick={() => selectCliente(null)}
                                aria-label="Limpiar cliente"
                                className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300 sm:h-9 sm:min-w-[36px] sm:rounded-lg"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                                </svg>
                              </button>
                            )}
                            <button type='button' onClick={() => setClienteOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-300 transition'>
                              <svg className={`w-3.5 h-3.5 transition-transform ${clienteOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                            </button>
                          </div>
                        </div>
                        {clienteOpen && (
                          <div className="absolute left-0 right-0 top-full z-[110] mt-1 w-full max-h-64 overflow-auto divide-y divide-gray-100 rounded-lg border border-gray-200/80 bg-white shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10 custom-scrollbar">
                            <button type='button' onClick={() => selectCliente(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-gray-800 dark:text-white ${!clienteId ? 'bg-brand-50/60 dark:bg-gray-800/50 font-medium text-brand-700 dark:text-white' : ''}`}>Selecciona cliente</button>
                            {filteredClientes.map(c => (
                              <button key={c.id} type='button' onClick={() => selectCliente(c)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition'>
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                    {(c.nombre || '?').slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className='flex flex-col flex-1'>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-[12px] font-medium text-gray-800 dark:text-gray-100'>{c.nombre || '-'}</span>
                                      {c.is_prospecto && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider">Prospecto</span>
                                      )}
                                    </div>
                                    <span className='text-[11px] text-gray-500 dark:text-gray-400'>{c.telefono || '-'}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {filteredClientes.length === 0 && (
                              <div className='px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400'>Sin resultados</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className={labelPageClass}>Contacto</Label>
                      <input
                        value={contactoNombre}
                        onChange={(e) => setContactoNombre(e.target.value)}
                        placeholder="Nombre de la persona"
                        list="contactos-datalist"
                        className={inputLikeClassName}
                      />
                      <datalist id="contactos-datalist">
                        {contactosOptions.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <Label className={labelPageClass}>Descuento de Cliente (%)</Label>
                      <Input
                        className={inputFieldInsetClass}
                        type="number"
                        value={String(descuentoClientePct)}
                        onChange={(e) => {
                          setDescuentoClienteTouched(true);
                          setDescuentoClientePct(clampPct(toNumber(e.target.value, 0)));
                        }}
                        min="0"
                        max="100"
                        step={0.01}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label className={labelPageClass}>Medio de Contacto</Label>
                      <select
                        value={medioContacto}
                        onChange={(e) => setMedioContacto(e.target.value)}
                        className={inputLikeClassName}
                      >
                        <option value="">Selecciona</option>
                        {MEDIO_CONTACTO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className={labelPageClass}>Status</Label>
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputLikeClassName}>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
              </ComponentCard>

              <ComponentCard
                title="Agregar productos o servicios"
                desc="Integra con catálogo Syscom o captura manualmente cantidad, precio y descuento."
                className={cardShellClass}
                compact
                actions={
                  <button
                    type="button"
                    onClick={clearConceptoForm}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200/90 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    aria-label="Limpiar sección de producto"
                    title="Limpiar"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 16h10l1-16" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                }
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12 lg:gap-x-6">
                    <div className="sm:col-span-2 lg:col-span-2">
                      <Label className={labelPageClass}>Cant</Label>
                      <Input
                        className={inputFieldInsetClass}
                        type="number"
                        value={String(cantidad)}
                        onChange={(e) => setCantidad(toNumber(e.target.value, 0))}
                        min="0"
                        step={1}
                        placeholder="0"
                      />
                    </div>

                    <div className="sm:col-span-4 lg:col-span-5">
                      <Label className={labelPageClass}>Concepto / nombre</Label>
                      <div ref={syscomInputWrapRef} className="relative">
                        <input
                          className={inputLikeClassName}
                          value={conceptoNombre}
                          onFocus={() => {
                            if (conceptoNombre.trim().length >= 2) setSyscomOpen(true);
                          }}
                          onChange={(e) => {
                            setConceptoNombre(e.target.value);
                            setSelectedSyscomProducto(null);
                            setSelectedCatalogoConcepto(null);
                            setSelectedManualProducto(null);
                          }}
                          placeholder="Buscar concepto por folio/nombre, producto manual, Syscom o escribir manualmente"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 lg:col-span-3">
                      <Label className={labelPageClass}>Precio del producto</Label>
                      <Input
                        className={inputFieldInsetClass}
                        type="number"
                        value={String(precioLista)}
                        onChange={(e) => setPrecioLista(toNumber(e.target.value, 0))}
                        min="0"
                        step={0.01}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="sm:col-span-3 lg:col-span-2">
                      <Label className={labelPageClass}>Desct%</Label>
                      <Input
                        className={inputFieldInsetClass}
                        type="number"
                        value={String(descuentoPct)}
                        onChange={(e) => setDescuentoPct(clampPct(toNumber(e.target.value, 0)))}
                        min="0"
                        max="100"
                        step={0.01}
                        placeholder="0"
                      />
                    </div>

                    <div className="sm:col-span-6 lg:col-span-12">
                      <div className={`${cardShellMutedClass} px-4 py-3`}>
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                          <div>
                            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[11px]">Precio unitario</div>
                            <div className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{formatMoney(preview.pu)}</div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[11px]">Importe de línea</div>
                            <div className="mt-1 text-base font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-lg">{formatMoney(preview.importe)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-6 lg:col-span-12 pt-1">
                      <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <button
                          type="button"
                          onClick={addConcepto}
                          disabled={!canAddConcepto}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                        >
                          {editingConceptoId ? "Actualizar" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </div>
              </ComponentCard>

              <ComponentCard
                title="Detalle de conceptos"
                desc="Revisa cantidades, precios finales y acciones por línea."
                className={cardShellClass}
                compact
              >
                <p className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 sm:hidden">
                  <span className="inline-block h-px w-4 bg-brand-400/60" aria-hidden />
                  Desliza horizontalmente para ver todas las columnas
                </p>
                <div className="-mx-3 overflow-hidden rounded-xl border border-gray-200/70 bg-gray-50/40 dark:border-white/[0.06] dark:bg-gray-950/25 sm:mx-0">
                  <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] px-1 pb-1 sm:px-0 sm:pb-0">
                    <Table className="min-w-[720px]">
                      <TableHeader className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-100/90 text-[10px] font-semibold text-gray-700 backdrop-blur-sm dark:border-white/[0.06] dark:bg-gray-900/90 dark:text-gray-200 sm:text-[11px]">
                        <TableRow>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Cantidad</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Unidad</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-3/12 text-gray-700 dark:text-gray-300">Descripcion</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-3/12 text-gray-700 dark:text-gray-300">Detalle</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Precio unitario</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Descuento</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Importe total</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-center w-1/12 text-gray-700 dark:text-gray-300"> </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 text-[11px] text-gray-700 dark:divide-white/[0.06] dark:text-gray-200 sm:text-[12px]">
                        {computed.lines.map((c) => {
                          return (
                          <TableRow key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{c.cantidad}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{c.unidad || "—"}</TableCell>
                            <TableCell className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                {c.thumbnail_url ? (
                                  <img src={c.thumbnail_url} alt={c.producto_nombre} className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-white/10" />
                                ) : null}
                                <span className="text-gray-900 dark:text-white">{c.producto_nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-1.5">{c.producto_descripcion || "—"}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(toNumber(c.pu, 0))}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{clampPct(toNumber(c.descuento_pct, 0)).toFixed(2)}%</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(toNumber(c.importe, 0))}</TableCell>
                            <TableCell className="px-2 py-1.5 text-center">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                <button
                                  type="button"
                                  onClick={() => editConcepto(c.id)}
                                  className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-brand-400 hover:text-brand-600 active:scale-[0.97] dark:border-white/10 dark:bg-gray-800 dark:hover:border-brand-500 sm:h-7 sm:w-7 sm:rounded"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeConcepto(c.id)}
                                  className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 active:scale-[0.97] dark:border-white/10 dark:bg-gray-800 dark:hover:border-error-500 sm:h-7 sm:w-7 sm:rounded"
                                  title="Eliminar"
                                >
                                  <TrashBinIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}

                        {!computed.lines.length && (
                          <TableRow>
                            <TableCell colSpan={8} className="px-4 py-10 text-center">
                              <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                  </svg>
                                </span>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 sm:text-sm">Aún no hay conceptos</p>
                                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 sm:text-xs">Usa el formulario de arriba para agregar productos o servicios.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard
                title="Notas y condiciones"
                desc="Texto opcional que aparecerá en el documento de cotización."
                className={cardShellClass}
                compact
              >
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <Label className={labelPageClass}>Texto arriba de los precios</Label>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-[11px]">Máx. 5000</span>
                    </div>
                    <textarea
                      value={textoArribaPrecios}
                      onChange={(e) => setTextoArribaPrecios(e.target.value.slice(0, 5000))}
                      className={`${textareaLikeClassName} mt-2 rounded-lg`}
                      rows={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <Label className={labelPageClass}>Términos y condiciones</Label>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-[11px]">Máx. 8000</span>
                    </div>
                    <textarea
                      value={terminos}
                      onChange={(e) => setTerminos(e.target.value.slice(0, 8000))}
                      className={`${textareaLikeClassName} mt-2 rounded-lg`}
                      rows={15}
                    />
                  </div>
                </div>
              </ComponentCard>
            </div>

            <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
              <ComponentCard
                title="Resumen"
                desc="Totales y acciones principales."
                className={cardShellClass}
                compact
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200/80 bg-gray-50/60 px-3 py-2.5 dark:border-white/[0.06] dark:bg-gray-950/35">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 sm:text-sm">
                        <svg className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M8 2v3M16 2v3M4 7h16M6 10h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Fecha de cotización</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatDMY(todayIso)}</span>
                    </div>

                    <div className="rounded-xl border border-gray-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-gray-950/40">
                      <div className="flex items-end justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/[0.06]">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[11px]">Total estimado</div>
                          <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-2xl">{formatMoney(computed.total)}</div>
                        </div>
                        <div className="text-right text-[9px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:text-[10px]">MXN</div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {!!toNumber(computed.descClientePct, 0) && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Importe conceptos</span>
                              <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.subtotalLineas)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)</span>
                              <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">-{formatMoney(computed.descuentoCliente)}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-2 dark:border-white/[0.06]" aria-hidden />
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Subtotal</span>
                          <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.subtotalSinIva)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">IVA (16%)</span>
                          <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.ivaDesglose)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-white/[0.06]">
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 sm:text-xs">Total</span>
                          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{formatMoney(computed.totalConIva)}</span>
                        </div>
                      </div>
                    </div>

                    {!canGuardarCotizacion && (
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-100/95">Completa lo siguiente para guardar</p>
                        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-amber-900/90 dark:text-amber-200/90">
                          {!clienteId && <li>Selecciona un cliente</li>}
                          {!!clienteId && !String(contactoNombre || "").trim() && <li>Indica el nombre del contacto</li>}
                          {!computed.lines.length && <li>Agrega al menos un producto o servicio</li>}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion}
                        onClick={() => {
                          void handleSaveCotizacion(true);
                        }}
                        title={!clienteId ? "Selecciona un cliente" : undefined}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                      >
                        {isEditingRoute ? "Actualizar cotización" : "Guardar cotización"}
                      </button>
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion || exportBusy}
                        onClick={handlePreviewPdf}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-brand-200/90 bg-white px-4 py-3 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-50/80 focus:outline-none focus:ring-2 focus:ring-brand-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-transparent dark:text-brand-200 dark:hover:bg-brand-500/[0.08] sm:min-h-0"
                      >
                        {previewLoading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                            </svg>
                            Generando...
                          </>
                        ) : (
                          "Vista previa PDF"
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={exportBusy || !String(editingCotizacionId || activeCotizacionId || "").trim()}
                        onClick={() => void handleDownloadExcel()}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-emerald-200/90 bg-white px-4 py-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/[0.08] sm:min-h-0"
                        title={
                          !String(editingCotizacionId || activeCotizacionId || "").trim()
                            ? "Guarda la cotización para descargar el Excel"
                            : undefined
                        }
                      >
                        {excelLoading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                            </svg>
                            Generando...
                          </>
                        ) : (
                          "Descargar Excel"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.04] sm:min-h-0"
                      >
                        Limpiar formulario
                      </button>
                      {!editingCotizacionId && canCotizacionesCreate && (
                        <button
                          type="button"
                          onClick={() => {
                            setCloneSearch("");
                            setCloneSearchDebounced("");
                            setCloneRows([]);
                            setCloneModalOpen(true);
                          }}
                          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-brand-200/90 bg-brand-50/80 px-4 py-3 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100/90 active:scale-[0.99] dark:border-brand-500/30 dark:bg-brand-500/[0.12] dark:text-brand-100 dark:hover:bg-brand-500/20 sm:min-h-0"
                        >
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Clonar cotización
                        </button>
                      )}
                    </div>
                </div>
              </ComponentCard>
            </div>
          </div>

        </>
      )}
      </div>
    </div>
  );
}
