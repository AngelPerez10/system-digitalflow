interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  actions?: React.ReactNode;
  /** Tipografía y espaciado más contenidos en viewport pequeño (p. ej. formularios largos en móvil) */
  compact?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  actions,
  compact = false,
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 ${className}`}
    >
      {/* Card Header */}
      <div
        className={
          compact
            ? "px-4 py-3.5 sm:px-6 sm:py-5"
            : "px-6 py-5"
        }
      >
        <div className="flex items-start justify-between gap-4">
          <h3
            className={
              compact
                ? "text-sm font-semibold tracking-tight text-gray-800 sm:text-base sm:font-medium sm:tracking-normal dark:text-white/90"
                : "text-base font-medium text-gray-800 dark:text-white/90"
            }
          >
            {title}
          </h3>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {desc && (
          <p
            className={
              compact
                ? "mt-1 text-xs leading-relaxed text-gray-500 sm:text-sm dark:text-gray-400"
                : "mt-1 text-sm text-gray-500 dark:text-gray-400"
            }
          >
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div
        className={
          compact
            ? "space-y-0 border-t border-gray-100 p-3 dark:border-gray-800 sm:p-6"
            : "border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6"
        }
      >
        <div className={compact ? "space-y-4 sm:space-y-6" : "space-y-6"}>{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
