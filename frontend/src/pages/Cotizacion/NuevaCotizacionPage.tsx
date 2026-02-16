import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";

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

type ProductoMedia = {
  id?: number;
  url?: string;
  public_id?: string;
  nombre_original?: string;
};

type Producto = {
  id: number;
  idx: number;
  nombre: string;
  unidad?: string;
  descripcion?: string;
  modelo?: string;
  precio_venta?: number | string | null;
  imagen?: ProductoMedia | null;
};

type Concepto = {
  id: string;
  producto_id: number | null;
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
  producto_id: number | null;
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
  fecha: string | null;
  vencimiento: string | null;
  subtotal: number;
  iva_pct: number;
  iva: number;
  total: number;
  texto_arriba_precios: string;
  terminos: string;
  items: ApiCotizacionItem[];
};

const inputLikeClassName =
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

const textareaLikeClassName =
  "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

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
  const canProductosView = asBool(permissions?.productos?.view, true);

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

  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [clienteId, setClienteId] = useState<number | "">("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);

  const [contactoNombre, setContactoNombre] = useState("");

  const [cantidad, setCantidad] = useState<number>(1);
  const [productoId, setProductoId] = useState<number | "">("");
  const [productoSearch, setProductoSearch] = useState("");
  const [productoDescripcion, setProductoDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [precioLista, setPrecioLista] = useState<number>(0);
  const [descuentoPct, setDescuentoPct] = useState<number>(0);
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
      "- Precios expresados en pesos mexicanos, no incluyen IVA salvo indicación contraria.\n" +
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

  const [vigenciaIso, setVigenciaIso] = useState<string>(todayIso);

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

  const selectedProducto = useMemo(() => {
    if (!productoId) return null;
    return productos.find((p) => p.id === productoId) || null;
  }, [productos, productoId]);

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
    const fetchProductos = async () => {
      if (!canProductosView) {
        setProductos([]);
        return;
      }
      const token = getToken();
      if (!token) return;
      setLoadingProductos(true);
      try {
        const query = new URLSearchParams({
          page: '1',
          page_size: '5000',
          ordering: 'idx',
        });
        if (String(productoSearch || '').trim()) {
          query.set('search', String(productoSearch || '').trim());
        }

        const res = await fetch(apiUrl(`/api/productos/?${query.toString()}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = (data as any)?.detail || (typeof data === 'string' ? data : '') || `No se pudieron cargar productos (HTTP ${res.status}).`;
          setProductos([]);
          setAlert({ show: true, variant: 'warning', title: 'Productos', message: String(msg) });
          return;
        }
        const list = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
        setProductos(list as Producto[]);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [canProductosView, productoSearch]);

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
        setContactoNombre(String(data.contacto || ''));
        setDescuentoClientePct(clampPct(toNumber((data as any)?.descuento_cliente_pct, 0)));
        setDescuentoClienteTouched(true);
        setVigenciaIso(String(data.vencimiento || todayIso));
        setIvaPct(clampPct(toNumber(data.iva_pct, 16)));
        setTextoArribaPrecios(String(data.texto_arriba_precios || ''));
        {
          const incoming = String((data as any).terminos || '').trim();
          if (incoming) setTerminos(incoming);
        }

        const conceptosList: Concepto[] = Array.isArray(data.items)
          ? data.items.map((it) => ({
            id: uid(),
            producto_id: it.producto_id ?? null,
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
    if (!selectedProducto) {
      setProductoDescripcion("");
      setUnidad("");
      setPrecioLista(0);
      return;
    }
    setProductoDescripcion(String(selectedProducto.descripcion || ""));
    setUnidad(String(selectedProducto.unidad || ""));
    setPrecioLista(toNumber(selectedProducto.precio_venta, 0));
  }, [selectedProducto]);

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
    const c = selectedCliente;
    return String(c?.nombre || "").trim();
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
    const venc = String(vigenciaIso || "").trim() || nowIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();

    const token = getToken();
    if (!token) return null;

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || '',
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || '',
      fecha: nowIso,
      vencimiento: venc,
      subtotal: round2(toNumber(computed.subtotal, 0)),
      descuento_cliente_pct: clampPct(toNumber(descuentoClientePct, 0)),
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: round2(toNumber(computed.iva, 0)),
      total: round2(toNumber(computed.total, 0)),
      texto_arriba_precios: String(textoArribaPrecios || ''),
      terminos: String(terminos || ''),
      items: computed.lines.map((c, i) => ({
        producto_id: c.producto_id,
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
    const prodOk = !!productoId;
    return v.ok && qtyOk && prodOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, contactoNombre, cantidad, productoId]);

  const clearConceptoForm = () => {
    setEditingConceptoId(null);
    setCantidad(1);
    setProductoId("");
    setProductoSearch("");
    setProductoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
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

    const prod = selectedProducto;

    if (!prod) return;
    if (qty <= 0) return;

    if (editingConceptoId) {
      setConceptos((prev) =>
        prev.map((x) =>
          x.id === editingConceptoId
            ? {
              ...x,
              producto_id: prod.id,
              producto_nombre: String(prod.nombre || ""),
              producto_descripcion: String(productoDescripcion || ""),
              unidad: String(unidad || ""),
              thumbnail_url: prod.imagen?.url || undefined,
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
          producto_id: prod.id,
          producto_nombre: String(prod.nombre || ""),
          producto_descripcion: String(productoDescripcion || ""),
          unidad: String(unidad || ""),
          thumbnail_url: prod.imagen?.url || undefined,
          cantidad: qty,
          precio_lista: pl,
          descuento_pct: desc,
        },
      ]);
    }

    setCantidad(1);
    setProductoId("");
    setProductoSearch("");
    setProductoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
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
    setProductoId(c.producto_id ?? "");
    setProductoSearch(String(c.producto_nombre || ""));
    setProductoDescripcion(String(c.producto_descripcion || ""));
    setUnidad(String(c.unidad || ""));
    setPrecioLista(toNumber(c.precio_lista, 0));
    setDescuentoPct(clampPct(toNumber(c.descuento_pct, 0)));
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

    return { lines, subtotalLineas, descClientePct, descuentoCliente, subtotal, iva, total };
  }, [conceptos, ivaPct, descuentoClientePct]);

  const resetAll = () => {
    setClienteId("");
    setContactoNombre("");

    setCantidad(1);
    setProductoId("");
    setProductoDescripcion("");
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
        "- Precios expresados en pesos mexicanos, no incluyen IVA salvo indicación contraria.\n" +
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
    setVigenciaIso(todayIso);
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
    const venc = String(vigenciaIso || "").trim() || nowIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || "",
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      fecha: nowIso,
      vencimiento: venc,
      subtotal: round2(toNumber(computed.subtotal, 0)),
      descuento_cliente_pct: clampPct(toNumber(descuentoClientePct, 0)),
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: round2(toNumber(computed.iva, 0)),
      total: round2(toNumber(computed.total, 0)),
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
      items: computed.lines.map((c, i) => ({
        producto_id: c.producto_id,
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
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />
      <PageBreadcrumb pageTitle="Nueva Cotización" />

      <Modal isOpen={previewLoading} onClose={() => {}} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-5">
              <div className="absolute -inset-3 rounded-full bg-linear-to-r from-brand-500/25 via-blue-500/15 to-brand-500/25 blur-xl"></div>
              <div className="relative flex items-center justify-center w-[74px] h-[74px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 shadow-theme-md">
                <div className="absolute inset-0 rounded-2xl border border-gray-100 dark:border-white/5"></div>
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-brand-600 dark:border-t-brand-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-xl border-2 border-transparent border-t-blue-600/70 dark:border-t-blue-400/70 animate-spin" style={{ animationDuration: "1.6s" }}></div>

                <svg className="w-7 h-7 text-brand-700 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8v-3Z" />
                  <path d="M13 16v-3h1.5a1.5 1.5 0 0 1 0 3H13Z" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generando vista previa</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Preparando el PDF
              <span className="inline-flex items-center gap-1 ml-1 align-middle">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500/70 dark:bg-gray-300/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500/70 dark:bg-gray-300/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500/70 dark:bg-gray-300/70 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </p>

            <div className="mt-5 w-full rounded-full h-2 overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-white/10">
              <div className="h-full w-[65%] bg-linear-to-r from-brand-600 via-blue-600 to-brand-600 animate-pulse"></div>
            </div>
            <div className="mt-2 w-full h-[2px] overflow-hidden rounded-full bg-transparent">
              <div className="h-full w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/25 animate-pulse"></div>
            </div>
          </div>
        </div>
      </Modal>

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canCotizacionesView ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver Cotizaciones.</div>
      ) : (
        <>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Nueva Cotización</h2>
              <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">Completa los datos del cliente y agrega productos/servicios.</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate("/cotizacion")}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200"
                aria-label="Regresar a cotizaciones"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 19 3 12l7-7" />
                  <path d="M3 12h18" />
                </svg>
                <span className="hidden sm:inline">Regresar</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 space-y-4">
              <ComponentCard title="Datos de Cliente">
                <div className="p-5">
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente</label>
                      <div className="relative">
                        <div className="relative">
                          <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                          <input
                            value={clienteSearch || (clienteId ? clientes.find(c => c.id === clienteId)?.nombre || '' : '')}
                            onChange={(e) => { setClienteSearch(e.target.value); setClienteOpen(true); }}
                            onFocus={() => setClienteOpen(true)}
                            placeholder={loadingClientes ? 'Cargando clientes...' : 'Buscar cliente por nombre o teléfono...'}
                            disabled={loadingClientes}
                            className='block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                          />
                          <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                            {(clienteId || clienteSearch) && (
                              <button type='button' onClick={() => { selectCliente(null); }} className='h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition'>Limpiar</button>
                            )}
                            <button type='button' onClick={() => setClienteOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-300 transition'>
                              <svg className={`w-3.5 h-3.5 transition-transform ${clienteOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                            </button>
                          </div>
                        </div>
                        {clienteOpen && (
                          <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
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
                      <Label>Contacto</Label>
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
                      <Label>Descuento de Cliente (%)</Label>
                      <Input
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
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard
                title="Agregar productos o servicios"
                actions={
                  <button
                    type="button"
                    onClick={clearConceptoForm}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200 dark:hover:bg-gray-800"
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
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-x-6">
                    <div className="lg:col-span-2">
                      <Label>Cant</Label>
                      <Input
                        type="number"
                        value={String(cantidad)}
                        onChange={(e) => setCantidad(toNumber(e.target.value, 0))}
                        min="0"
                        step={1}
                        placeholder="0"
                      />
                    </div>

                    <div className="lg:col-span-5">
                      <div className="mt-1">
                        <ActionSearchBar
                          label={loadingProductos ? "Cargando productos..." : "Productos o servicios"}
                          placeholder={loadingProductos ? "Cargando..." : "Buscar por nombre, modelo o descripción"}
                          value={productoSearch}
                          onQueryChange={(q) => setProductoSearch(q)}
                          actions={productos.map((p) => ({
                            id: String(p.id),
                            label: String(p.nombre || ""),
                            icon: (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 text-[10px] font-semibold">
                                {(String(p.nombre || "?").trim().slice(0, 1) || "?").toUpperCase()}
                              </span>
                            ),
                            description: String(p.modelo || p.descripcion || "").trim() || undefined,
                            end: p.precio_venta != null && String(p.precio_venta) !== "" ? formatMoney(toNumber(p.precio_venta, 0)) : "",
                          }))}
                          onSelectAction={(a) => {
                            const id = Number(a?.id);
                            if (!Number.isFinite(id)) return;
                            setProductoId(id);
                            setProductoSearch(String(a?.label || ""));
                          }}
                          showAllActions={false}
                        />
                      </div>
                      {!loadingProductos && productos.length === 0 && (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">No hay productos disponibles o no tienes permiso para verlos.</p>
                      )}
                      {!!selectedProducto?.descripcion && (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          {String(selectedProducto.descripcion)}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-3">
                      <Label>Precio del producto</Label>
                      <Input
                        type="number"
                        value={String(precioLista)}
                        onChange={(e) => setPrecioLista(toNumber(e.target.value, 0))}
                        min="0"
                        step={0.01}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <Label>Desct%</Label>
                      <Input
                        type="number"
                        value={String(descuentoPct)}
                        onChange={(e) => setDescuentoPct(clampPct(toNumber(e.target.value, 0)))}
                        min="0"
                        max="100"
                        step={0.01}
                        placeholder="0"
                      />
                    </div>

                    <div className="lg:col-span-12">
                      <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 px-4 py-3 shadow-theme-xs">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Precio unitario</div>
                            <div className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatMoney(preview.pu)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Importe</div>
                            <div className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white tabular-nums">{formatMoney(preview.importe)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-12 pt-1">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={addConcepto}
                          disabled={!canAddConcepto}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {editingConceptoId ? "Actualizar" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="Productos o servicios">
                <div className="p-2">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
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
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                        {computed.lines.map((c) => (
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
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(toNumber(c.precio_lista, 0))}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{clampPct(toNumber(c.descuento_pct, 0)).toFixed(2)}%</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(toNumber(c.pu, 0))}</TableCell>
                            <TableCell className="px-2 py-1.5 whitespace-nowrap">{formatMoney(toNumber(c.importe, 0))}</TableCell>
                            <TableCell className="px-2 py-1.5 text-center">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                <button
                                  type="button"
                                  onClick={() => editConcepto(c.id)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeConcepto(c.id)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                                  title="Eliminar"
                                >
                                  <TrashBinIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!computed.lines.length && (
                          <TableRow>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2 text-center text-sm text-gray-500">Sin conceptos</TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                            <TableCell className="px-2 py-2"> </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="Notas">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <Label>Texto arriba de los precios</Label>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Máx. 5000</span>
                    </div>
                    <textarea
                      value={textoArribaPrecios}
                      onChange={(e) => setTextoArribaPrecios(e.target.value.slice(0, 5000))}
                      className={`${textareaLikeClassName} mt-2 rounded-xl bg-white/70 dark:bg-gray-900/40 border-gray-200/70 dark:border-white/10`}
                      rows={4}
                    />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <Label>Términos y condiciones</Label>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Máx. 5000</span>
                    </div>
                    <textarea
                      value={terminos}
                      onChange={(e) => setTerminos(e.target.value.slice(0, 5000))}
                      className={`${textareaLikeClassName} mt-2 rounded-xl bg-white/70 dark:bg-gray-900/40 border-gray-200/70 dark:border-white/10`}
                      rows={12}
                    />
                  </div>
                </div>
              </ComponentCard>
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
              <ComponentCard title="Resumen Cotización">
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M8 2v3M16 2v3M4 7h16M6 10h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{formatDMY(todayIso)}</span>
                    </div>

                    <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 p-4 shadow-theme-xs">
                      <div className="flex items-baseline justify-between">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</div>
                        <div className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums">{formatMoney(computed.total)}</div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200/70 dark:border-white/10 grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{formatMoney(computed.subtotalLineas)}</span>
                        </div>
                        {!!toNumber(computed.descClientePct, 0) && (
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-gray-500 dark:text-gray-400">Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)</span>
                            <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">-{formatMoney(computed.descuentoCliente)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-gray-500 dark:text-gray-400">Subtotal con descuento</span>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{formatMoney(computed.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-gray-500 dark:text-gray-400">IVA ({clampPct(toNumber(ivaPct, 16)).toFixed(2)}%)</span>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{formatMoney(computed.iva)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Vigencia</Label>
                      <DatePicker
                        id="cotizacion-vigencia"
                        placeholder="Selecciona una fecha"
                        defaultDate={vigenciaIso}
                        onChange={(_dates, currentDateString) => {
                          setVigenciaIso(String(currentDateString || ""));
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        disabled={!computed.lines.length}
                        onClick={() => {
                          void handleSaveCotizacion(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingCotizacionId ? "Actualizar Cotización" : "Guardar Cotización"}
                      </button>
                      <button
                        type="button"
                        disabled={!computed.lines.length || previewLoading}
                        onClick={handlePreviewPdf}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-900/40 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
                      >
                        {previewLoading ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              </ComponentCard>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
