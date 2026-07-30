import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildEquiposFromCotizaciones,
  createCotizacionBloque,
  reindexCotizacionBloques,
} from "../../shared/proyectoFormUtils";
import type {
  CotizacionOrigen,
  CotizacionResumen,
  ProyectoCotizacionBloque,
  ProyectoEquipoLinea,
} from "../../shared/proyectoTypes";
import { loadProyectoCotizacionDetalle, searchProyectoCotizaciones } from "./proyectoCotizacionSearch";

export type CotizacionPickerTarget = "principal" | "adicional";

export type UseCotizacionPickerArgs = {
  open: boolean;
  cotizaciones: ProyectoCotizacionBloque[];
  setCotizaciones: React.Dispatch<React.SetStateAction<ProyectoCotizacionBloque[]>>;
  equipos: ProyectoEquipoLinea[];
  setEquipos: React.Dispatch<React.SetStateAction<ProyectoEquipoLinea[]>>;
  cliente: string;
  setCliente: React.Dispatch<React.SetStateAction<string>>;
  setClienteId: React.Dispatch<React.SetStateAction<string>>;
  cotizacionAdicional: CotizacionResumen | null;
  setCotizacionAdicional: React.Dispatch<React.SetStateAction<CotizacionResumen | null>>;
  setCloseBlockedMessage: React.Dispatch<React.SetStateAction<string>>;
};

export function useCotizacionPicker({
  open,
  cotizaciones,
  setCotizaciones,
  setEquipos,
  cliente,
  setCliente,
  setClienteId,
  setCotizacionAdicional,
  setCloseBlockedMessage,
}: UseCotizacionPickerArgs) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClearCotizaciones, setConfirmClearCotizaciones] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<CotizacionPickerTarget>("principal");
  const [pickerTab, setPickerTab] = useState<CotizacionOrigen>("digitalflow");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<CotizacionResumen[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [pickerLoadingId, setPickerLoadingId] = useState<string | null>(null);

  const cotizacionIdsVinculados = useMemo(
    () => new Set(cotizaciones.map((c) => c.cotizacion.id)),
    [cotizaciones]
  );

  const cotizacionesFiltradas = useMemo(() => {
    return pickerResults.filter((c) => {
      if (pickerTarget === "principal" && cotizacionIdsVinculados.has(c.id)) return false;
      return true;
    });
  }, [pickerResults, pickerTarget, cotizacionIdsVinculados]);

  const resetPicker = useCallback(() => {
    setPickerOpen(false);
    setConfirmClearCotizaciones(false);
    setPickerTarget("principal");
    setPickerSearch("");
    setPickerResults([]);
    setPickerLoading(false);
    setPickerError("");
    setPickerLoadingId(null);
  }, []);

  useEffect(() => {
    if (!open || !pickerOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    setPickerError("");
    const timer = window.setTimeout(() => {
      void (async () => {
        const { rows, error } = await searchProyectoCotizaciones(pickerTab, pickerSearch);
        if (cancelled) return;
        setPickerResults(rows);
        setPickerError(error?.message || "");
        setPickerLoading(false);
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, pickerOpen, pickerTab, pickerSearch]);

  const handleCargarCotizacion = async (item: CotizacionResumen) => {
    if (pickerLoadingId) return;

    if (pickerTarget === "adicional") {
      setPickerLoadingId(item.id);
      setPickerError("");
      const { result, error } = await loadProyectoCotizacionDetalle(item);
      setPickerLoadingId(null);
      if (!result) {
        setPickerError(error || "No se pudo cargar la cotización.");
        return;
      }
      setCotizacionAdicional(result.resumen);
      setCloseBlockedMessage("");
      setPickerOpen(false);
      setPickerSearch("");
      setPickerResults([]);
      setPickerTarget("principal");
      return;
    }

    if (cotizacionIdsVinculados.has(item.id)) {
      setPickerOpen(false);
      setPickerSearch("");
      return;
    }

    setPickerLoadingId(item.id);
    setPickerError("");
    const { result, error } = await loadProyectoCotizacionDetalle(item);
    setPickerLoadingId(null);
    if (!result) {
      setPickerError(error || "No se pudo cargar la cotización.");
      return;
    }

    const next = reindexCotizacionBloques([
      ...cotizaciones,
      createCotizacionBloque(result.resumen, result.lineas, cotizaciones.length + 1),
    ]);
    setCotizaciones(next);
    setEquipos((prevEq) => buildEquiposFromCotizaciones(next, prevEq));
    if (!cliente.trim()) {
      setCliente(result.clienteNombre);
      setClienteId(result.clienteId);
    }
    setPickerOpen(false);
    setPickerSearch("");
    setPickerResults([]);
  };

  const openCotizacionPicker = (target: CotizacionPickerTarget) => {
    setPickerTarget(target);
    setPickerSearch("");
    setPickerResults([]);
    setPickerError("");
    setPickerOpen(true);
  };

  const handleQuitarCotizacion = (vinculoId: string) => {
    const next = reindexCotizacionBloques(cotizaciones.filter((b) => b.vinculoId !== vinculoId));
    setCotizaciones(next);
    setEquipos((prevEq) => buildEquiposFromCotizaciones(next, prevEq));
    if (next.length === 0) {
      setClienteId("");
    }
  };

  const handleLimpiarPresupuesto = () => {
    setCotizaciones([]);
    setEquipos([]);
    setConfirmClearCotizaciones(false);
  };

  return {
    pickerOpen,
    setPickerOpen,
    confirmClearCotizaciones,
    setConfirmClearCotizaciones,
    pickerTarget,
    pickerTab,
    setPickerTab,
    pickerSearch,
    setPickerSearch,
    setPickerResults,
    pickerLoading,
    pickerError,
    setPickerError,
    pickerLoadingId,
    cotizacionesFiltradas,
    resetPicker,
    handleCargarCotizacion,
    openCotizacionPicker,
    handleQuitarCotizacion,
    handleLimpiarPresupuesto,
  };
}
