import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildEquiposFromCotizaciones,
  createCotizacionBloque,
  normalizeTiposTrabajo,
  reindexCotizacionBloques,
} from "../../shared/proyectoFormUtils";
import type {
  CotizacionOrigen,
  CotizacionResumen,
  ProyectoCotizacionBloque,
  ProyectoEquipoLinea,
  ProyectoTipoTrabajo,
} from "../../shared/proyectoTypes";
import { loadProyectoCotizacionDetalle, searchProyectoCotizaciones } from "./proyectoCotizacionSearch";
import {
  fetchCotizacionesOcupadas,
  type CotizacionOcupadaInfo,
} from "./proyectoCotizacionesOcupadas";

export type CotizacionPickerTarget = "principal" | "adicional";

export type CotizacionPickerRow = CotizacionResumen & {
  /** Ya está en la lista principal de este borrador. */
  yaVinculada?: boolean;
  /** Ocupada por otro proyecto (no cancelado). */
  ocupadaPorFolio?: string | null;
  ocupadaEnProyectoId?: number | null;
};

export type UseCotizacionPickerArgs = {
  open: boolean;
  /** Al editar, excluye este id del índice de ocupadas. */
  proyectoId?: number | null;
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
  /** Une tipos de trabajo de la cotización al proyecto. */
  onMergeTiposTrabajo?: (tipos: ProyectoTipoTrabajo[]) => void;
  servicios?: Array<{ id: number; nombre: string }>;
};

function tiposFromLoadResult(
  tipos: ProyectoTipoTrabajo[] | undefined,
  servicios: Array<{ id: number; nombre: string }>
): ProyectoTipoTrabajo[] {
  const normalized = normalizeTiposTrabajo(tipos);
  if (!normalized.length) return [];
  return normalized.map((t) => ({
    id: t.id,
    nombre: t.nombre || servicios.find((s) => s.id === t.id)?.nombre || "",
  }));
}

export function useCotizacionPicker({
  open,
  proyectoId = null,
  cotizaciones,
  setCotizaciones,
  setEquipos,
  cliente,
  setCliente,
  setClienteId,
  cotizacionAdicional,
  setCotizacionAdicional,
  setCloseBlockedMessage,
  onMergeTiposTrabajo,
  servicios = [],
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
  const [ocupadasById, setOcupadasById] = useState<Record<string, CotizacionOcupadaInfo>>({});

  const cotizacionIdsVinculados = useMemo(
    () => new Set(cotizaciones.map((c) => c.cotizacion.id)),
    [cotizaciones]
  );

  const adicionalId = cotizacionAdicional?.id ?? null;

  const cotizacionesFiltradas = useMemo((): CotizacionPickerRow[] => {
    const rows: CotizacionPickerRow[] = [];
    for (const c of pickerResults) {
      const yaVinculada = cotizacionIdsVinculados.has(c.id);
      if (pickerTarget === "principal" && yaVinculada) {
        continue;
      }
      const ocupada = ocupadasById[c.id];
      const esAdicionalActual = pickerTarget === "adicional" && adicionalId === c.id;
      rows.push({
        ...c,
        yaVinculada: pickerTarget === "adicional" ? yaVinculada : false,
        ocupadaPorFolio: ocupada && !esAdicionalActual ? ocupada.folio : null,
        ocupadaEnProyectoId: ocupada && !esAdicionalActual ? ocupada.id : null,
      });
    }
    return rows;
  }, [
    pickerResults,
    pickerTarget,
    cotizacionIdsVinculados,
    ocupadasById,
    adicionalId,
  ]);

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
    void (async () => {
      const { byId, error } = await fetchCotizacionesOcupadas(proyectoId);
      if (cancelled) return;
      setOcupadasById(byId);
      if (error) {
        setPickerError((prev) => prev || error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pickerOpen, proyectoId]);

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

  const handleCargarCotizacion = async (item: CotizacionPickerRow) => {
    if (pickerLoadingId) return;
    if (item.ocupadaPorFolio) {
      setPickerError(
        `La cotización ya está vinculada al proyecto ${item.ocupadaPorFolio}.`
      );
      return;
    }
    if (pickerTarget === "adicional" && cotizacionIdsVinculados.has(item.id)) {
      setPickerError(
        "Esa cotización ya está vinculada como principal en este proyecto."
      );
      return;
    }

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

    const tiposIncoming = tiposFromLoadResult(result.tiposTrabajo, servicios);
    const next = reindexCotizacionBloques([
      ...cotizaciones,
      createCotizacionBloque(
        result.resumen,
        result.lineas,
        cotizaciones.length + 1,
        undefined,
        tiposIncoming
      ),
    ]);
    setCotizaciones(next);
    setEquipos((prevEq) => buildEquiposFromCotizaciones(next, prevEq));
    if (!cliente.trim()) {
      setCliente(result.clienteNombre);
      setClienteId(result.clienteId);
    }
    if (tiposIncoming.length && onMergeTiposTrabajo) {
      onMergeTiposTrabajo(tiposIncoming);
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
