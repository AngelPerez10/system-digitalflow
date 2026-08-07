import type { ReactNode } from "react";
import {
  inventarioEyebrowClass,
  inventarioSectionCardClass,
  inventarioSectionClass,
  inventarioSectionHeadClass,
  inventarioSectionHintClass,
  inventarioSectionTitleClass,
} from "../shared/inventarioStyles";

type InventarioFormSectionProps = {
  titleId: string;
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Si es false, los hijos no van dentro de la tarjeta blanca. */
  card?: boolean;
};

/** Bloque de formulario alineado a Proyectos: icono + título → tarjeta blanca. */
export default function InventarioFormSection({
  titleId,
  title,
  eyebrow,
  icon,
  hint,
  actions,
  children,
  card = true,
}: InventarioFormSectionProps) {
  return (
    <section className={inventarioSectionClass} aria-labelledby={titleId}>
      <div className={inventarioSectionHeadClass}>
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 inline-flex shrink-0 text-[#ea580c] dark:text-[#fb923c]" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className={inventarioEyebrowClass}>{eyebrow}</p> : null}
            <h4 id={titleId} className={`${inventarioSectionTitleClass}${eyebrow ? " mt-0.5" : ""}`}>
              {title}
            </h4>
            {hint ? <p className={inventarioSectionHintClass}>{hint}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {card ? <div className={inventarioSectionCardClass}>{children}</div> : children}
    </section>
  );
}
