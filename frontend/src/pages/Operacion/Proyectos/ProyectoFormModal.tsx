import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { TimeIcon } from "@/icons";
import {
  erpBodyClass,
  erpChipNeutralClass,
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
  erpTableHeaderClass,
  erpTableWrapClass,
} from "@/layout/erpPageStyles";
import {
  OrdenFormModalHeader,
  OrdenModalFooterActions,
  OrdenModalPrimaryButton,
} from "../OrdenesTrabajo/OrdenTrabajoModals";
import {
  erpDangerBtnClass,
  erpDeleteModalClass,
  erpDeleteModalPanelClass,
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalShellClass,
  erpModalTabClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import { canCerrarProyecto, proyectoRequiereCotizacionAdicional } from "./proyectoCloseValidation";
import { ProyectoEquiposSection } from "./ProyectoEquiposSection";
import { ProyectoEvidenciasField } from "./ProyectoEvidenciasField";
import { ProyectoFormSection, proyectoSectionIconClass } from "./ProyectoFormSection";
import { ProyectoNotaDiaFotosField } from "./ProyectoNotaDiaFotosField";
import {
  buildEquiposFromCotizaciones,
  clampPorcentajeAvance,
  createCotizacionBloque,
  createEmptyNotaDia,
  emptyPersona,
  flattenPresupuesto,
  getDeviceTimeHHMM,
  normalizeDraftCotizaciones,
  normalizeNotasPorDia,
  reindexCotizacionBloques,
} from "./proyectoFormUtils";
import {
  MOCK_COTIZACIONES_DIGITALFLOW,
  MOCK_COTIZACIONES_SICAR,
  MOCK_PRESUPUESTO_BY_COTIZACION,
} from "./proyectoMockData";
import {
  formatProyectoFecha,
  proyectoAddDayBtnClass,
  proyectoAvanceRangeClass,
  proyectoAvanceValueClass,
  proyectoCotizacionOptionClass,
  proyectoEmptyPanelClass,
  proyectoFieldLabelClass,
  proyectoGhostIconBtnClass,
  proyectoNotaCardClass,
  proyectoNotaDayBadgeClass,
  proyectoNotaMetaClass,
  proyectoNotaTextareaClass,
  proyectoOrigenBadgeClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
  proyectoSectionHintClass,
  proyectoStatusChipClass,
} from "./proyectoPageStyles";
import { ProyectoProductoThumb } from "./ProyectoProductoThumb";
import {
  ProyectoSyscomModeloPicker,
  type SyscomModeloSeleccionado,
} from "./ProyectoSyscomModeloPicker";
import type {
  CotizacionOrigen,
  CotizacionResumen,
  ProyectoCotizacionBloque,
  ProyectoDraft,
  ProyectoEquipoLinea,
  ProyectoEstado,
  ProyectoNotaDia,
  ProyectoPersonaAsignada,
  ServicioOpcion,
  TecnicoOpcion,
} from "./proyectoTypes";

type ProyectoFormTab = "cliente" | "operacion" | "presupuesto";
type CotizacionPickerTarget = "principal" | "adicional";

type ProyectoFormModalProps = {
  open: boolean;
  editing: boolean;
  initialDraft: ProyectoDraft;
  onClose: () => void;
  onSave: (draft: ProyectoDraft) => void;
};

const STATUS_OPTIONS: { value: ProyectoEstado; label: string; tone: "proceso" | "pausado" | "cerrado" }[] = [
  { value: "en_proceso", label: "En proceso", tone: "proceso" },
  { value: "pausado", label: "Pausado", tone: "pausado" },
  { value: "cerrado", label: "Cerrado", tone: "cerrado" },
];

const FORM_TABS: { id: ProyectoFormTab; label: string; step: string }[] = [
  { id: "cliente", label: "Cliente", step: "Paso 1" },
  { id: "operacion", label: "Operación", step: "Paso 2" },
  { id: "presupuesto", label: "Presupuesto", step: "Paso 3" },
];

const TAB_ORDER: ProyectoFormTab[] = ["cliente", "operacion", "presupuesto"];

function personaNombreFromUser(u: {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return full || u.email || `Usuario ${u.id}`;
}

export default function ProyectoFormModal({
  open,
  editing,
  initialDraft,
  onClose,
  onSave,
}: ProyectoFormModalProps) {
  const { isAdmin } = useAuth();
  const cotizacionPickerTitleId = useId();
  const presupuestoHintId = useId();
  const clienteTabId = useId();
  const operacionTabId = useId();
  const presupuestoTabId = useId();
  const clientePanelId = useId();
  const operacionPanelId = useId();
  const presupuestoPanelId = useId();
  const motivoId = useId();
  const notasLiveId = useId();
  const focusNotaIdRef = useRef<string | null>(null);
  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [notasLiveMessage, setNotasLiveMessage] = useState("");
  const [clienteStepError, setClienteStepError] = useState("");
  const [horaSalidaError, setHoraSalidaError] = useState("");

  const [activeTab, setActiveTab] = useState<ProyectoFormTab>("cliente");
  const activeTabRef = useRef<ProyectoFormTab>(activeTab);
  activeTabRef.current = activeTab;
  const [cliente, setCliente] = useState(initialDraft.cliente);
  const [clienteId, setClienteId] = useState(initialDraft.clienteId);
  const [cotizaciones, setCotizaciones] = useState<ProyectoCotizacionBloque[]>(() =>
    normalizeDraftCotizaciones(initialDraft)
  );
  const [equipos, setEquipos] = useState(initialDraft.equipos);

  const [tipoTrabajoId, setTipoTrabajoId] = useState(initialDraft.tipoTrabajoId);
  const [tipoTrabajoNombre, setTipoTrabajoNombre] = useState(initialDraft.tipoTrabajoNombre);
  const [status, setStatus] = useState<ProyectoEstado>(initialDraft.status);
  const [motivoPausa, setMotivoPausa] = useState(initialDraft.motivoPausa);
  const [fechaAutorizacion, setFechaAutorizacion] = useState(initialDraft.fechaAutorizacion);
  const [fechasInicio, setFechasInicio] = useState(initialDraft.fechasInicio);
  const [horaLlegada, setHoraLlegada] = useState(initialDraft.horaLlegada);
  const [horaSalida, setHoraSalida] = useState(initialDraft.horaSalida);
  const [tecnico, setTecnico] = useState(initialDraft.tecnico);
  const [auxiliar, setAuxiliar] = useState(initialDraft.auxiliar);
  const [vehiculoAsignado, setVehiculoAsignado] = useState(initialDraft.vehiculoAsignado);
  const [herramientasGenerales, setHerramientasGenerales] = useState(initialDraft.herramientasGenerales);
  const [notasPorDia, setNotasPorDia] = useState<ProyectoNotaDia[]>(
    () => normalizeNotasPorDia(initialDraft.notasPorDia)
  );
  const [porcentajeAvance, setPorcentajeAvance] = useState(initialDraft.porcentajeAvance);
  const [porcentajeExacto, setPorcentajeExacto] = useState(() =>
    String(clampPorcentajeAvance(initialDraft.porcentajeAvance))
  );
  const [incidencias, setIncidencias] = useState(initialDraft.incidencias);
  const [requerimientosAdicionales, setRequerimientosAdicionales] = useState(
    initialDraft.requerimientosAdicionales
  );
  const [requierePresupuestoAdicional, setRequierePresupuestoAdicional] = useState(
    initialDraft.requierePresupuestoAdicional
  );
  const [cotizacionAdicional, setCotizacionAdicional] = useState(initialDraft.cotizacionAdicional);
  const [evidenciasUrls, setEvidenciasUrls] = useState(initialDraft.evidenciasUrls);
  const [firmaClienteUrl, setFirmaClienteUrl] = useState(initialDraft.firmaClienteUrl);
  const [firmaTecnicoUrl, setFirmaTecnicoUrl] = useState(initialDraft.firmaTecnicoUrl);
  const [closeBlockedMessage, setCloseBlockedMessage] = useState("");

  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOpcion[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClearCotizaciones, setConfirmClearCotizaciones] = useState(false);
  const clearCotizacionesTitleId = useId();
  const [pickerTarget, setPickerTarget] = useState<CotizacionPickerTarget>("principal");
  const [pickerTab, setPickerTab] = useState<CotizacionOrigen>("digitalflow");
  const [pickerSearch, setPickerSearch] = useState("");
  const [modeloPickerLineaId, setModeloPickerLineaId] = useState<string | null>(null);

  const presupuesto = useMemo(() => flattenPresupuesto(cotizaciones), [cotizaciones]);
  const presupuestoCargado = cotizaciones.length > 0;
  const cotizacionIdsVinculados = useMemo(
    () => new Set(cotizaciones.map((c) => c.cotizacion.id)),
    [cotizaciones]
  );

  const equiposPorCotizacion = useMemo(() => {
    const map = new Map<string, ProyectoEquipoLinea[]>();
    for (const bloque of cotizaciones) {
      map.set(
        bloque.vinculoId,
        equipos.filter((e) => e.cotizacionVinculoId === bloque.vinculoId)
      );
    }
    // Equipos sin vínculo (legado) al final de la primera sección si existe
    const huerfanos = equipos.filter((e) => !e.cotizacionVinculoId);
    if (huerfanos.length && cotizaciones[0]) {
      const first = map.get(cotizaciones[0].vinculoId) ?? [];
      map.set(cotizaciones[0].vinculoId, [...first, ...huerfanos]);
    }
    return map;
  }, [cotizaciones, equipos]);

  const servicioOptions = useMemo(
    () => servicios.map((s) => ({ value: String(s.id), label: s.nombre })),
    [servicios]
  );

  const tecnicoOptions = useMemo(
    () => tecnicos.map((t) => ({ value: String(t.id), label: t.nombre })),
    [tecnicos]
  );

  const cotizacionesFiltradas = useMemo(() => {
    const pool =
      pickerTab === "digitalflow" ? MOCK_COTIZACIONES_DIGITALFLOW : MOCK_COTIZACIONES_SICAR;
    const q = pickerSearch.trim().toLowerCase();
    return pool.filter((c) => {
      if (pickerTarget === "principal" && cotizacionIdsVinculados.has(c.id)) return false;
      if (!q) return true;
      return (
        c.folio.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        (c.contacto || "").toLowerCase().includes(q)
      );
    });
  }, [pickerTab, pickerSearch, pickerTarget, cotizacionIdsVinculados]);

  const resetFromInitial = useCallback(() => {
    setActiveTab("cliente");
    setCliente(initialDraft.cliente);
    setClienteId(initialDraft.clienteId);
    const bloques = normalizeDraftCotizaciones(initialDraft);
    setCotizaciones(bloques);
    setEquipos(
      initialDraft.equipos?.length
        ? initialDraft.equipos
        : buildEquiposFromCotizaciones(bloques)
    );
    setTipoTrabajoId(initialDraft.tipoTrabajoId);
    setTipoTrabajoNombre(initialDraft.tipoTrabajoNombre);
    setStatus(initialDraft.status);
    setMotivoPausa(initialDraft.motivoPausa);
    setFechaAutorizacion(initialDraft.fechaAutorizacion);
    setFechasInicio(initialDraft.fechasInicio.length ? initialDraft.fechasInicio : [""]);
    setHoraLlegada(initialDraft.horaLlegada);
    setHoraSalida(initialDraft.horaSalida);
    setTecnico(initialDraft.tecnico);
    setAuxiliar(initialDraft.auxiliar);
    setVehiculoAsignado(initialDraft.vehiculoAsignado);
    setHerramientasGenerales(initialDraft.herramientasGenerales);
    setNotasPorDia(normalizeNotasPorDia(initialDraft.notasPorDia));
    setPorcentajeAvance(initialDraft.porcentajeAvance);
    setPorcentajeExacto(String(clampPorcentajeAvance(initialDraft.porcentajeAvance)));
    setIncidencias(initialDraft.incidencias);
    setRequerimientosAdicionales(initialDraft.requerimientosAdicionales);
    setRequierePresupuestoAdicional(initialDraft.requierePresupuestoAdicional);
    setCotizacionAdicional(initialDraft.cotizacionAdicional);
    setEvidenciasUrls(initialDraft.evidenciasUrls ?? []);
    setFirmaClienteUrl(initialDraft.firmaClienteUrl);
    setFirmaTecnicoUrl(initialDraft.firmaTecnicoUrl);
    setCloseBlockedMessage("");
    setClienteStepError("");
    setHoraSalidaError("");
    setPickerOpen(false);
    setConfirmClearCotizaciones(false);
    setPickerTarget("principal");
    setPickerSearch("");
    setModeloPickerLineaId(null);
    setCatalogError("");
  }, [initialDraft]);

  useEffect(() => {
    if (open) resetFromInitial();
  }, [open, resetFromInitial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadCatalogs = async () => {
      try {
        const [servRes, tecRes] = await Promise.all([
          fetchApi("/api/servicios/?page=1&page_size=500&ordering=idx", {
            cache: "no-store" as RequestCache,
          }),
          fetchApi("/api/ordenes/tecnico-opciones/").then(async (res) => {
            if (res.ok) return res;
            return fetchApi("/api/users/accounts/");
          }),
        ]);

        if (cancelled) return;

        if (servRes.ok) {
          const data = await servRes.json().catch(() => null);
          const results = Array.isArray(data?.results) ? data.results : [];
          const mapped: ServicioOpcion[] = results
            .filter(
              (s: { nombre?: string; activo?: boolean }) =>
                s && typeof s.nombre === "string" && s.nombre.trim() && s.activo !== false
            )
            .map((s: { id: number; nombre: string }) => ({
              id: Number(s.id),
              nombre: String(s.nombre).trim(),
            }));
          setServicios(mapped);
        } else {
          setServicios([]);
        }

        if (tecRes.ok) {
          const data = await tecRes.json().catch(() => null);
          const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
          const mapped: TecnicoOpcion[] = rows
            .filter((u: { id?: number }) => u && u.id != null)
            .map((u: { id: number; first_name?: string; last_name?: string; email?: string }) => ({
              id: Number(u.id),
              nombre: personaNombreFromUser(u),
              email: u.email,
            }));
          setTecnicos(mapped);
        } else {
          setTecnicos([]);
        }
      } catch {
        if (!cancelled) {
          setCatalogError("No se pudieron cargar servicios o técnicos. Revisa la conexión.");
          setServicios([]);
          setTecnicos([]);
        }
      }
    };

    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const equipoParaModeloPicker = modeloPickerLineaId
    ? equipos.find((eq) => eq.lineaId === modeloPickerLineaId) ?? null
    : null;

  const handleCargarCotizacion = (item: CotizacionResumen) => {
    if (pickerTarget === "adicional") {
      setCotizacionAdicional(item);
      setCloseBlockedMessage("");
      setPickerOpen(false);
      setPickerSearch("");
      setPickerTarget("principal");
      return;
    }
    if (cotizacionIdsVinculados.has(item.id)) {
      setPickerOpen(false);
      setPickerSearch("");
      return;
    }
    const lineas = MOCK_PRESUPUESTO_BY_COTIZACION[item.id] ?? [];
    const next = reindexCotizacionBloques([
      ...cotizaciones,
      createCotizacionBloque(item, lineas, cotizaciones.length + 1),
    ]);
    setCotizaciones(next);
    setEquipos((prevEq) => buildEquiposFromCotizaciones(next, prevEq));
    if (!cliente.trim()) {
      setCliente(item.cliente);
      setClienteId(item.origen === "digitalflow" ? `df-cli-${item.id}` : `sic-cli-${item.id}`);
    }
    setPickerOpen(false);
    setPickerSearch("");
  };

  const openCotizacionPicker = (target: CotizacionPickerTarget) => {
    setPickerTarget(target);
    setPickerSearch("");
    setPickerOpen(true);
  };

  const buildCurrentDraft = (): ProyectoDraft => {
    const bloques = reindexCotizacionBloques(cotizaciones);
    return {
      cliente: cliente.trim(),
      clienteId: clienteId.trim(),
      cotizaciones: bloques,
      cotizacion: bloques[0]?.cotizacion ?? null,
      presupuesto: flattenPresupuesto(bloques),
      equipos,
      tipoTrabajoId,
      tipoTrabajoNombre: tipoTrabajoNombre.trim(),
      status,
      motivoPausa: status === "pausado" ? motivoPausa.trim() : "",
      fechaAutorizacion,
      fechasInicio: fechasInicio.length ? fechasInicio : [""],
      horaLlegada,
      horaSalida,
      tecnico,
      auxiliar,
      vehiculoAsignado: vehiculoAsignado.trim(),
      herramientasGenerales: herramientasGenerales.trim(),
      notasPorDia: notasPorDia.length ? notasPorDia : [createEmptyNotaDia()],
      porcentajeAvance: clampPorcentajeAvance(porcentajeAvance),
      incidencias: incidencias.trim(),
      requerimientosAdicionales: requerimientosAdicionales.trim(),
      requierePresupuestoAdicional,
      cotizacionAdicional,
      evidenciasUrls,
      firmaClienteUrl,
      firmaTecnicoUrl,
    };
  };

  const handleQuitarCotizacion = (vinculoId: string) => {
    const next = reindexCotizacionBloques(cotizaciones.filter((b) => b.vinculoId !== vinculoId));
    setCotizaciones(next);
    setEquipos((prevEq) => buildEquiposFromCotizaciones(next, prevEq));
    if (next.length === 0) {
      setClienteId("");
    }
  };

  const handleLimpiarPresupuesto = () => {
    setCotizaciones([]);
    setEquipos([]);
    setConfirmClearCotizaciones(false);
  };

  const updateEquipo = (lineaId: string, patch: Partial<ProyectoEquipoLinea>) => {
    setEquipos((prev) =>
      prev.map((eq) => {
        if (eq.lineaId !== lineaId) return eq;
        const next = { ...eq, ...patch };
        if (patch.equipoEntregado === true) {
          next.estadoInstalacion = "entregado";
        } else if (patch.equipoEntregado === false && next.estadoInstalacion === "entregado") {
          next.estadoInstalacion = "pendiente";
        }
        if (patch.estadoInstalacion === "no_instalado") {
          next.equipoEntregado = false;
        }
        return next;
      })
    );
  };

  const handleSelectModeloSyscom = (producto: SyscomModeloSeleccionado) => {
    if (!modeloPickerLineaId) return;
    updateEquipo(modeloPickerLineaId, {
      modelo: producto.modelo,
      productoId: producto.productoId,
      marca: producto.marca,
      imagenUrl: producto.imagenUrl,
      fuenteProducto: producto.fuenteProducto,
    });
    setModeloPickerLineaId(null);
  };

  const handleRestaurarModeloOriginal = (eq: ProyectoEquipoLinea) => {
    const lineaOrigen = presupuesto.find(
      (l) =>
        eq.lineaId === l.id ||
        eq.lineaId.endsWith(`:${l.id}`) ||
        eq.lineaId.includes(`:${l.id}-`)
    );
    updateEquipo(eq.lineaId, {
      modelo: eq.modeloOriginal,
      productoId: lineaOrigen?.productoId,
      marca: undefined,
      imagenUrl: lineaOrigen?.imagenUrl,
      fuenteProducto: lineaOrigen?.fuenteProducto,
    });
  };

  const setPersonaFromId = (
    idStr: string,
    setter: (p: ProyectoPersonaAsignada) => void
  ) => {
    if (!idStr) {
      setter(emptyPersona());
      return;
    }
    const found = tecnicos.find((t) => String(t.id) === idStr);
    setter({
      id: found ? found.id : Number(idStr),
      nombre: found?.nombre || "",
    });
  };

  const updateFechaInicio = (index: number, value: string) => {
    setFechasInicio((prev) => prev.map((f, i) => (i === index ? value : f)));
  };

  const addFechaInicio = () => {
    setFechasInicio((prev) => [...prev, ""]);
  };

  const removeFechaInicio = (index: number) => {
    setFechasInicio((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const addNotaDia = () => {
    const next = createEmptyNotaDia();
    focusNotaIdRef.current = next.id;
    const nextCount = notasPorDia.length + 1;
    setNotasPorDia((prev) => [...prev, next]);
    setNotasLiveMessage(`Día ${nextCount} agregado a la bitácora`);
  };

  const removeNotaDia = (index: number) => {
    if (notasPorDia.length <= 1) {
      setNotasPorDia([createEmptyNotaDia()]);
      setNotasLiveMessage("Nota del día 1 vaciada");
      return;
    }
    const remaining = notasPorDia.length - 1;
    setNotasPorDia((prev) => prev.filter((_, i) => i !== index));
    setNotasLiveMessage(`Día ${index + 1} eliminado. Quedan ${remaining} jornadas`);
  };

  const updateNotaDia = (index: number, nota: string) => {
    setNotasPorDia((prev) => prev.map((n, i) => (i === index ? { ...n, nota } : n)));
  };

  const updateNotaDiaImagenes = (index: number, imagenesUrls: string[]) => {
    setNotasPorDia((prev) =>
      prev.map((n, i) => (i === index ? { ...n, imagenesUrls: imagenesUrls.slice(0, 2) } : n))
    );
  };

  useEffect(() => {
    const id = focusNotaIdRef.current;
    if (!id) return;
    focusNotaIdRef.current = null;
    const el = document.getElementById(`proyecto-nota-dia-${id}`) as HTMLTextAreaElement | null;
    el?.focus();
  }, [notasPorDia]);

  const setPorcentajeAvanceSafe = (value: number) => {
    const next = clampPorcentajeAvance(value);
    setPorcentajeAvance(next);
    setPorcentajeExacto(String(next));
  };

  const handlePorcentajeExactoChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    if (digits === "") {
      setPorcentajeExacto("");
      setPorcentajeAvance(0);
      return;
    }
    // Evita "012": quita ceros a la izquierda (deja un solo "0").
    const cleaned = digits.replace(/^0+(?=\d)/, "");
    const parsed = Number(cleaned);
    const next = clampPorcentajeAvance(parsed);
    setPorcentajeAvance(next);
    setPorcentajeExacto(parsed > 100 ? String(next) : cleaned);
  };

  const handleStatusChange = (next: ProyectoEstado) => {
    if (next === "cerrado") {
      const check = canCerrarProyecto({
        requierePresupuestoAdicional,
        requerimientosAdicionales,
        cotizacionAdicional,
      });
      if (!check.ok) {
        setCloseBlockedMessage(check.message);
        setActiveTab("operacion");
        return;
      }
    }
    setCloseBlockedMessage("");
    setStatus(next);
    if (next !== "pausado") setMotivoPausa("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter en un campo no debe guardar si aún no estamos en la última pestaña.
    if (activeTabRef.current !== "presupuesto") {
      goToNextTab(true);
      return;
    }
    if (!cliente.trim()) {
      setActiveTab("cliente");
      setClienteStepError("Escribe el nombre del cliente para continuar.");
      requestAnimationFrame(() => {
        document.getElementById("proyecto-modal-cliente")?.focus();
      });
      return;
    }
    if (status === "pausado" && !motivoPausa.trim()) {
      setActiveTab("operacion");
      return;
    }
    const draft = buildCurrentDraft();
    if (draft.status === "cerrado") {
      const check = canCerrarProyecto(draft);
      if (!check.ok) {
        setCloseBlockedMessage(check.message);
        setActiveTab("operacion");
        return;
      }
    }
    onSave(draft);
  };

  const tabIds: Record<ProyectoFormTab, string> = {
    cliente: clienteTabId,
    operacion: operacionTabId,
    presupuesto: presupuestoTabId,
  };

  const panelIds: Record<ProyectoFormTab, string> = {
    cliente: clientePanelId,
    operacion: operacionPanelId,
    presupuesto: presupuestoPanelId,
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: ProyectoFormTab) => {
    const idx = TAB_ORDER.indexOf(current);
    if (idx < 0) return;
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % TAB_ORDER.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = TAB_ORDER.length - 1;
    } else {
      return;
    }
    const next = TAB_ORDER[nextIdx];
    setActiveTab(next);
    requestAnimationFrame(() => {
      document.getElementById(tabIds[next])?.focus();
    });
  };

  const goToNextTab = (fromPointer?: boolean) => {
    const current = activeTabRef.current;
    const idx = TAB_ORDER.indexOf(current);
    if (idx < 0 || idx >= TAB_ORDER.length - 1) return;

    if (current === "cliente" && !cliente.trim()) {
      setClienteStepError("Escribe el nombre del cliente para continuar.");
      requestAnimationFrame(() => {
        document.getElementById("proyecto-modal-cliente")?.focus();
      });
      return;
    }

    setClienteStepError("");
    const apply = () => {
      const next = TAB_ORDER[idx + 1];
      setActiveTab(next);
      activeTabRef.current = next;
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    };

    if (fromPointer) window.setTimeout(apply, 0);
    else apply();
  };

  const goToPrevTab = () => {
    const idx = TAB_ORDER.indexOf(activeTabRef.current);
    if (idx <= 0) return;
    const prev = TAB_ORDER[idx - 1];
    setActiveTab(prev);
    activeTabRef.current = prev;
    setClienteStepError("");
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const stampHoraLlegada = () => {
    setHoraLlegada(getDeviceTimeHHMM());
    setHoraSalidaError("");
  };

  const stampHoraSalida = () => {
    if (!horaLlegada.trim()) {
      setHoraSalidaError("Primero registra la hora de llegada.");
      requestAnimationFrame(() => {
        document.getElementById("proyecto-hora-llegada")?.focus();
      });
      return;
    }
    setHoraSalidaError("");
    setHoraSalida(getDeviceTimeHHMM());
  };

  const iconUser = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconDoc = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconClock = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const iconTeam = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconNotes = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconChart = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const iconAlert = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconStatus = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const iconBox = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const iconPen = (
    <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={open}
        onClose={onClose}
        closeOnBackdropClick={false}
        closeOnEscape={!pickerOpen && !modeloPickerLineaId && !confirmClearCotizaciones}
        ariaLabel={`${editing ? "Editar" : "Nuevo"} proyecto`}
        className={erpModalShellClass}
      >
        <OrdenFormModalHeader
          editing={editing}
          contextLabel="Operación · Proyectos"
          title={`${editing ? "Editar" : "Nuevo"} proyecto`}
          subtitle="Captura y revisa los datos antes de guardar"
        />

        <div className={erpModalBodyClass}>
          <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div ref={formScrollRef} className={erpModalFormScrollClass}>
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Secciones del proyecto">
              {FORM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  id={tabIds[tab.id]}
                  role="tab"
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  aria-selected={activeTab === tab.id}
                  aria-controls={panelIds[tab.id]}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setClienteStepError("");
                  }}
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  className={erpModalTabClass(activeTab === tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "cliente" && (
              <div
                id={clientePanelId}
                role="tabpanel"
                aria-labelledby={clienteTabId}
                className="space-y-5"
              >
                <ProyectoFormSection
                  titleId="proyecto-sec-cliente"
                  eyebrow="Paso 1"
                  title="Identificación"
                  hint="Cliente del proyecto y referencia interna."
                  icon={iconUser}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="proyecto-modal-cliente" className={proyectoFieldLabelClass}>
                        Cliente
                      </label>
                      <input
                        id="proyecto-modal-cliente"
                        type="text"
                        value={cliente}
                        onChange={(e) => {
                          setCliente(e.target.value);
                          if (clienteStepError) setClienteStepError("");
                        }}
                        placeholder="Nombre o razón social"
                        className={erpInputLikeClass}
                        autoComplete="organization"
                        aria-invalid={Boolean(clienteStepError)}
                        aria-describedby={clienteStepError ? "proyecto-cliente-step-error" : undefined}
                      />
                      {clienteStepError ? (
                        <p
                          id="proyecto-cliente-step-error"
                          className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                          role="alert"
                        >
                          {clienteStepError}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="proyecto-modal-cliente-id" className={proyectoFieldLabelClass}>
                        ID cliente
                      </label>
                      <input
                        id="proyecto-modal-cliente-id"
                        type="text"
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        placeholder="Referencia interna"
                        className={erpInputLikeClass}
                        readOnly={presupuestoCargado}
                        aria-readonly={presupuestoCargado}
                      />
                    </div>
                  </div>
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-cotizacion"
                  eyebrow="Presupuesto"
                  title="Cotizaciones del proyecto"
                  hint="Puedes vincular varias cotizaciones sin duplicar el formulario."
                  icon={iconDoc}
                  card={presupuestoCargado}
                  actions={
                    presupuestoCargado ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 dark:border-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                          onClick={() => setConfirmClearCotizaciones(true)}
                          aria-haspopup="dialog"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Quitar todas
                        </button>
                        <button
                          type="button"
                          className={proyectoAddDayBtnClass}
                          onClick={() => openCotizacionPicker("principal")}
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                          Agregar cotización
                        </button>
                      </div>
                    ) : null
                  }
                >
                  {presupuestoCargado ? (
                    <ul className="space-y-3" aria-label="Cotizaciones vinculadas">
                      {cotizaciones.map((bloque) => (
                        <li
                          key={bloque.vinculoId}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-3.5 dark:border-[#334155] dark:bg-[#0f172a]/50"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#ff801f]/15 px-2 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]">
                                {bloque.orden}
                              </span>
                              <span className={proyectoOrigenBadgeClass(bloque.cotizacion.origen)}>
                                {bloque.cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                              </span>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Cotización {bloque.orden} · #{bloque.cotizacion.folio}
                              </p>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                              {formatProyectoFecha(bloque.cotizacion.fecha)}
                              {bloque.cotizacion.contacto ? ` · ${bloque.cotizacion.contacto}` : ""}
                              {" · "}
                              {bloque.lineas.length}{" "}
                              {bloque.lineas.length === 1 ? "partida" : "partidas"}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
                            onClick={() => handleQuitarCotizacion(bloque.vinculoId)}
                            aria-label={`Quitar cotización ${bloque.orden}, folio ${bloque.cotizacion.folio}`}
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`${proyectoEmptyPanelClass} mt-0`}>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Vincula una o más cotizaciones para traer el presupuesto sin importes.
                      </p>
                      <button
                        type="button"
                        className={`${erpPrimaryBtnClass} mt-4`}
                        onClick={() => openCotizacionPicker("principal")}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden
                        >
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        Cargar cotización
                      </button>
                    </div>
                  )}
                </ProyectoFormSection>
              </div>
            )}

            {activeTab === "operacion" && (
              <div
                id={operacionPanelId}
                role="tabpanel"
                aria-labelledby={operacionTabId}
                className="space-y-5"
              >
                {catalogError ? (
                  <p
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                    role="status"
                  >
                    {catalogError}
                  </p>
                ) : null}

                <ProyectoFormSection
                  titleId="proyecto-sec-estado"
                  eyebrow="Paso 2"
                  title="Estado del proyecto"
                  hint="Define el tipo de trabajo y el status actual."
                  icon={iconStatus}
                >
                    <div>
                      <SearchableSelect
                        label="Tipo de trabajo"
                        value={tipoTrabajoId != null ? String(tipoTrabajoId) : ""}
                        onChange={(v) => {
                          if (!v) {
                            setTipoTrabajoId(null);
                            setTipoTrabajoNombre("");
                            return;
                          }
                          const found = servicios.find((s) => String(s.id) === v);
                          setTipoTrabajoId(found ? found.id : Number(v));
                          setTipoTrabajoNombre(found?.nombre || "");
                        }}
                        options={servicioOptions}
                        placeholder="Buscar servicio…"
                      />
                      {tipoTrabajoNombre && tipoTrabajoId == null ? (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          Actual: {tipoTrabajoNombre}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p id="proyecto-status-label" className={proyectoFieldLabelClass}>
                        Status
                      </p>
                      <div
                        className="flex flex-wrap gap-2"
                        role="radiogroup"
                        aria-labelledby="proyecto-status-label"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={status === opt.value}
                            onClick={() => handleStatusChange(opt.value)}
                            className={proyectoStatusChipClass(status === opt.value, opt.tone)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {status === "pausado" ? (
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
                        <label htmlFor={motivoId} className={proyectoFieldLabelClass}>
                          Motivo de la pausa <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id={motivoId}
                          type="text"
                          value={motivoPausa}
                          onChange={(e) => setMotivoPausa(e.target.value)}
                          placeholder="¿Por qué está pausado el proyecto?"
                          className={erpInputLikeClass}
                          required
                          aria-required="true"
                          aria-invalid={status === "pausado" && !motivoPausa.trim()}
                        />
                      </div>
                    ) : null}
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-agenda"
                  title="Agenda"
                  hint="Autorización, llegada y días de inicio en campo."
                  icon={iconClock}
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <DatePicker
                          key={`proyecto-fecha-autorizacion-${editing ? "edit" : "new"}`}
                          id="proyecto-fecha-autorizacion"
                          label="Fecha de autorización"
                          placeholder="Seleccionar fecha"
                          defaultDate={fechaAutorizacion || undefined}
                          onChange={(_dates, currentDateString) => {
                            setFechaAutorizacion(currentDateString || "");
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="proyecto-hora-llegada">Hora de llegada</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            id="proyecto-hora-llegada"
                            name="proyecto-hora-llegada"
                            value={horaLlegada}
                            onChange={(e) => {
                              setHoraLlegada(e.target.value);
                              if (e.target.value.trim()) setHoraSalidaError("");
                            }}
                            onClick={stampHoraLlegada}
                            className="pr-11"
                            aria-describedby="proyecto-hora-llegada-hint"
                          />
                          <button
                            type="button"
                            className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#fff4eb] hover:text-[#9a3412] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:text-gray-400 dark:hover:bg-[#ff801f]/15 dark:hover:text-[#fdba74]"
                            onClick={stampHoraLlegada}
                            aria-label="Usar hora actual del dispositivo para llegada"
                            title="Usar hora actual"
                          >
                            <TimeIcon className="size-5" />
                          </button>
                        </div>
                        <p id="proyecto-hora-llegada-hint" className={`${proyectoSectionHintClass} !mt-1.5`}>
                          Clic para capturar la hora del dispositivo.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="proyecto-hora-salida">Horario de salida</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            id="proyecto-hora-salida"
                            name="proyecto-hora-salida"
                            value={horaSalida}
                            onChange={(e) => {
                              setHoraSalida(e.target.value);
                              if (horaSalidaError) setHoraSalidaError("");
                            }}
                            onClick={stampHoraSalida}
                            className="pr-11"
                            error={Boolean(horaSalidaError)}
                            aria-invalid={Boolean(horaSalidaError)}
                            aria-describedby={
                              horaSalidaError
                                ? "proyecto-hora-salida-error proyecto-hora-salida-hint"
                                : "proyecto-hora-salida-hint"
                            }
                          />
                          <button
                            type="button"
                            className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#fff4eb] hover:text-[#9a3412] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#ff801f]/15 dark:hover:text-[#fdba74]"
                            onClick={stampHoraSalida}
                            aria-label="Usar hora actual del dispositivo para salida"
                            title={
                              horaLlegada.trim()
                                ? "Usar hora actual"
                                : "Requiere hora de llegada"
                            }
                          >
                            <TimeIcon className="size-5" />
                          </button>
                        </div>
                        {horaSalidaError ? (
                          <p
                            id="proyecto-hora-salida-error"
                            className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                            role="alert"
                          >
                            {horaSalidaError}
                          </p>
                        ) : null}
                        <p id="proyecto-hora-salida-hint" className={`${proyectoSectionHintClass} !mt-1.5`}>
                          Requiere hora de llegada. Clic para capturar la hora actual.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className={proyectoFieldLabelClass}>Fechas de inicio</p>
                          <p className={`${proyectoSectionHintClass} !mt-0`}>
                            Una fecha por jornada. Puedes agregar más días.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={proyectoAddDayBtnClass}
                          onClick={addFechaInicio}
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                          Agregar día
                        </button>
                      </div>

                      <ol className="mt-3 space-y-0" aria-label="Fechas de inicio del proyecto">
                        {fechasInicio.map((fecha, index) => (
                          <li
                            key={`fecha-inicio-row-${index}`}
                            className="group relative flex gap-3 pb-3 last:pb-0"
                          >
                            {index < fechasInicio.length - 1 ? (
                              <span
                                className="absolute bottom-0 left-[13px] top-8 w-px bg-gray-200 dark:bg-gray-700"
                                aria-hidden
                              />
                            ) : null}

                            <span
                              className="relative z-[1] mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ff801f]/35 bg-[#fff4eb] text-[11px] font-bold tabular-nums text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/15 dark:text-[#fdba74]"
                              aria-hidden
                            >
                              {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <DatePicker
                                    key={`proyecto-fecha-inicio-${index}-${editing ? "e" : "n"}`}
                                    id={`proyecto-fecha-inicio-${index}`}
                                    label={`Día ${index + 1}`}
                                    placeholder="Seleccionar fecha"
                                    defaultDate={fecha || undefined}
                                    onChange={(_dates, currentDateString) => {
                                      updateFechaInicio(index, currentDateString || "");
                                    }}
                                  />
                                </div>
                                {fechasInicio.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => removeFechaInicio(index)}
                                    aria-label={`Quitar día ${index + 1}`}
                                    title={`Quitar día ${index + 1}`}
                                    className={`${proyectoGhostIconBtnClass} mt-7`}
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      aria-hidden
                                    >
                                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-equipo"
                  title="Equipo de campo"
                  hint="Quién va, en qué unidad y con qué herramientas."
                  icon={iconTeam}
                >
                    <div className="grid gap-4 lg:grid-cols-3">
                      <SearchableSelect
                        label="Técnico"
                        value={tecnico.id != null ? String(tecnico.id) : ""}
                        onChange={(v) => setPersonaFromId(v, setTecnico)}
                        options={tecnicoOptions}
                        placeholder="Buscar técnico…"
                      />
                      <SearchableSelect
                        label="Auxiliar"
                        value={auxiliar.id != null ? String(auxiliar.id) : ""}
                        onChange={(v) => setPersonaFromId(v, setAuxiliar)}
                        options={tecnicoOptions}
                        placeholder="Buscar auxiliar…"
                      />
                      <div>
                        <label htmlFor="proyecto-vehiculo" className={proyectoFieldLabelClass}>
                          Vehículo asignado
                        </label>
                        <input
                          id="proyecto-vehiculo"
                          type="text"
                          value={vehiculoAsignado}
                          onChange={(e) => setVehiculoAsignado(e.target.value)}
                          placeholder="Placas o unidad"
                          className={erpInputLikeClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="proyecto-herramientas" className={proyectoFieldLabelClass}>
                        Herramientas generales
                      </label>
                      <textarea
                        id="proyecto-herramientas"
                        value={herramientasGenerales}
                        onChange={(e) => setHerramientasGenerales(e.target.value)}
                        rows={3}
                        placeholder="Lista de herramientas o equipo general del proyecto"
                        className={`${erpInputLikeClass} min-h-[4.5rem] resize-y`}
                      />
                    </div>
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-notas"
                  title="Bitácora por jornada"
                  hint="Una entrada por día de trabajo, con hasta 2 fotos. Se alinea con las fechas de inicio cuando existan."
                  icon={iconNotes}
                  actions={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        className="rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                        aria-hidden
                      >
                        {notasPorDia.length} {notasPorDia.length === 1 ? "día" : "días"}
                      </span>
                      <button
                        type="button"
                        className={proyectoAddDayBtnClass}
                        onClick={addNotaDia}
                        aria-describedby={notasLiveId}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        Agregar día
                      </button>
                    </div>
                  }
                >
                  <p id={notasLiveId} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {notasLiveMessage}
                  </p>

                  <ol className="space-y-0" aria-label="Notas por día de trabajo">
                    {notasPorDia.map((item, index) => {
                      const fechaJornada = fechasInicio[index] || "";
                      const fechaLabel = fechaJornada ? formatProyectoFecha(fechaJornada) : null;
                      const charCount = item.nota.trim().length;
                      const hintId = `proyecto-nota-hint-${item.id}`;

                      return (
                        <li
                          key={item.id}
                          className="group relative flex gap-3 pb-4 last:pb-0"
                        >
                          {index < notasPorDia.length - 1 ? (
                            <span
                              className="absolute bottom-0 left-[15px] top-10 w-px bg-gradient-to-b from-[#ff801f]/45 via-[#e7ded0] to-[#e7ded0] dark:from-[#ff801f]/40 dark:via-[#334155] dark:to-[#334155]"
                              aria-hidden
                            />
                          ) : null}

                          <span className={proyectoNotaDayBadgeClass} aria-hidden>
                            {index + 1}
                          </span>

                          <article className={proyectoNotaCardClass} aria-labelledby={`proyecto-nota-title-${item.id}`}>
                            <div className="flex items-start justify-between gap-2 border-b border-[#f0e8dc] bg-gradient-to-r from-[#fff8f1]/90 to-transparent px-3 py-2.5 dark:border-[#273244] dark:from-[#ff801f]/10 dark:to-transparent">
                              <div className="min-w-0">
                                <h5
                                  id={`proyecto-nota-title-${item.id}`}
                                  className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
                                >
                                  Día {index + 1}
                                  {fechaLabel ? (
                                    <span className="font-medium text-[#78716c] dark:text-[#8ea0b8]">
                                      {" "}
                                      · {fechaLabel}
                                    </span>
                                  ) : null}
                                </h5>
                                <p className={`${proyectoNotaMetaClass} mt-0.5`}>
                                  {fechaLabel
                                    ? "Jornada vinculada a fecha de inicio"
                                    : "Sin fecha de inicio asociada aún"}
                                </p>
                              </div>
                              {notasPorDia.length > 1 ? (
                                <button
                                  type="button"
                                  className={proyectoGhostIconBtnClass}
                                  onClick={() => removeNotaDia(index)}
                                  aria-label={`Quitar nota del día ${index + 1}`}
                                  title={`Quitar día ${index + 1}`}
                                >
                                  <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden
                                  >
                                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                                  </svg>
                                </button>
                              ) : null}
                            </div>

                            <div className="space-y-2 p-3">
                              <div>
                                <label htmlFor={`proyecto-nota-dia-${item.id}`} className="sr-only">
                                  Nota del día {index + 1}
                                  {fechaLabel ? `, ${fechaLabel}` : ""}
                                </label>
                                <textarea
                                  id={`proyecto-nota-dia-${item.id}`}
                                  value={item.nota}
                                  onChange={(e) => updateNotaDia(index, e.target.value)}
                                  rows={3}
                                  placeholder={`Avances, pendientes o hallazgos del día ${index + 1}…`}
                                  className={proyectoNotaTextareaClass}
                                  aria-describedby={hintId}
                                />
                                <div
                                  id={hintId}
                                  className="mt-1.5 flex flex-wrap items-center justify-between gap-2"
                                >
                                  <p className={proyectoNotaMetaClass}>
                                    {charCount === 0
                                      ? "Sin nota todavía"
                                      : `${charCount} ${charCount === 1 ? "carácter" : "caracteres"}`}
                                  </p>
                                  {index === 0 && notasPorDia.length === 1 ? (
                                    <p className={proyectoNotaMetaClass}>
                                      Usa «Agregar día» para más jornadas
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="border-t border-[#f0e8dc]/80 pt-2 dark:border-[#273244]/80">
                                <ProyectoNotaDiaFotosField
                                  urls={item.imagenesUrls ?? []}
                                  onChange={(urls) => updateNotaDiaImagenes(index, urls)}
                                  diaLabel={`día ${index + 1}`}
                                />
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-avance"
                  title="Avance del proyecto"
                  hint="Arrastra el control o escribe el porcentaje exacto."
                  icon={iconChart}
                  actions={
                    <p className={proyectoAvanceValueClass} aria-live="polite">
                      {porcentajeAvance}
                      <span className="ml-0.5 text-base font-medium opacity-70">%</span>
                    </p>
                  }
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                      <div className="min-w-0 flex-1">
                        <label htmlFor="proyecto-avance-slider" className="sr-only">
                          Avance del proyecto, de 0 a 100 por ciento
                        </label>
                        <input
                          id="proyecto-avance-slider"
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={porcentajeAvance}
                          onChange={(e) => setPorcentajeAvanceSafe(Number(e.target.value))}
                          className={proyectoAvanceRangeClass}
                          style={
                            {
                              "--proyecto-avance": `${porcentajeAvance}%`,
                            } as CSSProperties
                          }
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={porcentajeAvance}
                          aria-valuetext={`${porcentajeAvance} por ciento`}
                        />
                        <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="sm:w-[7.5rem]">
                        <label htmlFor="proyecto-porcentaje" className={proyectoFieldLabelClass}>
                          Exacto
                        </label>
                        <div className="relative">
                          <input
                            id="proyecto-porcentaje"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            maxLength={3}
                            value={porcentajeExacto}
                            onChange={(e) => handlePorcentajeExactoChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => setPorcentajeExacto(String(porcentajeAvance))}
                            className={`${erpInputLikeClass} pr-9 text-center tabular-nums`}
                            aria-describedby="proyecto-avance-hint"
                          />
                          <span
                            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 dark:text-gray-400"
                            aria-hidden
                          >
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                    <p id="proyecto-avance-hint" className="sr-only">
                      Valor entre 0 y 100. El control deslizante y el campo numérico van sincronizados.
                    </p>
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-incidencias"
                  title="Incidencias y requerimientos"
                  hint="Si hay requerimientos o presupuesto adicional, el proyecto no podrá cerrarse sin cotización vinculada."
                  icon={iconAlert}
                >
                  {closeBlockedMessage ? (
                    <p
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
                      role="alert"
                    >
                      {closeBlockedMessage}
                    </p>
                  ) : null}

                    <div>
                      <label htmlFor="proyecto-incidencias" className={proyectoFieldLabelClass}>
                        Incidencias
                      </label>
                      <textarea
                        id="proyecto-incidencias"
                        value={incidencias}
                        onChange={(e) => setIncidencias(e.target.value)}
                        rows={3}
                        placeholder="Describe incidencias del proyecto…"
                        className={`${erpInputLikeClass} min-h-[4.5rem] resize-y`}
                      />
                    </div>

                    <div>
                      <label htmlFor="proyecto-requerimientos" className={proyectoFieldLabelClass}>
                        Requerimientos adicionales
                      </label>
                      <textarea
                        id="proyecto-requerimientos"
                        value={requerimientosAdicionales}
                        onChange={(e) => {
                          setRequerimientosAdicionales(e.target.value);
                          setCloseBlockedMessage("");
                        }}
                        rows={3}
                        placeholder="Material, servicios o trabajos extra…"
                        className={`${erpInputLikeClass} min-h-[4.5rem] resize-y`}
                      />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/70 px-3 py-3 dark:border-[#334155] dark:bg-[#0f172a]/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-[#d6d3d1] text-[#ff801f] focus:ring-[#ff801f]/30"
                        checked={requierePresupuestoAdicional}
                        onChange={(e) => {
                          setRequierePresupuestoAdicional(e.target.checked);
                          setCloseBlockedMessage("");
                        }}
                        aria-describedby="proyecto-presupuesto-adicional-hint"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                          Requiere presupuesto adicional
                        </span>
                        <span
                          id="proyecto-presupuesto-adicional-hint"
                          className="mt-0.5 block text-[12px] text-[#78716c] dark:text-[#8ea0b8]"
                        >
                          Al activarlo, debes vincular una cotización antes de cerrar.
                        </span>
                      </span>
                    </label>

                    {proyectoRequiereCotizacionAdicional({
                      requierePresupuestoAdicional,
                      requerimientosAdicionales,
                    }) ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-950/30">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Cotización adicional vinculada
                        </p>
                        {cotizacionAdicional ? (
                          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <span className={proyectoOrigenBadgeClass(cotizacionAdicional.origen)}>
                                {cotizacionAdicional.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                              </span>
                              <p className="mt-2 text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                                #{cotizacionAdicional.folio} — {cotizacionAdicional.cliente}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={erpSecondaryBtnClass}
                                onClick={() => openCotizacionPicker("adicional")}
                              >
                                Cambiar
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                onClick={() => setCotizacionAdicional(null)}
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]">
                              Vincula la cotización correspondiente para poder cerrar el proyecto.
                            </p>
                            <button
                              type="button"
                              className={`${erpPrimaryBtnClass} mt-3`}
                              onClick={() => openCotizacionPicker("adicional")}
                            >
                              Vincular cotización
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-evidencia"
                  title="Evidencia fotográfica"
                  hint="Misma experiencia de carga que Órdenes de servicio."
                  icon={iconBox}
                >
                  <ProyectoEvidenciasField urls={evidenciasUrls} onChange={setEvidenciasUrls} />
                </ProyectoFormSection>

                <ProyectoFormSection
                  titleId="proyecto-sec-firmas"
                  title="Firmas"
                  hint="Firma del técnico y del cliente al cierre."
                  icon={iconPen}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SignaturePad
                      label="Firma del técnico"
                      value={firmaTecnicoUrl}
                      onChange={setFirmaTecnicoUrl}
                      width={400}
                      height={220}
                    />
                    <SignaturePad
                      label="Firma del cliente"
                      value={firmaClienteUrl}
                      onChange={setFirmaClienteUrl}
                      width={400}
                      height={220}
                    />
                  </div>
                </ProyectoFormSection>
              </div>
            )}

            {activeTab === "presupuesto" && (
              <div
                id={presupuestoPanelId}
                role="tabpanel"
                aria-labelledby={presupuestoTabId}
                className="space-y-5"
              >
                <ProyectoFormSection
                  titleId="proyecto-sec-presupuesto"
                  eyebrow="Paso 3"
                  title="Presupuesto por cotización"
                  hint="Cada cotización mantiene sus partidas por separado — sin precios."
                  icon={iconDoc}
                  actions={
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${erpChipNeutralClass}`}>
                      {cotizaciones.length
                        ? `${cotizaciones.length} ${cotizaciones.length === 1 ? "sección" : "secciones"}`
                        : "Sin precios"}
                    </span>
                  }
                >
                  <p id={presupuestoHintId} className="sr-only">
                    Solo descripción, cantidad y unidad, agrupadas por cotización.
                  </p>

                  {!presupuestoCargado ? (
                    <div className={proyectoEmptyPanelClass} role="status">
                      Carga una o más cotizaciones en la pestaña «Cliente».
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {cotizaciones.map((bloque) => (
                        <section
                          key={bloque.vinculoId}
                          className="overflow-hidden rounded-xl border border-[#e7ded0] dark:border-[#334155]"
                          aria-labelledby={`proyecto-presupuesto-cot-${bloque.vinculoId}`}
                        >
                          <header className="flex flex-wrap items-center gap-2 border-b border-[#e7ded0] bg-gradient-to-r from-[#fff8f1] to-[#fffdfa] px-3 py-2.5 dark:border-[#334155] dark:from-[#ff801f]/10 dark:to-[#0f172a]">
                            <span
                              className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#ff801f]/15 px-2 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                              aria-hidden
                            >
                              {bloque.orden}
                            </span>
                            <h5
                              id={`proyecto-presupuesto-cot-${bloque.vinculoId}`}
                              className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
                            >
                              Cotización {bloque.orden}
                            </h5>
                            <span className={proyectoOrigenBadgeClass(bloque.cotizacion.origen)}>
                              {bloque.cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                            </span>
                            <span className="text-xs font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
                              #{bloque.cotizacion.folio}
                            </span>
                          </header>
                          {bloque.lineas.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400" role="status">
                              Esta cotización no tiene partidas.
                            </p>
                          ) : (
                            <div className={`${erpTableWrapClass} !rounded-none !border-0 !shadow-none`}>
                              <table className="min-w-full text-left text-sm">
                                <thead className={erpTableHeaderClass}>
                                  <tr>
                                    <th scope="col" className="px-3 py-2.5 font-semibold">
                                      Descripción
                                    </th>
                                    <th scope="col" className="w-16 px-2 py-2.5 text-center font-semibold">
                                      Cant.
                                    </th>
                                    <th scope="col" className="w-14 px-2 py-2.5 text-center font-semibold">
                                      Ud.
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {bloque.lineas.map((linea) => (
                                    <tr
                                      key={linea.id}
                                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                                    >
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-start gap-2.5">
                                          <ProyectoProductoThumb
                                            src={linea.imagenUrl}
                                            alt={linea.descripcion}
                                            size="sm"
                                            className="mt-0.5 border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]"
                                          />
                                          <div className="min-w-0">
                                            {linea.categoria ? (
                                              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-[#ff801f]">
                                                {linea.categoria}
                                              </span>
                                            ) : null}
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                              {linea.descripcion}
                                            </span>
                                            {linea.detalle ? (
                                              <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                                {linea.detalle}
                                              </p>
                                            ) : null}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2.5 text-center tabular-nums">
                                        {linea.cantidad}
                                      </td>
                                      <td className="px-2 py-2.5 text-center text-xs uppercase">
                                        {linea.unidad}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                </ProyectoFormSection>

                <ProyectoEquiposSection
                  icon={iconBox}
                  presupuestoCargado={presupuestoCargado}
                  isAdmin={isAdmin}
                  cotizaciones={cotizaciones}
                  equipos={equipos}
                  equiposPorCotizacion={equiposPorCotizacion}
                  onUpdateEquipo={updateEquipo}
                  onCambiarModelo={setModeloPickerLineaId}
                  onRestaurarModelo={handleRestaurarModeloOriginal}
                />
              </div>
            )}
          </div>
          </form>

          <footer className={erpModalFooterClass}>
            <OrdenModalFooterActions
              onCancel={activeTab === "cliente" ? onClose : goToPrevTab}
              cancelLabel={activeTab === "cliente" ? "Cancelar" : "Anterior"}
              primary={
                activeTab !== "presupuesto" ? (
                  <OrdenModalPrimaryButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToNextTab(true);
                    }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Siguiente
                  </OrdenModalPrimaryButton>
                ) : (
                  <OrdenModalPrimaryButton
                    type="button"
                    disabled={!cliente.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      formRef.current?.requestSubmit();
                    }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {editing ? "Guardar cambios" : "Crear proyecto"}
                  </OrdenModalPrimaryButton>
                )
              }
            />
          </footer>
        </div>
      </Modal>
      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        closeOnEscape
        ariaLabelledBy={cotizacionPickerTitleId}
        className={proyectoPickerModalClass}
      >
        <header className={proyectoPickerModalHeaderClass}>
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={erpSectionLabelClass}>Proyectos · Cotización</p>
              <h3 id={cotizacionPickerTitleId} className={`mt-1 ${erpSubheadingClass}`}>
                {pickerTarget === "adicional" ? "Vincular cotización adicional" : "Cargar cotización"}
              </h3>
              <p className={`${erpBodyClass} mt-1 text-sm`}>
                {pickerTarget === "adicional"
                  ? "Selecciona la cotización que cubre el presupuesto o requerimientos adicionales."
                  : "Puedes vincular varias cotizaciones DigitalFlow o SICAR — el cliente se completa con la primera."}
              </p>
            </div>
          </div>
        </header>

        <div className={proyectoPickerModalBodyClass}>
          <div
            className="flex rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]"
            role="tablist"
            aria-label="Origen de cotización"
          >
            {(
              [
                { id: "digitalflow" as const, label: "DigitalFlow" },
                { id: "sicar" as const, label: "SICAR" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={pickerTab === tab.id}
                onClick={() => setPickerTab(tab.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 ${
                  pickerTab === tab.id
                    ? "bg-white text-[#1c1917] shadow-sm dark:bg-[#1e293b] dark:text-[#f8fafc]"
                    : "text-[#78716c] dark:text-[#8ea0b8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Label htmlFor="proyecto-cotizacion-buscar" className="sr-only">
              Buscar cotización
            </Label>
            <input
              id="proyecto-cotizacion-buscar"
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Buscar por folio o cliente…"
              className={erpInputLikeClass}
            />
          </div>

          <ul className="mt-4 space-y-2" role="listbox" aria-label="Cotizaciones">
            {cotizacionesFiltradas.length === 0 ? (
              <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
                Sin resultados para la búsqueda.
              </li>
            ) : (
              cotizacionesFiltradas.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    className={proyectoCotizacionOptionClass}
                    onClick={() => handleCargarCotizacion(item)}
                  >
                    <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      #{item.folio} — {item.cliente}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">
                      {item.fecha}
                      {item.contacto ? ` · ${item.contacto}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>

      <Modal
        isOpen={confirmClearCotizaciones}
        onClose={() => setConfirmClearCotizaciones(false)}
        closeOnBackdropClick={false}
        closeOnEscape
        ariaLabelledBy={clearCotizacionesTitleId}
        className={`${erpDeleteModalClass} z-[100000]`}
      >
        <div className={erpDeleteModalPanelClass}>
          <div className="mb-4 flex flex-col items-center text-center">
            <span
              className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
              aria-hidden
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 id={clearCotizacionesTitleId} className={erpSubheadingClass}>
              Quitar todas las cotizaciones
            </h3>
            <p className={`mt-2 text-sm ${erpBodyClass}`}>
              Se eliminarán {cotizaciones.length}{" "}
              {cotizaciones.length === 1 ? "cotización" : "cotizaciones"} del proyecto, junto con su
              presupuesto y el seguimiento de equipos. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <button
              type="button"
              onClick={() => setConfirmClearCotizaciones(false)}
              className={`${erpSecondaryBtnClass} sm:min-w-[7rem]`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleLimpiarPresupuesto}
              className={`${erpDangerBtnClass} sm:min-w-[7rem] sm:flex-none`}
            >
              Sí, quitar todas
            </button>
          </div>
        </div>
      </Modal>

      <ProyectoSyscomModeloPicker
        open={Boolean(equipoParaModeloPicker)}
        equipoLabel={equipoParaModeloPicker?.modelo ?? ""}
        modeloActual={equipoParaModeloPicker?.modelo ?? ""}
        fuentePreferida={equipoParaModeloPicker?.fuenteProducto}
        onClose={() => setModeloPickerLineaId(null)}
        onSelect={handleSelectModeloSyscom}
      />
    </>
  );
}
