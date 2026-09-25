import { memo, useId, type CSSProperties } from "react";
import { Check, Plus, X } from "lucide-react";
import { useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";
import { formatFechaCorta, localDateKey } from "../../shared/proyectoListUtils";
import { NOTA_DIA_MIN_CHARS, proyectoNotaDiaFieldId } from "../../shared/proyectoOperacionValidation";
import { ProgressBar } from "../../shared/ProyectoUi";
import { btn, btnSm, fieldError, focusRing, inputInvalid, textarea } from "../../shared/proyectoTokens";
import type { ProyectoNotaDia } from "../../shared/proyectoTypes";
import { ProyectoNotaDiaFotosField } from "./ProyectoNotaDiaFotosField";

type Props = {
  notas: ProyectoNotaDia[];
  fechas: string[];
  errors: Record<string, string>;
  /** El status actual exige el mínimo de caracteres (cerrar). */
  minRequired: boolean;
  liveMessage: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, nota: string) => void;
  onImagenes: (index: number, urls: string[]) => void;
};

type DiaProps = {
  item: ProyectoNotaDia;
  index: number;
  total: number;
  fecha: string;
  error: string;
  minRequired: boolean;
  onRemove: (index: number) => void;
  onChange: (index: number, nota: string) => void;
  onImagenes: (index: number, urls: string[]) => void;
};

const Dia = memo(function Dia({ item, index, total, fecha, error, minRequired, onRemove, onChange, onImagenes }: DiaProps) {
  const chars = item.nota.trim().length;
  const listo = chars >= NOTA_DIA_MIN_CHARS;
  const fieldId = proyectoNotaDiaFieldId(item.id);
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const hoy = Boolean(fecha) && fecha === localDateKey();
  const notaTextareaRef = useAutoGrowTextarea({ value: item.nota });

  return (
    <li className="cot-rise relative flex gap-3 pb-5 last:pb-0" style={{ "--cot-i": Math.min(index, 6) } as CSSProperties}>
      {index < total - 1 ? (
        <span className="absolute bottom-0 left-3.75 top-9 w-px bg-[#E4E4E7] dark:bg-[#273244]" aria-hidden />
      ) : null}
      <span
        className={`relative z-1 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums ring-4 ring-white transition-colors duration-300 dark:ring-[#111827] ${
          listo
            ? "bg-[#0E8A5F] text-white dark:bg-[#22A06B]"
            : hoy
              ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
              : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]"
        }`}
        aria-hidden
      >
        {listo ? <Check key="ok" className="cot-tick size-4" strokeWidth={3} /> : index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
            Día {index + 1}
            {fecha ? <span className="font-normal text-[#71717A] dark:text-[#8EA0B8]"> · {formatFechaCorta(fecha)}</span> : null}
            {hoy ? (
              <span className="ml-2 inline-flex h-5 items-center rounded-full bg-[#EEF3FF] px-2 align-middle text-[11px] font-semibold text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#C9D7FF]">
                Hoy
              </span>
            ) : null}
          </h4>
          {total > 1 ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className={`cot-press inline-flex size-8 items-center justify-center rounded-xl text-[#A1A1AA] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171] ${focusRing}`}
              aria-label={`Quitar día ${index + 1}`}
              title="Quitar día"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <label htmlFor={fieldId} className="sr-only">
          Nota del día {index + 1}
          {fecha ? `, ${formatFechaCorta(fecha)}` : ""}. Mínimo {NOTA_DIA_MIN_CHARS} caracteres para cerrar.
        </label>
        <textarea
          ref={notaTextareaRef}
          id={fieldId}
          value={item.nota}
          onChange={(e) => onChange(index, e.target.value)}
          rows={3}
          placeholder="¿Qué se hizo hoy? Avances, pendientes o hallazgos…"
          className={`${textarea} mt-2 min-h-22 max-h-80 resize-none overflow-hidden ${error ? inputInvalid : ""}`}
          aria-required={minRequired || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        />

        <div id={hintId} className="mt-2 flex items-center gap-3">
          <ProgressBar
            value={(Math.min(chars, NOTA_DIA_MIN_CHARS) / NOTA_DIA_MIN_CHARS) * 100}
            barClass={listo ? "bg-[#0E8A5F] dark:bg-[#34D399]" : "bg-[#1B5CFF] dark:bg-[#4B7CFF]"}
            size="sm"
            className="w-24 shrink-0"
          />
          <span
            className={`text-[12px] tabular-nums ${
              listo ? "font-medium text-[#04724D] dark:text-[#4ADE80]" : "text-[#71717A] dark:text-[#8EA0B8]"
            }`}
          >
            {listo
              ? `${chars} caracteres · lista para cerrar`
              : chars === 0
                ? `Mínimo ${NOTA_DIA_MIN_CHARS} caracteres para cerrar`
                : `${chars} / ${NOTA_DIA_MIN_CHARS} · faltan ${NOTA_DIA_MIN_CHARS - chars}`}
          </span>
        </div>
        {error ? (
          <p id={errorId} className={fieldError} role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3">
          <ProyectoNotaDiaFotosField
            urls={item.imagenesUrls ?? []}
            onChange={(urls) => onImagenes(index, urls)}
            diaLabel={`día ${index + 1}`}
          />
        </div>
      </div>
    </li>
  );
});

/** Bitácora por jornada: línea de tiempo con nota y hasta 2 fotos por día. */
export function ProyectoBitacora({ notas, fechas, errors, minRequired, liveMessage, onAdd, onRemove, onChange, onImagenes }: Props) {
  const liveId = useId();
  return (
    <div>
      <p id={liveId} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>
      <ol aria-label="Bitácora por día de trabajo">
        {notas.map((item, index) => (
          <Dia
            key={item.id}
            item={item}
            index={index}
            total={notas.length}
            fecha={fechas[index] || ""}
            error={errors[item.id] || ""}
            minRequired={minRequired}
            onRemove={onRemove}
            onChange={onChange}
            onImagenes={onImagenes}
          />
        ))}
      </ol>
      <button
        type="button"
        onClick={onAdd}
        aria-describedby={liveId}
        className={`${btn.secondary} ${btnSm} mt-4 w-full border-dashed! sm:w-auto`}
      >
        <Plus aria-hidden />
        Agregar día
      </button>
    </div>
  );
}
