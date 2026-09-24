import { useEffect, useState } from "react";
import { resolveProyectoProductoImageUrl } from "../../shared/proyectoProductoImage";

type Props = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "size-9 rounded-[8px]",
  md: "size-12 rounded-[10px]",
  lg: "size-14 rounded-[12px]",
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
      className={`inline-flex ${sizeClass[size]} shrink-0 items-center justify-center overflow-hidden border border-[#F0F0F2] bg-white dark:border-[#1F2A3C] dark:bg-[#0F172A] ${className}`}
    >
      {showImg ? (
        <img
          src={resolved!}
          alt={alt}
          className="h-full w-full object-contain p-1"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-[12px] font-semibold uppercase text-[#A1A1AA] dark:text-[#64748B]" aria-hidden>
          {initial}
        </span>
      )}
    </span>
  );
}
