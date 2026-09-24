/**
 * Alerta de la app.
 *
 * `toast` (por defecto): tarjeta fija arriba a la derecha, se apila con otras,
 * se cierra sola (barra de tiempo restante) y se pausa al pasar el cursor o
 * enfocar. Entra deslizándose desde la derecha y sale con un desvanecido.
 * `inline`: la misma tarjeta dentro del flujo (errores de formulario / modal).
 *
 * La API es la misma de siempre; solo cambian el diseño y el movimiento.
 */
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import "./alert.css";

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
  /** Si es 0, no se oculta solo. Por defecto: error 6s, aviso 5s, resto 4s (solo toast). */
  autoHideMs?: number;
  onClose?: () => void;
};

const TONE: Record<
  AlertVariant,
  { icon: typeof CircleCheck; tile: string; accent: string; bar: string; title: string }
> = {
  success: {
    icon: CircleCheck,
    tile: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]",
    accent: "bg-[#22A06B]",
    bar: "bg-[#22A06B]",
    title: "text-[#09090B] dark:text-[#F8FAFC]",
  },
  error: {
    icon: CircleAlert,
    tile: "bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]",
    accent: "bg-[#C22B2B] dark:bg-[#F87171]",
    bar: "bg-[#C22B2B] dark:bg-[#F87171]",
    title: "text-[#9F1F1F] dark:text-[#FCA5A5]",
  },
  warning: {
    icon: TriangleAlert,
    tile: "bg-[#FFF6E6] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C]",
    accent: "bg-[#E6A23C]",
    bar: "bg-[#E6A23C]",
    title: "text-[#09090B] dark:text-[#F8FAFC]",
  },
  info: {
    icon: Info,
    tile: "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]",
    accent: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    bar: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    title: "text-[#09090B] dark:text-[#F8FAFC]",
  },
};

const TOAST_HOST_ID = "df-alert-toast-host";
const TOAST_HOST_CLASS =
  "pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[100200] flex flex-col items-end gap-2.5 px-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[min(100%,24rem)] sm:px-0";

const FONT = "[font-family:Geist,Outfit,system-ui,sans-serif]";

function ensureToastHost(): HTMLElement {
  let host = document.getElementById(TOAST_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = TOAST_HOST_ID;
    document.body.appendChild(host);
  }
  host.className = TOAST_HOST_CLASS;
  return host;
}

const defaultMs = (variant: AlertVariant) => (variant === "error" ? 6000 : variant === "warning" ? 5000 : 4000);

type Phase = "open" | "leaving" | "closed";

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
  const [phase, setPhase] = useState<Phase>("open");
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const onCloseRef = useRef(onClose);
  const remainingRef = useRef(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const isToast = placement === "toast";
  const ms = isToast ? (autoHideMs ?? defaultMs(variant)) : 0;

  // Un aviso nuevo (otro texto/variante) reaparece y reinicia su tiempo.
  useEffect(() => {
    setPhase("open");
    setPaused(false);
    remainingRef.current = ms;
    setRunKey((k) => k + 1);
  }, [variant, title, message, ms]);

  useEffect(() => {
    if (isToast) setHost(ensureToastHost());
  }, [isToast]);

  const dismiss = useCallback(() => {
    setPhase((p) => (p === "open" ? "leaving" : p));
  }, []);

  const finishLeave = useCallback(() => {
    setPhase((p) => {
      if (p !== "leaving") return p;
      onCloseRef.current?.();
      return "closed";
    });
  }, []);

  // Salida: al terminar la animación; respaldo por si el navegador no la emite.
  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(finishLeave, 320);
    return () => window.clearTimeout(t);
  }, [phase, finishLeave]);

  // Cierre automático con pausa (cursor encima o foco dentro).
  useEffect(() => {
    if (!isToast || ms <= 0 || phase !== "open" || paused) return;
    startedAtRef.current = Date.now();
    const t = window.setTimeout(dismiss, Math.max(0, remainingRef.current));
    return () => {
      window.clearTimeout(t);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [isToast, ms, phase, paused, runKey, dismiss]);

  if (phase === "closed") return null;

  const tone = TONE[variant];
  const Icon = tone.icon;
  const isAssertive = variant === "error" || variant === "warning";

  const card = (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={message ? descId : undefined}
      className={`${FONT} relative flex w-full items-start gap-3 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white py-3.5 pl-4 pr-2.5 text-left dark:border-[#273244] dark:bg-[#151E32] ${
        isToast
          ? "shadow-[0_1px_2px_rgba(9,9,11,0.06),0_18px_40px_-16px_rgba(9,9,11,0.35)] dark:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]"
          : ""
      }`}
    >
      {/* Acento lateral del tono */}
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} aria-hidden />

      <span className={`df-alert-icon inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tone.tile}`} aria-hidden>
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1 pt-px">
        <p id={titleId} className={`text-[14px] font-semibold leading-[20px] tracking-[-0.1px] ${tone.title}`}>
          {title}
        </p>
        {message ? (
          <p id={descId} className="mt-0.5 break-words text-[13px] leading-[19px] text-[#52525B] dark:text-[#B7C1D1]">
            {message}
          </p>
        ) : null}
        {showLink ? (
          <Link
            to={linkHref}
            className="mt-1.5 inline-block text-[13px] font-semibold text-[#1B5CFF] underline-offset-2 hover:underline dark:text-[#7EA0FF]"
          >
            {linkText}
          </Link>
        ) : null}
      </div>

      {isToast ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}

      {/* Tiempo restante (solo visual; el cierre lo lleva un temporizador pausable) */}
      {isToast && ms > 0 && phase === "open" ? (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/[0.04] motion-reduce:hidden dark:bg-white/[0.06]" aria-hidden>
          <span
            key={runKey}
            className={`df-alert-timer block h-full opacity-70 ${tone.bar}`}
            style={{ animationDuration: `${ms}ms` } as CSSProperties}
          />
        </span>
      ) : null}
    </div>
  );

  if (!isToast) return card;
  if (!host) return null;

  return createPortal(
    <div
      className={`pointer-events-auto w-full max-w-md ${phase === "leaving" ? "df-alert-leave" : "df-alert-enter"} ${
        paused ? "df-alert-paused" : ""
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && phase === "leaving") finishLeave();
      }}
    >
      {card}
    </div>,
    host,
  );
}
