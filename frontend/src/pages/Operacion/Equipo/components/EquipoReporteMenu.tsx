/**
 * «Reporte»: botón de la barra con un panel para elegir el mes y descargar el
 * PDF (resumen por técnico, órdenes, proyectos e historial del mes).
 *
 * Al descargar pide los datos frescos del mes (no depende de la semana que se
 * ve en el tablero). Panel: Esc o clic afuera lo cierran; en móvil se ancla a
 * la izquierda del botón.
 */
import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Loader2, ListChecks, Users, History } from "lucide-react";
import { fetchOrdenesMes } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesFetch";
import { fetchTodosLosUsuariosApi, fetchUsuariosApi } from "../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { listProyectos } from "../../Proyectos/shared/proyectoApi";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { listEquipoHistorial } from "../shared/equipoHistorialApi";
import { toolbarBtn } from "../shared/equipoTokens";
import { buildReporteMes, etiquetaMes, mesDe, moverMes } from "../shared/equipoReporteMes";

export function EquipoReporteMenu({ lunes }: { lunes: string }) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(() => mesDe(lunes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mesActual = mesDe();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setMes(mesDe(lunes));
      setError("");
    }
    setOpen((v) => !v);
  };

  const descargar = async () => {
    setBusy(true);
    setError("");
    try {
      const [ordenes, proyectos, usuarios, roster, historial] = await Promise.all([
        fetchOrdenesMes(mes),
        listProyectos(),
        fetchTodosLosUsuariosApi(),
        fetchUsuariosApi(),
        listEquipoHistorial(2000, mes),
      ]);
      const data = buildReporteMes({ mes, ordenes, proyectos, usuarios, roster, historial });
      const { descargarReporteMesPdf } = await import("../shared/equipoReportePdf");
      await descargarReporteMesPdf(data);
      setOpen(false);
    } catch {
      setError("No se pudo generar el reporte. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const stepBtn = `cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#52525B] hover:bg-[#F4F4F5] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#B7C1D1] dark:hover:bg-white/[0.06] ${focusRing}`;

  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        aria-label="Reporte mensual"
        title="Reporte mensual"
        className={toolbarBtn(open)}
      >
        <FileDown data-eq-icon="reporte" aria-hidden />
        <span className="hidden sm:inline">Reporte</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Reporte mensual"
          className="cot-pop absolute left-0 top-[calc(100%+8px)] z-40 w-[min(20rem,calc(100vw-2rem))] origin-top-left overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)] sm:left-auto sm:right-0 sm:origin-top-right"
        >
          <div className="px-4 pb-3 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">Reporte mensual</p>
            <div className="mt-2 flex items-center justify-between rounded-[12px] border border-[#E4E4E7] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#0F172A]">
              <button type="button" className={stepBtn} onClick={() => setMes((m) => moverMes(m, -1))} disabled={busy} aria-label="Mes anterior">
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span key={mes} className="cot-fade text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" aria-live="polite">
                {etiquetaMes(mes)}
              </span>
              <button type="button" className={stepBtn} onClick={() => setMes((m) => moverMes(m, 1))} disabled={busy || mes >= mesActual} aria-label="Mes siguiente">
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-[#52525B] dark:text-[#B7C1D1]">
              <li className="flex items-center gap-2">
                <Users className="size-3.5 shrink-0 text-[#1B5CFF] dark:text-[#7EA0FF]" aria-hidden />
                Resumen y avance por técnico
              </li>
              <li className="flex items-center gap-2">
                <ListChecks className="size-3.5 shrink-0 text-[#1B5CFF] dark:text-[#7EA0FF]" aria-hidden />
                Detalle de órdenes y proyectos
              </li>
              <li className="flex items-center gap-2">
                <History className="size-3.5 shrink-0 text-[#1B5CFF] dark:text-[#7EA0FF]" aria-hidden />
                Historial de reasignaciones
              </li>
            </ul>
            {error ? (
              <p role="alert" className="mt-3 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-medium text-[#9F1F1F] dark:bg-[#3F1518] dark:text-[#FCA5A5]">
                {error}
              </p>
            ) : null}
          </div>
          <div className="border-t border-[#F0F0F2] bg-[#FAFAFB] px-4 py-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
            <button
              type="button"
              onClick={() => void descargar()}
              disabled={busy}
              aria-busy={busy}
              className={`cot-press inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#17235B] px-4 text-[13.5px] font-semibold text-white hover:bg-[#1F2D73] disabled:cursor-wait disabled:opacity-80 dark:bg-[#2A3D8F] dark:hover:bg-[#3349A8] ${focusRing}`}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
              {busy ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
