import type { ReactNode } from "react";
import {
  proyectoOrdenCardClass,
  proyectoOrdenEyebrowClass,
  proyectoOrdenHintClass,
  proyectoOrdenSectionClass,
  proyectoOrdenSectionHeadClass,
  proyectoOrdenTitleClass,
} from "./proyectoPageStyles";

type Props = {
  titleId: string;
  title: string;
  /** Eyebrow estilo cotización (“Paso 1”, “Cliente”, …). */
  eyebrow?: string;
  icon?: ReactNode;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Si false, no envuelve children en la tarjeta blanca (p. ej. listas vacías custom). */
  card?: boolean;
};

/**
 * Bloque de formulario alineado a Órdenes / Cotización:
 * icono + título (opcional eyebrow) → tarjeta blanca con campos.
 */
export function ProyectoFormSection({
  titleId,
  title,
  eyebrow,
  icon,
  hint,
  actions,
  children,
  card = true,
}: Props) {
  return (
    <section className={proyectoOrdenSectionClass} aria-labelledby={titleId}>
      <div className={proyectoOrdenSectionHeadClass}>
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 inline-flex shrink-0 text-[#ea580c] dark:text-[#fb923c]" aria-hidden>
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className={proyectoOrdenEyebrowClass}>{eyebrow}</p> : null}
            <h4
              id={titleId}
              className={`${proyectoOrdenTitleClass}${eyebrow ? " mt-0.5" : ""}`}
            >
              {title}
            </h4>
            {hint ? <p className={proyectoOrdenHintClass}>{hint}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {card ? <div className={proyectoOrdenCardClass}>{children}</div> : children}
    </section>
  );
}

export const proyectoSectionIconClass = "h-5 w-5";
