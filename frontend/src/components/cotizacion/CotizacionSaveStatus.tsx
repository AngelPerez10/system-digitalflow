type Props = {
  isAutoSaving: boolean;
  lastAutoSavedAt: number | string | null;
};

export function CotizacionSaveStatus({ isAutoSaving, lastAutoSavedAt }: Props) {
  if (!lastAutoSavedAt) return null;

  return (
    <p className="mt-2 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
      {isAutoSaving ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1B5CFF]" aria-hidden />
          Guardando cambios…
        </span>
      ) : (
        <>Último guardado: {new Date(lastAutoSavedAt).toLocaleTimeString("es-MX")}</>
      )}
    </p>
  );
}
