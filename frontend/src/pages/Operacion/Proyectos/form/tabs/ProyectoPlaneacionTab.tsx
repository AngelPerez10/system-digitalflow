import { CalendarRange, Check, Truck, Users, Wrench, X } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import { proyectoTieneTipoAlarmas } from "../../shared/proyectoFormUtils";
import { formatPeriodoLabel } from "../../shared/proyectoListUtils";
import { PROYECTO_MONITOREO_FIELD_ID } from "../../shared/proyectoOperacionValidation";
import { Field, LockBadge, Notice, SectionCard } from "../../shared/ProyectoUi";
import { fieldError, fieldLabel, focusRing, input, metaChip, requiredMark, textarea } from "../../shared/proyectoTokens";
import { ProyectoAsignadosMultiField } from "../fields/ProyectoAsignadosMultiField";
import { ProyectoTiposTrabajoField } from "../fields/ProyectoTiposTrabajoField";
import type { ProyectoFormApi } from "../useProyectoFormState";

type Props = { form: ProyectoFormApi; editing: boolean };

const siNoClass = (active: boolean, tone: "si" | "no") =>
  `cot-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-4 text-[14px] font-semibold ${focusRing} ${
    !active
      ? "border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA]"
      : tone === "si"
        ? "border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#1E5A42] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
        : "border-[#F6CFCF] bg-[#FEF2F2] text-[#B42323] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]"
  }`;

export function ProyectoPlaneacionTab({ form, editing }: Props) {
  const {
    catalogError,
    servicios,
    tiposTrabajo,
    setTiposTrabajo,
    assignedTechnicianLocked: locked,
    operacionErrors,
    monitoreo,
    setMonitoreo,
    fechaAutorizacion,
    setFechaAutorizacion,
    fechaDesde,
    fechaHasta,
    setFechaRangoStart,
    setFechaRangoEnd,
    diasRangoCount,
    tecnicosAsignados,
    setTecnicosAsignados,
    auxiliaresAsignados,
    setAuxiliaresAsignados,
    tecnicoOptions,
    vehiculoAsignado,
    setVehiculoAsignado,
    herramientasGenerales,
    setHerramientasGenerales,
  } = form;
  const esAlarmas = proyectoTieneTipoAlarmas(tiposTrabajo);

  return (
    <>
      {catalogError ? <Notice tone="warning" role="status">{catalogError}</Notice> : null}

      <SectionCard
        id="proyecto-sec-tipos"
        index={0}
        title="Tipo de trabajo"
        icon={<Wrench />}
        hint="Servicios del catálogo. Se agregan solos al vincular cotizaciones."
        locked={locked}
      >
        <ProyectoTiposTrabajoField
          value={tiposTrabajo}
          onChange={setTiposTrabajo}
          servicios={servicios}
          disabled={locked}
          placeholder="Buscar servicio…"
          required
          error={operacionErrors.tipos}
        />

        {esAlarmas ? (
          <div
            className={`cot-fade rounded-[14px] border p-3.5 ${
              operacionErrors.monitoreo
                ? "border-[#F6CFCF] bg-[#FEF2F2]/60 dark:border-[#7F1D1D] dark:bg-[#3F1518]/40"
                : "border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="proyecto-monitoreo-label" className={`${fieldLabel} mb-0!`}>
                ¿El proyecto contará con monitoreo?
                <span className={requiredMark} aria-hidden>
                  *
                </span>
              </p>
              <div
                className="flex w-full gap-2 sm:w-60"
                role="radiogroup"
                aria-labelledby="proyecto-monitoreo-label"
                aria-required="true"
                aria-describedby={operacionErrors.monitoreo ? "proyecto-monitoreo-error" : undefined}
              >
                <button
                  id={PROYECTO_MONITOREO_FIELD_ID}
                  type="button"
                  role="radio"
                  aria-checked={monitoreo === true}
                  onClick={() => setMonitoreo(true)}
                  className={siNoClass(monitoreo === true, "si")}
                >
                  <Check className="size-4" aria-hidden />
                  Sí
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={monitoreo === false}
                  onClick={() => setMonitoreo(false)}
                  className={siNoClass(monitoreo === false, "no")}
                >
                  <X className="size-4" aria-hidden />
                  No
                </button>
              </div>
            </div>
            {operacionErrors.monitoreo ? (
              <p id="proyecto-monitoreo-error" className={fieldError} role="alert">
                {operacionErrors.monitoreo}
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        id="proyecto-sec-agenda"
        index={1}
        title="Fechas"
        icon={<CalendarRange />}
        hint="El periodo genera una jornada por día para la bitácora."
        actions={
          diasRangoCount > 0 ? (
            <span key={diasRangoCount} className={`${metaChip} cot-flash tabular-nums`}>
              {diasRangoCount} {diasRangoCount === 1 ? "jornada" : "jornadas"}
            </span>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <DatePicker
              key={`proyecto-fecha-autorizacion-${editing ? "edit" : "new"}`}
              id="proyecto-fecha-autorizacion"
              label={
                <span className="inline-flex items-center gap-2">
                  Autorización {locked ? <LockBadge label="Oficina" /> : null}
                </span>
              }
              placeholder="Seleccionar fecha"
              required
              error={operacionErrors.fechaAuth}
              defaultDate={fechaAutorizacion || undefined}
              disabled={locked}
              onChange={(_dates, currentDateString) => {
                if (locked) return;
                setFechaAutorizacion(currentDateString || "");
              }}
            />
          </div>
          <div>
            <DatePicker
              key={`proyecto-fecha-desde-${editing ? "e" : "n"}-${fechaDesde || "x"}`}
              id="proyecto-fecha-inicio-desde"
              label="Inicio en campo"
              placeholder="Fecha de inicio"
              required
              error={operacionErrors.fechaDesde}
              defaultDate={fechaDesde || undefined}
              onChange={(_dates, currentDateString) => setFechaRangoStart(currentDateString || "")}
            />
          </div>
          <div>
            <DatePicker
              key={`proyecto-fecha-hasta-${editing ? "e" : "n"}-${fechaHasta || "x"}`}
              id="proyecto-fecha-inicio-hasta"
              label="Fin en campo"
              placeholder="Fecha de fin"
              defaultDate={fechaHasta || undefined}
              onChange={(_dates, currentDateString) => setFechaRangoEnd(currentDateString || "")}
            />
          </div>
        </div>
        {fechaDesde ? (
          <p className="cot-fade text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
            Periodo:{" "}
            <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
              {formatPeriodoLabel({ desde: fechaDesde, hasta: fechaHasta || fechaDesde, dias: diasRangoCount, diaActual: null })}
            </span>
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        id="proyecto-sec-equipo"
        index={2}
        title="Equipo de campo"
        icon={<Users />}
        hint={
          locked
            ? "La oficina asigna técnicos y auxiliares. Tú puedes actualizar vehículo y herramientas."
            : "Marca un técnico responsable: su firma aparece en el PDF. Todos ven el proyecto."
        }
        locked={locked}
      >
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ProyectoAsignadosMultiField
            mode="tecnicos"
            label="Técnicos"
            value={tecnicosAsignados}
            onChange={setTecnicosAsignados}
            options={tecnicoOptions}
            disabled={locked}
            excludeIds={auxiliaresAsignados.map((a) => a.id).filter((id): id is number => id != null)}
            placeholder="Buscar y agregar técnicos…"
          />
          <ProyectoAsignadosMultiField
            mode="auxiliares"
            label="Auxiliares"
            value={auxiliaresAsignados}
            onChange={setAuxiliaresAsignados}
            options={tecnicoOptions}
            disabled={locked}
            excludeIds={tecnicosAsignados.map((t) => t.id).filter((id): id is number => id != null)}
            placeholder="Buscar y agregar auxiliares…"
          />
        </div>

        <div className="grid gap-4 border-t border-[#F0F0F2] pt-4 dark:border-[#1F2A3C] sm:grid-cols-[16rem_minmax(0,1fr)]">
          <Field label="Vehículo" htmlFor="proyecto-vehiculo">
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
              <input
                id="proyecto-vehiculo"
                type="text"
                value={vehiculoAsignado}
                onChange={(e) => setVehiculoAsignado(e.target.value)}
                placeholder="Placas o unidad"
                className={`${input} pl-10`}
                autoComplete="off"
              />
            </div>
          </Field>
          <Field label="Herramientas generales" htmlFor="proyecto-herramientas">
            <textarea
              id="proyecto-herramientas"
              value={herramientasGenerales}
              onChange={(e) => setHerramientasGenerales(e.target.value)}
              rows={2}
              placeholder="Escalera, taladro, multímetro…"
              className={`${textarea} min-h-11!`}
            />
          </Field>
        </div>
      </SectionCard>
    </>
  );
}
