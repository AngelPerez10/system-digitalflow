import { useEffect, useState } from "react";
import { resolveProyectoProductoImageUrl } from "./proyectoProductoImage";

type Props = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-14 w-14",
} as const;

/**
 * Miniatura de producto (Syscom / TVC / manual) con fallback accesible.
 */
export function ProyectoProductoThumb({ src, alt, size = "md", className = "" }: Props) {
  const resolved = resolveProyectoProductoImageUrl(src);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  const showImg = Boolean(resolved) && !broken;
  const initial = (alt || "?").trim().slice(0, 1).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex ${sizeClass[size]} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/60 ${className}`}
    >
      {showImg ? (
        <img
          src={resolved!}
          alt={alt}
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-[10px] font-semibold uppercase text-[#a8a29e] dark:text-[#64748b]" aria-hidden>
          {initial}
        </span>
      )}
    </span>
  );
}
