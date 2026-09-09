import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";
import { useAuth } from "@/context/AuthContext";
import { useMarca } from "@/context/MarcaContext";
import { CotizacionConceptosTable, type CotizacionConceptoLine } from "@/pages/Ventas/Cotizacion/form/CotizacionConceptosTable";
import {
  buildVisualTableRows,
  categoriasToApiPayload,
  createCategoria,
  parseCategoriasFromApi,
  resolveCategoriaId,
  type CotizacionCategoria,
} from "@/pages/Ventas/Cotizacion/shared/cotizacionCategoriasUtils";
import { CotizacionPdfOptionsPanel } from "@/pages/Ventas/Cotizacion/pdf/CotizacionPdfOptionsPanel";
import { defaultPdfOpciones, parsePdfOpcionesFromApi } from "@/pages/Ventas/Cotizacion/shared/cotizacionPdfTypes";
import { terminosCotizacionDefault } from "@/pages/Ventas/Cotizacion/shared/terminosCotizacionDefault";
import {
  createCotizacionDraft,
  fetchCotizacionClienteById,
  fetchCotizacionClientes,
  fetchCotizacionDetail,
} from "@/pages/Ventas/Cotizacion/shared/cotizacionApi";
import { useCotizacionCatalogos } from "@/pages/Ventas/Cotizacion/shared/useCotizacionCatalogos";
import { useCotizacionCloneSearch } from "@/pages/Ventas/Cotizacion/shared/useCotizacionCloneSearch";
import {
  fetchSyscomProductosSugerencia,
  fetchSyscomTipoCambio,
  fetchTvcProductosSugerencia,
  fetchTvcTipoCambio,
  getCatalogProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";
import { cotizacionListPath, listSearchFromLocationState } from "@/pages/Ventas/Cotizacion/shared/cotizacionListNav";
import { CotizacionSaveStatus } from "@/components/cotizacion/CotizacionSaveStatus";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import CotizacionEnviarPdfModal, {
  type CotizacionEnviarPdfTarget,
} from "@/pages/Ventas/Cotizacion/form/CotizacionEnviarPdfModal";
import { CotizacionExportOverlay } from "@/pages/Ventas/Cotizacion/form/CotizacionExportOverlay";
import { CotizacionClearModal } from "@/pages/Ventas/Cotizacion/form/CotizacionClearModal";
import { CotizacionCloneModal } from "@/pages/Ventas/Cotizacion/form/CotizacionCloneModal";
import { MailIcon } from "@/icons";
import type {
  ApiCotizacion,
  CatalogoConcepto,
  Cliente,
  Concepto,
  ProductoManualCatalogo,
  SyscomPopPos,
} from "./shared/cotizacionFormTypes";
import {
  cardShellClass,
  cotPageCanvasClass,
  cotPageInnerClass,
  cotSansStyle,
  heroBandClass,
  heroBlurClass,
  heroBodyClass,
  heroChipClass,
  heroEyebrowClass,
  heroIconWrapClass,
  cloneActionBtnClass,
  conceptCountBadgeClass,
  correoActionBtnClass,
  ghostActionBtnClass,
  inputInvalidClass,
  inputLikeClassName,
  labelPageClass,
  numberInputClass,
  primaryActionBtnClass,
  primaryActionInlineBtnClass,
  secondaryActionBtnClass,
  sectionDividerClass,
  sectionEyebrowClass,
  sectionHeadingClass,
  sectionZoneClass,
  summaryHeroClass,
  tableWrapClass,
  tertiaryActionBtnClass,
  textareaLikeClassName,
} from "./shared/cotizacionFormStyles";
import {
  buildManualProductoDescripcion,
  clampPct,
  formatCotizacionApiError,
  formatMoney,
  getSyscomPrecioListaMxnConIva,
  linePrecioUnitarioCotizacion,
  linePrecioUnitarioSinIva,
  MAX_COTIZ_CLIENTE_LEN,
  MAX_COTIZ_PRODUCTO_NOMBRE_LEN,
  MAX_COTIZ_THUMB_URL_LEN,
  normalizeTipoTrabajoIds,
  resolveConceptoDescripcion,
  round2,
  toNumber,
  truncateStr,
  uid,
} from "./shared/cotizacionFormUtils";

/** Muestra "" cuando el número es 0 para no obligar al usuario a borrar el cero. */
const numValue = (n: number) => (n ? String(n) : "");

/** Anticipo por defecto y mínimo operativo (no se puede pedir menos del 40 %). */
const ANTICIPO_PCT_DEFAULT = 60;
const ANTICIPO_PCT_MIN = 40;
const ANTICIPO_PCT_MAX = 100;
const clampAnticipo = (n: number) =>
  Math.min(ANTICIPO_PCT_MAX, Math.max(ANTICIPO_PCT_MIN, Number.isFinite(n) ? n : ANTICIPO_PCT_DEFAULT));

export default function NuevaCotizacionPage() {
  const { permissions, isAdmin } = useAuth();
  const { nombre: marcaNombre } = useMarca();
  const canCotizacionesView = permissions?.cotizaciones?.view === true;
  const canCotizacionesCreate = permissions?.cotizaciones?.create === true;

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const editingCotizacionId = params?.id ? String(params.id) : "";
  const goToCotizacionList = useCallback(() => {
    navigate(cotizacionListPath(listSearchFromLocationState(location.state)));
  }, [location.state, navigate]);

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
  const [enviarCorreoSaving, setEnviarCorreoSaving] = useState(false);
  const [enviarPdfTarget, setEnviarPdfTarget] = useState<CotizacionEnviarPdfTarget | null>(null);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [clearFormModalOpen, setClearFormModalOpen] = useState(false);
  const {
    cloneListLoading,
    cloneRows,
    cloneSearch,
    cloneSearchDebounced,
    resetCloneSearch,
    setCloneSearch,
  } = useCotizacionCloneSearch({ canSearch: canCotizacionesView, isOpen: cloneModalOpen });
  const [clonePickingId, setClonePickingId] = useState<number | null>(null);
  const [cloneClienteMode, setCloneClienteMode] = useState<"mismo" | "otro">("mismo");
  const [cloneClienteSearch, setCloneClienteSearch] = useState("");
  const [cloneClienteDebounced, setCloneClienteDebounced] = useState("");
  const [cloneClienteOptions, setCloneClienteOptions] = useState<Cliente[]>([]);
  const [cloneClienteLoading, setCloneClienteLoading] = useState(false);
  const [cloneTargetCliente, setCloneTargetCliente] = useState<Cliente | null>(null);

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
  /** Switch ON = no aplicar IVA en la línea que se agrega/edita. */
  const [sinIva, setSinIva] = useState(false);
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
  const {
    catalogoConceptos,
    catalogoManualProductos,
    catalogoConceptosError,
    catalogoManualError,
    loadingCatalogoConceptos,
    servicios,
  } = useCotizacionCatalogos(canCotizacionesView);

  const syscomInputWrapRef = useRef<HTMLDivElement>(null);
  const syscomPopRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  /** Evita aplicar resultados de una petición SYSCOM anterior si el usuario sigue escribiendo. */
  const syscomSearchGenRef = useRef(0);
  const [syscomPopPos, setSyscomPopPos] = useState<SyscomPopPos | null>(null);
  const [descuentoClientePct, setDescuentoClientePct] = useState<number>(0);
  const [descuentoClienteTouched, setDescuentoClienteTouched] = useState<boolean>(false);
  /** Porcentaje de anticipo personalizado (default 60 %, mínimo 40 %). */
  const [anticipoPct, setAnticipoPct] = useState<number>(ANTICIPO_PCT_DEFAULT);

  const [editingConceptoId, setEditingConceptoId] = useState<string | null>(null);

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [categorias, setCategorias] = useState<CotizacionCategoria[]>([]);
  const [categoriaIdParaAgregar, setCategoriaIdParaAgregar] = useState("");

  const [textoArribaPrecios, setTextoArribaPrecios] = useState(
    "A continuación cotización solicitada: "
  );
  const [terminos, setTerminos] = useState(() =>
    terminosCotizacionDefault(MARCA_NOMBRE_DEFAULT)
  );

  const [pdfOpciones, setPdfOpciones] = useState(() => defaultPdfOpciones());
  const [pdfDescripcionCorta, setPdfDescripcionCorta] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditingRoute) return;
    setTerminos((prev) =>
      prev === terminosCotizacionDefault(MARCA_NOMBRE_DEFAULT)
        ? terminosCotizacionDefault(marcaNombre)
        : prev,
    );
  }, [isEditingRoute, marcaNombre]);

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

  const [tipoTrabajo, setTipoTrabajo] = useState<number[]>([]);
  const [tipoTrabajoOpen, setTipoTrabajoOpen] = useState(false);
  const [tipoTrabajoTouched, setTipoTrabajoTouched] = useState(false);
  const tipoTrabajoRef = useRef<HTMLDivElement>(null);
  const lastAutosaveSnapshotRef = useRef<string | null>(null);
  const draftInitStartedRef = useRef(false);
  const draftInitPromiseRef = useRef<Promise<string | null> | null>(null);
  const upsertInFlightRef = useRef(false);
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

  const pdfOpcionesAutosaveKey = useMemo(() => JSON.stringify(pdfOpciones), [pdfOpciones]);

  const pdfDescripcionCortaAutosaveKey = useMemo(
    () => JSON.stringify(pdfDescripcionCorta),
    [pdfDescripcionCorta]
  );

  const conceptosAutosaveKey = useMemo(
    () =>
      JSON.stringify({
        categorias: categoriasToApiPayload(categorias),
        conceptos: buildVisualTableRows(categorias, conceptos).flatMap((row) =>
          row.kind === "product"
            ? [
                {
                  producto_externo_id: row.line.producto_externo_id,
                  producto_nombre: row.line.producto_nombre,
                  producto_descripcion: row.line.producto_descripcion,
                  unidad: row.line.unidad,
                  thumbnail_url: row.line.thumbnail_url,
                  cantidad: row.line.cantidad,
                  precio_lista: row.line.precio_lista,
                  descuento_pct: row.line.descuento_pct,
                  categoria_id: row.line.categoria_id || "",
                },
              ]
            : []
        ),
      }),
    [conceptos, categorias]
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

  const lineaEditando = useMemo(
    () => (editingConceptoId ? conceptos.find((c) => c.id === editingConceptoId) : undefined),
    [editingConceptoId, conceptos]
  );

  const esFormularioProducto = useMemo(() => {
    if (selectedSyscomProducto || selectedManualProducto) return true;
    if (lineaEditando && String(lineaEditando.producto_externo_id || "").trim() !== "") return true;
    return false;
  }, [selectedSyscomProducto, selectedManualProducto, lineaEditando]);

  /** Conceptos: cualquiera. Productos: solo admin. */
  const canMarcarSinIva = !esFormularioProducto || isAdmin;

  useEffect(() => {
    if (!canMarcarSinIva && sinIva) setSinIva(false);
  }, [canMarcarSinIva, sinIva]);

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
    const productoExternoId =
      selectedSyscomProducto?.producto_id ||
      (selectedManualProducto ? `manual:${selectedManualProducto.id}` : "") ||
      (lineaEditando ? String(lineaEditando.producto_externo_id || "") : "");
    const sinIvaEfectivo = canMarcarSinIva && sinIva;
    const puBase = linePrecioUnitarioSinIva(pl, desc, productoExternoId);
    const puCobrado = linePrecioUnitarioCotizacion(pl, desc, productoExternoId, sinIvaEfectivo);
    const importe = qty * puBase;
    const importeCobrado = qty * puCobrado;
    return { qty, pl, desc, puBase, importe, puCobrado, importeCobrado, sinIvaEfectivo };
  }, [
    cantidad,
    precioLista,
    descuentoPct,
    selectedSyscomProducto,
    selectedManualProducto,
    lineaEditando,
    canMarcarSinIva,
    sinIva,
  ]);

  const fetchClientes = useCallback(async (search = "") => {
    if (!canCotizacionesView) return;
    setLoadingClientes(true);
    try {
      setClientes(await fetchCotizacionClientes(search));
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  }, [canCotizacionesView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClienteSearch(clienteSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  useEffect(() => {
    fetchClientes(debouncedClienteSearch);
  }, [debouncedClienteSearch, fetchClientes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCloneClienteDebounced(cloneClienteSearch.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [cloneClienteSearch]);

  useEffect(() => {
    if (!cloneModalOpen || cloneClienteMode !== "otro" || !canCotizacionesView) {
      setCloneClienteOptions([]);
      return;
    }
    if (cloneClienteDebounced.length < 1) {
      setCloneClienteOptions([]);
      return;
    }

    let cancelled = false;
    setCloneClienteLoading(true);
    fetchCotizacionClientes(cloneClienteDebounced)
      .then((rows) => {
        if (!cancelled) setCloneClienteOptions(rows);
      })
      .catch((error) => {
        console.error("Error buscando clientes para clonar:", error);
        if (!cancelled) setCloneClienteOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCloneClienteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCotizacionesView, cloneClienteDebounced, cloneClienteMode, cloneModalOpen]);

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

      const desc = clampPct(toNumber(cliente.descuento_pct, 0));
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
      setContactoTelefono(String(data.contacto_telefono || ""));
      setMedioContacto(String(data.medio_contacto || ""));
      setTipoTrabajo(normalizeTipoTrabajoIds(data.tipo_trabajo));
      setStatus(String(data.status || "PENDIENTE"));
      setDescuentoClientePct(clampPct(toNumber(data.descuento_cliente_pct, 0)));
      setDescuentoClienteTouched(true);
      setAnticipoPct(
        data.anticipo_pct == null
          ? ANTICIPO_PCT_DEFAULT
          : clampAnticipo(toNumber(data.anticipo_pct, ANTICIPO_PCT_DEFAULT)),
      );
      setTextoArribaPrecios(String(data.texto_arriba_precios || ""));
      {
        const incoming = String(data.terminos || "").trim();
        if (incoming) setTerminos(incoming);
      }

      const itemsArr = Array.isArray(data.items)
        ? [...data.items].sort((a, b) => toNumber(a.orden, 0) - toNumber(b.orden, 0))
        : [];
      const conceptosList: Concepto[] = itemsArr.map((it) => ({
        id: uid(),
        producto_externo_id: String(it.producto_externo_id ?? ""),
        producto_nombre: String(it.producto_nombre || ""),
        producto_descripcion: String(it.producto_descripcion || ""),
        unidad: String(it.unidad || ""),
        thumbnail_url: it.thumbnail_url || undefined,
        cantidad: toNumber(it.cantidad, 0),
        precio_lista: toNumber(it.precio_lista, 0),
        descuento_pct: clampPct(toNumber(it.descuento_pct, 0)),
        sin_iva: !!it.sin_iva,
        categoria_id: String(it.categoria_id || "").trim() || undefined,
      }));
      const descCortas: Record<string, string> = {};
      conceptosList.forEach((c, i) => {
        const corta = String(itemsArr[i]?.pdf_descripcion_corta || "").trim();
        if (corta) descCortas[c.id] = corta;
      });
      setConceptos(conceptosList);
      setCategorias(parseCategoriasFromApi((data as ApiCotizacion).categorias_productos));
      setCategoriaIdParaAgregar("");
      setPdfOpciones(parsePdfOpcionesFromApi(data.pdf_opciones));
      setPdfDescripcionCorta(descCortas);
      setEditingConceptoId(null);
      setClienteOpen(false);

      const cid = data.cliente_id ? Number(data.cliente_id) : null;
      if (cid) {
        try {
          const one = await fetchCotizacionClienteById(cid);
          if (one) {
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
    if (!catalogoManualProductos.length) return;
    setConceptos((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((c) => {
        const resolved = resolveConceptoDescripcion(c, catalogoManualProductos);
        const stored = String(c.producto_descripcion || "").trim();
        if (resolved && resolved !== stored) {
          changed = true;
          return { ...c, producto_descripcion: resolved };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [catalogoManualProductos]);

  useEffect(() => {
    setActiveCotizacionId(editingCotizacionId || "");
  }, [editingCotizacionId]);

  useEffect(() => {
    if (editingCotizacionId || activeCotizacionId || !canCotizacionesCreate) return;
    if (draftInitStartedRef.current) return;
    draftInitStartedRef.current = true;

    let cancelled = false;
    const createDraft = async (): Promise<string | null> => {
      try {
        const data = await createCotizacionDraft({
          cliente_id: null,
          cliente: "",
          prospecto: false,
          contacto: "",
          contacto_telefono: "",
          medio_contacto: "",
          tipo_trabajo: [],
          status: "PENDIENTE",
          fecha: todayIso,
          subtotal: 0,
          descuento_cliente_pct: 0,
          anticipo_pct: ANTICIPO_PCT_DEFAULT,
          iva_pct: 0,
          iva: 0,
          total: 0,
          texto_arriba_precios: "",
          terminos: "",
          items: [],
        });
        if (!data || cancelled) return null;
        const newId = String(data?.id || "").trim();
        if (newId) {
          setActiveCotizacionId(newId);
          setEditingCotizacionIdx(
            data?.idx != null && Number.isFinite(Number(data.idx)) ? Number(data.idx) : null
          );
        }
        return newId || null;
      } catch {
        draftInitStartedRef.current = false;
        return null;
      }
    };

    draftInitPromiseRef.current = createDraft();
    return () => {
      cancelled = true;
    };
  }, [editingCotizacionId, activeCotizacionId, canCotizacionesCreate, todayIso]);

  useEffect(() => {
    if (!editingCotizacionId) {
      return;
    }
    setHydratingFromStorage(true);

    const load = async () => {
      try {
        const data = await fetchCotizacionDetail(editingCotizacionId);
        if (!data) {
          setEditingCotizacionIdx(null);
          setAlert({
            show: true,
            variant: "warning",
            title: "Cotización no encontrada",
            message: "No se encontró la cotización. Regresando al listado.",
          });
          window.setTimeout(() => goToCotizacionList(), 450);
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
  }, [editingCotizacionId, hydrateFormFromCotizacionDetail, goToCotizacionList]);

  const resetCloneClienteState = useCallback(() => {
    setCloneClienteMode("mismo");
    setCloneClienteSearch("");
    setCloneClienteDebounced("");
    setCloneClienteOptions([]);
    setCloneTargetCliente(null);
  }, []);

  const handleClonePick = async (id: number) => {
    if (cloneClienteMode === "otro" && !cloneTargetCliente) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Falta el cliente",
        message: "Elige el cliente destino o cambia a «Mismo cliente».",
      });
      return;
    }

    setClonePickingId(id);
    setHydratingFromStorage(true);
    try {
      const data = await fetchCotizacionDetail(id);
      if (!data) {
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudo cargar la cotización seleccionada.",
        });
        return;
      }
      await hydrateFormFromCotizacionDetail(data, { updateIdxBadge: false });

      if (cloneClienteMode === "otro" && cloneTargetCliente) {
        selectCliente(cloneTargetCliente);
      }

      setCloneModalOpen(false);
      resetCloneSearch();
      resetCloneClienteState();
      const folioOrigen = formatDocumentFolio(FOLIO_SERIE.cotizacion, data.idx);
      const clienteDestino =
        cloneClienteMode === "otro" && cloneTargetCliente
          ? String(cloneTargetCliente.nombre || "").trim()
          : "";
      setAlert({
        show: true,
        variant: "success",
        title: "Cotización clonada",
        message: clienteDestino
          ? `Se copiaron conceptos y textos del folio ${folioOrigen} para ${clienteDestino}. Revisa y guarda como cotización nueva.`
          : `Se copiaron los datos del folio ${folioOrigen}. Revisa la información y guarda como cotización nueva.`,
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

    const desc = clampPct(toNumber(selectedCliente.descuento_pct, 0));
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
    Promise.all([fetchSyscomTipoCambio(), fetchTvcTipoCambio()])
      .then(([tcSyscom, tcTvc]) => setSyscomTipoCambio(tcSyscom ?? tcTvc))
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
    // Abrir panel por búsqueda local (catálogo) aunque falle Syscom o TVC.
    setSyscomOpen(true);
    const runGen = ++syscomSearchGenRef.current;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSyscom(true);
      setSyscomError("");
      try {
        const [syscomRes, tvcRes] = await Promise.all([
          fetchSyscomProductosSugerencia(q, { signal: ac.signal }),
          fetchTvcProductosSugerencia(q, { signal: ac.signal }),
        ]);
        if (runGen !== syscomSearchGenRef.current) return;

        const merged: SyscomProducto[] = [];
        const seen = new Set<string>();
        for (const p of [...tvcRes.productos, ...syscomRes.productos]) {
          const id = String(p.producto_id ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(p);
        }

        if (!syscomRes.ok && !tvcRes.ok && merged.length === 0) {
          setSyscomProductos([]);
          setSyscomError("No se pudo consultar Syscom ni TVC en este momento.");
          return;
        }
        setSyscomProductos(merged);
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

  const resolveCatalogoDescripcion = (c: CatalogoConcepto) => {
    const catalogDesc = String(c.descripcion || "").trim();
    if (catalogDesc) return catalogDesc;
    return `Folio: ${c.folio}`;
  };

  const selectCatalogoConcepto = (c: CatalogoConcepto) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(c);
    setSelectedManualProducto(null);
    setConceptoNombre(String(c.concepto || ""));
    setProductoSearch(String(c.concepto || ""));
    setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : resolveCatalogoDescripcion(c)));
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
    setConceptoDescripcion((prev) =>
      String(prev || "").trim() ? prev : buildManualProductoDescripcion(p)
    );
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
        key: `${p.fuente || "syscom"}-${p.producto_id}`,
        source: p.fuente === "tvc" ? ("tvc" as const) : ("syscom" as const),
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
    const tieneContacto = !!String(contactoNombre || "").trim();
    // Contacto es opcional; medio solo obligatorio si hay contacto.
    if (tieneContacto && !String(medioContacto || "").trim()) {
      missing.push("Medio de Contacto");
    }
    return { ok: missing.length === 0, missing };
  };

  const validateCotizacionRequired = () => {
    const v = validateClienteContacto();
    const missing = [...v.missing];
    if (tipoTrabajoIds.length === 0) missing.push("Tipo de Trabajo");
    return { ok: missing.length === 0, missing };
  };

  const medioContactoInvalid =
    medioContactoTouched &&
    !!String(contactoNombre || "").trim() &&
    !String(medioContacto || "").trim();

  const tipoTrabajoInvalid = tipoTrabajoTouched && tipoTrabajoIds.length === 0;

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
    const orderedLines = buildVisualTableRows(categorias, lines).flatMap((row) =>
      row.kind === "product" ? [row.line] : []
    );
    const subtotalLineasConIva = lines.reduce((acc, c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const pu = linePrecioUnitarioCotizacion(
        toNumber(c.precio_lista, 0),
        descuento,
        c.producto_externo_id,
        !!c.sin_iva
      );
      return acc + toNumber(c.cantidad, 0) * pu;
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
      anticipo_pct: clampAnticipo(toNumber(anticipoPct, ANTICIPO_PCT_DEFAULT)),
      iva_pct: 0,
      iva: 0,
      total,
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
      pdf_opciones: pdfOpciones,
      categorias_productos: categoriasToApiPayload(categorias),
      items: orderedLines.map((c, i) => ({
        producto_externo_id: truncateStr(c.producto_externo_id ?? "", 100),
        producto_nombre: truncateStr(c.producto_nombre, MAX_COTIZ_PRODUCTO_NOMBRE_LEN),
        producto_descripcion: resolveConceptoDescripcion(c, catalogoManualProductos),
        pdf_descripcion_corta: truncateStr(String(pdfDescripcionCorta[c.id] || "").trim(), 500),
        unidad: truncateStr(c.unidad, 50),
        thumbnail_url: truncateStr(c.thumbnail_url || "", MAX_COTIZ_THUMB_URL_LEN),
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        sin_iva: !!c.sin_iva,
        categoria_id: truncateStr(resolveCategoriaId(categorias, c.categoria_id), 64),
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
    categorias,
    effectiveDescuentoClientePct,
    anticipoPct,
    textoArribaPrecios,
    terminos,
    pdfOpciones,
    pdfDescripcionCorta,
    catalogoManualProductos,
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
    let targetId = (editingCotizacionId || activeCotizacionId || "").trim();

    if (!targetId && draftInitPromiseRef.current) {
      const draftId = await draftInitPromiseRef.current.catch(() => null);
      if (draftId) targetId = draftId;
    }

    if (upsertInFlightRef.current) {
      if (!silent) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Guardando",
          message: "Espera a que termine el guardado anterior.",
        });
      }
      return targetId || null;
    }
    upsertInFlightRef.current = true;

    if (!canView) {
      upsertInFlightRef.current = false;
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
        upsertInFlightRef.current = false;
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
        upsertInFlightRef.current = false;
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
      const v = validateCotizacionRequired();
      if (!v.ok) {
        if (!String(medioContacto || "").trim()) {
          setMedioContactoTouched(true);
        }
        if (tipoTrabajoIds.length === 0) {
          setTipoTrabajoTouched(true);
        }
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Faltan datos",
            message: `Completa: ${v.missing.join(", ")}.`,
          });
        }
        upsertInFlightRef.current = false;
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
        upsertInFlightRef.current = false;
        return null;
      }
    }

    const payload = buildCotizacionPayload();

    if (
      autosave &&
      clienteId &&
      String(contactoNombre || "").trim() &&
      !String(medioContacto || "").trim()
    ) {
      upsertInFlightRef.current = false;
      return null;
    }

    if (autosave) {
      const snapshot = JSON.stringify({
        ...payload,
        tipo_trabajo: [...(payload.tipo_trabajo || [])].sort((a: number, b: number) => a - b),
      });
      if (lastAutosaveSnapshotRef.current === snapshot) {
        upsertInFlightRef.current = false;
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
          message: `Folio ${formatDocumentFolio(FOLIO_SERIE.cotizacion, data?.idx || data?.id)} guardado correctamente.`,
        });
      }
      // Refresca contactos del cliente por si el backend creó uno nuevo.
      const cid = clienteId ? Number(clienteId) : 0;
      if (cid && String(contactoNombre || "").trim()) {
        try {
          const refreshed = await fetchCotizacionClienteById(cid);
          if (refreshed) {
            setClientes((prev) => {
              if (prev.some((c) => c.id === refreshed.id)) {
                return prev.map((c) => (c.id === refreshed.id ? { ...c, ...refreshed } : c));
              }
              return [refreshed, ...prev];
            });
          }
        } catch (error) {
          console.error("Error refrescando contactos del cliente:", error);
        }
      }
      if (navigateAfterSave) {
        window.setTimeout(() => goToCotizacionList(), 350);
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
      upsertInFlightRef.current = false;
      if (autosave) setIsAutoSaving(false);
    }
  }, [
    editingCotizacionId,
    activeCotizacionId,
    buildCotizacionPayload,
    conceptos.length,
    goToCotizacionList,
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
    anticipoPct,
    conceptosAutosaveKey,
    pdfOpcionesAutosaveKey,
    pdfDescripcionCortaAutosaveKey,
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
    setSinIva(false);
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
      setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : resolveCatalogoDescripcion(match)));
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
    const descripcion = selectedManualProducto
      ? buildManualProductoDescripcion(selectedManualProducto)
      : String(conceptoDescripcion || "").trim();
    const productoExternoId = selectedSyscomProducto?.producto_id || (selectedManualProducto ? `manual:${selectedManualProducto.id}` : "");
    const catalogThumb = selectedCatalogoConcepto?.imagen_url?.trim();
    const manualThumb = selectedManualProducto?.imagen_url?.trim();
    const thumbnail = selectedSyscomProducto?.img_portada
      ? getCatalogProductoImageUrl(selectedSyscomProducto) || undefined
      : manualThumb || catalogThumb || undefined;
    const esProductoLinea =
      !!productoExternoId ||
      (!!editingConceptoId &&
        String(conceptos.find((x) => x.id === editingConceptoId)?.producto_externo_id || "").trim() !== "");
    const sinIvaLinea = (esProductoLinea ? isAdmin : true) && sinIva;

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
              sin_iva: sinIvaLinea,
            }
            : x
        )
      );
      setEditingConceptoId(null);
    } else {
      const categoriaAsignada = resolveCategoriaId(categorias, categoriaIdParaAgregar);
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
          sin_iva: sinIvaLinea,
          categoria_id: categoriaAsignada || undefined,
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
    setSinIva(false);
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

  const handleReorderProducts = useCallback((reorderedLines: CotizacionConceptoLine[]) => {
    setConceptos((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const next: Concepto[] = [];
      for (const line of reorderedLines) {
        const base = byId.get(line.id);
        if (!base) continue;
        next.push({
          ...base,
          categoria_id: line.categoria_id || undefined,
        });
      }
      if (next.length !== prev.length) return prev;
      return next;
    });
  }, []);

  const handleReorderCategorias = useCallback((next: CotizacionCategoria[]) => {
    setCategorias(next);
  }, []);

  const handleAddCategoria = useCallback((nombre: string) => {
    setCategorias((prev) => [...prev, createCategoria(nombre, prev)]);
  }, []);

  const handleUpdateCategoria = useCallback((id: string, nombre: string) => {
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, nombre: nombre.trim() } : c)));
  }, []);

  const handleRemoveCategoria = useCallback((id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    setConceptos((prev) =>
      prev.map((c) => (c.categoria_id === id ? { ...c, categoria_id: undefined } : c))
    );
    setCategoriaIdParaAgregar((prev) => (prev === id ? "" : prev));
  }, []);

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
    setSinIva(!!c.sin_iva);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    if (productoExternoId.toLowerCase().startsWith("manual:")) {
      const manualId = Number(productoExternoId.split(":")[1]);
      const manual = catalogoManualProductos.find((p) => p.id === manualId);
      if (manual) {
        setSelectedManualProducto(manual);
        setConceptoDescripcion(buildManualProductoDescripcion(manual));
      }
    }
    setSyscomError("");
    setSyscomOpen(false);
  };

  const computed = useMemo(() => {
    const lines = conceptos.map((c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const sinIvaLinea = !!c.sin_iva;
      const pu = linePrecioUnitarioSinIva(toNumber(c.precio_lista, 0), descuento, c.producto_externo_id);
      const puCobrado = linePrecioUnitarioCotizacion(
        toNumber(c.precio_lista, 0),
        descuento,
        c.producto_externo_id,
        sinIvaLinea
      );
      const qty = toNumber(c.cantidad, 0);
      const importe = qty * pu;
      const importeCobrado = qty * puCobrado;
      return { ...c, pu, importe, sin_iva: sinIvaLinea, importeCobrado };
    });

    const subtotalLineasSinIva = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    const subtotalLineasBase = lines.reduce((acc, l) => {
      const descuento = clampPct(toNumber(l.descuento_pct, 0));
      const puBase = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), descuento, l.producto_externo_id);
      return acc + toNumber(l.cantidad, 0) * puBase;
    }, 0);
    /** Monto total descontado por los descuentos aplicados por concepto (sin IVA). */
    const descuentoLineasSinIva = lines.reduce((acc, l) => {
      const descuento = clampPct(toNumber(l.descuento_pct, 0));
      if (descuento <= 0) return acc;
      const puLista = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), 0, l.producto_externo_id);
      const puDesc = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), descuento, l.producto_externo_id);
      return acc + toNumber(l.cantidad, 0) * Math.max(0, puLista - puDesc);
    }, 0);
    /** Suma cobrada (con o sin IVA según bandera); el descuento cliente se aplica sobre este monto. */
    const subtotalLineasConIva = lines.reduce(
      (acc, l) => acc + (Number.isFinite(l.importeCobrado) ? l.importeCobrado : 0),
      0
    );

    const descClientePct = clampPct(toNumber(effectiveDescuentoClientePct, 0));
    const descuentoCliente = subtotalLineasConIva * (descClientePct / 100);
    const totalConIva = Math.max(0, subtotalLineasConIva - descuentoCliente);
    const factorDesc = subtotalLineasConIva > 0 ? totalConIva / subtotalLineasConIva : 1;
    const subtotalSinIva = round2(subtotalLineasBase * factorDesc);
    const ivaDesglose = round2(Math.max(0, totalConIva - subtotalSinIva));
    /** Subtotal/total guardados: monto cobrado (misma convención que el backend). */
    const subtotal = totalConIva;
    const total = totalConIva;

    return {
      lines,
      subtotalLineas: subtotalLineasSinIva,
      descuentoLineas: round2(descuentoLineasSinIva),
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
  }, [conceptos, effectiveDescuentoClientePct]);

  /** Cliente, tipo de trabajo y al menos un concepto; contacto es opcional (medio solo si hay contacto). */
  const canGuardarCotizacion = useMemo(() => {
    if (!clienteId) return false;
    if (String(contactoNombre || "").trim() && !medioContacto) return false;
    if (tipoTrabajoIds.length === 0) return false;
    if (!computed.lines.length) return false;
    return true;
  }, [clienteId, contactoNombre, medioContacto, tipoTrabajoIds.length, computed.lines.length]);

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
    setTipoTrabajoTouched(false);
    setStatus('PENDIENTE');

    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSinIva(false);
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
    setCategorias([]);
    setCategoriaIdParaAgregar("");
    setTextoArribaPrecios("A continuación cotización solicitada:");
    setTerminos(terminosCotizacionDefault(marcaNombre));
    setPdfOpciones(defaultPdfOpciones());
    setPdfDescripcionCorta({});
  };

  const handleOpenPdf = async () => {
    if (previewLoading || excelLoading) return;

    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para generar el PDF.",
      });
      return;
    }

    const v = validateCotizacionRequired();
    if (!v.ok) {
      if (tipoTrabajoIds.length === 0) setTipoTrabajoTouched(true);
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    try {
      setPreviewLoading(true);
      const savedId = await upsertCotizacion({
        navigateAfterSave: false,
        validateRequired: true,
        silent: false,
        autosave: false,
      });
      if (!savedId) return;
      navigate(`/cotizacion/${savedId}/pdf`);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo abrir el PDF." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const canEnviarPorCorreo = ["PENDIENTE", "AUTORIZADA"].includes(String(status || "").trim().toUpperCase());

  const handleEnviarPorCorreo = async () => {
    if (previewLoading || excelLoading || enviarCorreoSaving) return;

    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para enviar la cotización por correo.",
      });
      return;
    }

    const v = validateCotizacionRequired();
    if (!v.ok) {
      if (tipoTrabajoIds.length === 0) setTipoTrabajoTouched(true);
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    try {
      setEnviarCorreoSaving(true);
      const savedId = await upsertCotizacion({
        navigateAfterSave: false,
        validateRequired: true,
        silent: false,
        autosave: false,
      });
      if (!savedId) return;
      if (savedId !== activeCotizacionId) setActiveCotizacionId(savedId);
      setEnviarPdfTarget({
        id: Number(savedId),
        idx: editingCotizacionIdx ?? undefined,
        cliente: resolveClienteNombre() || undefined,
        status,
      });
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo preparar el envío por correo." });
    } finally {
      setEnviarCorreoSaving(false);
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
    <div className={cotPageCanvasClass} style={cotSansStyle}>
      <div className={cotPageInnerClass}>
        <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />

        <CotizacionExportOverlay open={exportBusy} isExcel={excelLoading} progress={loadingProgress} />

        <CotizacionEnviarPdfModal
          open={enviarPdfTarget != null}
          cotizacion={enviarPdfTarget}
          onClose={() => setEnviarPdfTarget(null)}
          onSent={(correo) => {
            setEnviarPdfTarget(null);
            setAlert({
              show: true,
              variant: "success",
              title: "Correo enviado",
              message: `El PDF se envió a ${correo}.`,
            });
          }}
          onError={(message) => {
            setAlert({ show: true, variant: "error", title: "Correo", message });
          }}
        />

        <CotizacionCloneModal
          open={cloneModalOpen}
          pickingId={clonePickingId}
          onClose={() => {
            if (clonePickingId != null) return;
            setCloneModalOpen(false);
            resetCloneClienteState();
          }}
          onPick={(id) => void handleClonePick(id)}
          clienteMode={cloneClienteMode}
          onClienteModeChange={(mode) => {
            setCloneClienteMode(mode);
            if (mode === "mismo") {
              setCloneTargetCliente(null);
              setCloneClienteSearch("");
              setCloneClienteOptions([]);
            }
          }}
          targetCliente={cloneTargetCliente}
          onPickTargetCliente={(c) => {
            setCloneTargetCliente(c);
            setCloneClienteSearch(String(c.nombre || ""));
            setCloneClienteOptions([]);
          }}
          onClearTargetCliente={() => {
            setCloneTargetCliente(null);
            setCloneClienteSearch("");
          }}
          clienteSearch={cloneClienteSearch}
          onClienteSearchChange={setCloneClienteSearch}
          clienteOptions={cloneClienteOptions}
          clienteLoading={cloneClienteLoading}
          clienteDebounced={cloneClienteDebounced}
          search={cloneSearch}
          onSearchChange={setCloneSearch}
          searchDebounced={cloneSearchDebounced}
          listLoading={cloneListLoading}
          rows={cloneRows}
        />

        <CotizacionClearModal
          open={clearFormModalOpen}
          onClose={() => setClearFormModalOpen(false)}
          onConfirm={resetAll}
        />

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
              className="flex flex-col overflow-hidden rounded-2xl border border-[#E7E7EA]/90 bg-white/98 shadow-2xl shadow-gray-900/20 ring-1 ring-black/[0.06] backdrop-blur-md dark:border-white/[0.12] dark:bg-[#111827]/98 dark:shadow-black/50 dark:ring-white/[0.08]"
            >
              <div className="shrink-0 border-b border-[#EDEDED] dark:border-[#273244]/90 bg-gradient-to-r from-[#F1F5FF]/95 to-transparent px-3 py-2 dark:border-white/[0.06] dark:from-[#1B5CFF]/50 dark:to-transparent">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">Resultados combinados</p>
                <p className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">Conceptos internos, manuales, Syscom y TVC</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                {loadingCatalogoConceptos && (
                  <div className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1B5CFF] border-t-transparent" aria-hidden />
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
                  <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1B5CFF] border-t-transparent" aria-hidden />
                    Buscando en catálogos externos…
                  </div>
                )}
                {!loadingSyscom && !!syscomError && (
                  <div className="mb-1 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    {syscomError}
                    {combinedConceptoOptions.length > 0
                      ? " Puedes seguir eligiendo conceptos o productos manuales."
                      : ""}
                  </div>
                )}
                {!loadingCatalogoConceptos &&
                  combinedConceptoOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      role="option"
                      onClick={opt.onSelect}
                      className="group mb-1 flex w-full rounded-xl px-2 py-2 text-left transition-colors last:mb-0 hover:bg-[#1B5CFF]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-[#09090B] group-hover:text-[#1B5CFF] dark:text-[#e5e7eb] dark:group-hover:text-[#4B7CFF]">
                            {opt.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
                            <span className="mr-1 rounded bg-[#EDEDED] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-white/[0.08]">
                              {opt.source === "catalogo"
                                ? "Concepto"
                                : opt.source === "manual"
                                  ? "Manual"
                                  : opt.source === "tvc"
                                    ? "TVC"
                                    : "Syscom"}
                            </span>
                            {opt.subtitle || "Sin detalle"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-[#1B5CFF]/10 px-2 py-1 text-xs font-semibold tabular-nums text-[#1B5CFF] dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF]">
                          {formatMoney(opt.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                {!loadingSyscom &&
                  !loadingCatalogoConceptos &&
                  !catalogoManualError &&
                  combinedConceptoOptions.length === 0 &&
                  productoSearch.trim().length >= 2 && (
                  <div className="rounded-lg px-3 py-4 text-center text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Sin resultados en catálogos</div>
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
          <div className="rounded-[24px] border border-[#E7E7EA] bg-white px-4 py-10 text-center text-sm text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] sm:px-6">
            No tienes permiso para ver Cotizaciones.
          </div>
        ) : (
          <>

            <nav
              className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8] sm:mb-2"
              aria-label="Migas de pan"
            >
              <Link
                to="/"
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
              >
                Inicio
              </Link>
              <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
                /
              </span>
              <Link
                to="/cotizacion"
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
              >
                Cotizaciones
              </Link>
              <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
                /
              </span>
              <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">
                {isEditingRoute ? "Editar" : "Nueva"}
              </span>
            </nav>

            <header className={heroBandClass}>
              <div className={heroBlurClass} aria-hidden />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className={heroIconWrapClass} aria-hidden>
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={heroEyebrowClass}>Ventas · Cotización</p>
                      {!!(isEditingRoute || activeCotizacionId) && (
                        <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">
                          {isEditingRoute ? "Edición" : "Borrador"} ·{" "}
                          {editingCotizacionIdx != null
                            ? formatDocumentFolio(FOLIO_SERIE.cotizacion, editingCotizacionIdx)
                            : activeCotizacionId || editingCotizacionId}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                      {isEditingRoute ? "Editar cotización" : "Nueva cotización"}
                    </h1>
                    <p className={heroBodyClass}>
                      {isEditingRoute
                        ? "Ajusta cliente, conceptos y totales; guarda los cambios o revisa el PDF antes de enviar."
                        : "Define el cliente, agrega productos o servicios y revisa el resumen antes de guardar o generar la vista previa. Se guarda automáticamente como borrador."}
                    </p>
                    <div className="mt-3 text-white/85">
                      <CotizacionSaveStatus isAutoSaving={isAutoSaving} lastAutoSavedAt={lastAutoSavedAt} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className={heroChipClass}>
                        <span className="tabular-nums">{computed.lines.length}</span>
                        {computed.lines.length === 1 ? "concepto" : "conceptos"}
                      </span>
                      <span className={heroChipClass}>
                        Total
                        <span className="font-semibold tabular-nums text-white">{formatMoney(computed.total)}</span>
                        <span className="text-[10px] uppercase text-white/55">MXN</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 lg:pt-1">
                  <button
                    type="button"
                    onClick={() => goToCotizacionList()}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
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
              </div>
            </header>

            <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-10">
              <div className="min-w-0 space-y-8 lg:col-span-8 xl:col-span-8">
                <section aria-labelledby="cotizacion-cliente-heading" className={sectionZoneClass}>
                  <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
                    <div>
                      <p className={sectionEyebrowClass}>Paso 1</p>
                      <h2 id="cotizacion-cliente-heading" className={`mt-1 ${sectionHeadingClass}`}>
                        Datos del cliente
                      </h2>
                    </div>
                  </div>
                <ComponentCard
                  title="Información de contacto"
                  desc="Busca por nombre o teléfono y completa contacto, descuento y estado."
                  className={`${cardShellClass.replace(/^overflow-hidden\b/, "overflow-visible")} ${
                    clienteOpen || tipoTrabajoOpen ? "relative z-[200]" : ""
                  }`}
                  compact
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="sm:col-span-2 xl:col-span-3">
                      <Label className={labelPageClass}>
                        Cliente
                        <span className="text-[#C22B2B] dark:text-[#F87171]"> *</span>
                      </Label>
                      <div className={`relative ${clienteOpen ? "z-[100]" : "z-0"}`}>
                        <div className="relative">
                          <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                          <input
                            value={clienteSearch}
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              if (clienteId) setClienteId("");
                              setClienteOpen(true);
                            }}
                            onFocus={() => setClienteOpen(true)}
                            autoComplete="off"
                            placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente por nombre o teléfono..."}
                            className={`${inputLikeClassName} block pl-9 pr-20`}
                          />
                          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                            {(!!clienteId || clienteSearch.trim().length > 0) && (
                              <button
                                type="button"
                                onClick={() => selectCliente(null)}
                                aria-label="Limpiar cliente"
                                className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md text-[#A1A1AA] transition hover:bg-[#E7E7EA]/60 hover:text-[#52525B] dark:hover:bg-white/[0.06] dark:hover:text-[#D3D3D8] sm:h-9 sm:min-w-[36px] sm:rounded-lg"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                                </svg>
                              </button>
                            )}
                            <button type="button" onClick={() => setClienteOpen((o) => !o)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:bg-[#243048]">
                              <svg className={`w-3.5 h-3.5 transition-transform ${clienteOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                            </button>
                          </div>
                        </div>
                        {clienteOpen && (
                          <div className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-64 w-full overflow-auto divide-y divide-[#EDEDED] rounded-xl border border-[#E7E7EA] bg-[#ffffff] shadow-xl ring-1 ring-black/5 backdrop-blur-sm custom-scrollbar dark:divide-[#273244] dark:border-[#273244] dark:bg-[#111827]/95 dark:ring-white/10">
                            <button type='button' onClick={() => selectCliente(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#1B5CFF]/10 dark:hover:bg-[#243048] dark:text-white ${!clienteId ? 'bg-[#1B5CFF]/10 dark:bg-[#0f172a]/50 font-medium text-[#1B5CFF] dark:text-white' : ''}`}>Selecciona cliente</button>
                            {filteredClientes.map(c => (
                              <button key={c.id} type='button' onClick={() => selectCliente(c)} className='w-full text-left px-3 py-2 hover:bg-[#FAFAFA] dark:hover:bg-[#243048] text-[#52525B] dark:text-[#e5e7eb] transition'>
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                    {(c.nombre || '?').slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className='flex flex-col flex-1'>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-[12px] font-medium text-[#252523] dark:text-[#e5e7eb]'>{c.nombre || '-'}</span>
                                      {c.is_prospecto && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider">Prospecto</span>
                                      )}
                                    </div>
                                    <span className='text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]'>{c.telefono || '-'}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {filteredClientes.length === 0 && (
                              <div className='px-3 py-2 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]'>Sin resultados</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className={labelPageClass}>
                        Contacto{" "}
                        <span className="font-normal normal-case tracking-normal text-[#A1A1AA] dark:text-[#64748b]">
                          (opcional)
                        </span>
                      </Label>
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
                      <p className="mt-1 text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]">
                        Si escribes un contacto nuevo, se guardará en la ficha del cliente.
                      </p>
                    </div>

                    <div>
                      <Label className={labelPageClass}>
                        Teléfono contacto{" "}
                        <span className="font-normal normal-case tracking-normal text-[#A1A1AA] dark:text-[#64748b]">
                          (opcional)
                        </span>
                      </Label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className={inputLikeClassName}
                        value={contactoTelefono}
                        onChange={(e) => setContactoTelefono(e.target.value)}
                        placeholder="Ej. 3141234567"
                      />
                    </div>

                    <div>
                      <Label className={labelPageClass}>Descuento de cliente</Label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          className={`${numberInputClass} pr-8 text-right`}
                          value={numValue(descuentoClientePct)}
                          onChange={(e) => {
                            setDescuentoClienteTouched(true);
                            setDescuentoClientePct(clampPct(toNumber(e.target.value, 0)));
                          }}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] dark:text-[#64748b]" aria-hidden>
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className={labelPageClass} htmlFor="anticipo-pct-input">
                        ¿Cuánto de anticipación?
                      </Label>
                      <div className="relative">
                        <input
                          id="anticipo-pct-input"
                          type="number"
                          inputMode="decimal"
                          className={`${numberInputClass} pr-8 text-right`}
                          value={numValue(anticipoPct)}
                          onChange={(e) =>
                            setAnticipoPct(
                              Math.min(
                                ANTICIPO_PCT_MAX,
                                Math.max(0, toNumber(e.target.value, ANTICIPO_PCT_DEFAULT)),
                              ),
                            )
                          }
                          onBlur={(e) => {
                            const raw = toNumber(e.target.value, ANTICIPO_PCT_DEFAULT);
                            setAnticipoPct(clampAnticipo(raw || ANTICIPO_PCT_DEFAULT));
                          }}
                          min={ANTICIPO_PCT_MIN}
                          max={ANTICIPO_PCT_MAX}
                          step="1"
                          placeholder={String(ANTICIPO_PCT_DEFAULT)}
                          aria-describedby="anticipo-pct-help"
                        />
                        <span
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] dark:text-[#64748b]"
                          aria-hidden
                        >
                          %
                        </span>
                      </div>
                      <p
                        id="anticipo-pct-help"
                        className="mt-1 text-[11px] leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]"
                      >
                        Por defecto {ANTICIPO_PCT_DEFAULT}% para iniciar trabajos; no puede ser menor a{" "}
                        {ANTICIPO_PCT_MIN}%. El resto (
                        {(100 - clampAnticipo(toNumber(anticipoPct, ANTICIPO_PCT_DEFAULT))).toFixed(0)}%) se
                        liquida al finalizar.
                      </p>
                    </div>

                    <div>
                      <Label className={labelPageClass}>
                        Medio de Contacto
                        {String(contactoNombre || "").trim() ? (
                          <span className="text-[#C22B2B] dark:text-[#F87171]"> *</span>
                        ) : (
                          <span className="font-normal normal-case tracking-normal text-[#A1A1AA] dark:text-[#64748b]">
                            {" "}
                            (si hay contacto)
                          </span>
                        )}
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
                            ? inputInvalidClass
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
                        <p id="medio-contacto-error" className="mt-1 text-xs text-[#C22B2B] dark:text-[#F87171]">
                          Selecciona un medio de contacto.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className={labelPageClass} htmlFor="tipo-trabajo-trigger">
                        Tipo de Trabajo
                        <span className="text-[#C22B2B] dark:text-[#F87171]"> *</span>
                      </Label>
                      <div ref={tipoTrabajoRef} className={`relative ${tipoTrabajoOpen ? "z-[100]" : "z-0"}`}>
                        <button
                          id="tipo-trabajo-trigger"
                          type="button"
                          onClick={() => {
                            setTipoTrabajoTouched(true);
                            setTipoTrabajoOpen((open) => !open);
                          }}
                          disabled={servicios.length === 0}
                          aria-expanded={tipoTrabajoOpen}
                          aria-haspopup="listbox"
                          aria-required
                          aria-invalid={tipoTrabajoInvalid}
                          aria-describedby={tipoTrabajoInvalid ? "tipo-trabajo-error" : undefined}
                          className={`${inputLikeClassName} flex w-full items-center justify-between gap-2 pr-10 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                            tipoTrabajoInvalid
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400 dark:focus:border-red-400"
                              : ""
                          }`}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate ${
                              tipoTrabajoIds.length === 0 ? "text-[#A1A1AA] dark:text-[#8ea0b8]" : "text-[#09090B] dark:text-[#e5e7eb]"
                            }`}
                          >
                            {servicios.length === 0
                              ? "Cargando servicios…"
                              : tipoTrabajoIds.length === 0
                                ? "Selecciona"
                                : tipoTrabajoDisplay}
                          </span>
                        </button>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E77] dark:text-[#8ea0b8]">
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
                            className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-[#E7E7EA] bg-[#ffffff] shadow-xl ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827]/95 dark:ring-white/10"
                            role="listbox"
                            aria-label="Servicios disponibles"
                            aria-multiselectable
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#E7E7EA] bg-[#FAFAFA]/95 px-3 py-2 dark:border-[#273244] dark:bg-[#0f172a]/90">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8ea0b8]">
                                Servicios
                              </span>
                              <div className="flex items-center gap-2">
                                {tipoTrabajoIds.length > 0 && (
                                  <span className="text-[10px] tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">
                                    {tipoTrabajoIds.length} sel.
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTipoTrabajoTouched(true);
                                    setTipoTrabajo(servicios.map((s) => s.id));
                                  }}
                                  className="text-[10px] font-medium text-[#1B5CFF] hover:text-[#1244D1] dark:text-[#4B7CFF] dark:hover:text-[#4B7CFF]"
                                >
                                  Todos
                                </button>
                                <span className="text-[#D3D3D8] dark:text-[#475569]" aria-hidden>
                                  ·
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTipoTrabajoTouched(true);
                                    setTipoTrabajo([]);
                                  }}
                                  className="text-[10px] font-medium text-[#6E6E77] hover:text-[#52525B] dark:text-[#8ea0b8] dark:hover:text-[#cbd5e1]"
                                >
                                  Ninguno
                                </button>
                              </div>
                            </div>

                            <ul className="max-h-52 divide-y divide-[#E7E7EA]/90 overflow-y-auto custom-scrollbar dark:divide-[#273244] sm:max-h-56">
                              {servicios.map((s) => {
                                const checked = tipoTrabajoIds.includes(s.id);
                                return (
                                  <li key={s.id} role="option" aria-selected={checked}>
                                    <label
                                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors sm:px-4 sm:py-3 ${
                                        checked
                                          ? "bg-[#EAF1FF]/90 dark:bg-[#1B5CFF]/10"
                                          : "hover:bg-[#1B5CFF]/[0.04] dark:hover:bg-white/[0.03]"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setTipoTrabajoTouched(true);
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
                                            ? "border-[#1B5CFF] bg-[#1B5CFF] text-[#0f172a] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:text-[#0f172a]"
                                            : "border-[#D3D3D8] bg-white dark:border-[#475569] dark:bg-[#111827]"
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
                                            ? "font-medium text-[#09090B] dark:text-[#f8fafc]"
                                            : "text-[#52525B] dark:text-[#cbd5e1]"
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
                      {tipoTrabajoInvalid && (
                        <p id="tipo-trabajo-error" className="mt-1 text-xs text-[#C22B2B] dark:text-[#F87171]">
                          Selecciona al menos un tipo de trabajo.
                        </p>
                      )}
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
                </section>

                <section aria-labelledby="cotizacion-productos-heading" className={`${sectionZoneClass} ${sectionDividerClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
                    <div>
                      <p className={sectionEyebrowClass}>Paso 2</p>
                      <h2 id="cotizacion-productos-heading" className={`mt-1 ${sectionHeadingClass}`}>
                        Productos y conceptos
                      </h2>
                    </div>
                    <span className={conceptCountBadgeClass}>
                      {computed.lines.length} {computed.lines.length === 1 ? "línea" : "líneas"}
                    </span>
                  </div>

                <ComponentCard
                  title="Agregar productos o servicios"
                  desc="Arma una línea: primero qué vendes, luego precio y descuento."
                  className={`${cardShellClass.replace(/^overflow-hidden\b/, "overflow-visible")} ${
                    conceptoOpen || syscomOpen ? "relative z-[200]" : ""
                  }`}
                  compact
                  actions={
                    <button
                      type="button"
                      onClick={clearConceptoForm}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E7EA] bg-[#ffffff] text-[#6E6E77] transition-colors hover:border-[#BBD0FF] hover:bg-[#F1F5FF] hover:text-[#1B5CFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/25 dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/40 dark:hover:bg-[#4B7CFF]/10 dark:hover:text-[#4B7CFF]"
                      aria-label="Limpiar sección de producto"
                      title="Limpiar"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M6 6l1 16h10l1-16" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  }
                >
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {editingConceptoId ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBD0FF] bg-[#F1F5FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1244D1] dark:border-[#4B7CFF]/35 dark:bg-[#4B7CFF]/12 dark:text-[#4B7CFF]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1B5CFF]" aria-hidden />
                          Editando línea
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E7EA] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6E6E77] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8]">
                          Nueva línea
                        </span>
                      )}
                      {esFormularioProducto ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                          Producto / catálogo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                          Concepto / servicio
                        </span>
                      )}
                      {preview.sinIvaEfectivo ? (
                        <span className="inline-flex items-center rounded-full border border-[#1B5CFF]/30 bg-[#1B5CFF]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1244D1] dark:text-[#4B7CFF]">
                          Sin IVA
                        </span>
                      ) : null}
                      <p className="ml-auto hidden text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] lg:block">
                        Producto primero → precio de lista; concepto para el texto final.
                      </p>
                    </div>

                    <fieldset
                      className={`relative overflow-visible rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-3.5 dark:border-[#273244] dark:bg-[#1B2539] sm:p-4 ${
                        conceptoOpen ? "z-30" : "z-10"
                      }`}
                    >
                      <legend className="sr-only">Qué vendes</legend>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#1B5CFF]/15 text-[11px] font-bold tabular-nums text-[#1244D1] dark:bg-[#1B5CFF]/20 dark:text-[#4B7CFF]" aria-hidden>
                          1
                        </span>
                        <div>
                          <p className={sectionEyebrowClass}>Qué vendes</p>
                          <p className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Cantidad, concepto o producto de catálogo</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-3">
                        <div className="sm:col-span-2">
                          <Label className={labelPageClass}>Cant.</Label>
                          <input
                            className={`${numberInputClass} min-h-[46px] text-center text-base font-semibold`}
                            type="number"
                            inputMode="numeric"
                            value={String(cantidad)}
                            onChange={(e) => setCantidad(toNumber(e.target.value, 0))}
                            min="1"
                            step="1"
                            placeholder="1"
                            aria-label="Cantidad"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <Label className={labelPageClass}>Concepto</Label>
                          <div className={`relative ${conceptoOpen ? "z-[100]" : "z-0"}`} ref={conceptoRef}>
                            <input
                              className={`${inputLikeClassName} min-h-[46px] text-sm sm:text-base ${bloquearConceptoInput ? "opacity-60" : ""}`}
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
                              placeholder={bloquearConceptoInput ? "Bloqueado por producto" : "Buscar folio o escribir…"}
                              autoComplete="off"
                              aria-expanded={conceptoOpen}
                              aria-controls={conceptoOpen ? "cotizacion-concepto-sugerencias" : undefined}
                            />
                            {!bloquearConceptoInput && conceptoOpen && (
                              <div
                                id="cotizacion-concepto-sugerencias"
                                role="listbox"
                                className="absolute left-0 right-0 top-full z-[120] mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-[#E7E7EA] bg-[#ffffff] shadow-[0_18px_40px_-20px_rgba(9,9,11,0.35)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827]/95 dark:ring-white/10"
                              >
                                <button
                                  type="button"
                                  role="option"
                                  onClick={() => {
                                    handleConceptoInputChange(conceptoSearch);
                                    setConceptoOpen(false);
                                  }}
                                  className="w-full border-b border-[#E7E7EA]/80 px-3 py-2.5 text-left text-sm text-[#52525B] transition-colors hover:bg-[#F1F5FF] dark:border-[#273244] dark:text-[#cbd5e1] dark:hover:bg-white/[0.06]"
                                >
                                  Usar: <span className="font-medium text-[#09090B] dark:text-[#f8fafc]">{conceptoSearch.trim() || "Concepto personalizado"}</span>
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
                                      role="option"
                                      onClick={() => {
                                        handleConceptoInputChange(String(c.concepto || ""));
                                        setConceptoOpen(false);
                                      }}
                                      className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5FF] dark:hover:bg-white/[0.06]"
                                    >
                                      <div className="font-medium text-[#09090B] dark:text-[#f8fafc]">{c.concepto || "Sin nombre"}</div>
                                      <div className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                                        {`Folio ${c.folio} · ${formatMoney(toNumber(c.precio1, 0))}`}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-5">
                          <Label className={labelPageClass}>Producto</Label>
                          <div ref={syscomInputWrapRef} className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]" aria-hidden>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="7" />
                                <path d="M20 20l-3-3" />
                              </svg>
                            </span>
                            <input
                              className={`${inputLikeClassName} min-h-[46px] pl-9 text-sm sm:text-base ${bloquearProductoInput ? "opacity-60" : ""}`}
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
                              placeholder={bloquearProductoInput ? "Bloqueado por concepto" : "Manual / SYSCOM / TVC…"}
                              autoComplete="off"
                            />
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="relative z-0 rounded-2xl border border-[#E7E7EA]/90 bg-[#ffffff]/70 p-3.5 dark:border-[#273244] dark:bg-[#0f172a]/35 sm:p-4">
                      <legend className="sr-only">Precio y condiciones</legend>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#09090B]/8 text-[11px] font-bold tabular-nums text-[#52525B] dark:bg-white/10 dark:text-[#cbd5e1]" aria-hidden>
                          2
                        </span>
                        <div>
                          <p className={sectionEyebrowClass}>Precio</p>
                          <p className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Lista, descuento{canMarcarSinIva ? ", IVA" : ""} y categoría</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-3 sm:items-start">
                        <div className="sm:col-span-4">
                          <Label className={labelPageClass}>Precio de lista</Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] dark:text-[#64748b]" aria-hidden>
                              $
                            </span>
                            <input
                              className={`${numberInputClass} pl-7 font-semibold`}
                              type="number"
                              inputMode="decimal"
                              value={numValue(precioLista)}
                              onChange={(e) => setPrecioLista(toNumber(e.target.value, 0))}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <Label className={labelPageClass}>Desct.</Label>
                          <div className="relative">
                            <input
                              className={`${numberInputClass} pr-7 text-right`}
                              type="number"
                              inputMode="decimal"
                              value={numValue(descuentoPct)}
                              onChange={(e) => setDescuentoPct(clampPct(toNumber(e.target.value, 0)))}
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] dark:text-[#64748b]" aria-hidden>
                              %
                            </span>
                          </div>
                        </div>

                        {canMarcarSinIva && (
                          <div className="sm:col-span-3 flex min-h-[46px] items-center rounded-xl border border-[#E7E7EA]/80 bg-[#FAFAFA]/80 px-3.5 py-2.5 dark:border-[#273244] dark:bg-[#111827]/50 sm:mt-6">
                            <Switch
                              label="Sin IVA"
                              checked={sinIva}
                              onChange={setSinIva}
                            />
                          </div>
                        )}

                        {categorias.length > 0 && (
                          <div className={canMarcarSinIva ? "sm:col-span-3" : "sm:col-span-6"}>
                            <Label className={labelPageClass}>Categoría</Label>
                            <select
                              className={inputLikeClassName}
                              value={categoriaIdParaAgregar}
                              onChange={(e) => setCategoriaIdParaAgregar(e.target.value)}
                            >
                              <option value="">Sin categoría</option>
                              {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </fieldset>

                    <div className={`relative z-0 ${summaryHeroClass}`}>
                      <div
                        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#1B5CFF]/15 blur-2xl dark:bg-[#1B5CFF]/20"
                        aria-hidden
                      />
                      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid flex-1 grid-cols-2 gap-4 sm:max-w-md">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1B5CFF]/80 dark:text-[#4B7CFF]/80 sm:text-[11px]">
                              Unitario{preview.sinIvaEfectivo ? " (sin IVA)" : " base"}
                            </div>
                            <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-[#09090B] dark:text-[#f8fafc] sm:text-xl">
                              {formatMoney(preview.puBase)}
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1B5CFF]/80 dark:text-[#4B7CFF]/80 sm:text-[11px]">
                              Importe de línea
                            </div>
                            <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-2xl">
                              {formatMoney(preview.importeCobrado ?? preview.importe)}
                            </div>
                            {preview.sinIvaEfectivo ? (
                              <p className="mt-0.5 text-[10px] text-[#1B5CFF]/70 dark:text-[#4B7CFF]/70">Cobrado sin IVA</p>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addConcepto}
                          disabled={!canAddConcepto}
                          className={`${primaryActionInlineBtnClass} shrink-0 sm:min-w-[11rem]`}
                        >
                          {editingConceptoId ? (
                            <>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Actualizar línea
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                              </svg>
                              Agregar línea
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </ComponentCard>

                <ComponentCard
                  title="Listado de conceptos"
                  desc="Organiza por categorías, revisa cantidades y precios. Arrastra productos o encabezados para reordenar."
                  className={cardShellClass}
                  compact
                >
                  <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-[#E7E7EA]/80 bg-[#FAFAFA]/80 px-3 py-2 text-[10px] text-[#6E6E77] dark:border-[#273244] dark:bg-[#111827]/50 dark:text-[#8ea0b8] sm:hidden">
                    <span className="inline-block h-px w-4 bg-[#1B5CFF]/50" aria-hidden />
                    Desliza horizontalmente para ver todas las columnas
                  </p>
                  <div className={tableWrapClass}>
                    <div className="p-1 sm:p-2">
                      <CotizacionConceptosTable
                        lines={computed.lines}
                        categorias={categorias}
                        onReorderProducts={handleReorderProducts}
                        onReorderCategorias={handleReorderCategorias}
                        onAddCategoria={handleAddCategoria}
                        onUpdateCategoria={handleUpdateCategoria}
                        onRemoveCategoria={handleRemoveCategoria}
                        onEdit={editConcepto}
                        onRemove={removeConcepto}
                      />
                    </div>
                  </div>
                </ComponentCard>
                </section>

                <section aria-labelledby="cotizacion-notas-heading" className={`${sectionZoneClass} ${sectionDividerClass}`}>
                  <div className="px-0.5">
                    <p className={sectionEyebrowClass}>Paso 3</p>
                    <h2 id="cotizacion-notas-heading" className={`mt-1 ${sectionHeadingClass}`}>
                      Notas y condiciones
                    </h2>
                  </div>
                <ComponentCard
                  title="Textos del documento"
                  desc="Texto opcional que aparecerá en el documento de cotización."
                  className={cardShellClass}
                  compact
                >
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <Label className={labelPageClass}>Texto arriba de los precios</Label>
                        <span className="text-[10px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-[11px]">Máx. 5000</span>
                      </div>
                      <textarea
                        value={textoArribaPrecios}
                        onChange={(e) => setTextoArribaPrecios(e.target.value.slice(0, 5000))}
                        className={`${textareaLikeClassName} mt-2`}
                        rows={6}
                      />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <Label className={labelPageClass}>Términos y condiciones</Label>
                        <span className="text-[10px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-[11px]">Máx. 8000</span>
                      </div>
                      <textarea
                        value={terminos}
                        onChange={(e) => setTerminos(e.target.value.slice(0, 8000))}
                        className={`${textareaLikeClassName} mt-2`}
                        rows={6}
                      />
                    </div>
                  </div>
                </ComponentCard>
                </section>
              </div>

              <aside className="min-w-0 space-y-5 lg:col-span-4 lg:sticky lg:top-6 lg:self-start xl:top-8">
                <ComponentCard
                  title="Resumen"
                  desc="Totales calculados en tiempo real."
                  className={cardShellClass}
                  compact
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2.5 dark:border-[#273244] dark:bg-[#111827]/90">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#52525B] dark:text-[#e5e7eb] sm:text-sm">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#6E6E77] dark:text-[#8ea0b8] sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M8 2v3M16 2v3M4 7h16M6 10h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Fecha</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[#09090B] dark:text-[#f8fafc] sm:text-sm">{formatDMY(todayIso)}</span>
                    </div>

                    <div className={summaryHeroClass}>
                      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#1B5CFF]/12 blur-2xl" aria-hidden />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]">
                            Total estimado
                          </span>
                          <span className="rounded-md border border-[#1B5CFF]/20 bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1B5CFF] dark:border-[#1B5CFF]/25 dark:bg-[#111827]/50 dark:text-[#4B7CFF] sm:text-[10px]">
                            MXN
                          </span>
                        </div>
                        <div className="mt-1.5 text-[2rem] font-semibold leading-none tabular-nums tracking-tight text-[#09090B] dark:text-[#f8fafc] sm:text-[2.25rem]">
                          {formatMoney(computed.total)}
                        </div>

                        <dl className="mt-4 space-y-2 rounded-xl border border-[#1B5CFF]/12 bg-white/55 p-3 dark:border-[#1B5CFF]/20 dark:bg-[#0f172a]/40">
                          {computed.descuentoLineas >= 0.01 && (
                            <div className="flex items-center justify-between">
                              <dt className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-xs">Descuento conceptos</dt>
                              <dd className="text-xs font-medium tabular-nums text-[#C22B2B] dark:text-[#F87171] sm:text-sm">-{formatMoney(computed.descuentoLineas)}</dd>
                            </div>
                          )}
                          {!!toNumber(computed.descClientePct, 0) && (
                            <>
                              <div className="flex items-center justify-between">
                                <dt className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-xs">Importe conceptos</dt>
                                <dd className="text-xs font-medium tabular-nums text-[#09090B] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.subtotalLineas)}</dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-xs">Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)</dt>
                                <dd className="text-xs font-medium tabular-nums text-[#C22B2B] dark:text-[#F87171] sm:text-sm">-{formatMoney(computed.descuentoCliente)}</dd>
                              </div>
                            </>
                          )}
                          {(computed.descuentoLineas >= 0.01 || !!toNumber(computed.descClientePct, 0)) && (
                            <div className="my-1 h-px bg-[#1B5CFF]/10 dark:bg-[#1B5CFF]/20" aria-hidden />
                          )}
                          <div className="flex items-center justify-between">
                            <dt className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-xs">Subtotal</dt>
                            <dd className="text-xs font-medium tabular-nums text-[#09090B] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.subtotalSinIva)}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:text-xs">IVA (16%)</dt>
                            <dd className="text-xs font-medium tabular-nums text-[#09090B] dark:text-[#f8fafc] sm:text-sm">{formatMoney(computed.ivaDesglose)}</dd>
                          </div>
                          <div className="flex items-center justify-between border-t border-[#1B5CFF]/15 pt-2 dark:border-[#1B5CFF]/20">
                            <dt className="text-[11px] font-semibold text-[#52525B] dark:text-[#B7C1D1] sm:text-xs">Total con IVA</dt>
                            <dd className="text-sm font-semibold tabular-nums text-[#09090B] dark:text-[#f8fafc]">{formatMoney(computed.totalConIva)}</dd>
                          </div>
                        </dl>

                        {(() => {
                          const pct = clampAnticipo(toNumber(anticipoPct, ANTICIPO_PCT_DEFAULT));
                          const anticipoMonto = computed.totalConIva * (pct / 100);
                          const saldoMonto = Math.max(0, computed.totalConIva - anticipoMonto);
                          return (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-[#1B5CFF]/25 bg-[#1B5CFF]/[0.07] p-2.5 dark:border-[#4B7CFF]/30 dark:bg-[#4B7CFF]/10">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">
                                  Anticipo {pct.toFixed(0)}%
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#09090B] dark:text-[#f8fafc]">
                                  {formatMoney(anticipoMonto)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[#E7E7EA] bg-white/70 p-2.5 dark:border-[#273244] dark:bg-[#0f172a]/55">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8ea0b8]">
                                  Saldo {(100 - pct).toFixed(0)}%
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#09090B] dark:text-[#f8fafc]">
                                  {formatMoney(saldoMonto)}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {!canGuardarCotizacion && (
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-100/95">Completa lo siguiente para guardar</p>
                        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-amber-900/90 dark:text-amber-200/90">
                          {!clienteId && <li>Selecciona un cliente</li>}
                          {!!clienteId &&
                            !!String(contactoNombre || "").trim() &&
                            !medioContacto && <li>Selecciona un medio de contacto</li>}
                          {tipoTrabajoIds.length === 0 && <li>Selecciona al menos un tipo de trabajo</li>}
                          {!computed.lines.length && <li>Agrega al menos un producto o servicio</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </ComponentCard>

                <ComponentCard
                  title="Acciones"
                  desc="Guarda, exporta, envía por correo o reinicia el formulario."
                  className={cardShellClass}
                  compact
                >
                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={!canGuardarCotizacion}
                      onClick={() => {
                        void handleSaveCotizacion(true);
                      }}
                      title={
                        !clienteId
                          ? "Selecciona un cliente"
                          : tipoTrabajoIds.length === 0
                            ? "Selecciona al menos un tipo de trabajo"
                            : undefined
                      }
                      className={primaryActionBtnClass}
                    >
                      {isEditingRoute ? "Actualizar cotización" : "Guardar cotización"}
                    </button>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion || exportBusy}
                        onClick={() => void handleOpenPdf()}
                        className={secondaryActionBtnClass}
                      >
                        {previewLoading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                            </svg>
                            Generando...
                          </>
                        ) : (
                          "Ver vista PDF"
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={exportBusy || !String(editingCotizacionId || activeCotizacionId || "").trim()}
                        onClick={() => void handleDownloadExcel()}
                        className={tertiaryActionBtnClass}
                        title={
                          !String(editingCotizacionId || activeCotizacionId || "").trim()
                            ? "Guarda la cotización para descargar el Excel"
                            : undefined
                        }
                      >
                        {excelLoading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                            </svg>
                            Generando...
                          </>
                        ) : (
                          "Descargar Excel"
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!canGuardarCotizacion || exportBusy || enviarCorreoSaving || !canEnviarPorCorreo}
                      onClick={() => void handleEnviarPorCorreo()}
                      className={correoActionBtnClass}
                      title={
                        !canEnviarPorCorreo
                          ? "Solo se puede enviar en estado Pendiente o Autorizada"
                          : !canGuardarCotizacion
                            ? "Completa cliente, contacto y conceptos para enviar"
                            : undefined
                      }
                    >
                      {enviarCorreoSaving ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                          </svg>
                          Preparando...
                        </>
                      ) : (
                        <>
                          <MailIcon className="h-4 w-4 shrink-0" />
                          Enviar PDF por correo
                        </>
                      )}
                    </button>

                    <div className="space-y-2 border-t border-[#E7E7EA] pt-3 dark:border-[#273244]">
                      <button type="button" onClick={() => setClearFormModalOpen(true)} className={ghostActionBtnClass}>
                        Limpiar formulario
                      </button>
                      {!editingCotizacionId && canCotizacionesCreate && (
                        <button
                          type="button"
                          onClick={() => {
                            resetCloneSearch();
                            resetCloneClienteState();
                            setCloneModalOpen(true);
                          }}
                          className={cloneActionBtnClass}
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

                <section aria-labelledby="cotizacion-pdf-heading" className={sectionZoneClass}>
                  <div className="px-0.5 lg:hidden">
                    <p className={sectionEyebrowClass}>Paso 4</p>
                    <h2 id="cotizacion-pdf-heading" className={`mt-1 ${sectionHeadingClass}`}>
                      Opciones del PDF
                    </h2>
                  </div>
                  <CotizacionPdfOptionsPanel
                    opciones={pdfOpciones}
                    onOpcionesChange={setPdfOpciones}
                    descripcionesCortas={pdfDescripcionCorta}
                    onDescripcionCortaChange={(conceptoId, value) => {
                      setPdfDescripcionCorta((prev) => ({ ...prev, [conceptoId]: value }));
                    }}
                    lines={computed.lines.map((c) => ({
                      id: c.id,
                      producto_nombre: c.producto_nombre,
                      producto_descripcion: c.producto_descripcion,
                    }))}
                  />
                </section>
              </aside>
            </div>

          </>
        )}
      </div>
    </div>
  );
}