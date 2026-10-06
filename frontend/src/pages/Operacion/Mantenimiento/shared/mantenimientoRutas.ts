/** Rutas de la vista Mantenimiento (pólizas + reportes). */
export const MANTENIMIENTO_PATH = "/mantenimiento";
export const reporteNuevoPath = () => `${MANTENIMIENTO_PATH}/reportes/nuevo`;
export const reporteEditPath = (id: number) => `${MANTENIMIENTO_PATH}/reportes/${id}`;
