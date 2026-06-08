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
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { PencilIcon, TrashBinIcon } from "@/icons";
import {
  fetchSyscomProductosSugerencia,
  fetchSyscomTipoCambio,
  getProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";
import { CotizacionSaveStatus } from "@/components/cotizacion/CotizacionSaveStatus";
import { erpPageCanvasClass, erpPageInnerClass } from "@/layout/erpPageStyles";
import type {
  ApiCotizacion,
  CatalogoConcepto,
  Cliente,
  Concepto,
  ProductoManualCatalogo,
  SyscomPopPos,
} from "./cotizacionFormTypes";
import {
  cardShellClass,
  cardShellMutedClass,
  claudeBodyClass,
  claudeHeroHeadingClass,
  cloneModalPanelClass,
  cloneModalSearchInputClass,
  inputFieldInsetClass,
  inputLikeClassName,
  labelPageClass,
  textareaLikeClassName,
} from "./cotizacionFormStyles";
import {
  clampPct,
  formatCotizacionApiError,
  formatMoney,
  getSyscomPrecioListaMxnConIva,
  MAX_COTIZ_CLIENTE_LEN,
  MAX_COTIZ_PRODUCTO_NOMBRE_LEN,
  MAX_COTIZ_THUMB_URL_LEN,
  normalizeTipoTrabajoIds,
  round2,
  IVA_MX,
  toNumber,
  truncateStr,
  uid,
} from "./cotizacionFormUtils";

export default function NuevaCotizacionPage() {
  const { permissions } = useAuth();
  const canCotizacionesView = permissions?.cotizaciones?.view === true;
  const canCotizacionesCreate = permissions?.cotizaciones?.create === true;

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
  const [contactoTelefono, setContactoTelefono] = useState("");

  const [cantidad, setCantidad] = useState<number>(1);
  const [conceptoNombre, setConceptoNombre] = useState("");
  const [productoSearch, setProductoSearch] = useState("");
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
  const [conceptoOpen, setConceptoOpen] = useState(false);
  const [conceptoSearch, setConceptoSearch] = useState("");
  const [catalogoConceptos, setCatalogoConceptos] = useState<CatalogoConcepto[]>([]);
  const [catalogoManualProductos, setCatalogoManualProductos] = useState<ProductoManualCatalogo[]>([]);
  const [loadingCatalogoConceptos, setLoadingCatalogoConceptos] = useState(false);
  const [catalogoConceptosError, setCatalogoConceptosError] = useState("");
  const [catalogoManualError, setCatalogoManualError] = useState("");

  const syscomInputWrapRef = useRef<HTMLDivElement>(null);
  const syscomPopRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
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
    "- El anticipo o liquidación no es reembolsable en caso de cancelación.\n" +
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
      { value: 'CLIENTE', label: 'Cliente' },
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
  const [medioContactoTouched, setMedioContactoTouched] = useState(false);
  const [status, setStatus] = useState<string>('PENDIENTE');

  const [servicios, setServicios] = useState<{ id: number; nombre: string }[]>([]);
  const [tipoTrabajo, setTipoTrabajo] = useState<number[]>([]);
  const [tipoTrabajoOpen, setTipoTrabajoOpen] = useState(false);
  const tipoTrabajoRef = useRef<HTMLDivElement>(null);
  const lastAutosaveSnapshotRef = useRef<string | null>(null);
  const upsertCotizacionRef = useRef<
    (opts?: {
      navigateAfterSave?: boolean;
      validateRequired?: boolean;
      silent?: boolean;
      autosave?: boolean;
    }) => Promise<string | null>
  >(() => Promise.resolve(null));

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((c) => c.id === clienteId) || null;
  }, [clientes, clienteId]);

  const tipoTrabajoIds = useMemo(() => normalizeTipoTrabajoIds(tipoTrabajo), [tipoTrabajo]);

  const tipoTrabajoAutosaveKey = useMemo(
    () => [...tipoTrabajoIds].sort((a, b) => a - b).join(","),
    [tipoTrabajoIds]
  );

  const conceptosAutosaveKey = useMemo(
    () =>
      JSON.stringify(
        conceptos.map((c, i) => ({
          producto_externo_id: c.producto_externo_id,
          producto_nombre: c.producto_nombre,
          producto_descripcion: c.producto_descripcion,
          unidad: c.unidad,
          thumbnail_url: c.thumbnail_url,
          cantidad: c.cantidad,
          precio_lista: c.precio_lista,
          descuento_pct: c.descuento_pct,
          orden: i,
        }))
      ),
    [conceptos]
  );

  const tipoTrabajoDisplay = useMemo(() => {
    if (tipoTrabajoIds.length === 0) return "";
    const names = tipoTrabajoIds
      .map((id) => servicios.find((s) => s.id === id)?.nombre)
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) return `${tipoTrabajoIds.length} seleccionados`;
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(", ");
    return `${tipoTrabajoIds.length} servicios seleccionados`;
  }, [tipoTrabajoIds, servicios]);

  useEffect(() => {
    if (!tipoTrabajoOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (tipoTrabajoRef.current && !tipoTrabajoRef.current.contains(event.target as Node)) {
        setTipoTrabajoOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [tipoTrabajoOpen]);

  useEffect(() => {
    if (!conceptoOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (conceptoRef.current && !conceptoRef.current.contains(event.target as Node)) {
        setConceptoOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [conceptoOpen]);

  const effectiveDescuentoClientePct = useMemo(() => {
    const hasManualConceptLines = conceptos.some((c) => String(c.producto_externo_id || "").trim() === "");
    const hasProductLines = conceptos.some((c) => String(c.producto_externo_id || "").trim() !== "");
    const base = clampPct(toNumber(descuentoClientePct, 0));
    return hasManualConceptLines && !hasProductLines ? 0 : base;
  }, [conceptos, descuentoClientePct]);

  const isProductoConPrecioSyscom = useCallback(
    (productoExternoId?: string) => {
      const id = String(productoExternoId || "").trim().toLowerCase();
      return id !== "" && !id.startsWith("manual:");
    },
    []
  );

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
    const usarPrecioSyscom = !!selectedSyscomProducto;
    const puBase = usarPrecioSyscom ? pl / IVA_MX : pl;
    const puConDescuento = puBase * (1 - desc / 100);
    const importe = qty * puConDescuento;
    return { qty, pl, desc, puBase, importe };
  }, [cantidad, precioLista, descuentoPct, selectedSyscomProducto]);

  const fetchClientes = async (search = "") => {
    if (!canCotizacionesView) return;
    setLoadingClientes(true);
    try {
      const query = new URLSearchParams({
        search: search.trim(),
        page_size: '20',
      });
      const res = await fetchApi(`/api/clientes/?${query.toString()}`);
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

  const telefonoPrincipalDeCliente = (cliente: Cliente) => {
    const principal = (cliente.contactos || []).find((x) => x.is_principal);
    const first = (cliente.contactos || [])[0];
    return String(principal?.celular || first?.celular || cliente.telefono || "").trim();
  };

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      setClienteId(cliente.id);
      setClienteSearch(String(cliente.nombre || "").trim());

      const desc = clampPct(toNumber((cliente as any)?.descuento_pct, 0));
      setDescuentoClientePct(desc);
      setDescuentoClienteTouched(false);
      setContactoNombre(contactoPrincipalDeCliente(cliente));
      setContactoTelefono(telefonoPrincipalDeCliente(cliente));
      setMedioContacto("CLIENTE");
      setMedioContactoTouched(false);
    } else {
      setClienteId("");
      setClienteSearch("");

      setDescuentoClientePct(0);
      setDescuentoClienteTouched(false);
      setContactoNombre("");
      setContactoTelefono("");
      setMedioContacto("");
      setMedioContactoTouched(false);
    }
    setClienteOpen(false);
  };

  const filteredClientes = clientes;

  const hydrateFormFromCotizacionDetail = useCallback(
    async (data: ApiCotizacion, opts: { updateIdxBadge: boolean }) => {
      if (opts.updateIdxBadge) {
        setEditingCotizacionIdx(Number.isFinite(Number(data.idx)) ? Number(data.idx) : null);
      }

      setClienteId(data.cliente_id ? Number(data.cliente_id) : "");
      const nombreDesdeApi = String(data.cliente_nombre || data.cliente || "").trim();
      setClienteSearch(nombreDesdeApi);
      setContactoNombre(String(data.contacto || ""));
      setContactoTelefono(String((data as any)?.contacto_telefono || ""));
      setMedioContacto(String((data as any)?.medio_contacto || ""));
      setTipoTrabajo(normalizeTipoTrabajoIds(data.tipo_trabajo));
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
          const cr = await fetchApi(`/api/clientes/${cid}/`);
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
    let cancelled = false;
    const createDraft = async () => {
      try {
        const res = await fetchApi("/api/cotizaciones/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cliente_id: null,
            cliente: "",
            prospecto: false,
            contacto: "",
            contacto_telefono: "",
            medio_contacto: String(medioContacto || ""),
            tipo_trabajo: [],
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

    const load = async () => {
      try {
        const res = await fetchApi(`/api/cotizaciones/${editingCotizacionId}/`);
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

        await hydrateFormFromCotizacionDetail(data, { updateIdxBadge: true });
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
        const res = await fetchApi(`/api/cotizaciones/?${params.toString()}`);
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
    setClonePickingId(id);
    setHydratingFromStorage(true);
    try {
      const res = await fetchApi(`/api/cotizaciones/${id}/`);
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
      await hydrateFormFromCotizacionDetail(data, { updateIdxBadge: false });
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
      if (!editingCotizacionId) {
        setContactoNombre("");
        setContactoTelefono("");
        setMedioContacto("");
        setMedioContactoTouched(false);
      }
      return;
    }

    if (String(contactoNombre || "").trim()) return;

    const principal = (selectedCliente.contactos || []).find((x) => x.is_principal);
    const first = (selectedCliente.contactos || [])[0];
    const next = (principal?.nombre_apellido || first?.nombre_apellido || "").trim();
    setContactoNombre(next);
  }, [selectedCliente, hydratingFromStorage, editingCotizacionId, contactoNombre]);

  useEffect(() => {
    if (hydratingFromStorage || !selectedCliente) return;
    const name = String(contactoNombre || "").trim().toLowerCase();
    if (!name) return;
    const match = (selectedCliente.contactos || []).find(
      (c) => String(c.nombre_apellido || "").trim().toLowerCase() === name
    );
    if (!match) return;
    const phone = String(match.celular || "").trim();
    if (phone) setContactoTelefono(phone);
  }, [selectedCliente, contactoNombre, hydratingFromStorage]);

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
    if (!productoSearch.trim()) {
      setUnidad("");
      setPrecioLista(0);
      setSyscomProductos([]);
      setSyscomOpen(false);
    }
  }, [productoSearch]);

  useEffect(() => {
    fetchSyscomTipoCambio()
      .then((tc) => setSyscomTipoCambio(tc))
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    const q = productoSearch.trim();
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
    const runGen = ++syscomSearchGenRef.current;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSyscom(true);
      setSyscomError("");
      try {
        // Incluye variantes de búsqueda si el modelo trae `/` (p. ej. ICOM IC-M424G/41).
        const { ok, productos } = await fetchSyscomProductosSugerencia(q, { signal: ac.signal });
        if (runGen !== syscomSearchGenRef.current) return;
        if (!ok && productos.length === 0) {
          setSyscomProductos([]);
          setSyscomError("No se pudo consultar SYSCOM en este momento.");
          return;
        }
        setSyscomProductos(productos);
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
  }, [productoSearch, selectedSyscomProducto, selectedCatalogoConcepto, selectedManualProducto]);

  useEffect(() => {
    if (!canCotizacionesView) {
      setCatalogoConceptos([]);
      setCatalogoConceptosError("");
      return;
    }
    const loadCatalogoConceptos = async () => {
      setLoadingCatalogoConceptos(true);
      setCatalogoConceptosError("");
      try {
        const res = await fetchApi("/api/conceptos/?ordering=folio");
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
    const loadManualProductos = async () => {
      setCatalogoManualError("");
      try {
        const res = await fetchApi("/api/productos-manuales/?ordering=-fecha_creacion&page_size=500");
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

  useEffect(() => {
    const loadServicios = async () => {
      try {
        const res = await fetchApi("/api/servicios/?page_size=500&ordering=idx");
        const data = await res.json().catch(() => ({ results: [] }));
        if (!res.ok) return;
        const list = Array.isArray((data as any)?.results)
          ? (data as any).results
          : Array.isArray(data) ? data : [];
        setServicios(
          list
            .filter((s: any) => s.activo !== false)
            .map((s: any) => ({ id: Number(s.id), nombre: String(s.nombre || "") }))
        );
      } catch {
        // ignore
      }
    };
    loadServicios();
  }, []);

  const selectSyscomProducto = (p: SyscomProducto) => {
    setSelectedSyscomProducto(p);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setConceptoNombre("");
    // No sobreescribir el concepto: el usuario lo captura manualmente.
    setProductoSearch(String(p.titulo || p.modelo || ""));
    setConceptoDescripcion(String([p.marca, p.modelo].filter(Boolean).join(" · ") || p.titulo || ""));
    setCantidad((q) => (toNumber(q, 0) > 0 ? q : 1));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)));
    setSyscomOpen(false);
  };

  const filteredCatalogoConceptos = useMemo(() => {
    const q = productoSearch.trim().toLowerCase();
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
  }, [catalogoConceptos, productoSearch]);

  const selectCatalogoConcepto = (c: CatalogoConcepto) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(c);
    setSelectedManualProducto(null);
    setConceptoNombre(String(c.concepto || ""));
    setProductoSearch(String(c.concepto || ""));
    setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : `Folio: ${c.folio}`));
    setCantidad((q) => (toNumber(q, 0) > 0 ? q : 1));
    setUnidad((u) => (u.trim() ? u : "SERV"));
    setPrecioLista(Math.max(0, toNumber(c.precio1, 0)));
    setSyscomOpen(false);
  };

  const filteredManualProductos = useMemo(() => {
    const q = productoSearch.trim().toLowerCase();
    if (!q) return [];
    return catalogoManualProductos
      .filter((p) =>
        p.producto.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.modelo.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
      .slice(0, 8);
  }, [catalogoManualProductos, productoSearch]);

  const selectManualProducto = (p: ProductoManualCatalogo) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(p);
    setConceptoNombre("");
    setProductoSearch(String(p.producto || ""));
    setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : [p.marca, p.modelo].filter(Boolean).join(" · ")));
    setCantidad((q) => (toNumber(q, 0) > 0 ? q : 1));
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
        productoSearch.trim().length >= 2),
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
      productoSearch,
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
    if (!String(medioContacto || "").trim()) missing.push("Medio de Contacto");
    return { ok: missing.length === 0, missing };
  };

  const medioContactoInvalid = medioContactoTouched && !String(medioContacto || "").trim();

  const resolveClienteNombre = () => {
    const fromList = String(selectedCliente?.nombre || "").trim();
    if (fromList) return fromList;
    return String(clienteSearch || "").trim();
  };

  const buildCotizacionPayload = useCallback(() => {
    const nowIso = todayIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();
    const contactoTelefonoValue = String(contactoTelefono || "").trim();
    const lines = conceptos.map((c) => ({ ...c }));
    const subtotalLineasConIva = lines.reduce((acc, c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const precioBase = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      const esSoloConceptoManual = String(c.producto_externo_id || "").trim() === "";
      const precioConIva = esSoloConceptoManual ? (precioBase * IVA_MX) : precioBase;
      return acc + toNumber(c.cantidad, 0) * precioConIva;
    }, 0);
    const descClientePct = clampPct(toNumber(effectiveDescuentoClientePct, 0));
    const descuentoCliente = subtotalLineasConIva * (descClientePct / 100);
    const totalConIva = Math.max(0, subtotalLineasConIva - descuentoCliente);
    const subtotal = round2(totalConIva);
    const total = round2(totalConIva);
    return {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: truncateStr(clienteNombre, MAX_COTIZ_CLIENTE_LEN),
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      contacto_telefono: contactoTelefonoValue || "",
      medio_contacto: String(medioContacto || ""),
      tipo_trabajo: tipoTrabajoIds,
      status: String(status || "PENDIENTE"),
      fecha: nowIso,
      subtotal,
      descuento_cliente_pct: descClientePct,
      iva_pct: 0,
      iva: 0,
      total,
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
    contactoTelefono,
    medioContacto,
    tipoTrabajoIds,
    status,
    conceptos,
    effectiveDescuentoClientePct,
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
    const canView = permissions?.cotizaciones?.view === true;
    const canCreate = permissions?.cotizaciones?.create === true;
    const canEdit = permissions?.cotizaciones?.edit === true;
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
        if (!String(medioContacto || "").trim()) {
          setMedioContactoTouched(true);
        }
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

    const payload: any = buildCotizacionPayload();

    if (
      autosave &&
      clienteId &&
      String(contactoNombre || "").trim() &&
      !String(medioContacto || "").trim()
    ) {
      return null;
    }

    if (autosave) {
      const snapshot = JSON.stringify({
        ...payload,
        tipo_trabajo: [...(payload.tipo_trabajo || [])].sort((a: number, b: number) => a - b),
      });
      if (lastAutosaveSnapshotRef.current === snapshot) {
        return targetId || null;
      }
      lastAutosaveSnapshotRef.current = snapshot;
    }

    try {
      if (autosave) setIsAutoSaving(true);
      const isEdit = !!targetId;
      const res = await fetchApi(isEdit ? `/api/cotizaciones/${targetId}/` : "/api/cotizaciones/", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (autosave) {
          lastAutosaveSnapshotRef.current = null;
        }
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
      if (!autosave && data && "tipo_trabajo" in data) {
        setTipoTrabajo(normalizeTipoTrabajoIds((data as ApiCotizacion).tipo_trabajo));
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
      if (autosave) {
        lastAutosaveSnapshotRef.current = null;
      }
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
    permissions,
    clienteId,
    contactoNombre,
    medioContacto,
  ]);

  upsertCotizacionRef.current = upsertCotizacion;

  const handleSaveCotizacion = async (navigateAfterSave = true): Promise<string | null> =>
    upsertCotizacion({ navigateAfterSave, validateRequired: true, silent: false, autosave: false });

  useEffect(() => {
    const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
    if (!targetId || hydratingFromStorage) return;

    const timer = window.setTimeout(() => {
      void upsertCotizacionRef.current({
        navigateAfterSave: false,
        validateRequired: false,
        silent: true,
        autosave: true,
      });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    editingCotizacionId,
    activeCotizacionId,
    hydratingFromStorage,
    clienteId,
    contactoNombre,
    medioContacto,
    tipoTrabajoAutosaveKey,
    status,
    descuentoClientePct,
    conceptosAutosaveKey,
    textoArribaPrecios,
    terminos,
  ]);

  useEffect(() => {
    lastAutosaveSnapshotRef.current = null;
  }, [editingCotizacionId, activeCotizacionId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
      if (!targetId) return;
      try {
        void fetchApi(`/api/cotizaciones/${targetId}/`, {
          method: "PUT",
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

  const editingConceptoActual = useMemo(
    () => (editingConceptoId ? conceptos.find((x) => x.id === editingConceptoId) || null : null),
    [conceptos, editingConceptoId]
  );
  const hasProductoSeleccionado = !!selectedSyscomProducto || !!selectedManualProducto || !!selectedCatalogoConcepto;
  const bloquearConceptoInput = hasProductoSeleccionado || String(productoSearch || "").trim().length > 0;
  const bloquearProductoInput = String(conceptoNombre || "").trim().length > 0;
  const nombreConceptoResuelto = String(
    conceptoNombre ||
      selectedCatalogoConcepto?.concepto ||
      selectedManualProducto?.producto ||
      selectedSyscomProducto?.titulo ||
      selectedSyscomProducto?.modelo ||
      (editingConceptoActual?.producto_externo_id ? productoSearch : "") ||
      ""
  ).trim();

  const canAddConcepto = useMemo(() => {
    const v = validateClienteContacto();
    const qtyOk = toNumber(cantidad, 0) > 0;
    const nameOk = nombreConceptoResuelto !== "";
    const priceOk = toNumber(precioLista, 0) >= 0;
    return v.ok && qtyOk && nameOk && priceOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clienteId,
    contactoNombre,
    medioContacto,
    cantidad,
    nombreConceptoResuelto,
    precioLista,
  ]);

  const clearConceptoForm = () => {
    setEditingConceptoId(null);
    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
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
    setConceptoOpen(false);
    setConceptoSearch("");
  };

  const handleConceptoInputChange = (nextConcepto: string) => {
    setConceptoNombre(nextConcepto);
    setConceptoSearch(nextConcepto);
    if (toNumber(cantidad, 0) <= 0) {
      setCantidad(1);
    }
    if (nextConcepto.trim().length > 0) {
      setProductoSearch("");
      setSyscomOpen(false);
    }
    setSelectedSyscomProducto(null);
    setSelectedManualProducto(null);
    const match = catalogoConceptos.find(
      (c) => String(c.concepto || "").trim().toLowerCase() === nextConcepto.trim().toLowerCase()
    );
    if (match) {
      setSelectedCatalogoConcepto(match);
      if (toNumber(precioLista, 0) <= 0) {
        setPrecioLista(Math.max(0, toNumber(match.precio1, 0)));
      }
      setUnidad((u) => (u.trim() ? u : "SERV"));
    } else {
      setSelectedCatalogoConcepto(null);
    }
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
    const precioCatalogo = Math.max(0, toNumber(selectedCatalogoConcepto?.precio1, 0));
    const precioLinea = pl > 0 ? pl : precioCatalogo;
    const desc = clampPct(toNumber(descuentoPct, 0));
    const nombre = nombreConceptoResuelto;
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
              precio_lista: precioLinea,
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
          precio_lista: precioLinea,
          descuento_pct: desc,
        },
      ]);
    }

    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
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
    const productoExternoId = String(c.producto_externo_id || "").trim();
    const esLineaDeProducto = productoExternoId !== "";
    setEditingConceptoId(id);
    setCantidad(toNumber(c.cantidad, 1));
    setConceptoNombre(String(c.producto_nombre || ""));
    setProductoSearch(esLineaDeProducto ? String(c.producto_nombre || "") : "");
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
      const precioBase = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      const pu = isProductoConPrecioSyscom(c.producto_externo_id) ? precioBase / IVA_MX : precioBase;
      const importe = toNumber(c.cantidad, 0) * pu;
      return { ...c, pu, importe };
    });

    const subtotalLineasSinIva = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    /** Suma con IVA (precio Syscom); el descuento cliente se aplica sobre este monto (igual que el serializer). */
    const subtotalLineasConIva = conceptos.reduce((acc, c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const precioBase = toNumber(c.precio_lista, 0) * (1 - descuento / 100);
      const esSoloConceptoManual = String(c.producto_externo_id || "").trim() === "";
      const precioConIva = esSoloConceptoManual ? (precioBase * IVA_MX) : precioBase;
      return acc + toNumber(c.cantidad, 0) * precioConIva;
    }, 0);

    const descClientePct = clampPct(toNumber(effectiveDescuentoClientePct, 0));
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
  }, [conceptos, effectiveDescuentoClientePct, isProductoConPrecioSyscom]);

  /** Cliente, contacto y al menos un concepto (misma regla que validateClienteContacto + líneas) */
  const canGuardarCotizacion = useMemo(() => {
    if (!clienteId) return false;
    if (!String(contactoNombre || "").trim()) return false;
    if (!medioContacto) return false;
    if (!computed.lines.length) return false;
    return true;
  }, [clienteId, contactoNombre, medioContacto, computed.lines.length]);

  const resetAll = () => {
    setClienteId("");
    setClienteSearch("");
    setClienteOpen(false);
    setDebouncedClienteSearch("");
    setContactoNombre("");
    setContactoTelefono("");

    setMedioContacto('');
    setMedioContactoTouched(false);
    setTipoTrabajo([]);
    setStatus('PENDIENTE');

    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
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
      "- El anticipo o liquidación no es reembolsable en caso de cancelación.\n" +
      "- La aceptación de la cotización implica conformidad con estos términos."
    );
  };

  const handlePreviewPdf = async () => {
    if (previewLoading || excelLoading) return;

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
    const contactoTelefonoValue = String(contactoTelefono || "").trim();

    const payload: any = {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: clienteNombre || "",
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      contacto_telefono: contactoTelefonoValue || "",
      medio_contacto: String(medioContacto || ''),
      tipo_trabajo: tipoTrabajoIds,
      status: String(status || 'PENDIENTE'),
      fecha: nowIso,
      subtotal: round2(toNumber(computed.subtotal, 0)),
      descuento_cliente_pct: clampPct(toNumber(effectiveDescuentoClientePct, 0)),
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
      const resp = await fetchApi(`/api/cotizaciones/${cotizacionPk}/excel/`);

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
    <div className={erpPageCanvasClass}>
      <div className={erpPageInnerClass}>
        <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />

        <Modal isOpen={exportBusy} onClose={() => { }} showCloseButton={false} className="max-w-md mx-4 sm:mx-auto">
          <div className="p-7 sm:p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="relative flex items-center justify-center w-[76px] h-[76px] rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50 dark:bg-[#111827]/80">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#0f172a] border border-[#f1e8db] dark:border-[#273244] dark:border-white/5">
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ff801f] dark:border-t-[#ffa057] animate-spin" />
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
                          className="w-8 h-8 text-[#ea580c] dark:text-[#ffa057]"
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

              <h3 className="text-base font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-lg">
                {excelLoading ? "Generando Excel" : "Generando vista previa"}
              </h3>
              <p className="mt-1.5 text-xs text-[#78716c] dark:text-[#8ea0b8] sm:text-sm">
                Esto puede tardar unos segundos. No cierres esta ventana.
              </p>

              <div className="mt-6 w-full">
                <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#8ea0b8]">
                  <span>Progreso</span>
                  <span className="tabular-nums font-medium">{Math.min(99, Math.max(0, Math.round(loadingProgress)))}%</span>
                </div>
                <div className="mt-2 w-full rounded-full h-2 overflow-hidden bg-gray-100 dark:bg-[#0f172a]/80 border border-gray-200/60 dark:border-white/[0.06]">
                  <div
                    className="h-full bg-[#ff801f] dark:bg-[#ff801f] transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
                  />
                </div>
                <div className="mt-3 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
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
          className="mx-4 flex max-h-[min(90vh,640px)] w-[min(96vw,30rem)] flex-col overflow-hidden rounded-3xl border border-gray-200/80 p-0 shadow-[0_24px_54px_-20px_rgba(15,23,42,0.35)] dark:border-white/[0.08] dark:bg-[#111827] dark:shadow-[0_24px_54px_-18px_rgba(0,0,0,0.55)] sm:mx-auto sm:max-w-xl"
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fffdfa] px-5 py-5 pr-12 dark:border-[#273244] dark:bg-[#111827]/80 sm:px-6 sm:pr-14">
              <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]/85 dark:bg-[#ff801f]/80" aria-hidden />
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#ff801f]/15 bg-white text-[#ea580c] shadow-sm dark:border-[#ffa057]/20 dark:bg-[#111827]/70 dark:text-[#ffa057]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                    <path d="M16 3h2a2 2 0 0 1 2 2v2M8 3H6a2 2 0 0 0-2 2v2" strokeLinecap="round" />
                    <path d="M8 21h8M12 17v4M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="3" y="7" width="18" height="10" rx="2" strokeLinejoin="round" />
                    <path d="M7 11h2M11 11h2M15 11h.01" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff801f]/80 dark:text-[#ffa057]/80 sm:text-[11px]">Cotización</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc]">Clonar desde existente</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
                    Busque por <span className="font-medium text-gray-800 dark:text-[#e5e7eb]">cliente</span> o{" "}
                    <span className="font-medium text-gray-800 dark:text-[#e5e7eb]">folio</span>. Al elegir una fila se copian cliente, contacto,
                    descuentos, conceptos y textos al borrador actual.
                  </p>
                </div>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-gray-50/45 px-5 py-5 dark:bg-[#0f172a]/60 sm:px-6">
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
                  {cloneSearch.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCloneSearch("")}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
                      aria-label="Limpiar búsqueda"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-gray-200/90 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">Tip: usa #folio exacto</span>
                  <span className="rounded-full border border-gray-200/90 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">Tip: busca por cliente parcial</span>
                </div>
              </section>

              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Resultados</span>
                  {!cloneListLoading && cloneSearchDebounced.length >= 1 && cloneRows.length > 0 && (
                    <span className="tabular-nums text-[11px] font-medium text-gray-400 dark:text-gray-500">{cloneRows.length}</span>
                  )}
                </div>
                <div className="relative min-h-[12rem] flex-1 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/75 dark:border-white/[0.08] dark:bg-[#111827]/45">
                  <div className="custom-scrollbar max-h-[min(48vh,320px)] overflow-y-auto overscroll-contain sm:max-h-[min(50vh,340px)]">
                    {cloneListLoading && (
                      <div className="flex flex-col items-center justify-center gap-3 px-4 py-14">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#ff801f] dark:border-gray-700 dark:border-t-[#ffa057]" />
                        <p className="text-sm text-[#78716c] dark:text-[#8ea0b8]">Buscando cotizaciones…</p>
                      </div>
                    )}
                    {!cloneListLoading && cloneSearchDebounced.length < 1 && (
                      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200/80 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-[#0f172a] dark:text-gray-500">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                            <path d="M12 19V5M5 12h14" strokeLinecap="round" />
                          </svg>
                        </span>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Empiece a escribir</p>
                        <p className="max-w-[240px] text-xs leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
                          Escriba al menos un carácter para buscar en el directorio de cotizaciones.
                        </p>
                      </div>
                    )}
                    {!cloneListLoading && cloneSearchDebounced.length >= 1 && cloneRows.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200/80 bg-gray-50 text-gray-400 dark:border-white/[0.08] dark:bg-[#0f172a] dark:text-gray-500">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3-3M8 11h6" strokeLinecap="round" />
                          </svg>
                        </span>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin coincidencias</p>
                        <p className="max-w-[260px] text-xs text-[#78716c] dark:text-[#8ea0b8]">Pruebe otro folio o parte del nombre del cliente.</p>
                      </div>
                    )}
                    {!cloneListLoading && cloneRows.length > 0 && (
                      <ul className="space-y-2.5 p-3 sm:p-3.5">
                        {cloneRows.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              disabled={clonePickingId != null}
                              onClick={() => void handleClonePick(row.id)}
                              className="flex w-full flex-col gap-2 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/60 p-3.5 text-left shadow-sm transition-all hover:-translate-y-[1px] hover:border-[#ff801f]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:from-gray-900/70 dark:to-gray-900/40 dark:hover:border-[#ff801f]/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff801f]/20 bg-[#fff7ed]/80 text-sm font-bold tabular-nums text-[#9a3412] dark:border-[#ff801f]/25 dark:bg-[#ff801f]/15 dark:text-[#ffa057]">
                                  #{row.idx}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">{row.cliente}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                    {row.contacto && row.contacto !== "—" && <span>Contacto: {row.contacto}</span>}
                                    {row.fecha && (
                                      <span className="tabular-nums text-gray-400 dark:text-gray-500">{formatDMY(row.fecha)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg border border-gray-200/80 bg-gray-50/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-[#e5e7eb]">
                                {formatMoney(row.total)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {clonePickingId != null && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px] dark:bg-[#0f172a]">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md dark:border-white/[0.1] dark:bg-[#111827] dark:text-[#e5e7eb]">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#ff801f] dark:border-gray-600 dark:border-t-[#ffa057]" />
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
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white/98 shadow-2xl shadow-gray-900/20 ring-1 ring-black/[0.06] backdrop-blur-md dark:border-white/[0.12] dark:bg-[#111827]/98 dark:shadow-black/50 dark:ring-white/[0.08]"
            >
              <div className="shrink-0 border-b border-[#f1e8db] dark:border-[#273244]/90 bg-gradient-to-r from-[#fff7ed]/95 to-transparent px-3 py-2 dark:border-white/[0.06] dark:from-[#7c2d12]/50 dark:to-transparent">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9a3412] dark:text-[#ffa057]">Resultados combinados</p>
                <p className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">Conceptos internos, productos manuales y Syscom</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {loadingCatalogoConceptos && (
                  <div className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent" aria-hidden />
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
                  <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs text-[#78716c] dark:text-[#8ea0b8]">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent" aria-hidden />
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
                      className="group mb-1 flex w-full rounded-xl px-2 py-2 text-left transition-colors last:mb-0 hover:bg-[#ff801f]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-gray-900 group-hover:text-[#9a3412] dark:text-[#e5e7eb] dark:group-hover:text-[#ffa057]">
                            {opt.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                            <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-white/[0.08]">
                              {opt.source === "catalogo" ? "Concepto" : opt.source === "manual" ? "Manual" : "Syscom"}
                            </span>
                            {opt.subtitle || "Sin detalle"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-[#ff801f]/10 px-2 py-1 text-xs font-semibold tabular-nums text-[#ea580c] dark:bg-[#ff801f]/15 dark:text-[#ffa057]">
                          {formatMoney(opt.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                {!loadingSyscom && !loadingCatalogoConceptos && !syscomError && !catalogoConceptosError && !catalogoManualError && combinedConceptoOptions.length === 0 && productoSearch.trim().length >= 2 && (
                  <div className="rounded-lg px-3 py-4 text-center text-xs text-[#78716c] dark:text-[#8ea0b8]">Sin resultados en catálogos</div>
                )}
              </div>
            </div>,
            document.body
          )}

        {alert.show && (
          <div role="alert" aria-live={alert.variant === "error" ? "assertive" : "polite"}>
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        )}

        {!canCotizacionesView ? (
          <div className="rounded-3xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-10 text-center text-sm text-[#57534e] dark:border-[#273244] dark:bg-[#111827]/80 dark:text-[#b7c1d1] sm:px-6">
            No tienes permiso para ver Cotizaciones.
          </div>
        ) : (
          <>

            <nav
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
              aria-label="Migas de pan"
            >
              <Link
                to="/"
                className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
              >
                Inicio
              </Link>
              <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
                /
              </span>
              <Link
                to="/cotizacion"
                className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
              >
                Cotizaciones
              </Link>
              <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
                /
              </span>
              <span className="text-[#44403c] dark:text-[#cbd5e1]">
                {isEditingRoute ? "Editar" : "Nueva"}
              </span>
            </nav>

            <header className={`relative flex flex-col gap-4 ${cardShellClass} p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6`}>
              <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
              <div className="relative z-[1] flex min-w-0 gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
                  <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">Cotización</p>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:mt-1">
                    <h1 className={claudeHeroHeadingClass}>
                      {isEditingRoute ? "Editar cotización" : "Nueva cotización"}
                    </h1>
                    {!!(isEditingRoute || activeCotizacionId) && (
                      <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.12] dark:text-amber-200">
                        {isEditingRoute ? "Edición" : "Borrador"} · #
                        {editingCotizacionIdx != null ? editingCotizacionIdx : (activeCotizacionId || editingCotizacionId)}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 max-w-2xl ${claudeBodyClass}`}>
                    {isEditingRoute
                      ? "Ajusta cliente, conceptos y totales; guarda los cambios o revisa el PDF antes de enviar."
                      : "Define el cliente, agrega productos o servicios y revisa el resumen antes de guardar o generar la vista previa. Se guarda automáticamente como borrador."}
                  </p>
                  <CotizacionSaveStatus isAutoSaving={isAutoSaving} lastAutoSavedAt={lastAutoSavedAt} />
                  <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:justify-end sm:pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/cotizacion")}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#e7ded0] bg-white px-4 py-2.5 text-sm font-medium text-[#57534e] shadow-none transition-colors hover:bg-[#fffdf8] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80 sm:w-auto sm:min-h-0"
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

            <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-10">
              <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-9">
                <ComponentCard
                  title="Datos del cliente"
                  desc="Busca por nombre o teléfono y completa contacto, descuento y estado."
                  className={`${cardShellClass.replace(/^overflow-hidden\b/, "overflow-visible")} ${
                    clienteOpen || tipoTrabajoOpen ? "relative z-[200]" : ""
                  }`}
                  compact
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400 sm:text-xs">Cliente</label>
                      <div className={`relative ${clienteOpen ? "z-[100]" : "z-0"}`}>
                        <div className="relative">
                          <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                          <input
                            value={clienteSearch}
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              if (clienteId) setClienteId("");
                              setClienteOpen(true);
                            }}
                            onFocus={() => setClienteOpen(true)}
                            placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente por nombre o teléfono..."}
                            className={`block min-h-[42px] w-full pl-8 pr-20 sm:min-h-[44px] sm:py-2.5 ${inputLikeClassName}`}
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
                            <button type="button" onClick={() => setClienteOpen((o) => !o)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e2d9ca] bg-[#fffdfa] text-[#78716c] transition hover:bg-[#fffdf8] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#8ea0b8] dark:hover:bg-[#1e293b]">
                              <svg className={`w-3.5 h-3.5 transition-transform ${clienteOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                            </button>
                          </div>
                        </div>
                        {clienteOpen && (
                          <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-64 w-full overflow-auto divide-y divide-[#f1e8db] rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl ring-1 ring-black/5 backdrop-blur-sm custom-scrollbar dark:divide-[#273244] dark:border-[#334155] dark:bg-[#111827]/95 dark:ring-white/10">
                            <button type='button' onClick={() => selectCliente(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#ff801f]/10 dark:hover:bg-[#1e293b] dark:text-white ${!clienteId ? 'bg-[#ff801f]/10 dark:bg-[#0f172a]/50 font-medium text-[#ea580c] dark:text-white' : ''}`}>Selecciona cliente</button>
                            {filteredClientes.map(c => (
                              <button key={c.id} type='button' onClick={() => selectCliente(c)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#1e293b] text-gray-700 dark:text-[#e5e7eb] transition'>
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                    {(c.nombre || '?').slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className='flex flex-col flex-1'>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-[12px] font-medium text-gray-800 dark:text-[#e5e7eb]'>{c.nombre || '-'}</span>
                                      {c.is_prospecto && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider">Prospecto</span>
                                      )}
                                    </div>
                                    <span className='text-[11px] text-[#78716c] dark:text-[#8ea0b8]'>{c.telefono || '-'}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {filteredClientes.length === 0 && (
                              <div className='px-3 py-2 text-[11px] text-[#78716c] dark:text-[#8ea0b8]'>Sin resultados</div>
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
                      <Label className={labelPageClass}>Teléfono contacto</Label>
                      <Input
                        className={inputFieldInsetClass}
                        value={contactoTelefono}
                        onChange={(e) => setContactoTelefono(e.target.value)}
                        placeholder="Ej. 3141234567"
                      />
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
                      <Label className={labelPageClass}>
                        Medio de Contacto <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={medioContacto}
                        onChange={(e) => {
                          setMedioContacto(e.target.value);
                          setMedioContactoTouched(true);
                        }}
                        onBlur={() => setMedioContactoTouched(true)}
                        className={`${inputLikeClassName} ${
                          medioContactoInvalid
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400 dark:focus:border-red-400"
                            : ""
                        }`}
                        required
                        aria-invalid={medioContactoInvalid}
                        aria-describedby={medioContactoInvalid ? "medio-contacto-error" : undefined}
                      >
                        <option value="">Selecciona</option>
                        {MEDIO_CONTACTO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {medioContactoInvalid && (
                        <p id="medio-contacto-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Selecciona un medio de contacto.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className={labelPageClass}>Tipo de Trabajo</Label>
                      <div ref={tipoTrabajoRef} className={`relative ${tipoTrabajoOpen ? "z-[100]" : "z-0"}`}>
                        <button
                          type="button"
                          onClick={() => setTipoTrabajoOpen((open) => !open)}
                          disabled={servicios.length === 0}
                          aria-expanded={tipoTrabajoOpen}
                          aria-haspopup="listbox"
                          className={`${inputLikeClassName} flex w-full items-center justify-between gap-2 pr-10 text-left disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate ${
                              tipoTrabajoIds.length === 0 ? "text-[#a8a29e] dark:text-[#8ea0b8]" : "text-[#1c1917] dark:text-[#e5e7eb]"
                            }`}
                          >
                            {servicios.length === 0
                              ? "Cargando servicios…"
                              : tipoTrabajoIds.length === 0
                                ? "Selecciona"
                                : tipoTrabajoDisplay}
                          </span>
                        </button>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#8ea0b8]">
                          <svg
                            className={`h-4 w-4 transition-transform ${tipoTrabajoOpen ? "rotate-180" : ""}`}
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M5.25 7.5 10 12.25 14.75 7.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>

                        {tipoTrabajoOpen && servicios.length > 0 && (
                          <div
                            className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl ring-1 ring-black/5 dark:border-[#334155] dark:bg-[#111827]/95 dark:ring-white/10"
                            role="listbox"
                            aria-label="Servicios disponibles"
                            aria-multiselectable
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#e7ded0] bg-[#fcfaf6]/95 px-3 py-2 dark:border-[#273244] dark:bg-[#0f172a]/90">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                                Servicios
                              </span>
                              <div className="flex items-center gap-2">
                                {tipoTrabajoIds.length > 0 && (
                                  <span className="text-[10px] tabular-nums text-[#9a3412] dark:text-[#fdba74]">
                                    {tipoTrabajoIds.length} sel.
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setTipoTrabajo(servicios.map((s) => s.id))}
                                  className="text-[10px] font-medium text-[#ea580c] hover:text-[#c2410c] dark:text-[#fb923c] dark:hover:text-[#fdba74]"
                                >
                                  Todos
                                </button>
                                <span className="text-[#d6d3d1] dark:text-[#475569]" aria-hidden>
                                  ·
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTipoTrabajo([])}
                                  className="text-[10px] font-medium text-[#78716c] hover:text-[#57534e] dark:text-[#8ea0b8] dark:hover:text-[#cbd5e1]"
                                >
                                  Ninguno
                                </button>
                              </div>
                            </div>

                            <ul className="max-h-52 divide-y divide-[#e7ded0]/90 overflow-y-auto custom-scrollbar dark:divide-[#273244] sm:max-h-56">
                              {servicios.map((s) => {
                                const checked = tipoTrabajoIds.includes(s.id);
                                return (
                                  <li key={s.id} role="option" aria-selected={checked}>
                                    <label
                                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors sm:px-4 sm:py-3 ${
                                        checked
                                          ? "bg-[#fff3e8]/90 dark:bg-[#ff801f]/10"
                                          : "hover:bg-[#ff801f]/[0.04] dark:hover:bg-white/[0.03]"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setTipoTrabajo((prev) => {
                                            const next = new Set(normalizeTipoTrabajoIds(prev));
                                            if (next.has(s.id)) next.delete(s.id);
                                            else next.add(s.id);
                                            return Array.from(next);
                                          });
                                        }}
                                        className="sr-only"
                                      />
                                      <span
                                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                          checked
                                            ? "border-[#ff801f] bg-[#ff801f] text-[#0f172a] dark:border-[#fb923c] dark:bg-[#fb923c] dark:text-[#0f172a]"
                                            : "border-[#d6d3d1] bg-white dark:border-[#475569] dark:bg-[#111a2b]"
                                        }`}
                                        aria-hidden
                                      >
                                        {checked ? (
                                          <svg
                                            className="h-2.5 w-2.5"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <path d="M2.5 6.5 5 9.5 9.5 2.5" />
                                          </svg>
                                        ) : null}
                                      </span>
                                      <span
                                        className={`min-w-0 flex-1 text-sm leading-snug ${
                                          checked
                                            ? "font-medium text-[#1c1917] dark:text-[#f8fafc]"
                                            : "text-[#57534e] dark:text-[#cbd5e1]"
                                        }`}
                                      >
                                        {s.nombre}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
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
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200/90 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-[#e5e7eb] dark:hover:bg-white/[0.04]"
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
                  <div className="mb-4 rounded-2xl border border-[#fed7aa]/40 bg-gradient-to-r from-[#fff7ed]/80 to-cyan-50/60 px-4 py-2.5 text-[11px] text-[#9a3412] dark:border-[#ff801f]/25 dark:from-[#7c2d12]/20 dark:to-cyan-900/15 dark:text-[#ffa057]">
                    Sugerencia: selecciona primero el producto para usar precio especial/lista automaticamente, y despues ajusta el concepto si deseas editar el texto final.
                  </div>
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

                    <div className="sm:col-span-6 lg:col-span-5">
                      <Label className={labelPageClass}>Concepto</Label>
                      <div className="relative" ref={conceptoRef}>
                        <input
                          className={`${inputLikeClassName} min-h-[46px] text-sm sm:text-base`}
                          value={conceptoOpen ? conceptoSearch : conceptoNombre}
                          disabled={bloquearConceptoInput}
                          onFocus={() => {
                            setConceptoSearch(conceptoNombre || "");
                            setConceptoOpen(true);
                          }}
                          onChange={(e) => {
                            const nextConcepto = e.target.value;
                            handleConceptoInputChange(nextConcepto);
                            setConceptoOpen(true);
                          }}
                          placeholder={bloquearConceptoInput ? "Concepto bloqueado por selección de producto" : "Buscar o escribir concepto..."}
                          autoComplete="off"
                        />
                        {!bloquearConceptoInput && conceptoOpen && (
                          <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl ring-1 ring-black/5 dark:border-[#334155] dark:bg-[#111827]/95 dark:ring-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                handleConceptoInputChange(conceptoSearch);
                                setConceptoOpen(false);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm text-[#57534e] transition-colors hover:bg-gray-100 dark:text-[#cbd5e1] dark:hover:bg-white/[0.06]"
                            >
                              Usar: {conceptoSearch.trim() || "Concepto personalizado"}
                            </button>
                            {catalogoConceptos
                              .filter((c) => {
                                const q = (conceptoSearch || "").trim().toLowerCase();
                                if (!q) return true;
                                return String(c.concepto || "").toLowerCase().includes(q) || String(c.folio || "").toLowerCase().includes(q);
                              })
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    handleConceptoInputChange(String(c.concepto || ""));
                                    setConceptoOpen(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                                >
                                  <div className="font-medium text-[#1c1917] dark:text-[#f8fafc]">{c.concepto || "Sin nombre"}</div>
                                  <div className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
                                    {`Folio ${c.folio} · ${formatMoney(toNumber(c.precio1, 0))}`}
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6 lg:col-span-5">
                      <Label className={labelPageClass}>Buscar producto</Label>
                      <div ref={syscomInputWrapRef} className="relative">
                        <input
                          className={`${inputLikeClassName} min-h-[46px] text-sm sm:text-base`}
                          value={productoSearch}
                          disabled={bloquearProductoInput}
                          onFocus={() => {
                            if (!bloquearProductoInput && productoSearch.trim().length >= 2) setSyscomOpen(true);
                          }}
                          onChange={(e) => {
                            setProductoSearch(e.target.value);
                            setSelectedSyscomProducto(null);
                            setSelectedCatalogoConcepto(null);
                            setSelectedManualProducto(null);
                          }}
                          placeholder={bloquearProductoInput ? "Producto bloqueado por captura de concepto" : "Buscar en concepto folio/manual/SYSCOM"}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 lg:col-span-4">
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
                            <div className="mt-1 text-sm font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{formatMoney(preview.puBase)}</div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[11px]">Importe de línea</div>
                            <div className="mt-1 text-base font-semibold tabular-nums tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-lg">{formatMoney(preview.importe)}</div>
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
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
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
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] text-[#78716c] dark:text-[#8ea0b8] sm:hidden">
                    <span className="inline-block h-px w-4 bg-[#ff801f]/50" aria-hidden />
                    Desliza horizontalmente para ver todas las columnas
                  </p>
                  <div className="-mx-3 overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/90 dark:border-[#273244] dark:bg-[#0f172a]/50 sm:mx-0">
                    <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] px-1 pb-1 sm:px-0 sm:pb-0">
                      <Table className="min-w-[720px]">
                        <TableHeader className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-100/90 text-[10px] font-semibold text-gray-700 backdrop-blur-sm dark:border-white/[0.06] dark:bg-[#111827]/90 dark:text-[#e5e7eb] sm:text-[11px]">
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
                        <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
                          {computed.lines.map((c) => {
                            return (
                              <TableRow key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1e293b]/60">
                                <TableCell className="px-2 py-1.5 whitespace-nowrap">{c.cantidad}</TableCell>
                                <TableCell className="px-2 py-1.5 whitespace-nowrap">{c.unidad || "—"}</TableCell>
                                <TableCell className="px-2 py-1.5">
                                  <div className="flex items-center gap-2">
                                    {c.thumbnail_url ? (
                                      <img src={c.thumbnail_url} alt={c.producto_nombre} className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-white/10" />
                                    ) : null}
                                    <span className="text-[#1c1917] dark:text-[#f8fafc]">{c.producto_nombre}</span>
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
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-[#ffa057] hover:text-[#ff801f] active:scale-[0.97] dark:border-white/10 dark:bg-[#0f172a] dark:hover:border-[#ff801f] sm:h-7 sm:w-7 sm:rounded"
                                      title="Editar"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeConcepto(c.id)}
                                      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 active:scale-[0.97] dark:border-white/10 dark:bg-[#0f172a] dark:hover:border-error-500 sm:h-7 sm:w-7 sm:rounded"
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
                                  <p className="text-xs font-medium text-gray-700 dark:text-[#e5e7eb] sm:text-sm">Aún no hay conceptos</p>
                                  <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">Usa el formulario de arriba para agregar productos o servicios.</p>
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
                        <span className="text-[10px] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">Máx. 5000</span>
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
                        <span className="text-[10px] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">Máx. 8000</span>
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

              <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-3 lg:sticky lg:top-6 lg:self-start xl:top-8">
                <ComponentCard
                  title="Resumen"
                  desc="Totales y acciones principales."
                  className={cardShellClass}
                  compact
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e7ded0] bg-[#fcfaf6] px-3 py-2.5 dark:border-[#273244] dark:bg-[#111a2b]/90">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-[#e5e7eb] sm:text-sm">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#78716c] dark:text-[#8ea0b8] sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M8 2v3M16 2v3M4 7h16M6 10h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Fecha de cotización</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-sm">{formatDMY(todayIso)}</span>
                    </div>

                    <div className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-4 dark:border-[#273244] dark:bg-[#111827]/80">
                      <div className="flex items-end justify-between gap-3 border-b border-[#f1e8db] dark:border-[#273244] pb-3 dark:border-white/[0.06]">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[11px]">Total estimado</div>
                          <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-2xl">{formatMoney(computed.total)}</div>
                        </div>
                        <div className="text-right text-[9px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:text-[10px]">MXN</div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {!!toNumber(computed.descClientePct, 0) && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">Importe conceptos</span>
                              <span className="text-xs font-medium tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.subtotalLineas)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)</span>
                              <span className="text-xs font-medium tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-sm">-{formatMoney(computed.descuentoCliente)}</span>
                            </div>
                            <div className="border-t border-[#f1e8db] dark:border-[#273244] pt-2 dark:border-white/[0.06]" aria-hidden />
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">Subtotal</span>
                          <span className="text-xs font-medium tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.subtotalSinIva)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">IVA (16%)</span>
                          <span className="text-xs font-medium tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.ivaDesglose)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#f1e8db] dark:border-[#273244] pt-2 dark:border-white/[0.06]">
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 sm:text-xs">Total</span>
                          <span className="text-sm font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{formatMoney(computed.totalConIva)}</span>
                        </div>
                      </div>
                    </div>

                    {!canGuardarCotizacion && (
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-100/95">Completa lo siguiente para guardar</p>
                        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-amber-900/90 dark:text-amber-200/90">
                          {!clienteId && <li>Selecciona un cliente</li>}
                          {!!clienteId && !String(contactoNombre || "").trim() && <li>Indica el nombre del contacto</li>}
                          {!!clienteId && !!String(contactoNombre || "").trim() && !medioContacto && <li>Selecciona un medio de contacto</li>}
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
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#ff801f] px-4 py-3 text-xs font-semibold text-[#1c1917] transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                      >
                        {isEditingRoute ? "Actualizar cotización" : "Guardar cotización"}
                      </button>
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion || exportBusy}
                        onClick={handlePreviewPdf}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#fed7aa] bg-white px-4 py-3 text-xs font-semibold text-[#9a3412] transition-colors hover:bg-[#fff3e8] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#fb923c]/40 dark:bg-transparent dark:text-[#fdba74] dark:hover:bg-[#fb923c]/10 sm:min-h-0"
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
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-white px-4 py-3 text-xs font-semibold text-emerald-900 transition-all hover:-translate-y-[1px] hover:bg-emerald-50/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/[0.08] sm:min-h-0"
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
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.99] dark:border-white/[0.08] dark:bg-transparent dark:text-[#e5e7eb] dark:hover:bg-white/[0.04] sm:min-h-0"
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
                          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#fed7aa] bg-[#fff3e8] px-4 py-3 text-xs font-semibold text-[#9a3412] transition-colors hover:bg-[#ffe7cc] active:scale-[0.99] dark:border-[#fb923c]/40 dark:bg-[#fb923c]/12 dark:text-[#fdba74] dark:hover:bg-[#fb923c]/20 sm:min-h-0"
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
