import { useEffect, useState } from "react";

import {
  fetchCatalogoConceptos,
  fetchProductosManualesCatalogo,
  fetchServiciosCotizacion,
} from "./cotizacionApi";
import type { CatalogoConcepto, ProductoManualCatalogo, ServicioOption } from "./cotizacionFormTypes";

export function useCotizacionCatalogos(canCotizacionesView: boolean) {
  const [servicios, setServicios] = useState<ServicioOption[]>([]);
  const [catalogoConceptos, setCatalogoConceptos] = useState<CatalogoConcepto[]>([]);
  const [catalogoManualProductos, setCatalogoManualProductos] = useState<ProductoManualCatalogo[]>([]);
  const [loadingCatalogoConceptos, setLoadingCatalogoConceptos] = useState(false);
  const [catalogoConceptosError, setCatalogoConceptosError] = useState("");
  const [catalogoManualError, setCatalogoManualError] = useState("");

  useEffect(() => {
    if (!canCotizacionesView) {
      setCatalogoConceptos([]);
      setCatalogoConceptosError("");
      return;
    }

    let cancelled = false;
    setLoadingCatalogoConceptos(true);
    setCatalogoConceptosError("");

    fetchCatalogoConceptos()
      .then((rows) => {
        if (!cancelled) setCatalogoConceptos(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogoConceptos([]);
        setCatalogoConceptosError("Error al consultar catálogo de conceptos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogoConceptos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCotizacionesView]);

  useEffect(() => {
    if (!canCotizacionesView) {
      setCatalogoManualProductos([]);
      setCatalogoManualError("");
      return;
    }

    let cancelled = false;
    setCatalogoManualError("");

    fetchProductosManualesCatalogo()
      .then((rows) => {
        if (!cancelled) setCatalogoManualProductos(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogoManualProductos([]);
        setCatalogoManualError("Error al consultar productos manuales.");
      });

    return () => {
      cancelled = true;
    };
  }, [canCotizacionesView]);

  useEffect(() => {
    let cancelled = false;

    fetchServiciosCotizacion()
      .then((rows) => {
        if (!cancelled) setServicios(rows);
      })
      .catch(() => {
        if (!cancelled) setServicios([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalogoConceptos,
    catalogoManualProductos,
    catalogoConceptosError,
    catalogoManualError,
    loadingCatalogoConceptos,
    servicios,
  };
}
