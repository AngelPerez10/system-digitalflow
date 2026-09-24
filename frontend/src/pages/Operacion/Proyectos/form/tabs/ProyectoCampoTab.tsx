import { useId, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  Clock,
  FilePlus2,
  Gauge,
  LogIn,
  LogOut,
  NotebookPen,
  TriangleAlert,
  X,
} from "lucide-react";
import { StatusChangedByChip } from "../../../shared/StatusChangedByChip";
import { proyectoRequiereCotizacionAdicional } from "../../shared/proyectoCloseValidation";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import { NOTA_DIA_MIN_CHARS, proyectoRequiresNotaDiaMinLength } from "../../shared/proyectoOperacionValidation";
import { Field, Notice, SectionCard } from "../../shared/ProyectoUi";
import {
  ESTADO_TONE,
  btn,
  btnSm,
  focusRing,
  input,
  inputInvalid,
  origenChip,
  textarea,
} from "../../shared/proyectoTokens";
import type { ProyectoDraft, ProyectoEstado } from "../../shared/proyectoTypes";
import { ProyectoBitacora } from "../fields/ProyectoBitacora";
import type { ProyectoFormApi } from "../useProyectoFormState";

type Props = {
  form: ProyectoFormApi;
  isAdmin: boolean;
  editing: boolean;
  initialDraft: ProyectoDraft;
};

const STATUS_OPTIONS: { value: ProyectoEstado; adminOnly?: boolean }[] = [
  { value: "en_proceso" },
  { value: "pausado" },
  { value: "cerrado" },
  { value: "cancelado", adminOnly: true },
];

const AVANCE_ATAJOS = [0, 25, 50, 75, 100];

/** Tarjeta de llegada / salida: un toque registra la hora del dispositivo. */
function HoraTile({
  id,
  label,
  icon,
  value,
  onChange,
  onStamp,
  stampLabel,
  error,
  hint,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  onStamp: () => void;
  stampLabel: string;
  error?: string;
  hint?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const set = Boolean(value.trim());
  return (
    <div
      className={`rounded-[14px] border p-3.5 transition-colors duration-200 ${
        error
          ? "border-[#F6CFCF] bg-[#FEF2F2]/50 dark:border-[#7F1D1D] dark:bg-[#3F1518]/40"
          : set
            ? "border-[#D7E3FF] bg-[#F5F8FF] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/30"
            : "border-[#E4E4E7] bg-white dark:border-[#273244] dark:bg-[#0F172A]"
      }`}
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
        <span className="text-[#1B5CFF] dark:text-[#7EA0FF] [&_svg]:size-4">{icon}</span>
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${input} h-12! flex-1 text-[22px]! font-semibold tabular-nums tracking-[-0.5px] ${error ? inputInvalid : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
        />
        <button type="button" onClick={onStamp} className={`${set ? btn.secondary : btn.primary} h-12 shrink-0 px-3`}>
          <Clock aria-hidden />
          <span className="hidden sm:inline">{set ? "Ahora" : stampLabel}</span>
          <span className="sm:hidden">Ahora</span>
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
          {error}
        </p>
      ) : null}
      <p id={hintId} className="mt-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
        {hint}
      </p>
    </div>
  );
}

export function ProyectoCampoTab({ form, isAdmin, editing, initialDraft }: Props) {
  const motivoPausaHintId = useId();
  const {
    status,
    handleStatusChange,
    closeBlockedMessage,
    setCloseBlockedMessage,
    motivoPausa,
    setMotivoPausa,
    motivoCancelacion,
    setMotivoCancelacion,
    horaLlegada,
    setHoraLlegada,
    horaSalida,
    setHoraSalida,
    horaSalidaError,
    setHoraSalidaError,
    stampHoraLlegada,
    stampHoraSalida,
    notasPorDia,
    fechasInicio,
    notaDiaErrors,
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
    incidencias,
    setIncidencias,
    requerimientosAdicionales,
    setRequerimientosAdicionales,
    requierePresupuestoAdicional,
    setRequierePresupuestoAdicional,
    cotizacionAdicional,
    setCotizacionAdicional,
    openCotizacionPicker,
  } = form;

  const minRequired = proyectoRequiresNotaDiaMinLength(status);
  const tone = ESTADO_TONE[status] ?? ESTADO_TONE.en_proceso;
  const notasListas = notasPorDia.filter((n) => n.nota.trim().length >= NOTA_DIA_MIN_CHARS).length;
  const requiereCotAdicional = proyectoRequiereCotizacionAdicional({ requierePresupuestoAdicional, requerimientosAdicionales });
  const opciones = STATUS_OPTIONS.filter((o) => !o.adminOnly || (isAdmin && editing) || status === o.value);

  return (
    <>
      <SectionCard
        id="proyecto-sec-status"
        index={0}
        title="Status del proyecto"
        icon={<Activity />}
        hint={`Para cerrar se pide la bitácora completa (mín. ${NOTA_DIA_MIN_CHARS} caracteres por día).${
          isAdmin && editing ? " Cancelar es solo para administradores." : ""
        }`}
        actions={
          editing ? (
            <StatusChangedByChip
              name={initialDraft.statusChangedByName}
              at={initialDraft.statusChangedAt}
              fallbackName={initialDraft.creadoPorName}
              fallbackAt={initialDraft.createdAt}
            />
          ) : null
        }
      >
        <div
          role="radiogroup"
          aria-label="Status operativo"
          aria-describedby={closeBlockedMessage ? "proyecto-close-blocked" : undefined}
          className={`grid gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#F4F4F5]/70 p-1 dark:border-[#273244] dark:bg-[#0F172A] ${
            opciones.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
          }`}
        >
          {opciones.map((opt) => {
            const t = ESTADO_TONE[opt.value];
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleStatusChange(opt.value)}
                className={`cot-press inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-2 text-[13.5px] font-semibold ${focusRing} ${
                  active ? t.segment : "text-[#52525B] hover:bg-white/70 hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className={`size-2 rounded-full transition-opacity duration-200 ${t.dot} ${active ? "" : "opacity-40"}`} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>

        {closeBlockedMessage ? (
          <Notice id="proyecto-close-blocked" tone="danger" role="alert" tabIndex={-1} title="No se puede cerrar todavía" className="scroll-mt-24">
            {closeBlockedMessage}
          </Notice>
        ) : null}

        {status === "pausado" ? (
          <div className="cot-fade">
            <Field
              label="Motivo de la pausa"
              htmlFor="proyecto-motivo-pausa"
              required
              hint="Queda visible en el listado y en el PDF."
              hintId={motivoPausaHintId}
            >
              <input
                id="proyecto-motivo-pausa"
                type="text"
                value={motivoPausa}
                onChange={(e) => setMotivoPausa(e.target.value)}
                placeholder="¿Por qué se detiene el proyecto?"
                className={`${input} ${!motivoPausa.trim() ? "border-[#F0D7A3]!" : ""}`}
                aria-required="true"
                aria-invalid={!motivoPausa.trim()}
                aria-describedby={motivoPausaHintId}
              />
            </Field>
          </div>
        ) : null}

        {status === "cancelado" ? (
          <div className="cot-fade">
            <Field label="Motivo de cancelación" htmlFor="proyecto-motivo-cancelacion" required hint="Obligatorio. Solo el administrador puede cancelar.">
              <input
                id="proyecto-motivo-cancelacion"
                type="text"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="¿Por qué se cancela el proyecto?"
                className={`${input} ${!motivoCancelacion.trim() ? inputInvalid : ""}`}
                aria-required="true"
                aria-invalid={!motivoCancelacion.trim()}
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard id="proyecto-sec-horario" index={1} title="Horario en sitio" icon={<Clock />} hint="Toca «Registrar» al llegar y al salir; puedes ajustar la hora a mano.">
        <div className="grid gap-3 sm:grid-cols-2">
          <HoraTile
            id="proyecto-hora-llegada"
            label="Llegada"
            icon={<LogIn />}
            value={horaLlegada}
            onChange={(v) => {
              setHoraLlegada(v);
              if (v.trim()) setHoraSalidaError("");
            }}
            onStamp={stampHoraLlegada}
            stampLabel="Registrar llegada"
            hint={horaLlegada ? "Hora de llegada registrada." : "Aún sin registrar."}
          />
          <HoraTile
            id="proyecto-hora-salida"
            label="Salida"
            icon={<LogOut />}
            value={horaSalida}
            onChange={(v) => {
              setHoraSalida(v);
              if (horaSalidaError) setHoraSalidaError("");
            }}
            onStamp={stampHoraSalida}
            stampLabel="Registrar salida"
            error={horaSalidaError}
            hint="Requiere la hora de llegada."
          />
        </div>
      </SectionCard>

      <SectionCard
        id="proyecto-sec-bitacora"
        index={2}
        title="Bitácora por jornada"
        icon={<NotebookPen />}
        hint={minRequired ? `Obligatoria para cerrar: mínimo ${NOTA_DIA_MIN_CHARS} caracteres por día.` : "Una entrada por día de trabajo, con hasta 2 fotos."}
        actions={
          <span
            key={notasListas}
            className={`cot-flash inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold tabular-nums ${
              notasListas === notasPorDia.length && notasPorDia.length > 0
                ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                : "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]"
            }`}
          >
            {notasListas}/{notasPorDia.length} completos
          </span>
        }
      >
        <ProyectoBitacora
          notas={notasPorDia}
          fechas={fechasInicio}
          errors={notaDiaErrors}
          minRequired={minRequired}
          liveMessage={notasLiveMessage}
          onAdd={addNotaDia}
          onRemove={removeNotaDia}
          onChange={updateNotaDia}
          onImagenes={updateNotaDiaImagenes}
        />
      </SectionCard>

      <SectionCard id="proyecto-sec-avance" index={3} title="Avance" icon={<Gauge />} hint="Arrastra, usa un atajo o escribe el porcentaje exacto.">
        <div className="flex items-end justify-between gap-3">
          <p className={`text-[40px] font-semibold leading-none tabular-nums tracking-[-1.5px] ${tone.text}`} aria-live="polite">
            <span key={porcentajeAvance} className="cot-flash inline-block">
              {porcentajeAvance}
            </span>
            <span className="ml-0.5 text-[20px] font-medium opacity-60">%</span>
          </p>
          <div className="relative w-24 shrink-0">
            <label htmlFor="proyecto-porcentaje" className="mb-1 block text-right text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
              Exacto
            </label>
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
              className={`${input} pr-7 text-center tabular-nums`}
            />
            <span className="pointer-events-none absolute bottom-0 right-2.5 flex h-11 items-center text-[13px] text-[#A1A1AA]" aria-hidden>
              %
            </span>
          </div>
        </div>
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
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,var(--range-fill)_var(--range-pct),#EDEDF0_var(--range-pct))] outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:bg-[linear-gradient(to_right,var(--range-fill)_var(--range-pct),#1F2A3C_var(--range-pct))] [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--range-fill)] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--range-fill)] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(9,9,11,0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 active:[&::-webkit-slider-thumb]:scale-110"
          style={{ "--range-pct": `${porcentajeAvance}%`, "--range-fill": "#1B5CFF" } as CSSProperties}
          aria-valuetext={`${porcentajeAvance} por ciento`}
        />
        <div className="grid grid-cols-5 gap-1.5">
          {AVANCE_ATAJOS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPorcentajeAvanceSafe(v)}
              aria-pressed={porcentajeAvance === v}
              className={`cot-press inline-flex h-10 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums ${focusRing} ${
                porcentajeAvance === v
                  ? "border-[#BFD3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63] dark:text-[#C9D7FF]"
                  : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#B7C1D1]"
              }`}
            >
              {v}%
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="proyecto-sec-incidencias"
        index={4}
        title="Incidencias y requerimientos"
        icon={<TriangleAlert />}
        hint="Si hay requerimientos o presupuesto adicional, el proyecto no se cierra sin una cotización vinculada."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Incidencias" htmlFor="proyecto-incidencias">
            <textarea
              id="proyecto-incidencias"
              value={incidencias}
              onChange={(e) => setIncidencias(e.target.value)}
              rows={3}
              placeholder="Problemas o imprevistos en sitio…"
              className={textarea}
            />
          </Field>
          <Field label="Requerimientos adicionales" htmlFor="proyecto-requerimientos">
            <textarea
              id="proyecto-requerimientos"
              value={requerimientosAdicionales}
              onChange={(e) => {
                setRequerimientosAdicionales(e.target.value);
                setCloseBlockedMessage("");
              }}
              rows={3}
              placeholder="Material, servicios o trabajos extra…"
              className={textarea}
            />
          </Field>
        </div>

        <label
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-[#E4E4E7] bg-white px-4 py-3 transition-colors hover:border-[#D3D3D8] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#0F172A]`}
        >
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Requiere presupuesto adicional</span>
            <span id="proyecto-presupuesto-adicional-hint" className="mt-0.5 block text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
              Al activarlo, hay que vincular una cotización antes de cerrar.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={requierePresupuestoAdicional}
            onChange={(e) => {
              setRequierePresupuestoAdicional(e.target.checked);
              setCloseBlockedMessage("");
            }}
            aria-describedby="proyecto-presupuesto-adicional-hint"
          />
          <span
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#D4D4D8] transition-colors duration-200 peer-checked:bg-[#1B5CFF] dark:bg-[#3A4661] dark:peer-checked:bg-[#4B7CFF] peer-checked:[&>span]:translate-x-5"
            aria-hidden
          >
            <span className="ml-0.5 inline-block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(9,9,11,0.25)] transition-transform duration-200 motion-reduce:transition-none" />
          </span>
        </label>

        {requiereCotAdicional ? (
          <div className="cot-fade rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] p-4 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60">
            <p className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Cotización adicional</p>
            {cotizacionAdicional ? (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={origenChip[cotizacionAdicional.origen]}>
                    {cotizacionAdicional.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                  </span>
                  <p className="min-w-0 truncate text-[14px] text-[#09090B] dark:text-[#F8FAFC]">
                    <span className="font-mono font-semibold">
                      {displayCotizacionFolio(cotizacionAdicional.folio, cotizacionAdicional.origen)}
                    </span>{" "}
                    · {cotizacionAdicional.cliente}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={`${btn.secondary} ${btnSm}`} onClick={() => openCotizacionPicker("adicional")}>
                    Cambiar
                  </button>
                  <button type="button" className={`${btn.dangerSoft} ${btnSm}`} onClick={() => setCotizacionAdicional(null)}>
                    <X aria-hidden />
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Vincúlala para poder cerrar el proyecto.</p>
                <button type="button" className={`${btn.primary} ${btnSm}`} onClick={() => openCotizacionPicker("adicional")}>
                  <FilePlus2 aria-hidden />
                  Vincular cotización
                </button>
              </div>
            )}
          </div>
        ) : null}
      </SectionCard>
    </>
  );
}
