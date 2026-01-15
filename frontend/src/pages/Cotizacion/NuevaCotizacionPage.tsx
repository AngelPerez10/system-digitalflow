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
import { apiUrl } from "@/config/api";
import { ChevronLeftIcon, PencilIcon, TrashBinIcon } from "@/icons";

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

const selectLikeClassName =
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

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
  const [productoDescripcion, setProductoDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [precioLista, setPrecioLista] = useState<number>(0);
  const [descuentoPct, setDescuentoPct] = useState<number>(0);
  const [ivaPct, setIvaPct] = useState<number>(16);

  const [editingConceptoId, setEditingConceptoId] = useState<string | null>(null);

  const [conceptos, setConceptos] = useState<Concepto[]>([]);

  const [textoArribaPrecios, setTextoArribaPrecios] = useState(
    "A continuación cotización solicitada: "
  );
  const [terminos, setTerminos] = useState(
    "Se requiere el 50% de anticipo para iniciar"
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
    if (!token) return;
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
      if (!canCotizacionesView) return;
      const token = getToken();
      if (!token) return;
      setLoadingProductos(true);
      try {
        const res = await fetch(apiUrl("/api/productos/"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          setProductos([]);
          return;
        }
        setProductos(Array.isArray(data) ? (data as Producto[]) : []);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [canCotizacionesView]);

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
    } else {
      setClienteId("");
      setClienteSearch("");
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
        setVigenciaIso(String(data.vencimiento || todayIso));
        setIvaPct(clampPct(toNumber(data.iva_pct, 16)));
        setTextoArribaPrecios(String(data.texto_arriba_precios || ''));
        setTerminos(String(data.terminos || ''));

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

  const handleSaveCotizacion = () => {
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
      return;
    }

    if (editingCotizacionId) {
      if (!canEdit) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para editar cotizaciones.",
        });
        return;
      }
    } else {
      if (!canCreate) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para crear cotizaciones.",
        });
        return;
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
      return;
    }
    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para guardar la cotización.",
      });
      return;
    }

    const nowIso = todayIso;
    const venc = String(vigenciaIso || "").trim() || nowIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();

    const token = getToken();
    if (!token) return;

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || '',
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || '',
      fecha: nowIso,
      vencimiento: venc,
      subtotal: toNumber(computed.subtotal, 0),
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: toNumber(computed.iva, 0),
      total: toNumber(computed.total, 0),
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

    const save = async () => {
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
          return;
        }
        setAlert({
          show: true,
          variant: 'success',
          title: isEdit ? 'Cotización actualizada' : 'Cotización guardada',
          message: `Folio #${data?.idx || data?.id || ''} guardado correctamente.`,
        });
        window.setTimeout(() => navigate('/cotizacion'), 350);
      } catch {
        setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudo guardar la cotización.' });
      }
    };

    save();
  };

  const canAddConcepto = useMemo(() => {
    const v = validateClienteContacto();
    const qtyOk = toNumber(cantidad, 0) > 0;
    const prodOk = !!productoId;
    return v.ok && qtyOk && prodOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, contactoNombre, cantidad, productoId]);

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

    const subtotal = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    const ivaP = clampPct(toNumber(ivaPct, 16));
    const iva = subtotal * (ivaP / 100);
    const total = subtotal + iva;

    return { lines, subtotal, iva, total };
  }, [conceptos, ivaPct]);

  const resetAll = () => {
    setClienteId("");
    setContactoNombre("");

    setCantidad(1);
    setProductoId("");
    setProductoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setIvaPct(16);

    setEditingConceptoId(null);

    setConceptos([]);
    setTextoArribaPrecios("A continuación cotización solicitada:");
    setTerminos("Se requiere el 50% de anticipo para iniciar");
    setVigenciaIso(todayIso);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />
      <PageBreadcrumb pageTitle="Nueva Cotización" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canCotizacionesView ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver Cotizaciones.</div>
      ) : (
        <>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Nueva Cotización</h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">Completa los datos del cliente y agrega productos/servicios.</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate("/cotizacion")}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200"
                title="Volver"
              >
                <ChevronLeftIcon className="w-4 h-4" />
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
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="Agregar productos o servicios">
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
                      <Label>Productos o servicios</Label>
                      <select
                        value={productoId}
                        onChange={(e) => setProductoId(e.target.value ? Number(e.target.value) : "")}
                        className={selectLikeClassName}
                        disabled={loadingProductos}
                      >
                        <option value="">Selecciona un producto</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
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
                      <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/40 px-3 py-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-300">
                            <span className="text-gray-500 dark:text-gray-400">Total</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatMoney(preview.pu)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-300">
                            <span className="text-gray-500 dark:text-gray-400">Importe</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatMoney(preview.importe)}</span>
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
                <div className="p-4 grid grid-cols-1 gap-4">
                  <div>
                    <Label>Este texto aparecerá arriba de los precios. Max. 1500 caracteres.</Label>
                    <textarea
                      value={textoArribaPrecios}
                      onChange={(e) => setTextoArribaPrecios(e.target.value.slice(0, 1500))}
                      className={textareaLikeClassName}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Términos y condiciones (puedes agregar tu datos bancarios para pago). Max. 1500 caracteres.</Label>
                    <textarea
                      value={terminos}
                      onChange={(e) => setTerminos(e.target.value.slice(0, 1500))}
                      className={textareaLikeClassName}
                      rows={4}
                    />
                  </div>
                </div>
              </ComponentCard>
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
              <ComponentCard title="Resumen Cotización">
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <select className={selectLikeClassName} defaultValue="Plantilla original">
                        <option value="Plantilla original">Plantilla original</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M8 2v3M16 2v3M4 7h16M6 10h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{formatDMY(todayIso)}</span>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">Subtotal</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatMoney(computed.subtotal)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">IVA ({clampPct(toNumber(ivaPct, 16)).toFixed(2)}%)</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatMoney(computed.iva)}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[12px] text-gray-700 dark:text-gray-200">Total</span>
                        <span className="text-base font-semibold text-gray-900 dark:text-white">{formatMoney(computed.total)}</span>
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
                        onClick={handleSaveCotizacion}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingCotizacionId ? "Actualizar Cotización" : "Guardar Cotización"}
                      </button>
                      <button
                        type="button"
                        disabled={!computed.lines.length}
                        onClick={() => { }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-xs font-medium text-blue-700 shadow-theme-xs hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-900/40 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
                      >
                        Vista Previa
                      </button>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200"
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
