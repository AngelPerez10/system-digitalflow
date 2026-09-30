/**
 * Modal «Notas» de un trabajo del tablero: la problemática (incidencias en
 * proyectos) y lo que escribió el técnico, completos. En proyectos la
 * bitácora se muestra como línea de tiempo por jornada, con el día de la
 * tarjeta resaltado.
 *
 * Hay una sola instancia en la página (la tarjeta solo avisa cuál abrir), así
 * que las tarjetas no cargan estado ni portales propios. Usa `AppModal` para
 * portal, foco atrapado, Escape y animación; la presentación es propia.
 */
import { useId, useMemo, type ReactNode } from "react";
import { AlertTriangle, CalendarDays, ClipboardList, Clock, FolderKanban, MessageSquareText, SquareArrowOutUpRight, X } from "lucide-react";
import { AppModal } from "@/components/ui/modal-kit/ModalKit";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import { bitacoraProyecto, infoOrden, infoProyecto } from "../shared/equipoInfo";
import { DIAS_LARGOS, diaSemana, parseYmd, type EquipoTarjeta } from "../shared/equipoSemana";
import { TIPO_TONE } from "../shared/equipoTokens";
import { EquipoAvatar } from "./EquipoUi";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fechaLarga(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_LARGOS[diaSemana(ymd)]} ${d.getDate()} ${MESES[d.getMonth()]}` : "";
}

const TONO = {
  issue: {
    title: "text-[#9A5B0B] dark:text-[#F2C27A]",
    tile: "bg-[#FFF4E0] text-[#9A5B0B] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A]",
    box: "border-[#F3E2C0] bg-[#FFFBF3] dark:border-[rgba(230,162,60,0.22)] dark:bg-[rgba(230,162,60,0.06)]",
  },
  tech: {
    title: "text-[#1244D1] dark:text-[#9BB6FF]",
    tile: "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#9BB6FF]",
    box: "border-[#DCE6FF] bg-[#F7F9FF] dark:border-[#2C3F7A]/70 dark:bg-[#1B2A63]/20",
  },
} as const;

function Seccion({ icon, title, tone, aside, children }: { icon: ReactNode; title: string; tone: keyof typeof TONO; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="eq-notas-sec min-w-0">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] [&_svg]:size-3.5 ${TONO[tone].tile}`} aria-hidden>
          {icon}
        </span>
        <h3 className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${TONO[tone].title}`}>{title}</h3>
        {aside ? <span className="ml-auto text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Texto({ tone, children }: { tone: keyof typeof TONO; children: string }) {
  return <p className={`whitespace-pre-line break-words rounded-[12px] border px-4 py-3.5 text-[14px] leading-[1.65] text-[#27272A] dark:text-[#E2E8F0] ${TONO[tone].box}`}>{children}</p>;
}

function Vacio({ children }: { children: string }) {
  return <p className="rounded-[12px] border border-dashed border-[#E4E4E7] px-4 py-3.5 text-[13px] text-[#A1A1AA] dark:border-[#273244] dark:text-[#64748B]">{children}</p>;
}

export function EquipoNotasModal({
  open,
  tarjeta: t,
  onClose,
  onOpen,
}: {
  open: boolean;
  /** Se conserva al cerrar para que el contenido no desaparezca durante la salida. */
  tarjeta: EquipoTarjeta | null;
  onClose: () => void;
  onOpen?: (t: EquipoTarjeta) => void;
}) {
  const titleId = useId();
  const d = useMemo(() => (t == null ? null : t.kind === "orden" ? infoOrden(t.orden, t.abierta) : infoProyecto(t.row, t.tecnico.id, t.fecha)), [t]);
  const bitacora = useMemo(() => (t?.kind === "proyecto" ? bitacoraProyecto(t.row) : []), [t]);

  return (
    <AppModal open={open && d != null} onClose={onClose} size="lg" dismissOnBackdrop labelledBy={titleId} className="flex max-h-[min(90dvh,48rem)] flex-col">
      {t && d ? (
        <>
          {/* Encabezado: tipo · folio · estado, cliente y datos de la visita. */}
          <header className="relative shrink-0 border-b border-[#EDEDF0] bg-[#FAFAFB] px-5 pb-4 pt-4 sm:px-6 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
            <span className={`absolute inset-x-0 top-0 h-[3px] ${TIPO_TONE[t.kind].bar}`} aria-hidden />
            <div className="flex items-center gap-2 pr-10">
              <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-semibold ring-1 ring-inset ${TIPO_TONE[t.kind].tile}`}>
                {t.kind === "orden" ? <ClipboardList className="size-3.5" aria-hidden /> : <FolderKanban className="size-3.5" aria-hidden />}
                {t.kind === "orden" ? "Orden" : "Proyecto"}
              </span>
              <span className="truncate font-mono text-[12.5px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{d.folio}</span>
              <span className={`ml-auto inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-semibold ring-1 ring-inset ${d.estadoPill}`}>
                <span className={`size-1.5 rounded-full ${d.estadoDot}`} aria-hidden />
                {d.estadoLabel}
              </span>
            </div>
            <h2 id={titleId} className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.35px] text-[#09090B] dark:text-[#F8FAFC]">
              {d.cliente}
            </h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[#52525B] dark:text-[#B7C1D1]">
              <span className="inline-flex min-w-0 items-center gap-2">
                <EquipoAvatar id={t.tecnico.id} nombre={t.tecnico.nombre} avatarUrl={t.tecnico.avatarUrl} size="sm" />
                <span className="truncate font-medium text-[#27272A] dark:text-[#E2E8F0]">{t.tecnico.nombre}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 capitalize">
                <CalendarDays className="size-3.5 text-[#A1A1AA] dark:text-[#64748B]" aria-hidden />
                {fechaLarga(t.fecha)}
              </span>
              {d.horario ? (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock className="size-3.5 text-[#A1A1AA] dark:text-[#64748B]" aria-hidden />
                  {d.horario}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className={`cot-press absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-[10px] text-[#71717A] hover:bg-[#EDEDF0] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.08] dark:hover:text-white ${focusRing}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <Seccion icon={<AlertTriangle />} title={d.detalleLabel} tone="issue">
              {d.detalle ? <Texto tone="issue">{d.detalle}</Texto> : <Vacio>{t.kind === "orden" ? "Sin problemática registrada." : "Sin incidencias registradas."}</Vacio>}
            </Seccion>

            {t.kind === "orden" ? (
              <Seccion icon={<MessageSquareText />} title="Comentario del técnico" tone="tech">
                {d.comentario ? <Texto tone="tech">{d.comentario}</Texto> : <Vacio>El técnico aún no ha dejado comentario.</Vacio>}
              </Seccion>
            ) : (
              <Seccion icon={<MessageSquareText />} title="Bitácora del técnico" tone="tech" aside={bitacora.length > 0 ? `${bitacora.length} ${bitacora.length === 1 ? "nota" : "notas"}` : undefined}>
                {bitacora.length === 0 ? (
                  <Vacio>Aún no hay notas en la bitácora.</Vacio>
                ) : (
                  /* Línea de tiempo: un punto por jornada; el día de la tarjeta, en azul. */
                  <ol className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[#E4E4E7] dark:before:bg-[#273244]">
                    {bitacora.map((x) => {
                      const esta = x.fecha === t.fecha;
                      return (
                        <li key={x.n} className="relative">
                          <span
                            className={`absolute -left-6 top-1 size-[15px] rounded-full border-[3px] ${
                              esta ? "border-[#DCE6FF] bg-[#1B5CFF] dark:border-[#1B2A63] dark:bg-[#4B7CFF]" : "border-white bg-[#D4D4DB] dark:border-[#111827] dark:bg-[#3A4661]"
                            }`}
                            aria-hidden
                          />
                          <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
                            <span className="font-semibold text-[#27272A] dark:text-[#E2E8F0]">Día {x.n}</span>
                            {x.fecha ? <span className="capitalize text-[#71717A] dark:text-[#8EA0B8]">{fechaLarga(x.fecha)}</span> : null}
                            {esta ? <span className="rounded-full bg-[#EEF3FF] px-2 py-px text-[10.5px] font-semibold text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]">Este día</span> : null}
                          </p>
                          {esta ? (
                            <Texto tone="tech">{x.nota}</Texto>
                          ) : (
                            <p className="whitespace-pre-line break-words text-[13.5px] leading-[1.6] text-[#3F3F46] dark:text-[#D6DEEA]">{x.nota}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Seccion>
            )}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#EDEDF0] bg-[#FAFAFB] px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
            <button type="button" onClick={onClose} className={appModalBtn.secondary}>
              Cerrar
            </button>
            {onOpen ? (
              <button type="button" onClick={() => onOpen(t)} className={appModalBtn.primary}>
                <SquareArrowOutUpRight aria-hidden />
                Abrir {t.kind === "orden" ? "orden" : "proyecto"}
              </button>
            ) : null}
          </footer>
        </>
      ) : null}
    </AppModal>
  );
}
