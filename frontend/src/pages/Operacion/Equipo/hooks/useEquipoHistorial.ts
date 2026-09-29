/** Estado del Historial de reasignaciones (drawer + contador de hoy). */
import { useCallback, useEffect, useMemo, useState } from "react";
import { listEquipoHistorial, type EquipoHistorialEntry } from "../shared/equipoHistorialApi";

export function useEquipoHistorial() {
  const [entries, setEntries] = useState<EquipoHistorialEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await listEquipoHistorial(100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Agrega al inicio un movimiento recién guardado. */
  const prepend = useCallback((entry: EquipoHistorialEntry) => setEntries((list) => [entry, ...list]), []);

  const abrir = useCallback(() => {
    setOpen(true);
    void cargar();
  }, [cargar]);

  const cerrar = useCallback(() => setOpen(false), []);

  const hoy = useMemo(() => {
    const d = new Date().toDateString();
    return entries.filter((h) => new Date(h.creado_at).toDateString() === d).length;
  }, [entries]);

  return { entries, open, loading, error, hoy, cargar, prepend, abrir, cerrar };
}
