import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { canCerrarProyecto } from "../shared/proyectoCloseValidation";
import {
  buildEquiposFromCotizaciones,
  clampPorcentajeAvance,
  createEmptyNotaDia,
  dateRangeFromFechasInicio,
  emptyPersona,
  expandFechasInicioRange,
  flattenPresupuesto,
  getDeviceTimeHHMM,
  normalizeAuxiliaresAsignados,
  normalizeDraftCotizaciones,
  normalizeNotasPorDia,
  normalizeTecnicosAsignados,
  normalizeTiposTrabajo,
  mergeTiposTrabajo,
  primerAuxiliar,
  reindexCotizacionBloques,
  responsableFromTecnicos,
  tiposTrabajoFromLegacy,
} from "../shared/proyectoFormUtils";
import type {
  ProyectoCotizacionBloque,
  ProyectoDraft,
  ProyectoEquipoLinea,
  ProyectoEstado,
  ProyectoNotaDia,
  ProyectoPersonaAsignada,
  ProyectoTecnicoAsignado,
  ProyectoTipoTrabajo,
  ServicioOpcion,
  TecnicoOpcion,
} from "../shared/proyectoTypes";
import { emptyInstalacionDraft, type ProyectoInstalacionDraft } from "../instalaciones";
import { useCotizacionPicker } from "./cotizaciones/useCotizacionPicker";
import type { SyscomModeloSeleccionado } from "./fields/ProyectoSyscomModeloPicker";

export type ProyectoFormTab = "cliente" | "operacion" | "presupuesto" | "instalaciones";

const TAB_ORDER: ProyectoFormTab[] = ["cliente", "instalaciones", "operacion", "presupuesto"];

function personaNombreFromUser(u: {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return full || u.email || `Usuario ${u.id}`;
}

export type UseProyectoFormStateArgs = {
  open: boolean;
  proyectoId: number | null;
  initialDraft: ProyectoDraft;
  onSave: (
    draft: ProyectoDraft,
    extras?: {
      instalacionDraft?: ProyectoInstalacionDraft | null;
      omitTechnicianLockedFields?: boolean;
    }
  ) => void | Promise<void>;
};

export function useProyectoFormState({
  open,
  initialDraft,
  onSave,
}: UseProyectoFormStateArgs) {
  const { user, isAdmin } = useAuth();
  const clienteTabId = useId();
  const operacionTabId = useId();
  const presupuestoTabId = useId();
  const instalacionesTabId = useId();
  const clientePanelId = useId();
  const operacionPanelId = useId();
  const presupuestoPanelId = useId();
  const instalacionesPanelId = useId();

  const focusNotaIdRef = useRef<string | null>(null);
  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const tecnicoSignatureCacheRef = useRef<Record<number, string>>({});

  const [notasLiveMessage, setNotasLiveMessage] = useState("");
  const [clienteStepError, setClienteStepError] = useState("");
  const [horaSalidaError, setHoraSalidaError] = useState("");

  const [activeTab, setActiveTab] = useState<ProyectoFormTab>("cliente");
  const activeTabRef = useRef<ProyectoFormTab>(activeTab);
  activeTabRef.current = activeTab;

  const [instalacionDraft, setInstalacionDraft] = useState<ProyectoInstalacionDraft>(() =>
    emptyInstalacionDraft()
  );
  const [cliente, setCliente] = useState(initialDraft.cliente);
  const [clienteId, setClienteId] = useState(initialDraft.clienteId);
  const [cotizaciones, setCotizaciones] = useState<ProyectoCotizacionBloque[]>(() =>
    normalizeDraftCotizaciones(initialDraft)
  );
  const [equipos, setEquipos] = useState(initialDraft.equipos);

  const [tiposTrabajo, setTiposTrabajo] = useState<ProyectoTipoTrabajo[]>(() =>
    normalizeTiposTrabajo(
      initialDraft.tiposTrabajo?.length
        ? initialDraft.tiposTrabajo
        : tiposTrabajoFromLegacy(initialDraft.tipoTrabajoId, initialDraft.tipoTrabajoNombre)
    )
  );
  const [status, setStatus] = useState<ProyectoEstado>(initialDraft.status);
  const [motivoPausa, setMotivoPausa] = useState(initialDraft.motivoPausa);
  const [fechaAutorizacion, setFechaAutorizacion] = useState(initialDraft.fechaAutorizacion);
  const [quienAutorizo, setQuienAutorizo] = useState(initialDraft.quienAutorizo || "");
  const [fechasInicio, setFechasInicio] = useState(initialDraft.fechasInicio);
  const initialFechaRango = dateRangeFromFechasInicio(initialDraft.fechasInicio);
  const [fechaDesde, setFechaDesde] = useState(initialFechaRango.start);
  const [fechaHasta, setFechaHasta] = useState(initialFechaRango.end);
  const [horaLlegada, setHoraLlegada] = useState(initialDraft.horaLlegada);
  const [horaSalida, setHoraSalida] = useState(initialDraft.horaSalida);
  const [tecnico, setTecnico] = useState(initialDraft.tecnico);
  const [auxiliar, setAuxiliar] = useState(initialDraft.auxiliar);
  const [tecnicosAsignados, setTecnicosAsignados] = useState<ProyectoTecnicoAsignado[]>(() =>
    normalizeTecnicosAsignados(
      initialDraft.tecnicos?.length
        ? initialDraft.tecnicos
        : initialDraft.tecnico?.id != null
          ? [{ ...initialDraft.tecnico, responsable: true }]
          : []
    )
  );
  const [auxiliaresAsignados, setAuxiliaresAsignados] = useState<ProyectoPersonaAsignada[]>(() =>
    normalizeAuxiliaresAsignados(
      initialDraft.auxiliares?.length
        ? initialDraft.auxiliares
        : initialDraft.auxiliar?.id != null
          ? [initialDraft.auxiliar]
          : []
    )
  );
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
  const [tecnicoSignatureUrl, setTecnicoSignatureUrl] = useState("");
  const [closeBlockedMessage, setCloseBlockedMessage] = useState("");

  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOpcion[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const [modeloPickerLineaId, setModeloPickerLineaId] = useState<string | null>(null);

  const onMergeTiposTrabajo = useCallback((incoming: ProyectoTipoTrabajo[]) => {
    setTiposTrabajo((prev) => mergeTiposTrabajo(prev, incoming));
  }, []);

  const assignedTechnicianLocked =
    !isAdmin &&
    user?.id != null &&
    tecnicosAsignados.some((t) => t.id != null && Number(t.id) === Number(user.id));

  const cotizacionPicker = useCotizacionPicker({
    open,
    cotizaciones,
    setCotizaciones,
    equipos,
    setEquipos,
    cliente,
    setCliente,
    setClienteId,
    cotizacionAdicional,
    setCotizacionAdicional,
    setCloseBlockedMessage,
    onMergeTiposTrabajo: assignedTechnicianLocked ? undefined : onMergeTiposTrabajo,
    servicios,
  });
  const { resetPicker } = cotizacionPicker;

  const presupuesto = useMemo(() => flattenPresupuesto(cotizaciones), [cotizaciones]);
  const presupuestoCargado = cotizaciones.length > 0;

  const equiposPorCotizacion = useMemo(() => {
    const map = new Map<string, ProyectoEquipoLinea[]>();
    for (const bloque of cotizaciones) {
      map.set(
        bloque.vinculoId,
        equipos.filter((e) => e.cotizacionVinculoId === bloque.vinculoId)
      );
    }
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
    setTiposTrabajo(
      normalizeTiposTrabajo(
        initialDraft.tiposTrabajo?.length
          ? initialDraft.tiposTrabajo
          : tiposTrabajoFromLegacy(initialDraft.tipoTrabajoId, initialDraft.tipoTrabajoNombre)
      )
    );
    setStatus(initialDraft.status);
    setMotivoPausa(initialDraft.motivoPausa);
    setFechaAutorizacion(initialDraft.fechaAutorizacion);
    setQuienAutorizo(initialDraft.quienAutorizo || "");
    setFechasInicio(initialDraft.fechasInicio.length ? initialDraft.fechasInicio : [""]);
    {
      const rango = dateRangeFromFechasInicio(
        initialDraft.fechasInicio.length ? initialDraft.fechasInicio : [""]
      );
      setFechaDesde(rango.start);
      setFechaHasta(rango.end);
    }
    setHoraLlegada(initialDraft.horaLlegada);
    setHoraSalida(initialDraft.horaSalida);
    setTecnico(initialDraft.tecnico);
    setAuxiliar(initialDraft.auxiliar);
    setTecnicosAsignados(
      normalizeTecnicosAsignados(
        initialDraft.tecnicos?.length
          ? initialDraft.tecnicos
          : initialDraft.tecnico?.id != null
            ? [{ ...initialDraft.tecnico, responsable: true }]
            : []
      )
    );
    setAuxiliaresAsignados(
      normalizeAuxiliaresAsignados(
        initialDraft.auxiliares?.length
          ? initialDraft.auxiliares
          : initialDraft.auxiliar?.id != null
            ? [initialDraft.auxiliar]
            : []
      )
    );
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
    setTecnicoSignatureUrl("");
    setCloseBlockedMessage("");
    setClienteStepError("");
    setHoraSalidaError("");
    setInstalacionDraft(emptyInstalacionDraft());
    resetPicker();
    setModeloPickerLineaId(null);
    setCatalogError("");
  }, [initialDraft, resetPicker]);

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

  useEffect(() => {
    if (!open) return;
    const tecnicoId = tecnico.id != null ? Number(tecnico.id) : null;
    if (!tecnicoId) {
      setTecnicoSignatureUrl("");
      setFirmaTecnicoUrl("");
      return;
    }

    // Al cambiar de responsable: limpiar firma previa hasta cargar la del nuevo.
    setTecnicoSignatureUrl("");
    setFirmaTecnicoUrl("");

    const cached = tecnicoSignatureCacheRef.current[tecnicoId];
    if (typeof cached === "string") {
      setTecnicoSignatureUrl(cached);
      setFirmaTecnicoUrl(cached);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchApi(`/api/users/accounts/${tecnicoId}/signature/`, {
          cache: "no-store" as RequestCache,
        });
        const data = (await res.json().catch(() => null)) as { url?: string } | null;
        if (cancelled) return;
        const url = res.ok ? String(data?.url || "") : "";
        tecnicoSignatureCacheRef.current[tecnicoId] = url;
        setTecnicoSignatureUrl(url);
        setFirmaTecnicoUrl(url);
      } catch {
        if (!cancelled) {
          tecnicoSignatureCacheRef.current[tecnicoId] = "";
          setTecnicoSignatureUrl("");
          setFirmaTecnicoUrl("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tecnico.id]);

  const equipoParaModeloPicker = modeloPickerLineaId
    ? equipos.find((eq) => eq.lineaId === modeloPickerLineaId) ?? null
    : null;

  // Mantener legacy tecnico/auxiliar alineados con las listas (firma + filtros).
  useEffect(() => {
    const nextTecnico = responsableFromTecnicos(tecnicosAsignados);
    setTecnico((prev) =>
      prev.id === nextTecnico.id && prev.nombre === nextTecnico.nombre ? prev : nextTecnico
    );
  }, [tecnicosAsignados]);

  useEffect(() => {
    const nextAux = primerAuxiliar(auxiliaresAsignados);
    setAuxiliar((prev) =>
      prev.id === nextAux.id && prev.nombre === nextAux.nombre ? prev : nextAux
    );
  }, [auxiliaresAsignados]);

  const handleTecnicosAsignadosChange = useCallback((next: ProyectoTecnicoAsignado[]) => {
    const normalized = normalizeTecnicosAsignados(next);
    const auxIds = new Set(
      auxiliaresAsignados.map((a) => a.id).filter((id): id is number => id != null)
    );
    setTecnicosAsignados(normalized.filter((t) => t.id == null || !auxIds.has(t.id)));
  }, [auxiliaresAsignados]);

  const handleAuxiliaresAsignadosChange = useCallback((next: ProyectoPersonaAsignada[]) => {
    const normalized = normalizeAuxiliaresAsignados(next);
    const techIds = new Set(
      tecnicosAsignados.map((t) => t.id).filter((id): id is number => id != null)
    );
    setAuxiliaresAsignados(normalized.filter((a) => a.id == null || !techIds.has(a.id)));
  }, [tecnicosAsignados]);

  const buildCurrentDraft = useCallback((): ProyectoDraft => {
    const bloques = reindexCotizacionBloques(cotizaciones);
    return {
      cliente: cliente.trim(),
      clienteId: clienteId.trim(),
      cotizaciones: bloques,
      cotizacion: bloques[0]?.cotizacion ?? null,
      presupuesto: flattenPresupuesto(bloques),
      equipos,
      tiposTrabajo,
      tipoTrabajoId: tiposTrabajo[0]?.id ?? null,
      tipoTrabajoNombre: tiposTrabajo[0]?.nombre?.trim() || "",
      status,
      motivoPausa: status === "pausado" ? motivoPausa.trim() : "",
      fechaAutorizacion,
      quienAutorizo: quienAutorizo.trim(),
      fechasInicio: fechasInicio.length ? fechasInicio : [""],
      horaLlegada,
      horaSalida,
      tecnicos: normalizeTecnicosAsignados(tecnicosAsignados),
      auxiliares: normalizeAuxiliaresAsignados(auxiliaresAsignados),
      tecnico: responsableFromTecnicos(tecnicosAsignados),
      auxiliar: primerAuxiliar(auxiliaresAsignados),
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
  }, [
    auxiliaresAsignados,
    cliente,
    clienteId,
    cotizacionAdicional,
    cotizaciones,
    equipos,
    evidenciasUrls,
    fechaAutorizacion,
    fechasInicio,
    firmaClienteUrl,
    firmaTecnicoUrl,
    herramientasGenerales,
    horaLlegada,
    horaSalida,
    incidencias,
    motivoPausa,
    notasPorDia,
    porcentajeAvance,
    quienAutorizo,
    requerimientosAdicionales,
    requierePresupuestoAdicional,
    status,
    tecnicosAsignados,
    tiposTrabajo,
    vehiculoAsignado,
  ]);

  const updateEquipo = (lineaId: string, patch: Partial<ProyectoEquipoLinea>) => {
    setEquipos((prev) =>
      prev.map((eq) => {
        if (eq.lineaId !== lineaId) return eq;
        const next = { ...eq, ...patch };
        // Entrega no debe degradar un equipo ya marcado como instalado.
        if (patch.equipoEntregado === true) {
          if (next.estadoInstalacion === "pendiente" || next.estadoInstalacion === "no_instalado") {
            next.estadoInstalacion = "entregado";
          }
        } else if (patch.equipoEntregado === false && next.estadoInstalacion === "entregado") {
          next.estadoInstalacion = "pendiente";
        }
        if (patch.estadoInstalacion === "instalado") {
          next.equipoEntregado = true;
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

  const diasRangoCount = fechasInicio.filter((d) => String(d || "").trim()).length;

  const setFechaRangoStart = (value: string) => {
    const next = String(value || "").trim().slice(0, 10);
    setFechaDesde(next);
    setFechasInicio(expandFechasInicioRange(next, fechaHasta));
  };

  const setFechaRangoEnd = (value: string) => {
    const next = String(value || "").trim().slice(0, 10);
    setFechaHasta(next);
    setFechasInicio(expandFechasInicioRange(fechaDesde, next));
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

  const tabIds: Record<ProyectoFormTab, string> = {
    cliente: clienteTabId,
    operacion: operacionTabId,
    presupuesto: presupuestoTabId,
    instalaciones: instalacionesTabId,
  };

  const panelIds: Record<ProyectoFormTab, string> = {
    cliente: clientePanelId,
    operacion: operacionPanelId,
    presupuesto: presupuestoPanelId,
    instalaciones: instalacionesPanelId,
  };

  const goToNextTab = useCallback(
    (fromPointer?: boolean) => {
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
    },
    [cliente]
  );

  const goToPrevTab = useCallback(() => {
    const idx = TAB_ORDER.indexOf(activeTabRef.current);
    if (idx <= 0) return;
    const prev = TAB_ORDER[idx - 1];
    setActiveTab(prev);
    activeTabRef.current = prev;
    setClienteStepError("");
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    try {
      await onSave(draft, {
        instalacionDraft: instalacionDraft.subtipo ? instalacionDraft : null,
        omitTechnicianLockedFields: assignedTechnicianLocked,
      });
    } catch {
      // El padre muestra el toast; el modal permanece abierto.
    }
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

  return {
    formRef,
    formScrollRef,
    activeTab,
    setActiveTab,
    goToNextTab,
    goToPrevTab,
    handleTabKeyDown,
    tabIds,
    panelIds,
    instalacionDraft,
    setInstalacionDraft,
    cliente,
    setCliente,
    clienteId,
    setClienteId,
    cotizaciones,
    equipos,
    tiposTrabajo,
    setTiposTrabajo,
    assignedTechnicianLocked,
    status,
    motivoPausa,
    setMotivoPausa,
    fechaAutorizacion,
    setFechaAutorizacion,
    quienAutorizo,
    setQuienAutorizo,
    fechasInicio,
    fechaDesde,
    fechaHasta,
    horaLlegada,
    setHoraLlegada,
    horaSalida,
    setHoraSalida,
    tecnico,
    setTecnico,
    auxiliar,
    setAuxiliar,
    tecnicosAsignados,
    setTecnicosAsignados: handleTecnicosAsignadosChange,
    auxiliaresAsignados,
    setAuxiliaresAsignados: handleAuxiliaresAsignadosChange,
    vehiculoAsignado,
    setVehiculoAsignado,
    herramientasGenerales,
    setHerramientasGenerales,
    notasPorDia,
    porcentajeAvance,
    porcentajeExacto,
    setPorcentajeExacto,
    incidencias,
    setIncidencias,
    requerimientosAdicionales,
    setRequerimientosAdicionales,
    requierePresupuestoAdicional,
    setRequierePresupuestoAdicional,
    cotizacionAdicional,
    setCotizacionAdicional,
    evidenciasUrls,
    setEvidenciasUrls,
    firmaClienteUrl,
    setFirmaClienteUrl,
    firmaTecnicoUrl,
    tecnicoSignatureUrl,
    closeBlockedMessage,
    setCloseBlockedMessage,
    servicios,
    catalogError,
    notasLiveMessage,
    clienteStepError,
    setClienteStepError,
    horaSalidaError,
    setHoraSalidaError,
    presupuesto,
    presupuestoCargado,
    equiposPorCotizacion,
    servicioOptions,
    tecnicoOptions,
    pickerOpen: cotizacionPicker.pickerOpen,
    setPickerOpen: cotizacionPicker.setPickerOpen,
    confirmClearCotizaciones: cotizacionPicker.confirmClearCotizaciones,
    setConfirmClearCotizaciones: cotizacionPicker.setConfirmClearCotizaciones,
    pickerTarget: cotizacionPicker.pickerTarget,
    pickerTab: cotizacionPicker.pickerTab,
    setPickerTab: cotizacionPicker.setPickerTab,
    pickerSearch: cotizacionPicker.pickerSearch,
    setPickerSearch: cotizacionPicker.setPickerSearch,
    setPickerResults: cotizacionPicker.setPickerResults,
    pickerLoading: cotizacionPicker.pickerLoading,
    pickerError: cotizacionPicker.pickerError,
    setPickerError: cotizacionPicker.setPickerError,
    pickerLoadingId: cotizacionPicker.pickerLoadingId,
    cotizacionesFiltradas: cotizacionPicker.cotizacionesFiltradas,
    modeloPickerLineaId,
    setModeloPickerLineaId,
    equipoParaModeloPicker,
    buildCurrentDraft,
    handleSubmit,
    handleStatusChange,
    handleCargarCotizacion: cotizacionPicker.handleCargarCotizacion,
    openCotizacionPicker: cotizacionPicker.openCotizacionPicker,
    handleQuitarCotizacion: cotizacionPicker.handleQuitarCotizacion,
    handleLimpiarPresupuesto: cotizacionPicker.handleLimpiarPresupuesto,
    updateEquipo,
    handleSelectModeloSyscom,
    handleRestaurarModeloOriginal,
    setPersonaFromId,
    diasRangoCount,
    setFechaRangoStart,
    setFechaRangoEnd,
    addNotaDia,
    removeNotaDia,
    updateNotaDia,
    updateNotaDiaImagenes,
    setPorcentajeAvanceSafe,
    handlePorcentajeExactoChange,
    stampHoraLlegada,
    stampHoraSalida,
  };
}
