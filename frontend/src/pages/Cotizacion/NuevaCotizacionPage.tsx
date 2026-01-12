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

type StoredCotizacion = {
  id: string;
  folio: string;
  fecha: string; // YYYY-MM-DD
  vencimiento: string; // YYYY-MM-DD
  creadaPor: string;
  cliente_id?: number | null;
  cliente: string;
  contacto: string;
  prospecto: boolean;
  subtotal: number;
  iva_pct: number;
  iva: number;
  total: number;
  conceptos: Array<{
    producto_id: number | null;
    producto_nombre: string;
    producto_descripcion: string;
    unidad: string;
    thumbnail_url?: string;
    cantidad: number;
    precio_lista: number;
    descuento_pct: number;
  }>;
  texto_arriba_precios: string;
  terminos: string;
};

const COTIZACIONES_STORAGE_KEY = "cotizaciones";

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

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [isProspecto, setIsProspecto] = useState(false);
  const [clienteId, setClienteId] = useState<number | "">("");
  const [clienteProspectoNombre, setClienteProspectoNombre] = useState("");

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

  useEffect(() => {
    const fetchClientes = async () => {
      const token = getToken();
      if (!token) return;
      setLoadingClientes(true);
      try {
        const res = await fetch(apiUrl("/api/clientes/"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          setClientes([]);
          return;
        }
        setClientes(Array.isArray(data) ? (data as Cliente[]) : []);
      } finally {
        setLoadingClientes(false);
      }
    };

    const fetchProductos = async () => {
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

    fetchClientes();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (!editingCotizacionId) return;
    setHydratingFromStorage(true);
    try {
      const raw = localStorage.getItem(COTIZACIONES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list: StoredCotizacion[] = Array.isArray(parsed) ? parsed : [];
      const found = list.find((x) => String(x?.id) === editingCotizacionId);
      if (!found) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Cotización no encontrada",
          message: "No se encontró la cotización guardada. Regresando al listado.",
        });
        window.setTimeout(() => navigate("/cotizacion"), 450);
        setHydratingFromStorage(false);
        return;
      }

      setIsProspecto(!!found.prospecto);
      setClienteProspectoNombre(found.prospecto ? String(found.cliente || "") : "");
      setContactoNombre(String(found.contacto || ""));
      setVigenciaIso(String(found.vencimiento || todayIso));
      setIvaPct(clampPct(toNumber(found.iva_pct, 16)));
      setTextoArribaPrecios(String(found.texto_arriba_precios || ""));
      setTerminos(String(found.terminos || ""));

      // Conceptos
      const conceptosList: Concepto[] = Array.isArray(found.conceptos)
        ? found.conceptos.map((c) => ({
          id: uid(),
          producto_id: c.producto_id ?? null,
          producto_nombre: String(c.producto_nombre || ""),
          producto_descripcion: String(c.producto_descripcion || ""),
          unidad: String(c.unidad || ""),
          thumbnail_url: c.thumbnail_url || undefined,
          cantidad: toNumber(c.cantidad, 0),
          precio_lista: toNumber(c.precio_lista, 0),
          descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        }))
        : [];
      setConceptos(conceptosList);

      // If it's not a prospecto, attempt to resolve clienteId by nombre once clients are loaded.
      if (!found.prospecto) {
        const storedClienteId = toNumber((found as any)?.cliente_id, 0);
        if (storedClienteId > 0) setClienteId(storedClienteId);
        else setClienteId("");
      }

      // If it's a prospecto, we can end hydration immediately.
      if (found.prospecto) {
        setHydratingFromStorage(false);
      }
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error",
        message: "No se pudo cargar la cotización guardada.",
      });
      setHydratingFromStorage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCotizacionId]);

  useEffect(() => {
    if (!editingCotizacionId) return;
    if (isProspecto) return;
    if (!clientes.length) return;

    try {
      const raw = localStorage.getItem(COTIZACIONES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list: StoredCotizacion[] = Array.isArray(parsed) ? parsed : [];
      const found = list.find((x) => String(x?.id) === editingCotizacionId);
      if (!found) return;

      const storedClienteId = toNumber((found as any)?.cliente_id, 0);
      if (storedClienteId > 0) {
        setClienteId(storedClienteId);
        setHydratingFromStorage(false);
        return;
      }

      const nombre = String(found.cliente || "").trim();
      if (!nombre) return;
      const n0 = nombre.toLowerCase();
      const match = clientes.find((c) => String(c.nombre || "").trim().toLowerCase() === n0);
      if (match) setClienteId(match.id);
    } catch {
      return;
    } finally {
      setHydratingFromStorage(false);
    }
  }, [editingCotizacionId, clientes, isProspecto]);

  useEffect(() => {
    if (hydratingFromStorage) return;
    if (isProspecto) {
      setClienteId("");
      setContactoNombre("");
      return;
    }
    setClienteProspectoNombre("");
  }, [isProspecto, hydratingFromStorage]);

  useEffect(() => {
    if (hydratingFromStorage) return;
    if (isProspecto) return;
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
  }, [isProspecto, selectedCliente, hydratingFromStorage, editingCotizacionId, contactoNombre]);

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
    if (isProspecto) {
      if (!String(clienteProspectoNombre || "").trim()) missing.push("Cliente (Prospecto)");
    } else {
      if (!clienteId) missing.push("Cliente");
    }
    if (!String(contactoNombre || "").trim()) missing.push("Contacto");
    return { ok: missing.length === 0, missing };
  };

  const resolveClienteNombre = () => {
    if (isProspecto) return String(clienteProspectoNombre || "").trim();
    const c = selectedCliente;
    return String(c?.nombre || "").trim();
  };

  const getCurrentUserDisplayName = () => {
    const candidates = [
      localStorage.getItem("user"),
      sessionStorage.getItem("user"),
      localStorage.getItem("username"),
      sessionStorage.getItem("username"),
      localStorage.getItem("email"),
      sessionStorage.getItem("email"),
    ].filter(Boolean) as string[];

    for (const raw of candidates) {
      const s = String(raw || "").trim();
      if (!s) continue;
      try {
        const parsed = JSON.parse(s);
        const first = String(parsed?.first_name || parsed?.user?.first_name || "").trim();
        const last = String(parsed?.last_name || parsed?.user?.last_name || "").trim();
        const full = `${first} ${last}`.trim();
        if (full) return full;
        const name =
          parsed?.name ||
          parsed?.nombre ||
          parsed?.username ||
          parsed?.email ||
          parsed?.user?.name ||
          parsed?.user?.nombre ||
          parsed?.user?.username;
        if (name) return String(name);
      } catch {
        if (s.includes("@")) return s;
        if (s.length <= 80) return s;
      }
    }
    return "—";
  };

  const handleSaveCotizacion = () => {
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

    let list: StoredCotizacion[] = [];
    try {
      const raw = localStorage.getItem(COTIZACIONES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      list = Array.isArray(parsed) ? (parsed as StoredCotizacion[]) : [];
    } catch {
      list = [];
    }

    const existing = editingCotizacionId
      ? list.find((x) => String(x?.id) === String(editingCotizacionId))
      : undefined;

    const nextFolioNum =
      (list
        .map((x) => Number(String((x as any)?.folio || "").replace(/[^0-9]/g, "")))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => b - a)[0] || 0) + 1;

    const createdBy = existing?.creadaPor ? String(existing.creadaPor) : getCurrentUserDisplayName();

    const record: StoredCotizacion = {
      id: existing?.id ? String(existing.id) : uid(),
      folio: existing?.folio ? String(existing.folio) : String(nextFolioNum),
      fecha: existing?.fecha ? String(existing.fecha) : nowIso,
      vencimiento: venc,
      creadaPor: createdBy,
      cliente_id: isProspecto ? null : (clienteId ? Number(clienteId) : null),
      cliente: clienteNombre || "—",
      contacto: contacto || "—",
      prospecto: !!isProspecto,
      subtotal: toNumber(computed.subtotal, 0),
      iva_pct: clampPct(toNumber(ivaPct, 16)),
      iva: toNumber(computed.iva, 0),
      total: toNumber(computed.total, 0),
      conceptos: computed.lines.map((c) => ({
        producto_id: c.producto_id,
        producto_nombre: c.producto_nombre,
        producto_descripcion: c.producto_descripcion,
        unidad: c.unidad,
        thumbnail_url: c.thumbnail_url,
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
      })),
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
    };

    const nextList = existing
      ? [record, ...list.filter((x) => String(x?.id) !== String(record.id))]
      : [record, ...list];
    localStorage.setItem(COTIZACIONES_STORAGE_KEY, JSON.stringify(nextList));

    setAlert({
      show: true,
      variant: "success",
      title: existing ? "Cotización actualizada" : "Cotización guardada",
      message: `Folio #${record.folio} guardado correctamente.`,
    });

    window.setTimeout(() => {
      navigate("/cotizacion");
    }, 350);
  };

  const canAddConcepto = useMemo(() => {
    const v = validateClienteContacto();
    const qtyOk = toNumber(cantidad, 0) > 0;
    const prodOk = !!productoId;
    return v.ok && qtyOk && prodOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProspecto, clienteId, clienteProspectoNombre, contactoNombre, cantidad, productoId]);

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
    setIsProspecto(false);
    setClienteId("");
    setClienteProspectoNombre("");
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
              <div className="flex items-center gap-2">
                <input
                  id="prospecto"
                  type="checkbox"
                  checked={isProspecto}
                  onChange={(e) => setIsProspecto(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="prospecto" className="text-sm text-gray-800 dark:text-gray-200">
                  Prospecto (Cliente no registrado)
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  {!isProspecto ? (
                    <select
                      value={clienteId ? String(clienteId) : ""}
                      onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : "")}
                      className={selectLikeClassName}
                      disabled={loadingClientes}
                    >
                      <option value="">Selecciona un cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={clienteProspectoNombre}
                      onChange={(e) => setClienteProspectoNombre(e.target.value)}
                      placeholder="Nombre del prospecto"
                    />
                  )}
                </div>

                <div>
                  <Label>Contacto</Label>
                  <input
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    placeholder="Nombre de la persona"
                    list={!isProspecto ? "contactos-datalist" : undefined}
                    className={inputLikeClassName}
                  />
                  {!isProspecto && (
                    <datalist id="contactos-datalist">
                      {contactosOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  )}
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
    </div>
  );
}
