import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { fetchApi } from "@/config/api";
import { fetchMarcaPublic } from "@/config/marcaApi";
import { MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";
import { terminosCotizacionDefault } from "@/pages/Ventas/Cotizacion/terminosCotizacionDefault";
import { fetchClientesCatalog } from "@/components/clientes/fetchClientesCatalog";
import type { Cliente } from "@/types/cliente";
import type { CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";
import {
  normalizeCotizacionesAdjuntas,
  normalizeFotosExtraFromOrden,
  normalizeStatusAdministrativo,
  COMENTARIO_TECNICO_MIN_LENGTH,
  ORDEN_BASE_MAX_FOTOS,
  type FotosExtraMax,
  type Orden,
  type OrdenCotizacionAdjunta,
  type OrdenEquipoInventarioLinea,
  type OrdenStatusAdministrativo,
  type ServicioCatalogo,
  type Usuario,
} from "../shared/ordenesPageTypes";
import {
  deleteImageFromCloudinary,
  fetchServiciosApi,
  fetchUsuariosApi,
  getPublicIdFromUrl,
  isOrdenResuelta,
  isOrdenServicioTecnico,
  ORDENES_PAGE_INIT_THROTTLE_MS,
} from "../shared/useOrdenesShared";
import {
  collectOrdenImageFiles,
  ORDEN_IMAGE_ACCEPT,
  ordenImageRejectMessage,
  uploadOrdenImageBatch,
} from "../shared/ordenImageUpload";
import { round2 } from "../shared/ordenesPageUtils";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import {
  addEquipoFromItem as addEquipoFromItemPure,
  filterEquiposForWritePayload,
  normalizeEquiposInventario,
  removeEquipoLinea,
  updateEquipoLinea,
  type OrdenEquipoLineaPatch,
} from "./ordenEquiposDraft";

export type OrdenFormData = {
  folio: string;
  cliente_id: number | null;
  contacto_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  nombre_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: "pendiente" | "resuelto";
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  tecnico_asignado: number | null;
  quien_instalo: number | null;
  quien_entrego: number | null;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  fotos_extra_max: FotosExtraMax;
  equipos_inventario: OrdenEquipoInventarioLinea[];
};

export function createEmptyOrdenFormData(mySignatureUrl = ""): OrdenFormData {
  return {
    folio: "",
    cliente_id: null,
    contacto_id: null,
    cliente: "",
    direccion: "",
    telefono_cliente: "",
    nombre_cliente: "",
    problematica: "",
    servicios_realizados: [],
    status: "pendiente",
    comentario_tecnico: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    hora_inicio: "",
    fecha_finalizacion: "",
    hora_termino: "",
    nombre_encargado: "",
    tecnico_asignado: null,
    quien_instalo: null,
    quien_entrego: null,
    firma_encargado_url: mySignatureUrl,
    firma_cliente_url: "",
    fotos_urls: [],
    fotos_extra_max: 0,
    equipos_inventario: [],
  };
}

const toNullIfEmpty = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? null : v;

export function buildOrdenWritePayload(opts: {
  formData: OrdenFormData;
  variant: "admin" | "tecnico";
  isAdmin: boolean;
  /** Equipos cargados de la orden al abrir edición (fuente de verdad para no-admin). */
  baselineEquipos?: OrdenEquipoInventarioLinea[] | unknown;
  statusAdministrativo?: OrdenStatusAdministrativo;
  fechaEnvioAdmin?: string;
  cotizacionesAdmin?: CotizacionResumen[];
  /** Firma del cliente al abrir la orden (detalle). Evita borrarla si el form llegó vacío sin Limpiar. */
  baselineFirmaClienteUrl?: string;
  /** true solo si el usuario pulsó Limpiar / vació la firma a propósito. */
  firmaClienteExplicitlyCleared?: boolean;
  isUpdate?: boolean;
}): Record<string, unknown> {
  const {
    formData,
    variant,
    isAdmin,
    baselineEquipos,
    statusAdministrativo = "pendiente",
    fechaEnvioAdmin = "",
    cotizacionesAdmin = [],
    baselineFirmaClienteUrl = "",
    firmaClienteExplicitlyCleared = false,
    isUpdate = false,
  } = opts;

  const payload: Record<string, unknown> = { ...formData };
  delete payload.firma_encargado_url;
  delete payload.contacto_id;

  if (payload.tecnico_asignado == null) delete payload.tecnico_asignado;
  if (payload.quien_instalo == null) delete payload.quien_instalo;
  if (payload.quien_entrego == null) delete payload.quien_entrego;

  payload.direccion = toNullIfEmpty(payload.direccion);
  payload.telefono_cliente = toNullIfEmpty(payload.telefono_cliente);
  payload.problematica = toNullIfEmpty(payload.problematica);
  payload.comentario_tecnico = toNullIfEmpty(payload.comentario_tecnico);
  payload.fecha_inicio = toNullIfEmpty(payload.fecha_inicio);
  payload.hora_inicio = toNullIfEmpty(payload.hora_inicio);
  payload.fecha_finalizacion = toNullIfEmpty(payload.fecha_finalizacion);
  payload.hora_termino = toNullIfEmpty(payload.hora_termino);
  payload.nombre_encargado = toNullIfEmpty(payload.nombre_encargado);
  payload.nombre_cliente = toNullIfEmpty(payload.nombre_cliente);

  const firmaTrimmed =
    typeof payload.firma_cliente_url === "string" ? payload.firma_cliente_url.trim() : "";
  if (firmaTrimmed) {
    payload.firma_cliente_url = firmaTrimmed;
  } else if (firmaClienteExplicitlyCleared) {
    payload.firma_cliente_url = "";
  } else if (String(baselineFirmaClienteUrl || "").trim()) {
    payload.firma_cliente_url = String(baselineFirmaClienteUrl).trim();
  } else if (isUpdate) {
    // No mandar vacío en update: el backend omite y conserva la firma en BD.
    delete payload.firma_cliente_url;
  } else {
    payload.firma_cliente_url = "";
  }

  if (variant === "tecnico") {
    payload.firma_encargado_url = toNullIfEmpty(formData.firma_encargado_url);
  }

  if (!Array.isArray(payload.servicios_realizados)) {
    payload.servicios_realizados = [];
  }

  if (variant === "admin" && isAdmin) {
    payload.status_administrativo = statusAdministrativo;
    payload.fecha_envio = fechaEnvioAdmin.trim() ? fechaEnvioAdmin.trim().slice(0, 10) : null;
    payload.cotizaciones_adjuntas = cotizacionesAdmin.map((c) => {
      const row: OrdenCotizacionAdjunta = {
        id: c.id,
        origen: c.origen,
        folio: c.folio,
        cliente: c.cliente,
        fecha: String(c.fecha || "").slice(0, 10),
      };
      if (c.contacto) row.contacto = c.contacto;
      return row;
    });
  } else {
    delete payload.status_administrativo;
    delete payload.fecha_envio;
    delete payload.cotizaciones_adjuntas;
  }

  // Echo server movimientoSalidaId; never invent ids client-side.
  // Non-admin: freeze qty/entrega/membership to baseline; only estadoInstalacion may change.
  payload.equipos_inventario = filterEquiposForWritePayload({
    isAdmin,
    draft: formData.equipos_inventario,
    baseline: baselineEquipos,
  });

  return payload;
}

type LevantamientoSnap = {
  payload: Record<string, unknown>;
  dibujo_url: string;
  cerco_materiales?: unknown[];
};

async function persistLevantamientoExtras(
  savedOrden: Orden,
  snap: LevantamientoSnap,
  logPrefix: string,
): Promise<void> {
  await fetchApi(`/api/ordenes/${savedOrden.id}/levantamiento/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: snap.payload || {},
      dibujo_url: snap.dibujo_url || "",
    }),
  }).catch(() => null);

  try {
    const payloadTipo = String(snap.payload?.tipo || "").toLowerCase();
    const cercoItems = Array.isArray(snap.cerco_materiales) ? snap.cerco_materiales : [];
    if (payloadTipo !== "cerco" || cercoItems.length === 0) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const cid = savedOrden.cliente_id ?? null;
    const clienteNombre = String(savedOrden.cliente || "").trim();
    const contactoNombre = String(savedOrden.nombre_cliente || "").trim();

    const subtotalRaw = cercoItems.reduce((acc: number, it: unknown) => {
      const row = it as Record<string, unknown>;
      const qty = Number(row.cantidad || 0);
      const price = Number(row.precio_lista || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
      return acc + qty * price;
    }, 0);
    const subtotal = round2(subtotalRaw);
    const ivaPct = 16;
    const iva = round2(subtotal * (ivaPct / 100));
    const total = round2(subtotal + iva);

    let nombreEmpresa = MARCA_NOMBRE_DEFAULT;
    try {
      nombreEmpresa = (await fetchMarcaPublic()).nombre;
    } catch {
      /* keep default */
    }

    const cotPayload: Record<string, unknown> = {
      cliente_id: cid != null ? Number(cid) : null,
      cliente: clienteNombre,
      prospecto: !cid,
      contacto: contactoNombre,
      medio_contacto: "OTRO",
      status: "PENDIENTE",
      fecha: todayIso,
      subtotal,
      descuento_cliente_pct: 0,
      iva_pct: ivaPct,
      iva,
      total,
      texto_arriba_precios: "A continuación cotización solicitada:",
      terminos: terminosCotizacionDefault(nombreEmpresa),
      items: cercoItems.map((it: unknown, index: number) => {
        const row = it as Record<string, unknown>;
        return {
          producto_externo_id: String(row.producto_externo_id || ""),
          producto_nombre: String(row.producto_nombre || ""),
          producto_descripcion: String(row.producto_descripcion || ""),
          unidad: String(row.unidad || ""),
          cantidad: round2(Number(row.cantidad || 0)),
          precio_lista: round2(Number(row.precio_lista || 0)),
          descuento_pct: 0,
          orden: index,
        };
      }),
    };

    const ordenMarker = `ORDEN #${savedOrden.id}`;
    let existingCotizacionId: number | null = null;
    try {
      const searchParam = encodeURIComponent(ordenMarker);
      const searchRes = await fetchApi(`/api/cotizaciones/?search=${searchParam}`, {
        cache: "no-store" as RequestCache,
      });
      if (searchRes.ok) {
        const data = await searchRes.json().catch(() => null);
        const searchRows = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
        if (searchRows.length > 0 && searchRows[0]?.id != null) {
          existingCotizacionId = Number(searchRows[0].id);
        }
      }
    } catch (searchErr) {
      console.warn(`No se pudo buscar cotización existente (${logPrefix}):`, searchErr);
    }

    const isUpdate = existingCotizacionId != null;
    const cotPath = isUpdate ? `/api/cotizaciones/${existingCotizacionId}/` : "/api/cotizaciones/";
    const cotMethod = isUpdate ? "PUT" : "POST";

    const cotRes = await fetchApi(cotPath, {
      method: cotMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cotPayload),
    });

    if (!cotRes.ok) {
      let detail: unknown = null;
      try {
        detail = await cotRes.json();
      } catch {
        try {
          detail = await cotRes.text();
        } catch {
          detail = null;
        }
      }
      console.warn(
        `No se pudo ${isUpdate ? "actualizar" : "crear"} cotización (${logPrefix}). Status:`,
        cotRes.status,
        "Detalle:",
        typeof detail === "string" ? detail : JSON.stringify(detail, null, 2),
      );
    }
  } catch (e) {
    console.error(`Error creando cotización desde levantamiento (${logPrefix}):`, e);
  }
}

export type UseOrdenFormDraftOpts = {
  variant: "admin" | "tecnico";
  open: boolean;
  editingOrden: Orden | null;
  setEditingOrden: React.Dispatch<React.SetStateAction<Orden | null>>;
  tipoOrden: string;
  isLimitedEdit: boolean;
  userId: number | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  mySignatureUrl: string;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  setOrdenes: React.Dispatch<React.SetStateAction<Orden[]>>;
  fetchOrdenes: () => Promise<void>;
  levantamientoSnapshotRef: RefObject<LevantamientoSnap | null>;
  activeTabRef: RefObject<"cliente" | "orden" | "equipos">;
  goToOrdenTab: (fromPointer?: boolean) => void;
  setAlert: React.Dispatch<React.SetStateAction<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>>;
  setModalAlert: React.Dispatch<React.SetStateAction<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>>;
  onAfterSaveClose: () => void;
  openEnviarPdfModal: (orden: Orden) => void;
  onSaved?: (orden: Orden) => void | Promise<void>;
};

let adminServiciosLastLoadAt = 0;
let tecnicoServiciosLastLoadAt = 0;

export function useOrdenFormDraft(opts: UseOrdenFormDraftOpts) {
  const {
    variant,
    open,
    editingOrden,
    setEditingOrden,
    tipoOrden,
    isLimitedEdit,
    userId,
    isAdmin,
    isAuthenticated,
    mySignatureUrl,
    clientes,
    setClientes,
    setUsuarios,
    setOrdenes,
    fetchOrdenes,
    levantamientoSnapshotRef,
    activeTabRef,
    goToOrdenTab,
    setAlert,
    setModalAlert,
    onAfterSaveClose,
    openEnviarPdfModal,
    onSaved,
  } = opts;

  const formNonceRef = useRef(0);
  const [formData, setFormData] = useState<OrdenFormData>(() => createEmptyOrdenFormData());
  const [isSaving, setIsSaving] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const fotosUrlsRef = useRef<string[]>([]);

  const [statusAdministrativo, setStatusAdministrativo] =
    useState<OrdenStatusAdministrativo>("pendiente");
  const [fechaEnvioAdmin, setFechaEnvioAdmin] = useState("");
  const [cotizacionesAdmin, setCotizacionesAdmin] = useState<CotizacionResumen[]>([]);

  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);

  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [tecnicoSearch, setTecnicoSearch] = useState("");
  const [quienInstaloSearch, setQuienInstaloSearch] = useState("");
  const [quienEntregoSearch, setQuienEntregoSearch] = useState("");
  const [servicioSearch, setServicioSearch] = useState("");

  const [tecnicoSignatureUrl, setTecnicoSignatureUrl] = useState("");
  const tecnicoSignatureCacheRef = useRef<Record<number, string>>({});
  const firmaClienteBaselineRef = useRef("");
  const firmaClienteClearedRef = useRef(false);

  const resetAdminSeguimientoUi = useCallback(() => {
    setStatusAdministrativo("pendiente");
    setFechaEnvioAdmin("");
    setCotizacionesAdmin([]);
  }, []);

  const loadAdminSeguimientoFromOrden = useCallback((orden: Orden) => {
    setStatusAdministrativo(normalizeStatusAdministrativo(orden.status_administrativo));
    setFechaEnvioAdmin(String(orden.fecha_envio || "").slice(0, 10));
    const rows = normalizeCotizacionesAdjuntas(orden.cotizaciones_adjuntas);
    setCotizacionesAdmin(rows as CotizacionResumen[]);
  }, []);

  const clearSearchFields = useCallback(() => {
    setClienteSearch("");
    setTecnicoSearch("");
    setQuienInstaloSearch("");
    setQuienEntregoSearch("");
    setServicioSearch("");
  }, []);

  const resetForm = useCallback(() => {
    setFormData(createEmptyOrdenFormData(mySignatureUrl));
    if (variant === "admin") resetAdminSeguimientoUi();
    clearSearchFields();
    firmaClienteBaselineRef.current = "";
    firmaClienteClearedRef.current = false;
  }, [mySignatureUrl, variant, resetAdminSeguimientoUi, clearSearchFields]);

  const bumpFormNonce = useCallback(() => {
    formNonceRef.current += 1;
  }, []);

  const loadFromOrden = useCallback(
    (orden: Orden) => {
      bumpFormNonce();
      setFormData({
        folio: (orden.folio ?? "").toString(),
        cliente_id: orden.cliente_id || null,
        contacto_id: null,
        cliente: orden.cliente || "",
        direccion: orden.direccion || "",
        telefono_cliente: orden.telefono_cliente || "",
        nombre_cliente: orden.nombre_cliente || "",
        nombre_encargado: orden.nombre_encargado || "",
        problematica: orden.problematica || "",
        servicios_realizados: orden.servicios_realizados || [],
        comentario_tecnico: orden.comentario_tecnico || "",
        status: orden.status || "pendiente",
        fecha_inicio: orden.fecha_inicio || "",
        hora_inicio: orden.hora_inicio || "",
        fecha_finalizacion: orden.fecha_finalizacion || "",
        hora_termino: orden.hora_termino || "",
        tecnico_asignado: orden.tecnico_asignado ? Number(orden.tecnico_asignado) : null,
        quien_instalo: orden.quien_instalo ? Number(orden.quien_instalo) : null,
        quien_entrego: orden.quien_entrego ? Number(orden.quien_entrego) : null,
        firma_encargado_url: mySignatureUrl || orden.firma_encargado_url || "",
        firma_cliente_url: orden.firma_cliente_url || "",
        fotos_urls: Array.isArray(orden.fotos_urls) ? orden.fotos_urls : [],
        fotos_extra_max: normalizeFotosExtraFromOrden(orden),
        equipos_inventario: normalizeEquiposInventario(orden.equipos_inventario),
      });
      firmaClienteBaselineRef.current = String(orden.firma_cliente_url || "").trim();
      firmaClienteClearedRef.current = false;
      // El input usa solo el search state (sin fallback a formData), para poder borrar a mano.
      setClienteSearch(String(orden.cliente || "").trim());
      setTecnicoSearch(
        String(orden.tecnico_asignado_full_name || orden.tecnico_asignado_username || "").trim(),
      );
      setQuienInstaloSearch(
        String(orden.quien_instalo_full_name || orden.quien_instalo_username || "").trim(),
      );
      setQuienEntregoSearch(
        String(orden.quien_entrego_full_name || orden.quien_entrego_username || "").trim(),
      );
      setServicioSearch("");
      if (variant === "admin") loadAdminSeguimientoFromOrden(orden);
    },
    [bumpFormNonce, mySignatureUrl, variant, loadAdminSeguimientoFromOrden],
  );

  const addEquipoFromItem = useCallback((item: InventarioItem) => {
    setFormData((prev) => ({
      ...prev,
      equipos_inventario: addEquipoFromItemPure(prev.equipos_inventario, item),
    }));
  }, []);

  const updateEquipo = useCallback(
    (lineaId: string, patch: OrdenEquipoLineaPatch, stockMax?: number) => {
      setFormData((prev) => ({
        ...prev,
        equipos_inventario: updateEquipoLinea(prev.equipos_inventario, lineaId, patch, {
          stockMax,
        }),
      }));
    },
    [],
  );

  const removeEquipo = useCallback((lineaId: string) => {
    setFormData((prev) => ({
      ...prev,
      equipos_inventario: removeEquipoLinea(prev.equipos_inventario, lineaId),
    }));
  }, []);

  const fetchClientes = useCallback(
    async (search = "") => {
      try {
        const rows = await fetchClientesCatalog(search, 50);
        setClientes(rows);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
        setClientes([]);
      }
    },
    [setClientes],
  );

  const fetchUsuarios = useCallback(async () => {
    try {
      const rows = await fetchUsuariosApi();
      setUsuarios(rows as Usuario[]);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  }, []);

  const loadServiciosDisponibles = useCallback(async () => {
    if (!isAuthenticated) {
      setServiciosDisponibles([]);
      return;
    }

    const fallbackServicios = [
      "ALARMAS",
      "RASTREO",
      "INTERNET",
      "GPS",
      "SENSOR DE GASOLINA",
      "SENSOR DE TEMPERATURA",
      "CAMARA",
      "DASHCAM",
      "VENTA DE PRODUCTO",
    ];

    if (variant === "admin") {
      const names = await fetchServiciosApi(fallbackServicios);
      const merged = Array.from(new Set(names));
      setServiciosDisponibles(merged);
      localStorage.setItem("servicios_disponibles", JSON.stringify(merged));
      return;
    }

    try {
      const res = await fetchApi("/api/servicios/?page=1&page_size=500&ordering=idx", {
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setServiciosDisponibles([]);
        return;
      }
      const results = Array.isArray((data as { results?: ServicioCatalogo[] })?.results)
        ? ((data as { results: ServicioCatalogo[] }).results)
        : [];
      const names = results
        .filter((s) => s && typeof s.nombre === "string" && s.nombre.trim() && s.activo !== false)
        .map((s) => s.nombre.trim());
      setServiciosDisponibles(Array.from(new Set(names)));
    } catch {
      setServiciosDisponibles([]);
    }
  }, [isAuthenticated, variant]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 400);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    void fetchClientes(debouncedClienteSearch);
  }, [open, isAuthenticated, debouncedClienteSearch, fetchClientes]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    void fetchUsuarios();
  }, [open, isAuthenticated, fetchUsuarios]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    const now = Date.now();
    if (variant === "admin") {
      if (now - adminServiciosLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
      adminServiciosLastLoadAt = now;
    } else {
      if (now - tecnicoServiciosLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
      tecnicoServiciosLastLoadAt = now;
    }
    void loadServiciosDisponibles();
  }, [open, isAuthenticated, variant, loadServiciosDisponibles]);

  const loadTecnicoSignature = useCallback(
    async (tecUserId: number | null) => {
      if (!tecUserId) {
        setTecnicoSignatureUrl("");
        return;
      }

      if (variant === "tecnico") {
        const currentUserId = userId != null ? Number(userId) : null;
        if (currentUserId != null && tecUserId === currentUserId) {
          setTecnicoSignatureUrl(mySignatureUrl || "");
          return;
        }
      }

      const cached = tecnicoSignatureCacheRef.current[tecUserId];
      if (typeof cached === "string") {
        setTecnicoSignatureUrl(cached);
        return;
      }

      if (!isAuthenticated) return;
      try {
        const res = await fetchApi(`/api/users/accounts/${tecUserId}/signature/`, {
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const url = (data as { url?: string })?.url || "";
        tecnicoSignatureCacheRef.current[tecUserId] = url;
        setTecnicoSignatureUrl(url);
      } catch {
        /* ignore */
      }
    },
    [variant, userId, mySignatureUrl, isAuthenticated],
  );

  useEffect(() => {
    const tecnicoId = formData.tecnico_asignado != null ? Number(formData.tecnico_asignado) : null;
    if (!tecnicoId) {
      setTecnicoSignatureUrl("");
      return;
    }
    void loadTecnicoSignature(tecnicoId);
  }, [formData.tecnico_asignado, loadTecnicoSignature, mySignatureUrl, userId]);

  const maxPhotosAllowed = ORDEN_BASE_MAX_FOTOS + formData.fotos_extra_max;
  fotosUrlsRef.current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];

  const onDropPhotos = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const nonce = formNonceRef.current;
      const current = fotosUrlsRef.current;
      const remainingSlots = maxPhotosAllowed - current.length;
      if (remainingSlots <= 0) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Límite de fotos",
          message: `Ya alcanzaste el máximo de ${maxPhotosAllowed} fotos.`,
        });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
        return;
      }

      const rejectedAsFiles = fileRejections.map((r) => r.file);
      const { files, heicFiles } = collectOrdenImageFiles(
        acceptedFiles,
        rejectedAsFiles,
        remainingSlots,
      );
      const failures: string[] = heicFiles.map((f) => ordenImageRejectMessage(f.name));

      if (!files.length) {
        if (failures.length) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Fotos no válidas",
            message: failures[0],
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 6000);
        }
        return;
      }

      setUploadingPhotos(true);
      setPhotoUploadProgress({ done: 0, total: files.length });
      try {
        const result = await uploadOrdenImageBatch({
          files,
          maxTotal: maxPhotosAllowed,
          getCurrentUrls: () => fotosUrlsRef.current,
          onUrlsChange: (urls) => {
            if (formNonceRef.current !== nonce) return;
            setFormData((prev) => ({ ...prev, fotos_urls: urls }));
          },
          onProgress: (progress) => {
            if (formNonceRef.current !== nonce) return;
            setPhotoUploadProgress(progress);
          },
          isCancelled: () => formNonceRef.current !== nonce,
        });
        failures.push(...result.failures);
        if (failures.length) {
          setAlert({
            show: true,
            variant: result.uploadedUrls.length ? "warning" : "error",
            title: result.uploadedUrls.length ? "Algunas fotos no se subieron" : "No se subieron las fotos",
            message: failures.slice(0, 3).join(" "),
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 7000);
        }
      } finally {
        if (formNonceRef.current === nonce) {
          setUploadingPhotos(false);
          setPhotoUploadProgress(null);
        }
      }
    },
    [maxPhotosAllowed, setAlert],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPhotos,
    multiple: true,
    maxFiles: maxPhotosAllowed,
    disabled: uploadingPhotos,
    accept: ORDEN_IMAGE_ACCEPT,
  });

  const handleDeletePhoto = useCallback(
    async (index: number, url: string) => {
      const nonce = formNonceRef.current;
      const publicId = getPublicIdFromUrl(url);
      const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter(
        (_, i) => i !== index,
      );

      setDeletingPhoto(true);
      try {
        if (publicId) {
          await deleteImageFromCloudinary(publicId);
        }
        if (editingOrden?.id) {
          const response = await fetchApi(`/api/ordenes/${editingOrden.id}/update-photos/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fotos_urls: updated }),
          });
          if (response.ok) {
            const updatedOrden = (await response.json()) as Orden;
            setEditingOrden(updatedOrden);
            await fetchOrdenes();
          } else {
            console.error("Error al actualizar fotos en backend:", await response.text());
          }
        }
      } catch (e) {
        console.error("Error al eliminar foto:", e);
      } finally {
        if (formNonceRef.current === nonce) {
          setFormData((prev) => ({ ...prev, fotos_urls: updated }));
        }
        setDeletingPhoto(false);
      }
    },
    [formData.fotos_urls, editingOrden, setEditingOrden, fetchOrdenes],
  );

  const validateForm = useCallback(() => {
    const missing: string[] = [];
    if (!formData.cliente_id) missing.push("Cliente");
    if (!formData.telefono_cliente?.trim()) missing.push("Teléfono");
    if (!Array.isArray(formData.servicios_realizados) || formData.servicios_realizados.length === 0) {
      missing.push("Servicios Realizados");
    }
    // Mínimo 150 solo al editar una orden ya existente en resuelto/cerrado (no en alta nueva).
    const requiereComentarioMinimo =
      Boolean(editingOrden) &&
      !isLimitedEdit &&
      (formData.status === "resuelto" || statusAdministrativo === "cerrado");
    if (requiereComentarioMinimo) {
      const comentarioLen = (formData.comentario_tecnico || "").trim().length;
      if (comentarioLen < COMENTARIO_TECNICO_MIN_LENGTH) {
        missing.push(
          `Comentario del técnico (mínimo ${COMENTARIO_TECNICO_MIN_LENGTH} caracteres; lleva ${comentarioLen})`,
        );
      }
    }
    return { ok: missing.length === 0, missing };
  }, [editingOrden, formData, isLimitedEdit, statusAdministrativo]);

  const patchClienteFromOrden = useCallback(
    async (payload: Record<string, unknown>) => {
      const cid = payload.cliente_id;
      if (!cid || !(payload.direccion || payload.telefono_cliente)) return;

      const existingCliente = clientes.find((c) => c.id === cid);
      const updates: Record<string, string> = {};
      const hasClienteDireccion =
        !!existingCliente?.direccion && String(existingCliente.direccion).trim() !== "";
      const hasClienteTelefono =
        !!existingCliente?.telefono && String(existingCliente.telefono).trim() !== "";

      if (!hasClienteDireccion && payload.direccion) {
        updates.direccion = String(payload.direccion);
      }
      if (!hasClienteTelefono && payload.telefono_cliente) {
        updates.telefono = String(payload.telefono_cliente);
      }

      if (Object.keys(updates).length > 0) {
        await fetchApi(`/api/clientes/${cid}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }).catch(() => null);
      }
    },
    [clientes],
  );

  const patchContactoFromOrden = useCallback(
    async (payload: Record<string, unknown>) => {
      const cid = payload.cliente_id;
      if (!cid || !(payload.nombre_cliente || payload.telefono_cliente)) return;

      const nombre = String(payload.nombre_cliente || "").trim();
      const celular = String(payload.telefono_cliente || "").trim();
      const contactoIdToUpdate =
        formData.contacto_id != null ? Number(formData.contacto_id) : null;

      if (contactoIdToUpdate == null) return;

      const body: Record<string, string> = {};
      if (nombre) body.nombre_apellido = nombre;
      if (celular) body.celular = celular;
      if (Object.keys(body).length === 0) return;

      await fetchApi(`/api/cliente-contactos/${contactoIdToUpdate}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
    },
    [formData.contacto_id],
  );

  const mergeSavedOrdenInList = useCallback(
    (savedOrden: Orden, filterByVisibility: boolean) => {
      if (!savedOrden?.id) return;
      if (filterByVisibility) {
        const tecnicoId = Number(savedOrden.tecnico_asignado ?? NaN);
        const creadoId = Number(savedOrden.creado_por ?? savedOrden.creado_por_id ?? NaN);
        const canShow =
          isAdmin || userId == null || tecnicoId === userId || creadoId === userId;
        if (!canShow) return;
      }
      setOrdenes((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const idx = list.findIndex((o) => o.id === savedOrden.id);
        if (idx >= 0) {
          const copy = list.slice();
          copy[idx] = savedOrden;
          return copy;
        }
        return [savedOrden, ...list];
      });
    },
    [isAdmin, userId, setOrdenes],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSaving || uploadingPhotos) return;
      if (activeTabRef.current === "cliente") {
        goToOrdenTab();
        return;
      }

      const { ok, missing } = validateForm();
      if (!ok) {
        setModalAlert({
          show: true,
          variant: "warning",
          title: "Campos requeridos",
          message: `Faltan: ${missing.join(", ")}`,
        });
        setTimeout(() => setModalAlert((prev) => ({ ...prev, show: false })), 3500);
        return;
      }

      const ordenCliente = formData.cliente;
      const isEditing = !!editingOrden;

      try {
        setIsSaving(true);
        const path = editingOrden ? `/api/ordenes/${editingOrden.id}/` : "/api/ordenes/";
        const method = editingOrden ? "PUT" : "POST";

        const payload = buildOrdenWritePayload({
          formData,
          variant,
          isAdmin,
          baselineEquipos: editingOrden?.equipos_inventario ?? [],
          statusAdministrativo,
          fechaEnvioAdmin,
          cotizacionesAdmin,
          baselineFirmaClienteUrl: firmaClienteBaselineRef.current,
          firmaClienteExplicitlyCleared: firmaClienteClearedRef.current,
          isUpdate: !!editingOrden,
        });

        const response = await fetchApi(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const savedOrden =
            variant === "tecnico"
              ? ((await response.json().catch(() => null)) as Orden | null)
              : ((await response.json()) as Orden);

          if (variant === "admin") {
            await patchClienteFromOrden(payload);
            await patchContactoFromOrden(payload);
            if (savedOrden) mergeSavedOrdenInList(savedOrden, false);

            if (
              !isLimitedEdit &&
              tipoOrden === "levantamiento" &&
              savedOrden?.id &&
              levantamientoSnapshotRef.current
            ) {
              const snap = levantamientoSnapshotRef.current;
              await persistLevantamientoExtras(
                savedOrden,
                snap,
                "OrdenesPage",
              );
              setOrdenes((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const idx = list.findIndex((o) => o.id === savedOrden.id);
                if (idx >= 0) {
                  const copy = list.slice();
                  copy[idx] = { ...copy[idx], tipo_orden: "levantamiento" };
                  return copy;
                }
                return prev;
              });
            }
          } else {
            if (
              !isLimitedEdit &&
              tipoOrden === "levantamiento" &&
              savedOrden?.id &&
              levantamientoSnapshotRef.current
            ) {
              const snap = levantamientoSnapshotRef.current;
              await persistLevantamientoExtras(savedOrden, snap, "OrdenesTecnicoPage");
              setOrdenes((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const idx = list.findIndex((o) => o.id === savedOrden.id);
                if (idx >= 0) {
                  const copy = list.slice();
                  copy[idx] = { ...copy[idx], tipo_orden: "levantamiento" };
                  return copy;
                }
                return prev;
              });
            }

            await patchClienteFromOrden(payload);
            await patchContactoFromOrden(payload);
            if (savedOrden) mergeSavedOrdenInList(savedOrden, true);
          }

          await fetchOrdenes();

          if (savedOrden) await onSaved?.(savedOrden);

          const becameResuelto =
            isOrdenResuelta(savedOrden?.status) && !isOrdenResuelta(editingOrden?.status);
          const tipoGuardado = savedOrden?.tipo_orden || tipoOrden;

          resetForm();
          onAfterSaveClose();

          setAlert({
            show: true,
            variant: "success",
            title: isEditing ? "Orden Actualizada" : "Orden Creada",
            message: isEditing
              ? `La orden para "${ordenCliente}" ha sido actualizada exitosamente.`
              : `La orden para "${ordenCliente}" ha sido creada exitosamente.`,
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);

          if (becameResuelto && savedOrden?.id && isOrdenServicioTecnico(tipoGuardado)) {
            openEnviarPdfModal(savedOrden);
          }
        } else {
          let errorMsg = "Error al guardar la orden";
          const raw = await response.text().catch(() => "");
          try {
            const errorData = raw ? JSON.parse(raw) : null;
            console.error("Error del servidor:", errorData);
            errorMsg = (errorData?.detail || JSON.stringify(errorData)) || errorMsg;
          } catch {
            errorMsg = raw || errorMsg;
          }
          setAlert({
            show: true,
            variant: "error",
            title: "Error al guardar",
            message: errorMsg,
          });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
        }
      } catch (error) {
        console.error("Error al guardar orden:", error);
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: String(error),
        });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      } finally {
        setIsSaving(false);
      }
    },
    [
      isSaving,
      activeTabRef,
      goToOrdenTab,
      validateForm,
      formData,
      editingOrden,
      variant,
      isAdmin,
      statusAdministrativo,
      fechaEnvioAdmin,
      cotizacionesAdmin,
      patchClienteFromOrden,
      patchContactoFromOrden,
      mergeSavedOrdenInList,
      isLimitedEdit,
      tipoOrden,
      levantamientoSnapshotRef,
      setOrdenes,
      fetchOrdenes,
      onSaved,
      resetForm,
      onAfterSaveClose,
      setAlert,
      setModalAlert,
      openEnviarPdfModal,
      uploadingPhotos,
    ],
  );

  const selectCliente = useCallback((cliente: Cliente | null) => {
    if (cliente) {
      const contactos = cliente.contactos || [];
      const contactoPrincipal = contactos.find((c) => c.is_principal) || contactos[0];
      const nombreContacto =
        String(contactoPrincipal?.nombre_apellido || "").trim() ||
        String(cliente.representante || "").trim();
      const telefonoCliente =
        String(contactoPrincipal?.celular || "").trim() ||
        String(cliente.celular || "").trim() ||
        String(cliente.telefono || "").trim();

      setFormData((prev) => ({
        ...prev,
        cliente_id: cliente.id,
        contacto_id: contactoPrincipal?.id != null ? Number(contactoPrincipal.id) : null,
        cliente: cliente.nombre,
        direccion: cliente.direccion,
        telefono_cliente: telefonoCliente,
        nombre_cliente: nombreContacto,
      }));
      setClienteSearch(cliente.nombre);
    } else {
      setFormData((prev) => ({
        ...prev,
        cliente_id: null,
        contacto_id: null,
        cliente: "",
        nombre_cliente: "",
        direccion: "",
        telefono_cliente: "",
      }));
      setClienteSearch("");
    }
  }, []);

  const selectTecnico = useCallback(
    (usuario: Usuario | null) => {
      if (usuario) {
        setFormData((prev) => ({ ...prev, tecnico_asignado: usuario.id }));
        const nombre =
          usuario.first_name && usuario.last_name
            ? `${usuario.first_name} ${usuario.last_name}`
            : usuario.email;
        setTecnicoSearch(nombre);
        void loadTecnicoSignature(usuario.id);
      } else {
        setFormData((prev) => ({ ...prev, tecnico_asignado: null }));
        setTecnicoSearch("");
        setTecnicoSignatureUrl("");
      }
    },
    [loadTecnicoSignature],
  );

  const selectQuienInstalo = useCallback((usuario: Usuario | null) => {
    if (usuario) {
      setFormData((prev) => ({ ...prev, quien_instalo: usuario.id }));
      const nombre =
        usuario.first_name && usuario.last_name
          ? `${usuario.first_name} ${usuario.last_name}`
          : usuario.email;
      setQuienInstaloSearch(nombre);
    } else {
      setFormData((prev) => ({ ...prev, quien_instalo: null }));
      setQuienInstaloSearch("");
    }
  }, []);

  const selectQuienEntrego = useCallback((usuario: Usuario | null) => {
    if (usuario) {
      setFormData((prev) => ({ ...prev, quien_entrego: usuario.id }));
      const nombre =
        usuario.first_name && usuario.last_name
          ? `${usuario.first_name} ${usuario.last_name}`
          : usuario.email;
      setQuienEntregoSearch(nombre);
    } else {
      setFormData((prev) => ({ ...prev, quien_entrego: null }));
      setQuienEntregoSearch("");
    }
  }, []);

  const setFirmaClienteUrl = useCallback((signature: string) => {
    const next = String(signature || "");
    firmaClienteClearedRef.current = !next.trim();
    setFormData((prev) => ({ ...prev, firma_cliente_url: next }));
  }, []);

  const addServicio = useCallback((servicio: string) => {
    setFormData((prev) => ({ ...prev, servicios_realizados: [servicio] }));
    setServicioSearch("");
  }, []);

  return {
    formData,
    setFormData,
    resetForm,
    loadFromOrden,
    bumpFormNonce,
    clearSearchFields,
    handleSubmit,
    isSaving,
    maxPhotosAllowed,
    onDropPhotos,
    getRootProps,
    getInputProps,
    isDragActive,
    handleDeletePhoto,
    deletingPhoto,
    uploadingPhotos,
    photoUploadProgress,
    clientes,
    fetchClientes,
    fetchUsuarios,
    serviciosDisponibles,
    setServiciosDisponibles,
    loadServiciosDisponibles,
    clienteSearch,
    setClienteSearch,
    tecnicoSearch,
    setTecnicoSearch,
    quienInstaloSearch,
    setQuienInstaloSearch,
    quienEntregoSearch,
    setQuienEntregoSearch,
    servicioSearch,
    setServicioSearch,
    selectCliente,
    selectTecnico,
    selectQuienInstalo,
    selectQuienEntrego,
    setFirmaClienteUrl,
    addServicio,
    addEquipoFromItem,
    updateEquipo,
    removeEquipo,
    loadTecnicoSignature,
    tecnicoSignatureUrl,
    statusAdministrativo,
    setStatusAdministrativo,
    fechaEnvioAdmin,
    setFechaEnvioAdmin,
    cotizacionesAdmin,
    setCotizacionesAdmin,
    loadAdminSeguimientoFromOrden,
    resetAdminSeguimientoUi,
  };
}
