/** Presentación de los pasos del formulario: etiqueta, ayuda e ícono (en el orden de `CLIENTE_STEP_ORDER`). */
import type { ComponentType } from "react";
import { Contact, FileText, IdCard } from "lucide-react";
import type { ClienteFormTab } from "../domain/clienteTipos";

export type ClienteStepMeta = { id: ClienteFormTab; label: string; hint: string; icon: ComponentType<{ className?: string }> };

export const CLIENTE_STEPS: ClienteStepMeta[] = [
  { id: "general", label: "Datos básicos", hint: "Nombre, teléfono y condiciones", icon: IdCard },
  { id: "contacto", label: "Contacto", hint: "Persona de contacto principal", icon: Contact },
  { id: "more", label: "Facturación y domicilio", hint: "Datos fiscales y ubicación", icon: FileText },
];
