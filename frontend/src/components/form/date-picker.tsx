import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Spanish } from "flatpickr/dist/l10n/es";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  appendToBody?: boolean; // Render calendar in a portal to avoid clipping in overflow containers
  disabled?: boolean;
};

const PORTAL_ID = "flatpickr-portal";
const ZINDEX_STYLE_ID = "flatpickr-global-zfix";

function ensurePortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID) as HTMLElement | null;
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    Object.assign(portal.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "2147483647",
      pointerEvents: "none",
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(portal);
  }
  return portal;
}

function ensureZIndexStyle() {
  if (document.getElementById(ZINDEX_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ZINDEX_STYLE_ID;
  style.textContent = `.flatpickr-calendar{z-index:2147483647 !important;margin:0 !important}`;
  document.head.appendChild(style);
}

/**
 * Posiciona el calendario con `position: fixed` anclado al input (coords de viewport).
 * Evita el bug de flatpickr (`pageYOffset + getBoundingClientRect`) dentro de un portal fixed.
 */
function placeCalendarNearInput(instance: FlatpickrInstance, positionElement?: HTMLElement) {
  const cal = instance.calendarContainer;
  const anchor = positionElement || instance._positionElement || instance.input;
  if (!cal || !anchor) return;

  const rect = anchor.getBoundingClientRect();
  const calHeight = cal.offsetHeight || 320;
  const calWidth = cal.offsetWidth || 307;
  const margin = 4;
  const viewportW = window.innerWidth || document.documentElement.clientWidth;
  const viewportH = window.innerHeight || document.documentElement.clientHeight;

  const spaceBelow = viewportH - rect.bottom;
  const showAbove = spaceBelow < calHeight + margin && rect.top > calHeight + margin;

  let top = showAbove ? rect.top - calHeight - margin : rect.bottom + margin;
  top = Math.max(margin, Math.min(top, viewportH - calHeight - margin));

  let left = rect.left;
  if (left + calWidth > viewportW - margin) {
    left = viewportW - calWidth - margin;
  }
  left = Math.max(margin, Math.min(left, viewportW - calWidth - margin));

  cal.classList.toggle("arrowTop", !showAbove);
  cal.classList.toggle("arrowBottom", showAbove);

  cal.style.position = "fixed";
  cal.style.top = `${Math.round(top)}px`;
  cal.style.left = `${Math.round(left)}px`;
  cal.style.right = "auto";
  cal.style.bottom = "auto";
  cal.style.margin = "0";
  cal.style.transform = "none";
}

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  appendToBody = true,
  disabled = false,
}: PropsType) {
  const instanceRef = useRef<FlatpickrInstance | null>(null);
  const calendarElRef = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    ensureZIndexStyle();

    const appendTarget = appendToBody ? ensurePortal() : undefined;

    const closeOnScroll = (event: Event) => {
      const instance = instanceRef.current;
      if (!instance?.isOpen) return;
      const target = event.target;
      if (
        target instanceof Node &&
        (calendarElRef.current?.contains(target) ||
          (target instanceof Element && target.closest(".flatpickr-calendar")))
      ) {
        return;
      }
      try {
        instance.close();
      } catch {
        /* ignore */
      }
    };

    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: !appendToBody,
      appendTo: appendTarget,
      monthSelectorType: "static",
      locale: Spanish,
      dateFormat: "Y-m-d",
      defaultDate,
      disableMobile: false,
      // Reemplaza por completo positionCalendar de flatpickr (evita pageYOffset + portal fixed).
      position: (instance, positionElement) => {
        placeCalendarNearInput(instance, positionElement);
      },
      onChange: (...args) => {
        const handler = onChangeRef.current;
        if (Array.isArray(handler)) {
          handler.forEach((fn) => fn?.(...args));
        } else {
          handler?.(...args);
        }
      },
      onOpen: (_dates, _str, instance) => {
        placeCalendarNearInput(instance);
        // Segunda pasada cuando el calendario ya midió su altura real.
        requestAnimationFrame(() => placeCalendarNearInput(instance));
        window.addEventListener("scroll", closeOnScroll, true);
        document.addEventListener("scroll", closeOnScroll, true);
      },
      onClose: () => {
        window.removeEventListener("scroll", closeOnScroll, true);
        document.removeEventListener("scroll", closeOnScroll, true);
      },
    });

    if (!Array.isArray(flatPickr)) {
      instanceRef.current = flatPickr;
      try {
        calendarElRef.current = flatPickr.calendarContainer;
        flatPickr.calendarContainer.style.zIndex = "2147483647";
        flatPickr.calendarContainer.style.pointerEvents = "auto";
        flatPickr.calendarContainer.style.margin = "0";
      } catch {
        /* ignore */
      }
    }

    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("scroll", closeOnScroll, true);
      if (!Array.isArray(flatPickr)) {
        try {
          flatPickr.destroy();
        } catch {
          /* ignore */
        }
        instanceRef.current = null;
        try {
          calendarElRef.current?.remove();
        } catch {
          /* ignore */
        }
        calendarElRef.current = null;
      }
    };
  }, [mode, id, appendToBody, defaultDate]);

  useEffect(() => {
    if (!instanceRef.current) return;
    try {
      if (defaultDate) {
        instanceRef.current.setDate(defaultDate, false);
      } else {
        instanceRef.current.clear(false);
      }
    } catch {
      /* ignore */
    }
  }, [defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition-colors ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed"
              : "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800"
          }`}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
