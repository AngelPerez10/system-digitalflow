/** Iconos del módulo: SVG stroke inline, como en Proyectos y Órdenes. */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function BarcodeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" />
    </svg>
  );
}

export function BoxesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </svg>
  );
}

export function EntradaIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.9" aria-hidden="true">
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function SalidaIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.9" aria-hidden="true">
      <path d="M12 14V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function LinkIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function PhotoIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export function TagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

export function AlertIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

export function HistoryIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function TrashIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 16h10l1-16" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CloseIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="2" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function UploadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.9" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function RefreshIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.9" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
      <path d="M21 4v4h-4M3 20v-4h4" />
    </svg>
  );
}

export function WarnIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="2" aria-hidden="true">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
