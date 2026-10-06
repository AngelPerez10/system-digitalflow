import { Camera, CalendarClock, ClipboardList, type LucideIcon } from "lucide-react";

export type ReporteStepId = 1 | 2 | 3;
export type ReporteStepState = "done" | "pending";

export type ReporteStepMeta = { id: ReporteStepId; label: string; hint: string; icon: LucideIcon };

export const REPORTE_STEPS: ReporteStepMeta[] = [
  { id: 1, label: "Origen", hint: "Orden o proyecto", icon: ClipboardList },
  { id: 2, label: "Datos del servicio", hint: "Fecha y técnicos", icon: CalendarClock },
  { id: 3, label: "Evidencia", hint: "Antes / Después", icon: Camera },
];
