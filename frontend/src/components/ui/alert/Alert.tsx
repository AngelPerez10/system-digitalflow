import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Alert as HeroAlert, CloseButton } from "@heroui/react";

export type AlertVariant = "success" | "error" | "warning" | "info";

type AlertProps = {
  variant: AlertVariant;
  title: string;
  message: string;
  showLink?: boolean;
  linkHref?: string;
  linkText?: string;
  /**
   * `toast` (default): aviso fijo arriba a la derecha.
   * `inline`: dentro del flujo (errores de formulario / modal).
   */
  placement?: "toast" | "inline";
  /** Si es 0, no se oculta solo. Por defecto: error 6s, resto 4s (solo toast). */
  autoHideMs?: number;
  onClose?: () => void;
};

const STATUS_BY_VARIANT = {
  success: "success",
  error: "danger",
  warning: "warning",
  info: "accent",
} as const;

const TOAST_HOST_ID = "df-alert-toast-host";
const TOAST_HOST_CLASS =
  "pointer-events-none fixed inset-x-0 top-3 z-[100200] flex flex-col items-end gap-3 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[min(100%,24rem)] sm:px-0";

function ensureToastHost(): HTMLElement {
  let host = document.getElementById(TOAST_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = TOAST_HOST_ID;
    document.body.appendChild(host);
  }
  host.className = TOAST_HOST_CLASS;
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-relevant", "additions text");
  return host;
}

function AlertBody({
  variant,
  title,
  message,
  showLink,
  linkHref,
  linkText,
  titleId,
  descId,
  onDismiss,
  showClose,
}: {
  variant: AlertVariant;
  title: string;
  message: string;
  showLink: boolean;
  linkHref: string;
  linkText: string;
  titleId: string;
  descId: string;
  onDismiss?: () => void;
  showClose: boolean;
}) {
  const status = STATUS_BY_VARIANT[variant];
  const isAssertive = variant === "error" || variant === "warning";

  return (
    <HeroAlert
      status={status}
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={message ? descId : undefined}
      className="w-full"
    >
      <HeroAlert.Indicator />
      <HeroAlert.Content>
        <HeroAlert.Title id={titleId}>{title}</HeroAlert.Title>
        {message ? (
          <HeroAlert.Description id={descId}>{message}</HeroAlert.Description>
        ) : null}
        {showLink ? (
          <Link
            to={linkHref}
            className="mt-1.5 inline-block text-sm font-medium underline underline-offset-2"
          >
            {linkText}
          </Link>
        ) : null}
      </HeroAlert.Content>
      {showClose ? (
        <CloseButton aria-label="Cerrar aviso" onPress={() => onDismiss?.()} />
      ) : null}
    </HeroAlert>
  );
}

export default function Alert({
  variant,
  title,
  message,
  showLink = false,
  linkHref = "#",
  linkText = "Más información",
  placement = "toast",
  autoHideMs,
  onClose,
}: AlertProps) {
  const titleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(true);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setOpen(true);
  }, [variant, title, message]);

  useEffect(() => {
    if (placement !== "toast") return;
    setHost(ensureToastHost());
  }, [placement]);

  useEffect(() => {
    if (!open || placement !== "toast") return;
    const ms =
      autoHideMs ??
      (variant === "error" ? 6000 : variant === "warning" ? 5000 : 4000);
    if (ms <= 0) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
      onClose?.();
    }, ms);
    return () => window.clearTimeout(timer);
  }, [open, placement, variant, title, message, autoHideMs, onClose]);

  const dismiss = () => {
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  if (placement === "inline") {
    return (
      <AlertBody
        variant={variant}
        title={title}
        message={message}
        showLink={showLink}
        linkHref={linkHref}
        linkText={linkText}
        titleId={titleId}
        descId={descId}
        showClose={false}
      />
    );
  }

  if (!host) return null;

  return createPortal(
    <div className="pointer-events-auto w-full max-w-md origin-top-right animate-in motion-reduce:animate-none">
      <AlertBody
        variant={variant}
        title={title}
        message={message}
        showLink={showLink}
        linkHref={linkHref}
        linkText={linkText}
        titleId={titleId}
        descId={descId}
        showClose
        onDismiss={dismiss}
      />
    </div>,
    host
  );
}
