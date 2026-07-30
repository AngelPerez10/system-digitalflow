import type { ReactNode } from "react";
import {
  proyectoOrdenCardClass,
  proyectoOrdenEyebrowClass,
  proyectoOrdenHintClass,
  proyectoOrdenSectionClass,
  proyectoOrdenSectionHeadClass,
  proyectoOrdenTitleClass,
} from "./instalacionStyles";

type Props = {
  titleId: string;
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Si false, no envuelve children en la tarjeta (listas vacías custom). */
  card?: boolean;
};

/**
 * Bloque visual alineado a `ProyectoFormSection` (otras pestañas del modal).
 * Vive en instalaciones/ para no importar form/.
 */
export function InstalacionFormSection({
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
            <h4 id={titleId} className={`${proyectoOrdenTitleClass}${eyebrow ? " mt-0.5" : ""}`}>
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
