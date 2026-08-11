import { useId, type CSSProperties } from "react";
import DatePicker from "@/components/form/date-picker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { TimeIcon } from "@/icons";
import { erpInputLikeClass, erpPrimaryBtnClass, erpSecondaryBtnClass } from "@/layout/erpPageStyles";
import { proyectoRequiereCotizacionAdicional } from "../../shared/proyectoCloseValidation";
import { ProyectoAsignadosMultiField } from "../fields/ProyectoAsignadosMultiField";
import { ProyectoEvidenciasField } from "../fields/ProyectoEvidenciasField";
import { ProyectoFormSection, proyectoSectionIconClass } from "../ProyectoFormSection";
import { ProyectoNotaDiaFotosField } from "../fields/ProyectoNotaDiaFotosField";
import { ProyectoTiposTrabajoField } from "../fields/ProyectoTiposTrabajoField";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import type { CotizacionPickerTarget } from "../cotizaciones/useCotizacionPicker";
import {
  formatProyectoFecha,
  proyectoAddDayBtnClass,
  proyectoAvanceRangeClass,
  proyectoAvanceValueClass,
  proyectoFieldLabelClass,
  proyectoGhostIconBtnClass,
  proyectoNotaCardClass,
  proyectoNotaDayBadgeClass,
  proyectoNotaMetaClass,
  proyectoNotaTextareaClass,
  proyectoOrigenBadgeClass,
  proyectoSectionHintClass,
  proyectoStatusChipClass,
} from "../../shared/proyectoPageStyles";
import type {
  CotizacionResumen,
  ProyectoEstado,
  ProyectoNotaDia,
  ProyectoPersonaAsignada,
  ProyectoTecnicoAsignado,
  ProyectoTipoTrabajo,
  ServicioOpcion,
} from "../../shared/proyectoTypes";

const STATUS_OPTIONS: { value: ProyectoEstado; label: string; tone: "proceso" | "pausado" | "cerrado" }[] = [
  { value: "en_proceso", label: "En proceso", tone: "proceso" },
  { value: "pausado", label: "Pausado", tone: "pausado" },
  { value: "cerrado", label: "Cerrado", tone: "cerrado" },
];

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

export type ProyectoOperacionTabProps = {
  panelId: string;
  labelledBy: string;
  editing: boolean;
  catalogError: string;
  servicios: ServicioOpcion[];
  tiposTrabajo: ProyectoTipoTrabajo[];
  setTiposTrabajo: (v: ProyectoTipoTrabajo[]) => void;
  /** Bloqueos del técnico asignado (tipos, fecha autorización). */
  assignedTechnicianLocked?: boolean;
  status: ProyectoEstado;
  handleStatusChange: (v: ProyectoEstado) => void;
  motivoPausa: string;
  setMotivoPausa: (v: string) => void;
  fechaAutorizacion: string;
  setFechaAutorizacion: (v: string) => void;
  horaLlegada: string;
  setHoraLlegada: (v: string) => void;
  horaSalida: string;
  setHoraSalida: (v: string) => void;
  horaSalidaError: string;
  setHoraSalidaError: (v: string) => void;
  stampHoraLlegada: () => void;
  stampHoraSalida: () => void;
  fechaDesde: string;
  fechaHasta: string;
  setFechaRangoStart: (v: string) => void;
  setFechaRangoEnd: (v: string) => void;
  operacionErrors: { tipos: string; fechaAuth: string; fechaDesde: string };
  diasRangoCount: number;
  fechasInicio: string[];
  tecnicosAsignados: ProyectoTecnicoAsignado[];
  setTecnicosAsignados: (v: ProyectoTecnicoAsignado[]) => void;
  auxiliaresAsignados: ProyectoPersonaAsignada[];
  setAuxiliaresAsignados: (v: ProyectoPersonaAsignada[]) => void;
  vehiculoAsignado: string;
  setVehiculoAsignado: (v: string) => void;
  herramientasGenerales: string;
  setHerramientasGenerales: (v: string) => void;
  tecnicoOptions: { value: string; label: string }[];
  notasPorDia: ProyectoNotaDia[];
  notasLiveMessage: string;
  addNotaDia: () => void;
  removeNotaDia: (index: number) => void;
  updateNotaDia: (index: number, nota: string) => void;
  updateNotaDiaImagenes: (index: number, urls: string[]) => void;
  porcentajeAvance: number;
  porcentajeExacto: string;
  setPorcentajeAvanceSafe: (v: number) => void;
  handlePorcentajeExactoChange: (v: string) => void;
  setPorcentajeExacto: (v: string) => void;
  closeBlockedMessage: string;
  setCloseBlockedMessage: (v: string) => void;
  incidencias: string;
  setIncidencias: (v: string) => void;
  requerimientosAdicionales: string;
  setRequerimientosAdicionales: (v: string) => void;
  requierePresupuestoAdicional: boolean;
  setRequierePresupuestoAdicional: (v: boolean) => void;
  cotizacionAdicional: CotizacionResumen | null;
  setCotizacionAdicional: (v: CotizacionResumen | null) => void;
  openCotizacionPicker: (target: CotizacionPickerTarget) => void;
  evidenciasUrls: string[];
  setEvidenciasUrls: (urls: string[]) => void;
  firmaClienteUrl: string;
  setFirmaClienteUrl: (v: string) => void;
  firmaTecnicoUrl: string;
  tecnicoSignatureUrl: string;
};

export function ProyectoOperacionTab({
  panelId,
  labelledBy,
  editing,
  catalogError,
  servicios,
  tiposTrabajo,
  setTiposTrabajo,
  assignedTechnicianLocked = false,
  status,
  handleStatusChange,
  motivoPausa,
  setMotivoPausa,
  fechaAutorizacion,
  setFechaAutorizacion,
  horaLlegada,
  setHoraLlegada,
  horaSalida,
  setHoraSalida,
  horaSalidaError,
  setHoraSalidaError,
  stampHoraLlegada,
  stampHoraSalida,
  fechaDesde,
  fechaHasta,
  setFechaRangoStart,
  setFechaRangoEnd,
  operacionErrors,
  diasRangoCount,
  fechasInicio,
  tecnicosAsignados,
  setTecnicosAsignados,
  auxiliaresAsignados,
  setAuxiliaresAsignados,
  vehiculoAsignado,
  setVehiculoAsignado,
  herramientasGenerales,
  setHerramientasGenerales,
  tecnicoOptions,
  notasPorDia,
  notasLiveMessage,
  addNotaDia,
  removeNotaDia,
  updateNotaDia,
  updateNotaDiaImagenes,
  porcentajeAvance,
  porcentajeExacto,
  setPorcentajeAvanceSafe,
  handlePorcentajeExactoChange,
  setPorcentajeExacto,
  closeBlockedMessage,
  setCloseBlockedMessage,
  incidencias,
  setIncidencias,
  requerimientosAdicionales,
  setRequerimientosAdicionales,
  requierePresupuestoAdicional,
  setRequierePresupuestoAdicional,
  cotizacionAdicional,
  setCotizacionAdicional,
  openCotizacionPicker,
  evidenciasUrls,
  setEvidenciasUrls,
  firmaClienteUrl,
  setFirmaClienteUrl,
  firmaTecnicoUrl,
  tecnicoSignatureUrl,
}: ProyectoOperacionTabProps) {
  const motivoId = useId();
  const notasLiveId = useId();
  const tecnicoResponsableNombre =
    tecnicosAsignados.find((t) => t.responsable)?.nombre?.trim() ||
    tecnicosAsignados[0]?.nombre?.trim() ||
    "";

  return (
    <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="space-y-5">
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
        eyebrow="Paso 3"
        title="Estado del proyecto"
        hint="Define el tipo de trabajo y el status actual."
        icon={iconStatus}
      >
        <div>
          <ProyectoTiposTrabajoField
            value={tiposTrabajo}
            onChange={setTiposTrabajo}
            servicios={servicios}
            disabled={assignedTechnicianLocked}
            placeholder="Buscar servicio…"
            required
            error={operacionErrors.tipos}
          />
          {catalogError ? (
            <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400" role="alert">
              {catalogError}
            </p>
          ) : null}
        </div>

        <div>
          <p id="proyecto-status-label" className={proyectoFieldLabelClass}>
            Status
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="proyecto-status-label">
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
              required
              error={operacionErrors.fechaAuth}
              defaultDate={fechaAutorizacion || undefined}
              disabled={assignedTechnicianLocked}
              onChange={(_dates, currentDateString) => {
                if (assignedTechnicianLocked) return;
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
                  horaSalidaError ? "proyecto-hora-salida-error proyecto-hora-salida-hint" : "proyecto-hora-salida-hint"
                }
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-[#fff4eb] hover:text-[#9a3412] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#ff801f]/15 dark:hover:text-[#fdba74]"
                onClick={stampHoraSalida}
                aria-label="Usar hora actual del dispositivo para salida"
                title={horaLlegada.trim() ? "Usar hora actual" : "Requiere hora de llegada"}
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
              <p className={proyectoFieldLabelClass}>Periodo de trabajo</p>
              <p className={`${proyectoSectionHintClass} !mt-0`}>
                Define el rango de fechas. Se generan las jornadas día por día para la bitácora.
              </p>
            </div>
            {diasRangoCount > 0 ? (
              <span className="rounded-full border border-[#e7ded0] bg-[#fcfaf6] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#aeb8c8]">
                {diasRangoCount} {diasRangoCount === 1 ? "día" : "días"}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
            <div>
              <DatePicker
                key={`proyecto-fecha-desde-${editing ? "e" : "n"}-${fechaDesde || "x"}`}
                id="proyecto-fecha-inicio-desde"
                label="Desde"
                placeholder="Fecha de inicio"
                required
                error={operacionErrors.fechaDesde}
                defaultDate={fechaDesde || undefined}
                onChange={(_dates, currentDateString) => {
                  setFechaRangoStart(currentDateString || "");
                }}
              />
            </div>
            <div>
              <DatePicker
                key={`proyecto-fecha-hasta-${editing ? "e" : "n"}-${fechaHasta || "x"}`}
                id="proyecto-fecha-inicio-hasta"
                label="Hasta"
                placeholder="Fecha de fin"
                defaultDate={fechaHasta || undefined}
                onChange={(_dates, currentDateString) => {
                  setFechaRangoEnd(currentDateString || "");
                }}
              />
            </div>
          </div>
          {fechaDesde && fechaHasta && fechaDesde !== fechaHasta ? (
            <p className="mt-2 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
              Del {formatProyectoFecha(fechaDesde)} al {formatProyectoFecha(fechaHasta)}
            </p>
          ) : null}
        </div>
      </ProyectoFormSection>

      <ProyectoFormSection
        titleId="proyecto-sec-equipo"
        title="Equipo de campo"
        hint="Varios técnicos: marca uno como responsable. Los auxiliares también ven el proyecto."
        icon={iconTeam}
      >
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ProyectoAsignadosMultiField
            mode="tecnicos"
            label="Técnicos"
            value={tecnicosAsignados}
            onChange={setTecnicosAsignados}
            options={tecnicoOptions}
            excludeIds={auxiliaresAsignados
              .map((a) => a.id)
              .filter((id): id is number => id != null)}
            placeholder="Buscar y agregar técnicos…"
          />
          <div className="space-y-4">
            <ProyectoAsignadosMultiField
              mode="auxiliares"
              label="Auxiliares"
              value={auxiliaresAsignados}
              onChange={setAuxiliaresAsignados}
              options={tecnicoOptions}
              excludeIds={tecnicosAsignados
                .map((t) => t.id)
                .filter((id): id is number => id != null)}
              placeholder="Buscar y agregar auxiliares…"
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
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155]/80">
          <label htmlFor="proyecto-herramientas" className={proyectoFieldLabelClass}>
            Herramientas generales
          </label>
          <textarea
            id="proyecto-herramientas"
            value={herramientasGenerales}
            onChange={(e) => setHerramientasGenerales(e.target.value)}
            rows={2}
            placeholder="Lista breve de herramientas o equipo general"
            className={`${erpInputLikeClass} !min-h-0 max-h-36 resize-y py-2 sm:!min-h-0 sm:py-2`}
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
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
              <li key={item.id} className="group relative flex gap-3 pb-4 last:pb-0">
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
                          <span className="font-medium text-[#78716c] dark:text-[#8ea0b8]"> · {fechaLabel}</span>
                        ) : null}
                      </h5>
                      <p className={`${proyectoNotaMetaClass} mt-0.5`}>
                        {fechaLabel ? "Jornada vinculada a fecha de inicio" : "Sin fecha de inicio asociada aún"}
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
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
                      <div id={hintId} className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <p className={proyectoNotaMetaClass}>
                          {charCount === 0 ? "Sin nota todavía" : `${charCount} ${charCount === 1 ? "carácter" : "caracteres"}`}
                        </p>
                        {index === 0 && notasPorDia.length === 1 ? (
                          <p className={proyectoNotaMetaClass}>Usa «Agregar día» para más jornadas</p>
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
              style={{ "--proyecto-avance": `${porcentajeAvance}%` } as CSSProperties}
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
            <span id="proyecto-presupuesto-adicional-hint" className="mt-0.5 block text-[12px] text-[#78716c] dark:text-[#8ea0b8]">
              Al activarlo, debes vincular una cotización antes de cerrar.
            </span>
          </span>
        </label>

        {proyectoRequiereCotizacionAdicional({
          requierePresupuestoAdicional,
          requerimientosAdicionales,
        }) ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-950/30">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Cotización adicional vinculada</p>
            {cotizacionAdicional ? (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={proyectoOrigenBadgeClass(cotizacionAdicional.origen)}>
                    {cotizacionAdicional.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                  </span>
                  <p className="mt-2 text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                    {displayCotizacionFolio(cotizacionAdicional.folio, cotizacionAdicional.origen)} —{" "}
                    {cotizacionAdicional.cliente}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={erpSecondaryBtnClass} onClick={() => openCotizacionPicker("adicional")}>
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
        hint="La firma del técnico es la del responsable. Si no tiene firma en su perfil, el recuadro queda vacío."
        icon={iconPen}
      >
        <div className="grid grid-cols-1 gap-4 touch-none md:grid-cols-2">
          <SignaturePad
            label={
              tecnicoResponsableNombre
                ? `Firma del técnico · ${tecnicoResponsableNombre}`
                : "Firma del técnico (responsable)"
            }
            value={tecnicoSignatureUrl || firmaTecnicoUrl}
            disabled
            onChange={() => {
              /* Solo lectura: se carga del perfil del técnico responsable */
            }}
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
  );
}
