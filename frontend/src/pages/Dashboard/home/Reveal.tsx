import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** `true` una sola vez, cuando el elemento entra a la vista. */
function useInView<T extends Element>(rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

type Props = {
  as?: "section" | "div" | "article";
  index?: number;
  className?: string;
  children: (inView: boolean) => ReactNode;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/**
 * Contenedor con entrada al hacer scroll (`cot-reveal`). Pasa `inView` a sus
 * hijos para que las gráficas monten y animen justo cuando se ven.
 */
export function Reveal({ as: Tag = "section", index = 0, className = "", children, ...aria }: Props) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={`cot-reveal ${className}`}
      data-shown={inView ? "" : undefined}
      style={{ "--cot-i": index } as CSSProperties}
      {...aria}
    >
      {children(inView)}
    </Tag>
  );
}
