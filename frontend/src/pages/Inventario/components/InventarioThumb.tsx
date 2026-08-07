type InventarioThumbProps = {
  src: string;
  alt: string;
  /** Lado del cuadro en px. */
  size?: number;
};

/** Miniatura del producto con marcador de posición cuando aún no hay foto. */
export default function InventarioThumb({ src, alt, size = 40 }: InventarioThumbProps) {
  const box = { width: size, height: size } as const;

  if (!src) {
    return (
      <span
        style={box}
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-[#e2d9ca] bg-[#fcfaf6] text-[#c4bcae] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#475569]"
        aria-hidden="true"
      >
        <svg className="h-1/2 w-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={box}
      loading="lazy"
      className="shrink-0 rounded-lg border border-[#e7ded0] bg-white object-contain dark:border-[#334155] dark:bg-[#0f172a]"
    />
  );
}
