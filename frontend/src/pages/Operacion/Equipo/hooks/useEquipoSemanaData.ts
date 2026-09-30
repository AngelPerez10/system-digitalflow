/**
 * Datos del tablero semanal: catálogos de usuarios, las órdenes de los meses
 * que toca la semana (una semana puede cruzar de mes) y los proyectos; de
 * ahí salen las secciones por técnico con solo lo que cae de lunes a domingo
 * (proyectos: por sus jornadas programadas).
 */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchOrdenesMes } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesFetch";
import { fetchTodosLosUsuariosApi, fetchUsuariosApi } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import type { Orden, Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { listProyectos } from "../../Proyectos/shared/proyectoApi";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { columnKey, type EquipoDestino } from "../shared/equipoDnd";
import { buildEquipoSecciones, type EquipoSeccion } from "../shared/equipoGrouping";
import { apiErrorMessage } from "../shared/equipoOrdenApi";
import { enSemana, mesesDeSemana, ordenFecha, proyectoEnSemana } from "../shared/equipoSemana";

export type EquipoSemanaData = {
  usuarios: Usuario[];
  roster: Usuario[];
  ordenes: Orden[];
  setOrdenes: Dispatch<SetStateAction<Orden[]>>;
  proyectos: ProyectoRow[];
  setProyectos: Dispatch<SetStateAction<ProyectoRow[]>>;
  /** Primera carga de la semana (sin datos que mostrar todavía). */
  loading: boolean;
  /** Secciones por técnico con solo lo de la semana (todos los técnicos, aunque estén vacíos). */
  secciones: EquipoSeccion[];
  destinos: EquipoDestino[];
};

/**
 * `mesExtra` (`YYYY-MM`): mes que se carga siempre además de los de la semana
 * (el mes actual, para la bandeja «Sin asignar» de todo el mes).
 */
export function useEquipoSemanaData(lunes: string, onError: (title: string, message: string) => void, mesExtra?: string): EquipoSemanaData {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roster, setRoster] = useState<Usuario[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoRow[]>([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  // Catálogos (una vez): usuarios para nombres/avatares, técnicos para las filas.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchTodosLosUsuariosApi(), fetchUsuariosApi()]).then(([todos, tecnicos]) => {
      if (cancelled) return;
      setUsuarios(todos);
      setRoster(tecnicos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Proyectos: el API devuelve todos; la semana se filtra en el cliente.
  useEffect(() => {
    let cancelled = false;
    listProyectos()
      .then((rows) => {
        if (!cancelled) setProyectos(rows);
      })
      .catch((err) => {
        if (!cancelled) onError("Proyectos", apiErrorMessage(err, "No se pudieron cargar los proyectos."));
      })
      .finally(() => {
        if (!cancelled) setLoadingProyectos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  // Órdenes de los meses que toca la semana (uno o dos) y el mes extra. Los meses ya
  // cargados no se vuelven a pedir: navegar entre semanas es instantáneo y
  // las reasignaciones hechas en memoria se conservan.
  const mesesKey = [...new Set([...mesesDeSemana(lunes), ...(mesExtra ? [mesExtra] : [])])].join(",");
  const cargadosRef = useRef(new Set<string>());
  useEffect(() => {
    const faltan = mesesKey.split(",").filter((m) => !cargadosRef.current.has(m));
    if (!faltan.length) {
      setLoadingOrdenes(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoadingOrdenes(true);
    Promise.all(faltan.map((mes) => fetchOrdenesMes(mes, { signal: controller.signal })))
      .then((porMes) => {
        if (cancelled) return;
        faltan.forEach((m) => cargadosRef.current.add(m));
        setOrdenes((prev) => {
          const unicas = new Map<number, Orden>(prev.map((o) => [o.id, o]));
          for (const o of porMes.flat()) unicas.set(o.id, o);
          return [...unicas.values()];
        });
      })
      .catch(() => {
        if (!cancelled) onError("Órdenes", "No se pudieron cargar las órdenes de la semana.");
      })
      .finally(() => {
        if (!cancelled) setLoadingOrdenes(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mesesKey, onError]);

  const ordenesSemana = useMemo(() => ordenes.filter((o) => enSemana(ordenFecha(o), lunes)), [ordenes, lunes]);
  const proyectosSemana = useMemo(() => proyectos.filter((r) => proyectoEnSemana(r, lunes)), [proyectos, lunes]);

  const secciones = useMemo(
    () => buildEquipoSecciones(ordenesSemana, proyectosSemana, usuarios, roster),
    [ordenesSemana, proyectosSemana, usuarios, roster]
  );

  const destinos = useMemo<EquipoDestino[]>(
    () => secciones.map((s) => ({ key: columnKey(s.tecnico.id), id: s.tecnico.id, nombre: s.tecnico.nombre, avatarUrl: s.tecnico.avatarUrl })),
    [secciones]
  );

  return {
    usuarios,
    roster,
    ordenes,
    setOrdenes,
    proyectos,
    setProyectos,
    loading: loadingOrdenes || loadingProyectos,
    secciones,
    destinos,
  };
}
