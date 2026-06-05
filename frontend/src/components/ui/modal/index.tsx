import { useRef, useEffect, useId } from "react";

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  closeOnBackdropClick?: boolean;
  /** When false, Escape does not call onClose (useful when stacking modals). Default true. */
  closeOnEscape?: boolean;
  mobileBottomSheet?: boolean;
  /** id del elemento que describe el diálogo (aria-describedby). */
  ariaDescribedBy?: string;
  /** Nombre accesible del diálogo (obligatorio si no hay ariaLabelledBy). */
  ariaLabel?: string;
  /** id del título visible del diálogo (preferido cuando hay encabezado). */
  ariaLabelledBy?: string;
}

export type ModalProps = ModalBaseProps;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  ariaLabelledBy,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fallbackLabelId = useId().replace(/:/g, "");
  const resolvedAriaLabel = ariaLabel ?? (ariaLabelledBy ? undefined : "Diálogo");
  const labelledBy = ariaLabelledBy ?? (resolvedAriaLabel ? fallbackLabelId : undefined);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = modalRef.current;

    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

    const focusInitial = () => {
      const focusable = getFocusable();
      const closeBtn = root.querySelector<HTMLElement>('button[aria-label="Cerrar ventana"]');
      (closeBtn && focusable.includes(closeBtn) ? closeBtn : focusable[0])?.focus();
    };

    const raf = requestAnimationFrame(focusInitial);

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative flex min-h-0 w-full flex-col rounded-3xl bg-white dark:bg-gray-900";

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
          onClick={closeOnBackdropClick ? onClose : undefined}
        ></div>
      )}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={resolvedAriaLabel}
        aria-describedby={ariaDescribedBy}
        className={`${contentClasses}  ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {resolvedAriaLabel && !ariaLabelledBy ? (
          <span id={fallbackLabelId} className="sr-only">
            {resolvedAriaLabel}
          </span>
        ) : null}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute right-3 top-3 z-999 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
};
