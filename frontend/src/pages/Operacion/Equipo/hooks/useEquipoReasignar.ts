/**
 * Mover trabajos en el tablero Equipo: cambiar de técnico, de día o ambos.
 *
 * - Optimista: se ve al instante y se guarda en segundo plano; si falla, la
 *   fila vuelve a como estaba y se avisa.
 * - Orden: `tecnico_asignado` y/o `fecha_inicio`.
 * - Proyecto: equipo y/o jornadas (todas se recorren los mismos días).
 * - «Deshacer» durante 6 s y registro de cada movimiento en el Historial.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Orden, Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { displayOrdenFolio } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { reasignarEquipoProyecto } from "../../Proyectos/shared/proyectoApi";
import { displayProyectoFolio, filledFechasInicio } from "../../Proyectos/shared/proyectoFormUtils";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { columnKey, itemKey, type EquipoItemKind, type EquipoMoveRequest } from "../shared/equipoDnd";
import {
  aplicarEquipoProyecto,
  equipoActualProyecto,
  moverEquipoProyecto,
  ordenTecnicoId,
  type EquipoProyectoAsignacion,
  type EquipoTecnicoId,
} from "../shared/equipoGrouping";
import { registrarEquipoHistorial, type EquipoHistorialEntry } from "../shared/equipoHistorialApi";
import { apiErrorMessage, patchOrdenEquipo } from "../shared/equipoOrdenApi";
import { DIAS_CORTOS, diaSemana, parseYmd, recorrerJornadas } from "../shared/equipoSemana";
import type { EquipoSemanaData } from "./useEquipoSemanaData";

export type EquipoUndoState = {
  token: number;
  message: string;
  req: EquipoMoveRequest;
  /** Fila antes del cambio (para restaurar y re-guardar). */
  prevOrden?: Orden;
  prevProyecto?: ProyectoRow;
};

type RegistroEntrada = {
  kind: EquipoItemKind;
  id: string;
  folio: string;
  cliente: string;
  accion: "reasignar" | "deshacer";
  fromId: EquipoTecnicoId;
  toId: EquipoTecnicoId;
  fromFecha: string | null;
  toFecha: string | null;
};

const UNDO_MS = 6000;
const FLASH_MS = 1600;

/** Qué cambia en una solicitud de movimiento. */
function cambiosDe(req: EquipoMoveRequest) {
  const tecnico = req.fromId !== req.toId;
  const dia = !!req.fromFecha && !!req.toFecha && req.fromFecha !== req.toFecha;
  return { tecnico, dia };
}

/** «mié 30». */
function diaCorto(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_CORTOS[diaSemana(ymd)].toLowerCase()} ${d.getDate()} ${d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")}` : ymd;
}

export function useEquipoReasignar({
  data,
  onError,
  onHistorial,
}: {
  data: Pick<EquipoSemanaData, "usuarios" | "roster" | "ordenes" | "setOrdenes" | "proyectos" | "setProyectos" | "destinos">;
  onError: (title: string, message: string) => void;
  onHistorial: (entry: EquipoHistorialEntry) => void;
}) {
  const { usuarios, roster, ordenes, setOrdenes, proyectos, setProyectos, destinos } = data;
  const [undo, setUndo] = useState<EquipoUndoState | null>(null);
  const [justMovedKey, setJustMovedKey] = useState<string | null>(null);

  // Refs: los callbacks leen siempre lo último sin re-crearse en cada render.
  const usuariosRef = useRef<Map<number, Usuario>>(new Map());
  // Por id, prefiere la entrada con foto (el catálogo general puede venir sin ella).
  usuariosRef.current = new Map();
  for (const u of [...usuarios, ...roster]) {
    const prev = usuariosRef.current.get(u.id);
    if (!prev || (!prev.avatar_url && u.avatar_url)) usuariosRef.current.set(u.id, u);
  }
  const ordenesRef = useRef(ordenes);
  ordenesRef.current = ordenes;
  const proyectosRef = useRef(proyectos);
  proyectosRef.current = proyectos;
  const destinosRef = useRef(destinos);
  destinosRef.current = destinos;
  const undoTokenRef = useRef(0);

  const nombreDe = useCallback((id: EquipoTecnicoId) => {
    if (id == null) return "Sin asignar";
    const s = destinosRef.current.find((d) => d.id === id);
    return s?.nombre ?? `Técnico #${id}`;
  }, []);

  const flashMoved = useCallback((kind: EquipoItemKind, id: string, toId: EquipoTecnicoId) => {
    const k = itemKey(kind, id, columnKey(toId));
    setJustMovedKey(k);
    window.setTimeout(() => setJustMovedKey((prev) => (prev === k ? null : prev)), FLASH_MS);
  }, []);

  const registrar = useCallback(
    (entry: RegistroEntrada) => {
      void registrarEquipoHistorial({
        tipo: entry.kind,
        objeto_id: Number(entry.id),
        folio: entry.folio,
        cliente: entry.cliente,
        accion: entry.accion,
        desde_id: entry.fromId,
        desde_nombre: nombreDe(entry.fromId),
        hacia_id: entry.toId,
        hacia_nombre: nombreDe(entry.toId),
        desde_fecha: entry.fromFecha,
        hacia_fecha: entry.toFecha,
      })
        .then(onHistorial)
        .catch(() => {
          // El cambio ya se guardó; avisar para que nadie crea que quedó registrado.
          onError("Historial", `Se guardó el cambio de ${entry.folio}, pero no se pudo registrar en el historial.`);
        });
    },
    [nombreDe, onHistorial, onError]
  );

  /* ---------------- Guardar (optimista) ---------------- */

  const guardarOrden = useCallback(
    async (prev: Orden, cambios: { tecnico?: EquipoTecnicoId; fecha?: string | null }) => {
      const conTecnico = cambios.tecnico !== undefined;
      const conFecha = cambios.fecha !== undefined;
      const toId = cambios.tecnico ?? null;
      const avatar = toId != null ? usuariosRef.current.get(toId)?.avatar_url ?? "" : "";
      setOrdenes((list) =>
        list.map((o) => {
          if (o.id !== prev.id) return o;
          let next: Orden = { ...o };
          if (conTecnico)
            next = {
              ...next,
              tecnico_asignado: toId,
              tecnico_asignado_full_name: toId != null ? nombreDe(toId) : "",
              tecnico_asignado_avatar_url: avatar,
              en_pool: toId != null ? false : o.en_pool,
            };
          if (conFecha) next = { ...next, fecha_inicio: cambios.fecha ?? null } as Orden;
          return next;
        })
      );
      try {
        const saved = await patchOrdenEquipo(prev.id, {
          ...(conTecnico ? { tecnico_asignado: toId } : {}),
          ...(conFecha ? { fecha_inicio: cambios.fecha ?? null } : {}),
        });
        setOrdenes((list) => list.map((o) => (o.id === prev.id ? { ...o, ...saved } : o)));
        return true;
      } catch (err) {
        setOrdenes((list) => list.map((o) => (o.id === prev.id ? prev : o)));
        onError("No se pudo mover", apiErrorMessage(err, "Ocurrió un error al guardar la orden."));
        return false;
      }
    },
    [nombreDe, onError, setOrdenes]
  );

  const guardarProyecto = useCallback(
    async (prev: ProyectoRow, equipo: EquipoProyectoAsignacion, fechas: string[] | null) => {
      const avatarDe = (id: number) => usuariosRef.current.get(id)?.avatar_url ?? "";
      setProyectos((list) =>
        list.map((r) => {
          if (r.id !== prev.id) return r;
          const conEquipo = aplicarEquipoProyecto(r, equipo, avatarDe);
          return fechas ? { ...conEquipo, draft: { ...conEquipo.draft, fechasInicio: fechas.length ? fechas : [""] } } : conEquipo;
        })
      );
      try {
        const saved = await reasignarEquipoProyecto(prev.id, equipo, fechas ? { fechas_inicio: fechas } : {});
        setProyectos((list) => list.map((r) => (r.id === saved.id ? saved : r)));
        return true;
      } catch (err) {
        setProyectos((list) => list.map((r) => (r.id === prev.id ? prev : r)));
        onError("No se pudo mover", apiErrorMessage(err, "Ocurrió un error al guardar el proyecto."));
        return false;
      }
    },
    [onError, setProyectos]
  );

  /* ---------------- Mover ---------------- */

  const mover = useCallback(
    async (req: EquipoMoveRequest) => {
      const { kind, id, fromId, toId } = req;
      const c = cambiosDe(req);
      if (!c.tecnico && !c.dia) return;
      const partes = [c.tecnico ? (toId == null ? "«Sin asignar»" : nombreDe(toId)) : "", c.dia && req.toFecha ? diaCorto(req.toFecha) : ""].filter(Boolean);
      const fromFecha = c.dia ? req.fromFecha ?? null : null;
      const toFecha = c.dia ? req.toFecha ?? null : null;

      if (kind === "orden") {
        const prev = ordenesRef.current.find((o) => String(o.id) === id);
        if (!prev) return;
        if (c.tecnico && ordenTecnicoId(prev) === toId && !c.dia) return;
        const folio = displayOrdenFolio(prev);
        flashMoved(kind, id, toId);
        const token = ++undoTokenRef.current;
        setUndo({ token, req, prevOrden: prev, message: `${folio} → ${partes.join(" · ")}` });
        const ok = await guardarOrden(prev, { ...(c.tecnico ? { tecnico: toId } : {}), ...(c.dia ? { fecha: toFecha } : {}) });
        if (ok) registrar({ kind, id, folio, cliente: prev.cliente || "", accion: "reasignar", fromId, toId, fromFecha, toFecha });
        else setUndo((u) => (u?.token === token ? null : u));
        return;
      }

      const prev = proyectosRef.current.find((r) => String(r.id) === id);
      if (!prev) return;
      const folio = displayProyectoFolio(prev.folio);
      const equipo = c.tecnico ? moverEquipoProyecto(prev, fromId, toId != null ? { id: toId, nombre: nombreDe(toId) } : null) : equipoActualProyecto(prev);
      const fechas = c.dia && req.fromFecha && req.toFecha ? recorrerJornadas(prev, req.fromFecha, req.toFecha) : null;
      flashMoved(kind, id, toId);
      const token = ++undoTokenRef.current;
      setUndo({ token, req, prevProyecto: prev, message: `${folio} → ${partes.join(" · ")}` });
      const ok = await guardarProyecto(prev, equipo, fechas);
      if (ok) registrar({ kind, id, folio, cliente: prev.cliente || "", accion: "reasignar", fromId, toId, fromFecha, toFecha });
      else setUndo((u) => (u?.token === token ? null : u));
    },
    [flashMoved, guardarOrden, guardarProyecto, nombreDe, registrar]
  );

  const deshacer = useCallback(async () => {
    const u = undo;
    if (!u) return;
    setUndo(null);
    const { req } = u;
    const c = cambiosDe(req);
    const fromFecha = c.dia ? req.toFecha ?? null : null;
    const toFecha = c.dia ? req.fromFecha ?? null : null;

    if (req.kind === "orden" && u.prevOrden) {
      const prev = u.prevOrden;
      const actual = ordenesRef.current.find((o) => o.id === prev.id) ?? prev;
      flashMoved("orden", req.id, req.fromId);
      const ok = await guardarOrden(actual, {
        ...(c.tecnico ? { tecnico: ordenTecnicoId(prev) } : {}),
        // La fecha original tal cual (puede ser `null` si venía de la de creación).
        ...(c.dia ? { fecha: prev.fecha_inicio ? String(prev.fecha_inicio).slice(0, 10) : null } : {}),
      });
      if (ok)
        registrar({
          kind: "orden",
          id: req.id,
          folio: displayOrdenFolio(prev),
          cliente: prev.cliente || "",
          accion: "deshacer",
          fromId: req.toId,
          toId: req.fromId,
          fromFecha,
          toFecha,
        });
    } else if (req.kind === "proyecto" && u.prevProyecto) {
      const prev = u.prevProyecto;
      const actual = proyectosRef.current.find((r) => r.id === prev.id) ?? prev;
      flashMoved("proyecto", req.id, req.fromId);
      const ok = await guardarProyecto(actual, equipoActualProyecto(prev), c.dia ? filledFechasInicio(prev.draft?.fechasInicio ?? []) : null);
      if (ok)
        registrar({
          kind: "proyecto",
          id: req.id,
          folio: displayProyectoFolio(prev.folio),
          cliente: prev.cliente || "",
          accion: "deshacer",
          fromId: req.toId,
          toId: req.fromId,
          fromFecha,
          toFecha,
        });
    }
  }, [undo, flashMoved, guardarOrden, guardarProyecto, registrar]);

  // El aviso de «Deshacer» se va solo.
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo((cur) => (cur?.token === undo.token ? null : cur)), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo]);

  const descartarUndo = useCallback(() => setUndo(null), []);

  return { mover, deshacer, undo, descartarUndo, justMovedKey };
}
