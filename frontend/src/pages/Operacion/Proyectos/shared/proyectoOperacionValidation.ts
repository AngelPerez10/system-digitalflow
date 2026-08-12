export type ProyectoOperacionRequiredErrors = {
  tipos: string;
  fechaAuth: string;
  fechaDesde: string;
};

export const PROYECTO_TIPOS_TRABAJO_FIELD_ID = "proyecto-tipos-trabajo";
export const PROYECTO_FECHA_AUTORIZACION_FIELD_ID = "proyecto-fecha-autorizacion";
export const PROYECTO_FECHA_DESDE_FIELD_ID = "proyecto-fecha-inicio-desde";

/** Mínimo de caracteres (trim) por jornada en la bitácora. */
export const NOTA_DIA_MIN_CHARS = 150;

export function proyectoNotaDiaFieldId(notaId: string): string {
  return `proyecto-nota-dia-${notaId}`;
}

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

/** El mínimo de bitácora solo aplica al cerrar el proyecto. */
export function proyectoRequiresNotaDiaMinLength(status: string | null | undefined): boolean {
  return String(status || "").trim().toLowerCase() === "cerrado";
}

export type ProyectoNotaDiaMinLengthResult =
  | { ok: true; errorsById: Record<string, string> }
  | {
      ok: false;
      errorsById: Record<string, string>;
      firstFieldId: string;
      firstDia: number;
    };

/**
 * Cada jornada debe tener al menos NOTA_DIA_MIN_CHARS caracteres.
 * Solo se exige al cerrar (`status === "cerrado"`); en alta/edición en proceso no bloquea.
 */
export function validateNotasPorDiaMinLength(
  notas: ReadonlyArray<{ id: string; nota?: string | null }>,
  options?: { status?: string | null; require?: boolean }
): ProyectoNotaDiaMinLengthResult {
  const require =
    options?.require ??
    (options?.status != null ? proyectoRequiresNotaDiaMinLength(options.status) : true);
  if (!require) {
    return { ok: true, errorsById: {} };
  }

  const list = notas.length > 0 ? notas : [{ id: "empty", nota: "" }];
  const errorsById: Record<string, string> = {};
  let firstFieldId = "";
  let firstDia = 0;

  list.forEach((item, index) => {
    const id = String(item?.id || `dia-${index + 1}`);
    const len = String(item?.nota || "").trim().length;
    if (len >= NOTA_DIA_MIN_CHARS) return;
    const faltan = NOTA_DIA_MIN_CHARS - len;
    errorsById[id] =
      len === 0
        ? `Para cerrar el proyecto escribe al menos ${NOTA_DIA_MIN_CHARS} caracteres en el día ${index + 1}.`
        : `Faltan ${faltan} caracteres para cerrar (mínimo ${NOTA_DIA_MIN_CHARS}).`;
    if (!firstFieldId) {
      firstFieldId = proyectoNotaDiaFieldId(id);
      firstDia = index + 1;
    }
  });

  if (!firstFieldId) {
    return { ok: true, errorsById: {} };
  }
  return { ok: false, errorsById, firstFieldId, firstDia };
}
