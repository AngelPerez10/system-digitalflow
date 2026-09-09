import { useCallback, useEffect, useRef, useState } from "react";

import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export type Notificacion = {
  id: number;
  tipo: string;
  titulo: string;
  cuerpo: string;
  url: string;
  ref_tipo: string;
  ref_id: number | null;
  leida: boolean;
  leida_at: string | null;
  created_at: string;
};

/** Cada cuánto se refresca el contador del badge mientras hay sesión. */
const POLL_MS = 60_000;

/**
 * Estado de la campanita del header: contador de no leídas (poll ligero) + la
 * lista completa (se pide al abrir el desplegable) + acciones de marcado.
 * Optimista en el marcado; si el POST falla, se re-sincroniza con el resumen.
 */
export function useNotificaciones() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const listaSeqRef = useRef(0);

  const cargarResumen = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetchApi("/api/notificaciones/resumen/");
      if (!res.ok) return;
      const data = await res.json();
      setNoLeidas(Math.max(0, Number(data?.no_leidas ?? 0)));
    } catch {
      /* es un poll: en silencio */
    }
  }, [isAuthenticated]);

  const cargarLista = useCallback(async () => {
    if (!isAuthenticated) return;
    const seq = ++listaSeqRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchApi("/api/notificaciones/");
      if (seq !== listaSeqRef.current) return;
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data?.results) ? data.results : []);
      setNoLeidas(Math.max(0, Number(data?.no_leidas ?? 0)));
    } catch {
      if (seq === listaSeqRef.current) setError(true);
    } finally {
      if (seq === listaSeqRef.current) setLoading(false);
    }
  }, [isAuthenticated]);

  const marcarLeida = useCallback(
    async (id: number) => {
      setItems((prev) => prev.map((n) => (n.id === id && !n.leida ? { ...n, leida: true } : n)));
      setNoLeidas((n) => Math.max(0, n - 1));
      try {
        const res = await fetchApi(`/api/notificaciones/${id}/leer/`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.no_leidas === "number") setNoLeidas(Math.max(0, data.no_leidas));
        } else {
          void cargarResumen();
        }
      } catch {
        void cargarResumen();
      }
    },
    [cargarResumen],
  );

  const marcarTodas = useCallback(async () => {
    setItems((prev) => prev.map((n) => (n.leida ? n : { ...n, leida: true })));
    setNoLeidas(0);
    try {
      const res = await fetchApi("/api/notificaciones/marcar-todas/", { method: "POST" });
      if (!res.ok) void cargarResumen();
    } catch {
      void cargarResumen();
    }
  }, [cargarResumen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setNoLeidas(0);
      return;
    }
    void cargarResumen();
    const intervalId = window.setInterval(() => void cargarResumen(), POLL_MS);
    const onFocus = () => void cargarResumen();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, cargarResumen]);

  return { items, noLeidas, loading, error, cargarLista, marcarLeida, marcarTodas };
}
