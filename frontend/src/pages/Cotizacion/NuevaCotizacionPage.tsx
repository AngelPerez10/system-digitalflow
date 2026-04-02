import { useEffect, useMemo, useState } from "react";
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

type ApiCotizacion = {
  id: number;
  idx: number;
  cliente_id: number | null;
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

const formatMoney = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toFinite = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getSyscomPrecioListaMxnConIva = (p: SyscomProducto, tipoCambio: number | null) => {
  const directMxn = toFinite(p.precio_mxn);
  if (directMxn !== null && directMxn > 0) return Math.max(0, directMxn);

  const lista = toFinite(p.precios?.precio_lista);
  const especial = toFinite(p.precios?.precio_especial);
  const descuento = toFinite(p.precios?.precio_descuento);
  const usdBase = lista ?? especial ?? descuento;

  if (usdBase == null) return 0;
  if (!tipoCambio) {
    // Fallback: mostrar algo útil aunque no haya tipo de cambio.
    return Math.max(0, usdBase);
  }

  return Math.max(0, usdBase * tipoCambio * 1.16);
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
  const [loadingProgress, setLoadingProgress] = useState(8);

  useEffect(() => {
    if (!previewLoading) {
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
  }, [previewLoading]);

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
  const [descuentoClientePct, setDescuentoClientePct] = useState<number>(0);
  const [descuentoClienteTouched, setDescuentoClienteTouched] = useState<boolean>(false);
  const [ivaPct, setIvaPct] = useState<number>(16);

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
    const pu = pl * (1 - desc / 100);
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

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      setClienteId(cliente.id);
      setClienteSearch(cliente.nombre);

      const desc = clampPct(toNumber((cliente as any)?.descuento_pct, 0));
      setDescuentoClientePct(desc);
      setDescuentoClienteTouched(false);
    } else {
      setClienteId("");
      setClienteSearch("");

      setDescuentoClientePct(0);
      setDescuentoClienteTouched(false);
    }
    setClienteOpen(false);
  };

  const filteredClientes = clientes;

  useEffect(() => {
    if (!editingCotizacionId) return;
    setHydratingFromStorage(true);
    const token = getToken();
    if (!token) {
      setHydratingFromStorage(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/cotizaciones/${editingCotizacionId}/`), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store' as RequestCache,
        });
        const data = (await res.json().catch(() => null)) as ApiCotizacion | null;
        if (!res.ok || !data) {
          setAlert({
            show: true,
            variant: 'warning',
            title: 'Cotización no encontrada',
            message: 'No se encontró la cotización. Regresando al listado.',
          });
          window.setTimeout(() => navigate('/cotizacion'), 450);
          return;
        }

        setClienteId(data.cliente_id ? Number(data.cliente_id) : '');
        setClienteSearch(String(data.cliente || "").trim());
        setContactoNombre(String(data.contacto || ''));
        setMedioContacto(String((data as any)?.medio_contacto || ''));
        setStatus(String((data as any)?.status || 'PENDIENTE'));
        setDescuentoClientePct(clampPct(toNumber((data as any)?.descuento_cliente_pct, 0)));
        setDescuentoClienteTouched(true);
        setIvaPct(clampPct(toNumber(data.iva_pct, 16)));
        setTextoArribaPrecios(String(data.texto_arriba_precios || ''));
        {
          const incoming = String((data as any).terminos || '').trim();
          if (incoming) setTerminos(incoming);
        }

        const conceptosList: Concepto[] = Array.isArray(data.items)
          ? data.items.map((it) => ({
            id: uid(),
            producto_externo_id: String((it as any).producto_externo_id ?? ''),
            producto_nombre: String(it.producto_nombre || ''),
            producto_descripcion: String(it.producto_descripcion || ''),
            unidad: String(it.unidad || ''),
            thumbnail_url: it.thumbnail_url || undefined,
            cantidad: toNumber(it.cantidad, 0),
            precio_lista: toNumber(it.precio_lista, 0),
            descuento_pct: clampPct(toNumber(it.descuento_pct, 0)),
          }))
          : [];
        setConceptos(conceptosList);
      } catch {
        setAlert({
          show: true,
          variant: 'error',
          title: 'Error',
          message: 'No se pudo cargar la cotización.',
        });
      } finally {
        setHydratingFromStorage(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCotizacionId]);

  useEffect(() => {
    if (hydratingFromStorage) return;
    if (!selectedCliente) {
      if (!editingCotizacionId) setContactoNombre("");
      return;
    }

    // In edit mode, preserve the stored contacto if already present.
    if (editingCotizacionId && String(contactoNombre || "").trim()) return;

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
    if (q.length < 2) {
      setSyscomProductos([]);
      setSyscomError("");
      if (!q) setSyscomOpen(false);
      return;
    }
    const token = getToken();
    if (!token) return;
    setSyscomOpen(true);
    const timer = window.setTimeout(async () => {
      setLoadingSyscom(true);
      setSyscomError("");
      try {
        const query = buildProductosQuery({
          busqueda: q,
          pagina: 1,
          orden: "relevancia",
          stock: "1",
        });
        const res = await fetchSyscom(`productos/?${query}`, token);
        const data: SyscomProductosResponse = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSyscomProductos([]);
          setSyscomError("No se pudo consultar SYSCOM en este momento.");
          return;
        }
        setSyscomProductos((data.productos || []).slice(0, 8));
      } catch {
        setSyscomProductos([]);
        setSyscomError("Error de conexión con SYSCOM.");
      } finally {
        setLoadingSyscom(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [conceptoNombre]);

  const selectSyscomProducto = (p: SyscomProducto) => {
    setSelectedSyscomProducto(p);
    setConceptoNombre(String(p.titulo || p.modelo || ""));
    setConceptoDescripcion(String([p.marca, p.modelo].filter(Boolean).join(" · ") || p.titulo || ""));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)));
    setSyscomOpen(false);
  };

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

  const handleSaveCotizacion = async (navigateAfterSave = true): Promise<string | null> => {
    const p = getPermissionsFromStorage();
    const canView = asBool(p?.cotizaciones?.view, true);
    const canCreate = asBool(p?.cotizaciones?.create, false);
    const canEdit = asBool(p?.cotizaciones?.edit, false);

    if (!canView) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Sin permiso",
        message: "No tienes permiso para ver cotizaciones.",
      });
      return null;
    }

    if (editingCotizacionId) {
      if (!canEdit) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para editar cotizaciones.",
        });
        return null;
      }
    } else {
      if (!canCreate) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para crear cotizaciones.",
        });
        return null;
      }
    }

    const v = validateClienteContacto();
    if (!v.ok) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return null;
    }
    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para guardar la cotización.",
      });
      return null;
    }

    const nowIso = todayIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();

    const token = getToken();
    if (!token) return null;

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || '',
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || '',
      medio_contacto: String(medioContacto || ''),
      status: String(status || 'PENDIENTE'),
      fecha: nowIso,
      subtotal: round2(toNumber(computed.subtotal, 0)),
      descuento_cliente_pct: clampPct(toNumber(descuentoClientePct, 0)),
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: round2(toNumber(computed.iva, 0)),
      total: round2(toNumber(computed.total, 0)),
      texto_arriba_precios: String(textoArribaPrecios || ''),
      terminos: String(terminos || ''),
      items: computed.lines.map((c, i) => ({
        producto_externo_id: c.producto_externo_id ?? '',
        producto_nombre: c.producto_nombre,
        producto_descripcion: c.producto_descripcion,
        unidad: c.unidad,
        thumbnail_url: c.thumbnail_url || '',
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        orden: i,
      })),
    };

    try {
      const isEdit = !!editingCotizacionId;
      const res = await fetch(apiUrl(isEdit ? `/api/cotizaciones/${editingCotizacionId}/` : '/api/cotizaciones/'), {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.detail || JSON.stringify(data) || 'No se pudo guardar la cotización.';
        setAlert({ show: true, variant: 'error', title: 'Error', message: msg });
        return null;
      }

      const savedId = String(data?.id || editingCotizacionId || '').trim();
      setAlert({
        show: true,
        variant: 'success',
        title: isEdit ? 'Cotización actualizada' : 'Cotización guardada',
        message: `Folio #${data?.idx || data?.id || ''} guardado correctamente.`,
      });
      if (navigateAfterSave) {
        window.setTimeout(() => navigate('/cotizacion'), 350);
      }
      return savedId || null;
    } catch {
      setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudo guardar la cotización.' });
      return null;
    }
  };

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
    const productoExternoId = selectedSyscomProducto?.producto_id || "";
    const thumbnail = selectedSyscomProducto?.img_portada
      ? getProductoImageUrl(selectedSyscomProducto.img_portada) || undefined
      : undefined;

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
    setSyscomError("");
    setSyscomOpen(false);
  };

  const computed = useMemo(() => {
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
    const ivaP = clampPct(toNumber(ivaPct, 16));
    const iva = subtotal * (ivaP / 100);
    const total = subtotal + iva;

    return { lines, subtotalLineas, descClientePct, descuentoCliente, subtotal, iva, total, ivaPct: ivaP };
  }, [conceptos, ivaPct, descuentoClientePct]);

  /** Cliente, contacto y al menos un concepto (misma regla que validateClienteContacto + líneas) */
  const canGuardarCotizacion = useMemo(() => {
    if (!clienteId) return false;
    if (!String(contactoNombre || "").trim()) return false;
    if (!computed.lines.length) return false;
    return true;
  }, [clienteId, contactoNombre, computed.lines.length]);

  const resetAll = () => {
    setClienteId("");
    setContactoNombre("");

    setMedioContacto('');
    setStatus('PENDIENTE');

    setCantidad(1);
    setConceptoNombre("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setDescuentoClientePct(0);
    setDescuentoClienteTouched(false);
    setIvaPct(16);

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
    if (previewLoading) return;

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
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: round2(toNumber(computed.iva, 0)),
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
      const res = await fetch(apiUrl("/api/cotizaciones/pdf-preview/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setAlert({ show: true, variant: "error", title: "Error", message: txt || "No se pudo generar la vista previa." });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo abrir la vista previa." });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-5 px-3 pb-8 pt-5 text-sm sm:space-y-8 sm:px-5 sm:pb-12 sm:pt-8 sm:text-base md:px-6 lg:px-8">
      <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />

      <Modal isOpen={previewLoading} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-7 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="relative flex items-center justify-center w-[76px] h-[76px] rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50 dark:bg-gray-900/80">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 dark:border-t-brand-400 animate-spin" />
                  <div className="relative flex items-center justify-center">
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
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">Generando vista previa</h3>
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
                Generando archivo de cotización…
              </div>
            </div>
          </div>
        </div>
      </Modal>

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
              {editingCotizacionId ? "Editar" : "Nueva"}
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
                    {editingCotizacionId ? "Editar cotización" : "Nueva cotización"}
                  </h1>
                  {!!editingCotizacionId && (
                    <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                      Edición · #{editingCotizacionId}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                  {editingCotizacionId
                    ? "Ajusta cliente, conceptos y totales; guarda los cambios o revisa el PDF antes de enviar."
                    : "Define el cliente, agrega productos o servicios y revisa el resumen antes de guardar o generar la vista previa."}
                </p>
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
                className={cardShellClass}
                compact
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400 sm:text-xs">Cliente</label>
                      <div className="relative">
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
                          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto divide-y divide-gray-100 rounded-lg border border-gray-200/80 bg-white shadow-sm backdrop-blur-sm dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-gray-900/95 custom-scrollbar">
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
                      <div className="relative">
                        <input
                          className={inputLikeClassName}
                          value={conceptoNombre}
                          onFocus={() => {
                            if (syscomProductos.length > 0) setSyscomOpen(true);
                          }}
                          onChange={(e) => {
                            setConceptoNombre(e.target.value);
                            setSelectedSyscomProducto(null);
                          }}
                          placeholder="Buscar producto Syscom o escribir manualmente"
                        />
                        {syscomOpen && (loadingSyscom || syscomProductos.length > 0 || !!syscomError || conceptoNombre.trim().length >= 2) && (
                          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-900 custom-scrollbar">
                            {loadingSyscom && (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando en Syscom...</div>
                            )}
                            {!loadingSyscom && !!syscomError && (
                              <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{syscomError}</div>
                            )}
                            {!loadingSyscom && syscomProductos.map((p) => {
                              const price = round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio));
                              const imgUrl = getProductoImageUrl(p.img_portada || "");
                              return (
                                <button
                                  key={`${p.fuente || "syscom"}-${p.producto_id}`}
                                  type="button"
                                  onClick={() => selectSyscomProducto(p)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center shrink-0">
                                      {imgUrl ? (
                                        <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                                      ) : (
                                        <span className="text-[10px] text-gray-400">—</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{p.titulo}</p>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                        {p.marca} · {p.modelo}
                                      </p>
                                    </div>
                                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                                      {formatMoney(price)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                            {!loadingSyscom && !syscomError && syscomProductos.length === 0 && conceptoNombre.trim().length >= 2 && (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Sin resultados</div>
                            )}
                          </div>
                        )}
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
                desc="Revisa cantidades, precios con IVA y acciones por línea."
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
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Cant.</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Unidad</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-3/12 text-gray-700 dark:text-gray-300">Nombre</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-3/12 text-gray-700 dark:text-gray-300">Descripción</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">P.L.</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Desct.</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">P.U.</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">Importe</TableCell>
                          <TableCell isHeader className="px-2 py-2 text-center w-1/12 text-gray-700 dark:text-gray-300"> </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 text-[11px] text-gray-700 dark:divide-white/[0.06] dark:text-gray-200 sm:text-[12px]">
                        {computed.lines.map((c) => {
                          const ivaFactor = 1 + (clampPct(toNumber(computed.ivaPct, 0)) / 100);
                          const precioListaConIva = toNumber(c.precio_lista, 0) * ivaFactor;
                          const puConIva = toNumber(c.pu, 0) * ivaFactor;
                          const importeConIva = toNumber(c.importe, 0) * ivaFactor;
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
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(precioListaConIva)}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{clampPct(toNumber(c.descuento_pct, 0)).toFixed(2)}%</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(puConIva)}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(importeConIva)}</TableCell>
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
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell colSpan={6} className="px-4 py-10 text-center">
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
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
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
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Subtotal líneas</span>
                          <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.subtotalLineas)}</span>
                        </div>
                        {!!toNumber(computed.descClientePct, 0) && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)</span>
                              <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">-{formatMoney(computed.descuentoCliente)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">Base</span>
                              <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.subtotal)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">IVA ({clampPct(toNumber(ivaPct, 16)).toFixed(2)}%)</span>
                          <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-white sm:text-sm">{formatMoney(computed.iva)}</span>
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
                        {editingCotizacionId ? "Actualizar cotización" : "Guardar cotización"}
                      </button>
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion || previewLoading}
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
                        onClick={resetAll}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.04] sm:min-h-0"
                      >
                        Limpiar formulario
                      </button>
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
