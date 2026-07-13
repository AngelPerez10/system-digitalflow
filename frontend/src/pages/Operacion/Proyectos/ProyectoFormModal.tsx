import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import {
  erpBodyClass,
  erpChipNeutralClass,
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSelectFieldClass,
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
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalInnerPanelClass,
  erpModalPanelClass,
  erpModalSectionRowClass,
  erpModalSectionTitleClass,
  erpModalShellClass,
  erpModalTabClass,
} from "../OrdenesTrabajo/ordenTrabajoStyles";
import { canCerrarProyecto, proyectoRequiereCotizacionAdicional } from "./proyectoCloseValidation";
import { ProyectoEvidenciasField } from "./ProyectoEvidenciasField";
import {
  buildEquiposFromPresupuesto,
  clampPorcentajeAvance,
  createEmptyNotaDia,
  emptyPersona,
  estadoBadgeClass,
  estadoInstalacionLabel,
} from "./proyectoFormUtils";
import {
  MOCK_COTIZACIONES_DIGITALFLOW,
  MOCK_COTIZACIONES_SICAR,
  MOCK_PRESUPUESTO_BY_COTIZACION,
} from "./proyectoMockData";
import {
  proyectoCotizacionOptionClass,
  proyectoEmptyPanelClass,
  proyectoEquipoCardClass,
  proyectoFieldLabelClass,
  proyectoOrigenBadgeClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
  proyectoSectionHintClass,
  proyectoStepBadgeClass,
} from "./proyectoPageStyles";
import {
  ProyectoSyscomModeloPicker,
  type SyscomModeloSeleccionado,
} from "./ProyectoSyscomModeloPicker";
import type {
  CotizacionOrigen,
  CotizacionResumen,
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

const STATUS_OPTIONS: { value: ProyectoEstado; label: string }[] = [
  { value: "en_proceso", label: "En proceso" },
  { value: "pausado", label: "Pausado" },
  { value: "cerrado", label: "Cerrado" },
];

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

  const [activeTab, setActiveTab] = useState<ProyectoFormTab>("cliente");
  const [cliente, setCliente] = useState(initialDraft.cliente);
  const [clienteId, setClienteId] = useState(initialDraft.clienteId);
  const [cotizacion, setCotizacion] = useState(initialDraft.cotizacion);
  const [presupuesto, setPresupuesto] = useState(initialDraft.presupuesto);
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
    initialDraft.notasPorDia?.length ? initialDraft.notasPorDia : [createEmptyNotaDia()]
  );
  const [porcentajeAvance, setPorcentajeAvance] = useState(initialDraft.porcentajeAvance);
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
  const [pickerTarget, setPickerTarget] = useState<CotizacionPickerTarget>("principal");
  const [pickerTab, setPickerTab] = useState<CotizacionOrigen>("digitalflow");
  const [pickerSearch, setPickerSearch] = useState("");
  const [modeloPickerLineaId, setModeloPickerLineaId] = useState<string | null>(null);

  const presupuestoCargado = presupuesto.length > 0;

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
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.folio.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        (c.contacto || "").toLowerCase().includes(q)
    );
  }, [pickerTab, pickerSearch]);

  const resetFromInitial = useCallback(() => {
    setActiveTab("cliente");
    setCliente(initialDraft.cliente);
    setClienteId(initialDraft.clienteId);
    setCotizacion(initialDraft.cotizacion);
    setPresupuesto(initialDraft.presupuesto);
    setEquipos(initialDraft.equipos);
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
    setNotasPorDia(
      initialDraft.notasPorDia?.length ? initialDraft.notasPorDia : [createEmptyNotaDia()]
    );
    setPorcentajeAvance(initialDraft.porcentajeAvance);
    setIncidencias(initialDraft.incidencias);
    setRequerimientosAdicionales(initialDraft.requerimientosAdicionales);
    setRequierePresupuestoAdicional(initialDraft.requierePresupuestoAdicional);
    setCotizacionAdicional(initialDraft.cotizacionAdicional);
    setEvidenciasUrls(initialDraft.evidenciasUrls ?? []);
    setFirmaClienteUrl(initialDraft.firmaClienteUrl);
    setFirmaTecnicoUrl(initialDraft.firmaTecnicoUrl);
    setCloseBlockedMessage("");
    setPickerOpen(false);
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
    const lineas = MOCK_PRESUPUESTO_BY_COTIZACION[item.id] ?? [];
    setCotizacion(item);
    setCliente(item.cliente);
    setClienteId(item.origen === "digitalflow" ? `df-cli-${item.id}` : `sic-cli-${item.id}`);
    setPresupuesto(lineas);
    setEquipos(buildEquiposFromPresupuesto(lineas));
    setPickerOpen(false);
    setPickerSearch("");
  };

  const openCotizacionPicker = (target: CotizacionPickerTarget) => {
    setPickerTarget(target);
    setPickerSearch("");
    setPickerOpen(true);
  };

  const buildCurrentDraft = (): ProyectoDraft => ({
    cliente: cliente.trim(),
    clienteId: clienteId.trim(),
    cotizacion,
    presupuesto,
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
  });

  const handleLimpiarPresupuesto = () => {
    setCotizacion(null);
    setPresupuesto([]);
    setEquipos([]);
    setCliente("");
    setClienteId("");
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
    });
    setModeloPickerLineaId(null);
  };

  const handleRestaurarModeloOriginal = (eq: ProyectoEquipoLinea) => {
    updateEquipo(eq.lineaId, {
      modelo: eq.modeloOriginal,
      productoId: undefined,
      marca: undefined,
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
    setNotasPorDia((prev) => [...prev, createEmptyNotaDia()]);
  };

  const removeNotaDia = (index: number) => {
    setNotasPorDia((prev) => {
      if (prev.length <= 1) return [{ ...prev[0], nota: "" }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateNotaDia = (index: number, nota: string) => {
    setNotasPorDia((prev) => prev.map((n, i) => (i === index ? { ...n, nota } : n)));
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
    if (!cliente.trim()) return;
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

  return (
    <>
      <Modal
        mobileBottomSheet
        isOpen={open}
        onClose={onClose}
        closeOnBackdropClick={false}
        closeOnEscape={!pickerOpen && !modeloPickerLineaId}
        ariaLabel={`${editing ? "Editar" : "Nuevo"} proyecto`}
        className={erpModalShellClass}
      >
        <OrdenFormModalHeader
          editing={editing}
          contextLabel="Operación · Proyectos"
          title={`${editing ? "Editar" : "Nuevo"} proyecto`}
          subtitle="Asigna equipo, fechas y seguimiento operativo del proyecto"
        />

        <form onSubmit={handleSubmit} className={erpModalBodyClass}>
          <div className={erpModalFormScrollClass}>
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Secciones del proyecto">
              <button
                type="button"
                id={clienteTabId}
                role="tab"
                aria-selected={activeTab === "cliente"}
                aria-controls={clientePanelId}
                onClick={() => setActiveTab("cliente")}
                className={erpModalTabClass(activeTab === "cliente")}
              >
                Cliente y cotización
              </button>
              <button
                type="button"
                id={operacionTabId}
                role="tab"
                aria-selected={activeTab === "operacion"}
                aria-controls={operacionPanelId}
                onClick={() => setActiveTab("operacion")}
                className={erpModalTabClass(activeTab === "operacion")}
              >
                Operación
              </button>
              <button
                type="button"
                id={presupuestoTabId}
                role="tab"
                aria-selected={activeTab === "presupuesto"}
                aria-controls={presupuestoPanelId}
                onClick={() => setActiveTab("presupuesto")}
                className={erpModalTabClass(activeTab === "presupuesto")}
              >
                Presupuesto y equipos
              </button>
            </div>

            {activeTab === "cliente" && (
              <div
                id={clientePanelId}
                role="tabpanel"
                aria-labelledby={clienteTabId}
                className={erpModalPanelClass}
              >
                <div className={erpModalSectionRowClass}>
                  <h3 className={erpModalSectionTitleClass}>Identificación</h3>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="proyecto-modal-cliente" className={proyectoFieldLabelClass}>
                      Cliente
                    </label>
                    <input
                      id="proyecto-modal-cliente"
                      type="text"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Nombre o razón social"
                      className={erpInputLikeClass}
                      autoComplete="organization"
                      required
                    />
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
                      readOnly={Boolean(cotizacion)}
                      aria-readonly={Boolean(cotizacion)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <p className={erpSectionLabelClass}>Origen del presupuesto</p>
                  {cotizacion ? (
                    <div className={`${erpModalInnerPanelClass} mt-3`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className={proyectoOrigenBadgeClass(cotizacion.origen)}>
                            {cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                            Cotización #{cotizacion.folio}
                          </p>
                          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
                            {cotizacion.fecha}
                            {cotizacion.contacto ? ` · ${cotizacion.contacto}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={erpSecondaryBtnClass} onClick={() => openCotizacionPicker("principal")}>
                            Cambiar
                          </button>
                          <button
                            type="button"
                            className={`${erpDangerBtnClass} !flex-none !px-3 !py-2 !text-xs`}
                            onClick={handleLimpiarPresupuesto}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`${proyectoEmptyPanelClass} mt-3`}>
                      <p className="text-sm text-[#57534e] dark:text-[#b7c1d1]">
                        Vincula una cotización para traer el presupuesto sin importes.
                      </p>
                      <button
                        type="button"
                        className={`${erpPrimaryBtnClass} mt-4`}
                        onClick={() => openCotizacionPicker("principal")}
                      >
                        Cargar cotización
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "operacion" && (
              <div
                id={operacionPanelId}
                role="tabpanel"
                aria-labelledby={operacionTabId}
                className="space-y-4"
              >
                {catalogError ? (
                  <p
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                    role="status"
                  >
                    {catalogError}
                  </p>
                ) : null}

                {/* 1 · Estado */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-estado">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      1
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-estado" className={erpModalSectionTitleClass}>
                        Estado del proyecto
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Define el tipo de trabajo y el status actual.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
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
                        <p className="mt-1 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                          Actual: {tipoTrabajoNombre}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="proyecto-status" className={proyectoFieldLabelClass}>
                        Status
                      </label>
                      <select
                        id="proyecto-status"
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value as ProyectoEstado)}
                        className={erpSelectFieldClass}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {status === "pausado" ? (
                      <div
                        className={`${erpModalInnerPanelClass} border-amber-200/80 bg-amber-50/40 dark:border-amber-500/25 dark:bg-amber-500/5`}
                      >
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
                  </div>
                </section>

                {/* 2 · Agenda */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-agenda">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      2
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-agenda" className={erpModalSectionTitleClass}>
                        Agenda
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Autorización, llegada y días de inicio en campo.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="proyecto-fecha-autorizacion" className={proyectoFieldLabelClass}>
                        Fecha de autorización
                      </label>
                      <input
                        id="proyecto-fecha-autorizacion"
                        type="date"
                        value={fechaAutorizacion}
                        onChange={(e) => setFechaAutorizacion(e.target.value)}
                        className={erpInputLikeClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="proyecto-hora-llegada" className={proyectoFieldLabelClass}>
                        Hora de llegada
                      </label>
                      <input
                        id="proyecto-hora-llegada"
                        type="time"
                        value={horaLlegada}
                        onChange={(e) => setHoraLlegada(e.target.value)}
                        className={erpInputLikeClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="proyecto-hora-salida" className={proyectoFieldLabelClass}>
                        Horario de salida
                      </label>
                      <input
                        id="proyecto-hora-salida"
                        type="time"
                        value={horaSalida}
                        onChange={(e) => setHoraSalida(e.target.value)}
                        className={erpInputLikeClass}
                      />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#e7ded0]/90 pt-4 dark:border-[#334155]">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className={proyectoFieldLabelClass}>Fechas de inicio</p>
                        <p className={`${proyectoSectionHintClass} !mt-0`}>
                          Una fecha por jornada. Puedes agregar más días.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                        onClick={addFechaInicio}
                      >
                        + Agregar día
                      </button>
                    </div>

                    <ol className="mt-3 space-y-0" aria-label="Fechas de inicio del proyecto">
                      {fechasInicio.map((fecha, index) => (
                        <li
                          key={`fecha-inicio-${index}`}
                          className="group relative flex gap-3 pb-3 last:pb-0"
                        >
                          {/* Rail vertical */}
                          {index < fechasInicio.length - 1 ? (
                            <span
                              className="absolute left-[13px] top-8 bottom-0 w-px bg-[#e7ded0] dark:bg-[#334155]"
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
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`proyecto-fecha-inicio-${index}`}
                                className="sr-only"
                              >
                                Fecha de inicio, día {index + 1}
                              </label>
                              <input
                                id={`proyecto-fecha-inicio-${index}`}
                                type="date"
                                value={fecha}
                                onChange={(e) => updateFechaInicio(index, e.target.value)}
                                className={erpInputLikeClass}
                              />
                              {fechasInicio.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeFechaInicio(index)}
                                  aria-label={`Quitar día ${index + 1}`}
                                  title={`Quitar día ${index + 1}`}
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#a8a29e] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:text-[#64748b] dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
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
                            <p className="mt-1 text-[11px] font-medium text-[#a8a29e] dark:text-[#64748b]">
                              Día {index + 1}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>

                {/* 3 · Equipo de campo */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-equipo">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      3
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-equipo" className={erpModalSectionTitleClass}>
                        Equipo de campo
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Quién va, en qué unidad y con qué herramientas.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
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

                  <div className="mt-4">
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
                </section>

                {/* 4 · Notas por día + avance */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-notas">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={proyectoStepBadgeClass} aria-hidden>
                        4
                      </span>
                      <div className="min-w-0">
                        <h3 id="proyecto-sec-notas" className={erpModalSectionTitleClass}>
                          Notas por día
                        </h3>
                        <p className={proyectoSectionHintClass}>
                          Una nota por jornada. Agrega tantos días como necesites.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="inline-flex min-w-[7rem] flex-col items-end rounded-xl border border-[#e7ded0] bg-[#fff8f1] px-3 py-2 dark:border-[#334155] dark:bg-[#ff801f]/10"
                        aria-hidden
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                          Avance
                        </span>
                        <span className="text-lg font-semibold tabular-nums text-[#9a3412] dark:text-[#fdba74]">
                          {porcentajeAvance}%
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                        onClick={addNotaDia}
                      >
                        + Agregar día
                      </button>
                    </div>
                  </div>

                  <ol className="mt-4 space-y-3" aria-label="Notas por día">
                    {notasPorDia.map((item, index) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-[#e7ded0]/90 bg-[#fffdfa] p-3 dark:border-[#334155] dark:bg-[#0f172a]/40"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <label
                            htmlFor={`proyecto-nota-dia-${item.id}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
                          >
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#ff801f]/35 bg-[#fff4eb] text-[11px] font-bold tabular-nums text-[#9a3412] dark:border-[#ff801f]/40 dark:bg-[#ff801f]/15 dark:text-[#fdba74]"
                              aria-hidden
                            >
                              {index + 1}
                            </span>
                            Día {index + 1}
                          </label>
                          {notasPorDia.length > 1 ? (
                            <button
                              type="button"
                              className={`${erpDangerBtnClass} !px-2.5 !py-1.5 !text-xs`}
                              onClick={() => removeNotaDia(index)}
                              aria-label={`Quitar nota del día ${index + 1}`}
                            >
                              Quitar
                            </button>
                          ) : null}
                        </div>
                        <textarea
                          id={`proyecto-nota-dia-${item.id}`}
                          value={item.nota}
                          onChange={(e) => updateNotaDia(index, e.target.value)}
                          rows={3}
                          placeholder={`Nota del día ${index + 1}…`}
                          className={`${erpInputLikeClass} min-h-[4.5rem] resize-y`}
                        />
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 max-w-xs">
                    <label htmlFor="proyecto-porcentaje" className={proyectoFieldLabelClass}>
                      Porcentaje de avance %
                    </label>
                    <div className="relative">
                      <input
                        id="proyecto-porcentaje"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={porcentajeAvance}
                        onChange={(e) =>
                          setPorcentajeAvance(clampPorcentajeAvance(Number(e.target.value)))
                        }
                        className={`${erpInputLikeClass} pr-10`}
                        aria-describedby="proyecto-porcentaje-bar"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[#78716c] dark:text-[#8ea0b8]">
                        %
                      </span>
                    </div>
                    <div
                      id="proyecto-porcentaje-bar"
                      className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#f1e8db] dark:bg-[#1e293b]"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={porcentajeAvance}
                      aria-label="Porcentaje de avance del proyecto"
                    >
                      <div
                        className="h-full rounded-full bg-[#ff801f] transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${porcentajeAvance}%` }}
                      />
                    </div>
                  </div>
                </section>

                {/* 5 · Incidencias y requerimientos */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-incidencias">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      5
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-incidencias" className={erpModalSectionTitleClass}>
                        Incidencias y requerimientos
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Si hay requerimientos o presupuesto adicional, el proyecto no podrá cerrarse sin cotización vinculada.
                      </p>
                    </div>
                  </div>

                  {closeBlockedMessage ? (
                    <p
                      className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
                      role="alert"
                    >
                      {closeBlockedMessage}
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-4">
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
                      <div className={`${erpModalInnerPanelClass}`}>
                        <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
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
                                className={`${erpDangerBtnClass} !flex-none !px-3 !py-2 !text-xs`}
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
                  </div>
                </section>

                {/* 6 · Evidencia */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-evidencia">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      6
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-evidencia" className={erpModalSectionTitleClass}>
                        Evidencia fotográfica
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Misma experiencia de carga que Órdenes de servicio.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProyectoEvidenciasField urls={evidenciasUrls} onChange={setEvidenciasUrls} />
                  </div>
                </section>

                {/* 7 · Firmas */}
                <section className={erpModalPanelClass} aria-labelledby="proyecto-sec-firmas">
                  <div className="flex items-start gap-3">
                    <span className={proyectoStepBadgeClass} aria-hidden>
                      7
                    </span>
                    <div className="min-w-0">
                      <h3 id="proyecto-sec-firmas" className={erpModalSectionTitleClass}>
                        Firmas
                      </h3>
                      <p className={proyectoSectionHintClass}>
                        Reutiliza el componente SignaturePad de Órdenes.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </section>
              </div>
            )}

            {activeTab === "presupuesto" && (
              <div
                id={presupuestoPanelId}
                role="tabpanel"
                aria-labelledby={presupuestoTabId}
                className="space-y-5"
              >
                <section className={erpModalPanelClass} aria-describedby={presupuestoHintId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={erpModalSectionRowClass}>
                      <h3 className={erpModalSectionTitleClass}>Presupuesto</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${erpChipNeutralClass}`}>
                      Sin precios
                    </span>
                  </div>
                  <p id={presupuestoHintId} className={`${erpBodyClass} mt-2 text-sm`}>
                    Solo descripción, cantidad y unidad.
                  </p>

                  {!presupuestoCargado ? (
                    <div className={`${proyectoEmptyPanelClass} mt-4`} role="status">
                      Carga una cotización en la pestaña «Cliente y cotización».
                    </div>
                  ) : (
                    <div className={`${erpTableWrapClass} mt-4`}>
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
                        <tbody className="divide-y divide-[#e7ded0] dark:divide-[#273244]">
                          {presupuesto.map((linea) => (
                            <tr key={linea.id} className="transition-colors hover:bg-[#fff8f1]/60 dark:hover:bg-[#1e293b]/30">
                              <td className="px-3 py-2.5">
                                {linea.categoria ? (
                                  <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-[#ff801f]">
                                    {linea.categoria}
                                  </span>
                                ) : null}
                                <span className="font-medium text-[#1c1917] dark:text-[#f1f5f9]">
                                  {linea.descripcion}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-center tabular-nums">{linea.cantidad}</td>
                              <td className="px-2 py-2.5 text-center text-xs uppercase">{linea.unidad}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className={erpModalPanelClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={erpModalSectionRowClass}>
                      <h3 className={erpModalSectionTitleClass}>Equipos del proyecto</h3>
                    </div>
                    {!presupuestoCargado && (
                      <span className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
                        Disponible al cargar presupuesto
                      </span>
                    )}
                  </div>

                  <fieldset
                    className="mt-4 space-y-3 border-0 p-0"
                    disabled={!presupuestoCargado}
                    aria-disabled={!presupuestoCargado}
                  >
                    <legend className="sr-only">Seguimiento de equipos</legend>

                    {equipos.length === 0 && presupuestoCargado ? (
                      <div className={proyectoEmptyPanelClass} role="status">
                        El presupuesto no incluye líneas marcadas como equipo.
                      </div>
                    ) : null}

                    {equipos.map((eq) => (
                      <article key={eq.lineaId} className={proyectoEquipoCardClass}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={estadoBadgeClass(eq.estadoInstalacion)}>
                              {estadoInstalacionLabel(eq.estadoInstalacion)}
                            </span>
                            <p className="mt-1.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                              {eq.modelo}
                            </p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2d9ca] bg-white px-2.5 py-1.5 text-xs font-medium has-[:disabled]:opacity-50 dark:border-[#334155] dark:bg-[#111a2b]">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[#d6d3d1] text-[#ff801f] focus:ring-[#ff801f]/30"
                              checked={eq.equipoEntregado}
                              disabled={!presupuestoCargado}
                              onChange={(e) =>
                                updateEquipo(eq.lineaId, { equipoEntregado: e.target.checked })
                              }
                              aria-label={`Equipo entregado: ${eq.modelo}`}
                            />
                            Equipo entregado
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <span className={proyectoFieldLabelClass}>
                              Modelo {!isAdmin && "(solo admin)"}
                            </span>
                            <div className="rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/80 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/50">
                              <p className="text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                                {eq.modelo}
                              </p>
                              {eq.modelo !== eq.modeloOriginal ? (
                                <p className="mt-1 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                  Original: {eq.modeloOriginal}
                                </p>
                              ) : (
                                <p className="mt-1 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                  Del presupuesto
                                </p>
                              )}
                              {eq.productoId ? (
                                <p className="mt-0.5 text-[10px] tabular-nums text-[#a8a29e] dark:text-[#64748b]">
                                  Syscom ID {eq.productoId}
                                </p>
                              ) : null}
                            </div>
                            {isAdmin ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={!presupuestoCargado}
                                  className={`${erpSecondaryBtnClass} !px-3 !py-1.5 !text-xs`}
                                  onClick={() => setModeloPickerLineaId(eq.lineaId)}
                                  aria-label={`Cambiar modelo Syscom de ${eq.modelo}`}
                                >
                                  Cambiar en Syscom
                                </button>
                                {eq.modelo !== eq.modeloOriginal ? (
                                  <button
                                    type="button"
                                    disabled={!presupuestoCargado}
                                    className="rounded-lg border border-[#e2d9ca] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#57534e] transition hover:border-[#ff801f]/40 focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1]"
                                    onClick={() => handleRestaurarModeloOriginal(eq)}
                                    aria-label={`Restaurar modelo original de ${eq.modeloOriginal}`}
                                  >
                                    Restaurar original
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <p className="mt-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                Solo un administrador puede cambiar el modelo desde Syscom.
                              </p>
                            )}
                          </div>
                          <div>
                            <span className={proyectoFieldLabelClass}>Instalación</span>
                            <div className="flex flex-wrap gap-2" role="group" aria-label={`Instalación de ${eq.modelo}`}>
                              <button
                                type="button"
                                disabled={!presupuestoCargado}
                                aria-pressed={eq.estadoInstalacion === "instalado"}
                                onClick={() => updateEquipo(eq.lineaId, { estadoInstalacion: "instalado" })}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 disabled:opacity-50 ${
                                  eq.estadoInstalacion === "instalado"
                                    ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/40"
                                    : "border-[#e2d9ca] bg-white dark:border-[#334155] dark:bg-[#111a2b]"
                                }`}
                              >
                                Instalado
                              </button>
                              <button
                                type="button"
                                disabled={!presupuestoCargado}
                                aria-pressed={eq.estadoInstalacion === "no_instalado"}
                                onClick={() =>
                                  updateEquipo(eq.lineaId, { estadoInstalacion: "no_instalado" })
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300/40 disabled:opacity-50 ${
                                  eq.estadoInstalacion === "no_instalado"
                                    ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40"
                                    : "border-[#e2d9ca] bg-white dark:border-[#334155] dark:bg-[#111a2b]"
                                }`}
                              >
                                No instalado
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </fieldset>
                </section>
              </div>
            )}
          </div>

          <footer className={erpModalFooterClass}>
            <OrdenModalFooterActions
              onCancel={onClose}
              primary={
                <OrdenModalPrimaryButton type="submit" disabled={!cliente.trim()}>
                  {editing ? "Guardar cambios" : "Crear proyecto"}
                </OrdenModalPrimaryButton>
              }
            />
          </footer>
        </form>
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
                  : "DigitalFlow o SICAR — el cliente y presupuesto se completan automáticamente."}
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

      <ProyectoSyscomModeloPicker
        open={Boolean(equipoParaModeloPicker)}
        equipoLabel={equipoParaModeloPicker?.modelo ?? ""}
        modeloActual={equipoParaModeloPicker?.modelo ?? ""}
        onClose={() => setModeloPickerLineaId(null)}
        onSelect={handleSelectModeloSyscom}
      />
    </>
  );
}
