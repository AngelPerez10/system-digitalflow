import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMarcaPublic, type MarcaPayload } from "@/config/marcaApi";
import { inicialesDeNombre, MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";

export type MarcaState = {
  nombre: string;
  logoUrl: string;
  iniciales: string;
  loading: boolean;
  refresh: () => Promise<void>;
  apply: (payload: MarcaPayload) => void;
};

const MarcaContext = createContext<MarcaState>({
  nombre: MARCA_NOMBRE_DEFAULT,
  logoUrl: "",
  iniciales: inicialesDeNombre(MARCA_NOMBRE_DEFAULT),
  loading: false,
  refresh: async () => {},
  apply: () => {},
});

export function MarcaProvider({ children }: { children: ReactNode }) {
  const [nombre, setNombre] = useState(MARCA_NOMBRE_DEFAULT);
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const apply = useCallback((payload: MarcaPayload) => {
    setNombre(payload.nombre);
    setLogoUrl(payload.logo_url);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchMarcaPublic();
      apply(payload);
    } catch {
      /* keep last known / default */
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<MarcaState>(
    () => ({
      nombre,
      logoUrl,
      iniciales: inicialesDeNombre(nombre),
      loading,
      refresh,
      apply,
    }),
    [nombre, logoUrl, loading, refresh, apply],
  );

  return <MarcaContext.Provider value={value}>{children}</MarcaContext.Provider>;
}

export function useMarca(): MarcaState {
  return useContext(MarcaContext);
}
