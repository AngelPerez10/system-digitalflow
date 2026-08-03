import { erpInputLikeClass, erpPrimaryBtnClass } from "@/layout/erpPageStyles";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import type { ProyectoCotizacionBloque } from "../../shared/proyectoTypes";
import {
  formatProyectoFecha,
  proyectoAddDayBtnClass,
  proyectoEmptyPanelClass,
  proyectoFieldLabelClass,
  proyectoOrigenBadgeClass,
} from "../../shared/proyectoPageStyles";
import type { CotizacionPickerTarget } from "../cotizaciones/useCotizacionPicker";
import { ProyectoFormSection, proyectoSectionIconClass } from "../ProyectoFormSection";

export type ProyectoClienteTabProps = {
  panelId: string;
  labelledBy: string;
  cliente: string;
  setCliente: (v: string) => void;
  clienteId: string;
  setClienteId: (v: string) => void;
  clienteStepError: string;
  setClienteStepError: (v: string) => void;
  quienAutorizo: string;
  setQuienAutorizo: (v: string) => void;
  presupuestoCargado: boolean;
  cotizaciones: ProyectoCotizacionBloque[];
  setConfirmClearCotizaciones: (open: boolean) => void;
  openCotizacionPicker: (target: CotizacionPickerTarget) => void;
  handleQuitarCotizacion: (vinculoId: string) => void;
  /** Técnico asignado: no puede quitar cotizaciones. */
  assignedTechnicianLocked?: boolean;
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

export function ProyectoClienteTab({
  panelId,
  labelledBy,
  cliente,
  setCliente,
  clienteId,
  setClienteId,
  clienteStepError,
  setClienteStepError,
  quienAutorizo,
  setQuienAutorizo,
  presupuestoCargado,
  cotizaciones,
  setConfirmClearCotizaciones,
  openCotizacionPicker,
  handleQuitarCotizacion,
  assignedTechnicianLocked = false,
}: ProyectoClienteTabProps) {
  return (
    <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="space-y-5">
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
        <div className="mt-4">
          <label htmlFor="proyecto-modal-quien-autorizo" className={proyectoFieldLabelClass}>
            ¿Quién autorizó?
          </label>
          <input
            id="proyecto-modal-quien-autorizo"
            type="text"
            value={quienAutorizo}
            onChange={(e) => setQuienAutorizo(e.target.value)}
            placeholder="Nombre de quien autorizó"
            className={erpInputLikeClass}
            autoComplete="name"
            maxLength={255}
          />
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
              {!assignedTechnicianLocked ? (
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
              ) : null}
              {!assignedTechnicianLocked ? (
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
              ) : null}
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
                      Cotización {bloque.orden} · {displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}
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
                {!assignedTechnicianLocked ? (
                  <button
                    type="button"
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
                    onClick={() => handleQuitarCotizacion(bloque.vinculoId)}
                    aria-label={`Quitar cotización ${bloque.orden}, folio ${displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}`}
                  >
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className={`${proyectoEmptyPanelClass} mt-0`}>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {assignedTechnicianLocked
                ? "No hay cotizaciones vinculadas. Solo un administrador puede agregarlas."
                : "Vincula una o más cotizaciones para traer el presupuesto sin importes."}
            </p>
            {!assignedTechnicianLocked ? (
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
            ) : null}
          </div>
        )}
      </ProyectoFormSection>
    </div>
  );
}
