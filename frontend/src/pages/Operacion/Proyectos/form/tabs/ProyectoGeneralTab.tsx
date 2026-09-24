import type { CSSProperties } from "react";
import { Building2, ClipboardCheck, FilePlus2, FileText, Trash2, X } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import { formatFechaCorta, localDateKey } from "../../shared/proyectoListUtils";
import { Field, SectionCard } from "../../shared/ProyectoUi";
import {
  btn,
  btnSm,
  emptyPanel,
  focusRing,
  iconBtnDanger,
  input,
  inputInvalid,
  metaChip,
  origenChip,
} from "../../shared/proyectoTokens";
import type { ProyectoStatusAdministrativo } from "../../shared/proyectoTypes";
import type { ProyectoFormApi } from "../useProyectoFormState";

const STATUS_ADMIN: { value: ProyectoStatusAdministrativo; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado", label: "Enviado" },
  { value: "cerrado", label: "Cerrado" },
];

type Props = { form: ProyectoFormApi; isAdmin: boolean };

export function ProyectoGeneralTab({ form, isAdmin }: Props) {
  const {
    cliente,
    setCliente,
    clienteStepError,
    setClienteStepError,
    quienAutorizo,
    setQuienAutorizo,
    presupuestoCargado,
    cotizaciones,
    setConfirmClearCotizaciones,
    openCotizacionPicker,
    handleQuitarCotizacion,
    assignedTechnicianLocked: locked,
    statusAdministrativo,
    setStatusAdministrativo,
    fechaEnvioAdmin,
    setFechaEnvioAdmin,
  } = form;

  return (
    <>
      <SectionCard id="proyecto-sec-cliente" index={0} title="Cliente" icon={<Building2 />} hint="Se completa solo con la primera cotización que vincules.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cliente"
            htmlFor="proyecto-modal-cliente"
            required
            error={clienteStepError}
            errorId="proyecto-cliente-step-error"
          >
            <input
              id="proyecto-modal-cliente"
              type="text"
              value={cliente}
              onChange={(e) => {
                setCliente(e.target.value);
                if (clienteStepError) setClienteStepError("");
              }}
              placeholder="Nombre o razón social"
              className={`${input} ${clienteStepError ? inputInvalid : ""}`}
              autoComplete="organization"
              aria-required="true"
              aria-invalid={Boolean(clienteStepError)}
              aria-describedby={clienteStepError ? "proyecto-cliente-step-error" : undefined}
            />
          </Field>
          <Field label="¿Quién autorizó?" htmlFor="proyecto-modal-quien-autorizo" hint="Persona que aprobó el presupuesto.">
            <input
              id="proyecto-modal-quien-autorizo"
              type="text"
              value={quienAutorizo}
              onChange={(e) => setQuienAutorizo(e.target.value)}
              placeholder="Nombre de quien autorizó"
              className={input}
              autoComplete="name"
              maxLength={255}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        id="proyecto-sec-cotizaciones"
        index={1}
        title="Cotizaciones"
        icon={<FileText />}
        hint="Traen las partidas del presupuesto sin importes. Puedes vincular varias."
        locked={locked}
        flush
        actions={
          presupuestoCargado && !locked ? (
            <button
              type="button"
              className={`${btn.ghost} ${btnSm} text-[#B42323]! hover:bg-[#FEF2F2]! dark:text-[#F87171]! dark:hover:bg-[#3F1518]!`}
              onClick={() => setConfirmClearCotizaciones(true)}
              aria-haspopup="dialog"
            >
              <Trash2 aria-hidden />
              Quitar todas
            </button>
          ) : null
        }
      >
        {presupuestoCargado ? (
          <>
            <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-label="Cotizaciones vinculadas">
              {cotizaciones.map((bloque, i) => {
                const folio = displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen);
                return (
                  <li
                    key={bloque.vinculoId}
                    className="cot-rise flex items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5"
                    style={{ "--cot-i": i } as CSSProperties}
                  >
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5] text-[13px] font-semibold tabular-nums text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]"
                      aria-hidden
                    >
                      {bloque.orden}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio}</p>
                        <span className={origenChip[bloque.cotizacion.origen]}>
                          {bloque.cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={metaChip}>{formatFechaCorta(bloque.cotizacion.fecha)}</span>
                        <span className={metaChip}>
                          {bloque.lineas.length} {bloque.lineas.length === 1 ? "partida" : "partidas"}
                        </span>
                        {bloque.cotizacion.contacto ? (
                          <span className={`${metaChip} max-w-[14rem] truncate`} title={bloque.cotizacion.contacto}>
                            {bloque.cotizacion.contacto}
                          </span>
                        ) : null}
                        {bloque.tiposTrabajo?.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex h-6 items-center rounded-full bg-[#EEF3FF] px-2.5 text-[12px] font-medium text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#C9D7FF]"
                          >
                            {t.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!locked ? (
                      <button
                        type="button"
                        className={iconBtnDanger}
                        onClick={() => handleQuitarCotizacion(bloque.vinculoId)}
                        aria-label={`Quitar cotización ${bloque.orden}, folio ${folio}`}
                        title="Quitar"
                      >
                        <X aria-hidden />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {!locked ? (
              <button
                type="button"
                onClick={() => openCotizacionPicker("principal")}
                className={`cot-press group flex min-h-12 w-full items-center justify-center gap-2 border-t border-dashed border-[#E4E4E7] bg-[#FAFAFA] text-[14px] font-semibold text-[#1B5CFF] hover:bg-[#F5F8FF] dark:border-[#273244] dark:bg-[#0F172A]/40 dark:text-[#7EA0FF] dark:hover:bg-[#1B2A63]/30 ${focusRing}`}
              >
                <FilePlus2 className="size-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
                Vincular otra cotización
              </button>
            ) : null}
          </>
        ) : (
          <div className="p-4 sm:p-5">
            <div className={emptyPanel}>
              <span className="cot-tick mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
                <FileText className="size-5" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                {locked ? "Sin cotizaciones vinculadas" : "Aún no hay cotizaciones"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {locked
                  ? "La oficina las vincula; aquí verás las partidas cuando estén listas."
                  : "Vincula una o más cotizaciones de DigitalFlow o SICAR para traer el presupuesto y los equipos."}
              </p>
              {!locked ? (
                <button type="button" className={`${btn.primary} mt-4`} onClick={() => openCotizacionPicker("principal")}>
                  <FilePlus2 aria-hidden />
                  Vincular cotización
                </button>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      {isAdmin ? (
        <SectionCard
          id="proyecto-sec-admin"
          index={2}
          title="Seguimiento administrativo"
          icon={<ClipboardCheck />}
          hint="Estado de oficina sobre las cotizaciones vinculadas. Solo lo ven administradores."
        >
          <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label="Status administrativo" labelId="proyecto-status-admin-label">
              <div
                role="radiogroup"
                aria-labelledby="proyecto-status-admin-label"
                className="grid grid-cols-2 gap-1 rounded-[12px] border border-[#E7E7EA] bg-[#F4F4F5]/70 p-1 dark:border-[#273244] dark:bg-[#0F172A] sm:grid-cols-4"
              >
                {STATUS_ADMIN.map((opt) => {
                  const active = statusAdministrativo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setStatusAdministrativo(opt.value);
                        if (opt.value === "enviado" && !fechaEnvioAdmin) {
                          setFechaEnvioAdmin(localDateKey());
                        }
                      }}
                      className={`cot-press min-h-10 rounded-[9px] px-2 text-[13px] font-semibold ${focusRing} ${
                        active
                          ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:text-white dark:ring-[#273244]"
                          : "text-[#52525B] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            {statusAdministrativo === "enviado" ? (
              <div className="cot-fade">
                <DatePicker
                  key={`proyecto-fecha-envio-admin-${statusAdministrativo}`}
                  id="proyecto-fecha-envio-admin"
                  label="Fecha de envío"
                  placeholder="Seleccionar fecha"
                  defaultDate={fechaEnvioAdmin || undefined}
                  onChange={(_dates, currentDateString) => setFechaEnvioAdmin(currentDateString || "")}
                />
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
