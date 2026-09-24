import {
  Building2,
  CalendarRange,
  ClipboardList,
  Package,
  PenLine,
  Satellite,
  type LucideIcon,
} from "lucide-react";
import type { ProyectoFormTab } from "./useProyectoFormState";

export type ProyectoStepMeta = {
  id: ProyectoFormTab;
  label: string;
  hint: string;
  icon: LucideIcon;
};

/** Pasos del modal, en el mismo orden que `PROYECTO_TAB_ORDER`. */
export const PROYECTO_STEPS: ProyectoStepMeta[] = [
  { id: "general", label: "General", hint: "Cliente y cotizaciones", icon: Building2 },
  { id: "planeacion", label: "Planeación", hint: "Tipos, fechas y equipo", icon: CalendarRange },
  { id: "equipos", label: "Equipos", hint: "Presupuesto y entrega", icon: Package },
  { id: "instalacion", label: "Instalación", hint: "Ficha GPS", icon: Satellite },
  { id: "campo", label: "Campo", hint: "Status, bitácora y avance", icon: ClipboardList },
  { id: "cierre", label: "Cierre", hint: "Evidencia y firmas", icon: PenLine },
];
