export type ProyectoOperacionRequiredErrors = {
  tipos: string;
  fechaAuth: string;
  fechaDesde: string;
};

export const PROYECTO_TIPOS_TRABAJO_FIELD_ID = "proyecto-tipos-trabajo";
export const PROYECTO_FECHA_AUTORIZACION_FIELD_ID = "proyecto-fecha-autorizacion";
export const PROYECTO_FECHA_DESDE_FIELD_ID = "proyecto-fecha-inicio-desde";

const EMPTY_ERRORS: ProyectoOperacionRequiredErrors = {
  tipos: "",
  fechaAuth: "",
  fechaDesde: "",
};

/** Campos de Operación que deben ir llenos para avanzar o guardar. */
export function validateProyectoOperacionRequired(input: {
  tiposTrabajo: ReadonlyArray<{ id?: number | null }>;
  fechaAutorizacion: string;
  fechaDesde: string;
}): { ok: true; errors: ProyectoOperacionRequiredErrors } | {
  ok: false;
  errors: ProyectoOperacionRequiredErrors;
  firstFieldId: string;
} {
  const errors: ProyectoOperacionRequiredErrors = {
    tipos: input.tiposTrabajo.some((t) => t?.id != null) ? "" : "Selecciona al menos un tipo de trabajo.",
    fechaAuth: String(input.fechaAutorizacion || "").trim()
      ? ""
      : "Indica la fecha de autorización.",
    fechaDesde: String(input.fechaDesde || "").trim() ? "" : "Indica la fecha de inicio (Desde).",
  };
  if (!errors.tipos && !errors.fechaAuth && !errors.fechaDesde) {
    return { ok: true, errors: EMPTY_ERRORS };
  }
  const firstFieldId = errors.tipos
    ? PROYECTO_TIPOS_TRABAJO_FIELD_ID
    : errors.fechaAuth
      ? PROYECTO_FECHA_AUTORIZACION_FIELD_ID
      : PROYECTO_FECHA_DESDE_FIELD_ID;
  return { ok: false, errors, firstFieldId };
}
