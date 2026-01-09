import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Spanish } from "flatpickr/dist/l10n/es";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
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
  const instanceRef = useRef<flatpickr.Instance | null>(null);
  const calendarElRef = useRef<HTMLElement | null>(null);

  const repositionCalendar = () => {
    try {
      if (!appendToBody) return;
      const input = document.getElementById(id) as HTMLElement | null;
      const cal = calendarElRef.current;
      if (!input || !cal) return;

      const rect = input.getBoundingClientRect();
      const calRect = cal.getBoundingClientRect();

      const margin = 6;
      const viewportW = window.innerWidth || document.documentElement.clientWidth;
      const viewportH = window.innerHeight || document.documentElement.clientHeight;

      let top = rect.bottom + margin;
      // If it overflows bottom, open above
      if (top + calRect.height > viewportH - margin) {
        top = rect.top - calRect.height - margin;
      }
      top = Math.max(margin, Math.min(top, viewportH - calRect.height - margin));

      let left = rect.left;
      if (left + calRect.width > viewportW - margin) {
        left = viewportW - calRect.width - margin;
      }
      left = Math.max(margin, Math.min(left, viewportW - calRect.width - margin));

      cal.style.position = 'fixed';
      cal.style.top = `${top}px`;
      cal.style.left = `${left}px`;
      cal.style.right = 'auto';
      cal.style.bottom = 'auto';
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Ensure a global CSS override exists so the calendar is always above modals/overlays
    const styleId = 'flatpickr-global-zfix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `.flatpickr-calendar{z-index:2147483647 !important}`;
      document.head.appendChild(style);
    }

    // Ensure a dedicated portal above modals
    let appendTarget: HTMLElement | undefined = undefined;
    if (appendToBody) {
      const portalId = 'flatpickr-portal';
      let portal = document.getElementById(portalId) as HTMLElement | null;
      if (!portal) {
        portal = document.createElement('div');
        portal.id = portalId;
        Object.assign(portal.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          zIndex: '2147483647',
          // Don't block the page; calendar itself will receive pointer events
          pointerEvents: 'none',
        } as CSSStyleDeclaration);
        document.body.appendChild(portal);
      }
      appendTarget = portal;
    }

    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      // Use floating calendar by default so it isn't clipped by overflow containers
      static: !appendToBody,
      appendTo: appendTarget,
      monthSelectorType: "static",
      locale: Spanish,
      dateFormat: "Y-m-d",
      defaultDate,
      disableMobile: false,
      onChange,
      onOpen: () => {
        // Some modal layouts (transforms/overflows) cause wrong positioning;
        // force correct placement near the input.
        requestAnimationFrame(() => repositionCalendar());
      },
    });

    // Keep instance reference and adjust z-index
    if (!Array.isArray(flatPickr)) {
      instanceRef.current = flatPickr as any;
      try {
        calendarElRef.current = (flatPickr as any).calendarContainer as HTMLElement;
        // Ensure the calendar renders above app modals/overlays (use max int z-index)
        (flatPickr as any).calendarContainer.style.zIndex = '2147483647';
        (flatPickr as any).calendarContainer.style.pointerEvents = 'auto';
        // Initial position fix (covers cases where flatpickr opens immediately)
        requestAnimationFrame(() => repositionCalendar());
      } catch { }
    }

    return () => {
      if (!Array.isArray(flatPickr)) {
        try { flatPickr.destroy(); } catch { }
        instanceRef.current = null;
        // When using appendTo: body, flatpickr may leave the calendar node behind.
        // Remove it to avoid blocking clicks on elements below.
        try {
          calendarElRef.current?.remove();
        } catch { }
        calendarElRef.current = null;
      }
    };
  }, [mode, onChange, id, appendToBody]);

  // Sync external defaultDate into flatpickr without re-creating the instance
  useEffect(() => {
    if (instanceRef.current && defaultDate) {
      try {
        // Do not trigger onChange when syncing external value; otherwise it can
        // create render loops in controlled forms.
        instanceRef.current.setDate(defaultDate as any, false);
      } catch { }
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
          className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 transition-colors ${disabled
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
