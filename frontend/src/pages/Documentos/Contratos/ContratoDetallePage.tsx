/**
 * Detalle de un contrato — espacio de trabajo del documento.
 *
 * Izquierda: «mesa» con la hoja del contrato (PDF). Derecha: panel fijo con
 * pestañas (Firma · Detalles · Actividad · Seguridad). En «Firma», la ruta
 * vertical Prestador → Cliente → Sellado concentra las acciones del flujo.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Fingerprint,
  History,
  Info,
  Link2,
  Link2Off,
  Loader2,
  MailCheck,
  Pencil,
  PenLine,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import EnviarEnlaceModal from "./firma/EnviarEnlaceModal";
import FirmarPrestadorModal from "./firma/FirmarPrestadorModal";
import {
  cancelarContrato,
  fetchContratoDocumento,
  getContrato,
  listEventos,
  revocarEnlace,
  type Contrato,
  type ContratoEvento,
} from "./shared/contratoApi";
import { formatoDinero, formatoFecha, relativo } from "./shared/contratoFormato";
import { btn, btnSm, cardShell, focusRing, heroBand, heroBtn, heroBtnPrimary, heroDots, heroGlowGold, iconBtn, pageWrap, sansStyle } from "./shared/contratoTokens";
import { EstadoPill } from "./shared/ContratoUi";
import DocumentoViewer from "./shared/DocumentoViewer";
import { descargarBlob } from "./shared/descargarBlob";

type Tab = "firma" | "detalles" | "actividad" | "seguridad";
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "firma", label: "Firma", icon: <PenLine className="size-4" /> },
  { id: "detalles", label: "Detalles", icon: <Info className="size-4" /> },
  { id: "actividad", label: "Actividad", icon: <History className="size-4" /> },
  { id: "seguridad", label: "Seguridad", icon: <Fingerprint className="size-4" /> },
];

const EVENTO_TONO: Record<string, string> = {
  firmado_cliente: "bg-[#0E8A5F]",
  firmado_prestador: "bg-[#0E8A5F]",
  sellado: "bg-[#E6A23C]",
  otp_fallido: "bg-[#C22B2B]",
  otp_bloqueado: "bg-[#C22B2B]",
  revocado: "bg-[#C22B2B]",
  cancelado: "bg-[#C22B2B]",
  otp_verificado: "bg-[#1B5CFF]",
  enviado: "bg-[#1B5CFF]",
};

/* ------------------------------------------------------------------ piezas */

/** Pestañas con indicador que se desliza bajo la activa. */
function Pestanas({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value]);
  return (
    <div role="tablist" aria-label="Secciones del contrato" className="relative flex border-b border-[#F0F0F2] px-2 dark:border-[#1F2A3C]">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          role="tab"
          type="button"
          id={`tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            const next = TABS[(i + d + TABS.length) % TABS.length].id;
            onChange(next);
            refs.current[next]?.focus();
          }}
          className={cn(
            "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 text-[13px] font-medium transition-colors",
            focusRing,
            value === t.id ? "text-[#1244D1] dark:text-[#9BB6FF]" : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white",
          )}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
      <span
        className="absolute bottom-[-1px] left-0 h-0.5 rounded-full bg-[#1B5CFF] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#4B7CFF]"
        style={{ width: ind.w, transform: `translateX(${ind.x}px)` }}
        aria-hidden
      />
    </div>
  );
}

function Nodo({
  hecho,
  activo,
  icon,
  titulo,
  sub,
  children,
  ultimo,
  i,
}: {
  hecho: boolean;
  activo?: boolean;
  icon: ReactNode;
  titulo: string;
  sub: ReactNode;
  children?: ReactNode;
  ultimo?: boolean;
  i: number;
}) {
  return (
    <li className="cot-rise relative pb-6 pl-12 last:pb-0" style={{ "--cot-i": i } as CSSProperties}>
      {!ultimo && (
        <span className="absolute bottom-0 left-[17px] top-9 w-0.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden>
          <span
            className="block h-full w-full bg-[#04724D] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#22A06B]"
            style={{ transform: `scaleY(${hecho ? 1 : 0})`, transformOrigin: "top" }}
          />
        </span>
      )}
      <span
        className={cn(
          "absolute left-0 top-0 inline-flex size-9 items-center justify-center rounded-full ring-4 ring-white transition-colors duration-500 dark:ring-[#111827] [&_svg]:size-4",
          hecho
            ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
            : activo
              ? "bg-[#EEF3FF] text-[#1B5CFF] ring-[#EEF3FF]/0 dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
              : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#64748B]",
        )}
      >
        {hecho ? <Check className="cot-tick" strokeWidth={3} /> : icon}
      </span>
      <p className="pt-1 text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{titulo}</p>
      <div className="text-[12.5px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{sub}</div>
      {children ? <div className="mt-3">{children}</div> : null}
    </li>
  );
}

function FirmaImagen({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex h-[84px] items-center justify-center rounded-[12px] border border-[#E4E4E7] bg-white dark:border-[#273244]">
      <img src={src} alt={alt} className="cot-fade max-h-[72px] max-w-[88%] object-contain" />
    </div>
  );
}

/* ------------------------------------------------------------------ página */

export default function ContratoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, permissions } = useAuth();
  const puedeEditar = isAdmin || permissions?.contratos?.edit === true;

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [eventos, setEventos] = useState<ContratoEvento[]>([]);
  const [doc, setDoc] = useState<Blob | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("firma");
  const [toast, setToast] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(
    (location.state as { guardado?: boolean } | null)?.guardado
      ? { variant: "success", title: "Contrato guardado", message: "Revisa el documento y continúa con la firma." }
      : null,
  );
  const [modal, setModal] = useState<"enlace" | "firmar" | "revocar" | "cancelar" | null>(null);
  const [copiado, setCopiado] = useState("");

  const cargarDocumento = useCallback(async (cid: number) => {
    setDocLoading(true);
    setDocError("");
    try {
      setDoc(await fetchContratoDocumento(cid));
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "No se pudo generar el documento.");
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    getContrato(id)
      .then((c) => {
        if (!vivo) return;
        setContrato(c);
        void listEventos(c.id).then((ev) => vivo && setEventos(ev)).catch(() => undefined);
        void cargarDocumento(c.id);
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : "No se pudo cargar el contrato."));
    return () => {
      vivo = false;
    };
  }, [id, cargarDocumento]);

  const actualizado = (c: Contrato, title?: string, message = "") => {
    setContrato((prev) => ({
      ...c,
      firma_prestador: c.firma_prestador || prev?.firma_prestador || "",
      firma_cliente: c.firma_cliente || prev?.firma_cliente || "",
    }));
    if (title) setToast({ variant: "success", title, message });
    void listEventos(c.id).then(setEventos).catch(() => undefined);
    void cargarDocumento(c.id);
  };

  if (error) {
    return (
      <div className={pageWrap} style={sansStyle}>
        <div className={cn(cardShell, "cot-fade flex flex-col items-center px-6 py-16 text-center")}>
          <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#C22B2B]">
            <ShieldAlert className="size-6" aria-hidden />
          </span>
          <p className="text-[16px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{error}</p>
          <Link to="/contratos" className={cn(btn.secondary, "mt-5")}>
            Volver a contratos
          </Link>
        </div>
      </div>
    );
  }
  if (!contrato) {
    return (
      <div className="grid min-h-[60vh] place-items-center" style={sansStyle}>
        <Loader2 className="size-6 animate-spin text-[#1B5CFF]" aria-label="Cargando" />
      </div>
    );
  }

  const c = contrato;
  const cerrado = c.estado === "completado" || c.estado === "cancelado";
  const completado = c.estado === "completado";
  const enlace = c.enlace_activo;

  const copiar = async (valor: string, cual: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(cual);
      window.setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* sin permiso de portapapeles */
    }
  };

  const abrirPestana = () => {
    if (!doc) return;
    const url = URL.createObjectURL(doc);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const filaDetalle = (k: string, v: ReactNode, mono = false) => (
    <div key={k} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5 text-[13px]">
      <dt className="text-[#71717A] dark:text-[#8EA0B8]">{k}</dt>
      <dd className={cn("break-words text-[#09090B] dark:text-[#F8FAFC]", mono && "font-mono text-[12px]")}>{v || "—"}</dd>
    </div>
  );

  /* --------------------------------------------------------- paneles */

  const panelFirma = (
    <ol className="p-5">
      <Nodo
        i={0}
        hecho={Boolean(c.firmado_prestador_at)}
        activo={!c.firmado_prestador_at}
        icon={<Stamp />}
        titulo="El prestador"
        sub={
          c.firmado_prestador_at ? (
            <>
              {c.firmado_prestador_nombre} · {formatoFecha(c.firmado_prestador_at, true)}
            </>
          ) : (
            "Se aplica la firma registrada de un usuario del sistema."
          )
        }
      >
        {c.firma_prestador ? (
          <FirmaImagen src={c.firma_prestador} alt={`Firma de ${c.firmado_prestador_nombre}`} />
        ) : puedeEditar && !cerrado ? (
          <button type="button" className={cn(btn.primary, btnSm, "w-full")} onClick={() => setModal("firmar")}>
            <PenLine aria-hidden /> Aplicar firma registrada
          </button>
        ) : null}
      </Nodo>

      <Nodo
        i={1}
        hecho={Boolean(c.firmado_cliente_at)}
        activo={!c.firmado_cliente_at}
        icon={<MailCheck />}
        titulo="El cliente"
        sub={
          c.firmado_cliente_at ? (
            <>
              {c.firma_cliente_nombre} · {formatoFecha(c.firmado_cliente_at, true)}
              <br />
              Identidad verificada en {c.firmado_cliente_correo}
            </>
          ) : enlace ? (
            <>
              Enlace enviado a <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{enlace.correo_destino}</span> · vence{" "}
              {relativo(enlace.expira_at)}
              <br />
              <span className={enlace.bloqueado ? "text-[#C22B2B]" : enlace.verificado ? "text-[#04724D]" : "text-[#8A5D0F]"}>
                {enlace.bloqueado ? "Bloqueado por intentos fallidos" : enlace.verificado ? "Identidad verificada, falta firmar" : "Aún no verifica su identidad"}
              </span>
            </>
          ) : (
            <>Recibirá un enlace único y un código en {c.cliente_correo || "su correo"}.</>
          )
        }
      >
        {c.firma_cliente ? (
          <FirmaImagen src={c.firma_cliente} alt={`Firma de ${c.firma_cliente_nombre}`} />
        ) : puedeEditar && !cerrado ? (
          <div className="flex gap-2">
            <button type="button" className={cn(enlace ? btn.secondary : btn.primary, btnSm, "flex-1")} onClick={() => setModal("enlace")}>
              <Link2 aria-hidden /> {enlace ? "Nuevo enlace" : "Enviar a firma"}
            </button>
            {enlace && (
              <button type="button" className={cn(btn.ghost, btnSm)} onClick={() => setModal("revocar")}>
                <Link2Off aria-hidden /> Revocar
              </button>
            )}
          </div>
        ) : null}
      </Nodo>

      <Nodo
        i={2}
        ultimo
        hecho={completado}
        icon={<ShieldCheck />}
        titulo="Documento sellado"
        sub={completado ? `PDF final con constancia · ${formatoFecha(c.sellado_at, true)}` : "Se genera solo al firmar ambas partes y se envía al cliente."}
      >
        {completado && doc ? (
          <button type="button" className={cn(btn.secondary, btnSm, "w-full")} onClick={() => descargarBlob(doc, `Contrato_${c.folio}.pdf`)}>
            <Download aria-hidden /> Descargar PDF sellado
          </button>
        ) : null}
      </Nodo>
    </ol>
  );

  const panelDetalles = (
    <div className="px-5 py-3">
      <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Cliente</p>
      <dl className="divide-y divide-[#F4F4F5] dark:divide-[#1F2A3C]">
        {filaDetalle(c.cliente_tipo_persona === "fisica" ? "Nombre" : "Razón social", c.cliente_razon_social)}
        {filaDetalle("RFC", c.cliente_rfc, true)}
        {c.cliente_tipo_persona !== "fisica" && filaDetalle("Representante", c.cliente_representante)}
        {filaDetalle("Correo", c.cliente_correo)}
        {filaDetalle("Domicilio fiscal", c.cliente_domicilio_fiscal)}
      </dl>
      <p className="pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Servicio</p>
      <dl className="divide-y divide-[#F4F4F5] dark:divide-[#1F2A3C]">
        {filaDetalle("Plan", `${c.plan_mbps} Mbps simétricos`)}
        {filaDetalle("Mensualidad", `${formatoDinero(c.precio_mensual)} + IVA`)}
        {filaDetalle("Vigencia", `${c.vigencia_meses} meses`)}
        {filaDetalle("Instalación", c.domicilio_instalacion)}
        {filaDetalle("Firma", `${c.ciudad_firma}, ${formatoFecha(c.fecha_firma)}`)}
      </dl>
      <p className="pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Prestador</p>
      <dl className="divide-y divide-[#F4F4F5] pb-2 dark:divide-[#1F2A3C]">
        {filaDetalle("Razón social", c.prestador_datos?.razon_social)}
        {filaDetalle("Representante", c.prestador_datos?.representante)}
        {filaDetalle("Correo oficial", c.prestador_datos?.correo)}
      </dl>
    </div>
  );

  const panelActividad =
    eventos.length === 0 ? (
      <p className="p-5 text-[13px] text-[#71717A]">Sin actividad.</p>
    ) : (
      <ol className="relative max-h-[60vh] space-y-4 overflow-y-auto p-5 before:absolute before:bottom-6 before:left-[25px] before:top-6 before:w-px before:bg-[#E4E4E7] dark:before:bg-[#273244]">
        {[...eventos].reverse().map((e, i) => (
          <li key={e.id} className="cot-rise relative pl-7" style={{ "--cot-i": Math.min(i, 10) } as CSSProperties}>
            <span className={cn("absolute left-0 top-1.5 size-[11px] rounded-full ring-[3px] ring-white dark:ring-[#111827]", EVENTO_TONO[e.tipo] ?? "bg-[#A1A1AA]")} aria-hidden />
            <p className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{e.tipo_display}</p>
            <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]" title={formatoFecha(e.created_at, true)}>
              {relativo(e.created_at)}
              {e.usuario_nombre ? ` · ${e.usuario_nombre}` : ""}
              {e.ip ? <span className="font-mono"> · {e.ip}</span> : null}
            </p>
          </li>
        ))}
      </ol>
    );

  const hashBloque = (titulo: string, valor: string, cual: string) => (
    <div className="rounded-[14px] border border-[#E7E7EA] p-3.5 dark:border-[#273244]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{titulo}</p>
        <button type="button" className={cn(iconBtn, "size-8!")} onClick={() => void copiar(valor, cual)} aria-label={`Copiar ${titulo}`}>
          {copiado === cual ? <Check className="cot-tick text-[#04724D]" aria-hidden /> : <Copy aria-hidden />}
        </button>
      </div>
      <p className="mt-1.5 break-all font-mono text-[11.5px] leading-relaxed text-[#3F3F46] dark:text-[#D6DEEA]">{valor}</p>
    </div>
  );

  const panelSeguridad = (
    <div className="space-y-3 p-5">
      {c.documento_sha256 ? hashBloque("Huella del contenido (SHA-256)", c.documento_sha256, "doc") : null}
      {c.pdf_sellado_sha256 ? hashBloque("Huella del PDF sellado (SHA-256)", c.pdf_sellado_sha256, "pdf") : null}
      {!c.documento_sha256 && (
        <p className="rounded-[12px] bg-[#FAFAFA] p-3.5 text-[13px] text-[#52525B] dark:bg-[#0F172A] dark:text-[#B7C1D1]">
          La huella se fija al enviar el contrato a firma o al aplicar la primera firma.
        </p>
      )}
      <ul className="space-y-2 text-[12.5px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
        {[
          "El enlace del cliente es único, vence en 7 días y sirve para una sola firma.",
          "El cliente confirma su identidad con un código de 6 dígitos enviado a su correo.",
          "Editar el contenido descarta las firmas y revoca el enlace.",
          "El PDF sellado incluye la constancia con IP, fecha y huellas.",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#04724D]" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );

  const paneles: Record<Tab, ReactNode> = { firma: panelFirma, detalles: panelDetalles, actividad: panelActividad, seguridad: panelSeguridad };

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
      <div className={pageWrap}>
        <PageMeta title={`${c.folio} · Contratos | Sistema Grupo Intrax GPS`} description="Contrato de Internet Dedicado" />
        {toast && <Alert variant={toast.variant} title={toast.title} message={toast.message} showLink={false} onClose={() => setToast(null)} />}

        {/* ============================ Encabezado compacto ============================ */}
        <header className={cn("cot-rise rounded-[24px]", heroBand)} style={{ "--cot-i": 0 } as CSSProperties}>
          <div className={heroGlowGold} aria-hidden />
          <div className={heroDots} aria-hidden />
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                to="/contratos"
                className="cot-press mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Volver a contratos"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/60">
                  <span>Contratos</span>
                  <ChevronRight className="size-3 text-white/30" aria-hidden />
                  <span className="font-mono font-semibold text-white/85">{c.folio}</span>
                  <EstadoPill estado={c.estado} className="bg-white/10! text-white! ring-white/20!" />
                </div>
                <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.6px] text-white [text-wrap:balance] sm:text-[26px]">
                  {c.cliente_razon_social}
                </h1>
                <p className="mt-0.5 text-[13.5px] text-white/65">
                  Internet Dedicado {c.plan_mbps} Mbps · {formatoDinero(c.precio_mensual)} + IVA / mes · {c.vigencia_meses} meses
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {puedeEditar && !cerrado && (
                <button type="button" className={heroBtn} onClick={() => navigate(`/contratos/${c.id}/editar`)}>
                  <Pencil aria-hidden /> Editar
                </button>
              )}
              {doc && (
                <button type="button" className={heroBtn} onClick={() => descargarBlob(doc, `Contrato_${c.folio}.pdf`)}>
                  <Download aria-hidden /> Descargar
                </button>
              )}
              {puedeEditar && !cerrado && !c.firmado_prestador_at ? (
                <button type="button" className={heroBtnPrimary} onClick={() => setModal("firmar")}>
                  <PenLine aria-hidden /> Firmar como prestador
                </button>
              ) : puedeEditar && !cerrado && !c.firmado_cliente_at ? (
                <button type="button" className={heroBtnPrimary} onClick={() => setModal("enlace")}>
                  <Link2 aria-hidden /> {enlace ? "Nuevo enlace" : "Enviar al cliente"}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {completado && (
          <div className="cot-rise flex items-center gap-4 rounded-[20px] border border-[#BFE6D4] bg-[#E9F8F0] p-4 dark:border-[#1E5A42] dark:bg-[#0F2A1C] sm:p-5" style={{ "--cot-i": 1 } as CSSProperties} role="status">
            <svg viewBox="0 0 48 48" className="size-11 shrink-0" aria-hidden>
              <circle cx="24" cy="24" r="21" fill="none" stroke="#04724D" strokeWidth="3" pathLength={1} className="cot-draw" />
              <path d="M15 24.5l6 6 12-13" fill="none" stroke="#04724D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="cot-draw" style={{ "--cot-i": 4 } as CSSProperties} />
            </svg>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#04724D] dark:text-[#4ADE80]">Contrato firmado y sellado</p>
              <p className="text-[13px] text-[#04724D]/80 dark:text-[#86EFAC]/80">
                Ambas partes firmaron. El PDF final incluye rúbricas en cada hoja y la constancia de firma electrónica.
              </p>
            </div>
          </div>
        )}

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ============================ Mesa con la hoja ============================ */}
          <section className="cot-rise min-w-0 overflow-hidden rounded-[24px] bg-[#E9EBF0] dark:bg-[#0B1220]" style={{ "--cot-i": 2 } as CSSProperties} aria-label="Documento">
            <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 text-[#52525B] dark:text-[#8EA0B8]" aria-hidden />
                <span className="truncate text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Contrato_{c.folio}.pdf</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    completado ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]" : "bg-white text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C]",
                  )}
                >
                  {completado ? "Sellado" : "Borrador"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className={iconBtn} onClick={abrirPestana} disabled={!doc} aria-label="Abrir en otra pestaña" title="Abrir en otra pestaña">
                  <ExternalLink aria-hidden />
                </button>
                <button type="button" className={iconBtn} onClick={() => void cargarDocumento(c.id)} disabled={docLoading} aria-label="Actualizar documento" title="Actualizar">
                  <RefreshCw className={cn(docLoading && "animate-spin")} aria-hidden />
                </button>
              </div>
            </div>
            <div className="px-3 pb-3 sm:px-5 sm:pb-5">
              <div className="relative h-[calc(100dvh-16rem)] min-h-[520px] overflow-hidden rounded-[6px] bg-white shadow-[0_24px_48px_-24px_rgba(9,9,11,0.45)] ring-1 ring-black/5">
                {docLoading && (
                  <div className="cot-fade absolute inset-0 z-10 grid place-items-center bg-white/85 backdrop-blur-[2px]">
                    <div className="flex w-60 flex-col items-center gap-3" aria-live="polite">
                      <div className="w-full space-y-2" aria-hidden>
                        {[100, 86, 94, 60].map((w, i) => (
                          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-[#ECECEC]">
                            <div className="cot-write h-full rounded-full bg-[#17235B]/50" style={{ "--cot-i": i, width: `${w}%` } as CSSProperties} />
                          </div>
                        ))}
                      </div>
                      <span className="text-[13px] text-[#6E6E77] [font-family:Calibri,Carlito,'Segoe_UI',Arial,sans-serif] italic">Preparando el documento…</span>
                    </div>
                  </div>
                )}
                {docError ? (
                  <div className="cot-fade m-5 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] p-4 text-[14px] text-[#B42323]">{docError}</div>
                ) : (
                  <DocumentoViewer blob={doc} title={`Contrato ${c.folio}`} className="absolute inset-0" />
                )}
              </div>
            </div>
          </section>

          {/* ============================ Panel ============================ */}
          <aside className={cn(cardShell, "cot-rise min-w-0 overflow-hidden lg:sticky lg:top-24")} style={{ "--cot-i": 3 } as CSSProperties}>
            <Pestanas value={tab} onChange={setTab} />
            <div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="cot-fade">
              {paneles[tab]}
            </div>
            {puedeEditar && !cerrado && (
              <div className="border-t border-[#F0F0F2] px-5 py-3 dark:border-[#1F2A3C]">
                <button type="button" className={cn(btn.ghost, btnSm, "w-full text-[#C22B2B]! hover:bg-[#FEF2F2]!")} onClick={() => setModal("cancelar")}>
                  <Ban aria-hidden /> Cancelar contrato
                </button>
              </div>
            )}
            {!cerrado && !c.firmado_prestador_at && !c.firmado_cliente_at && (
              <p className="flex items-center gap-2 border-t border-[#F0F0F2] px-5 py-3 text-[12px] text-[#71717A] dark:border-[#1F2A3C] dark:text-[#8EA0B8]">
                <Clock3 className="size-3.5" aria-hidden /> Actualizado {relativo(c.updated_at)}
              </p>
            )}
          </aside>
        </div>
      </div>

      {modal === "enlace" && <EnviarEnlaceModal contrato={c} open onClose={() => setModal(null)} onGenerado={(nc) => actualizado(nc)} />}
      {modal === "firmar" && (
        <FirmarPrestadorModal
          contrato={c}
          open
          onClose={() => setModal(null)}
          onFirmado={(nc) =>
            actualizado(
              nc,
              nc.estado === "completado" ? "Contrato sellado" : "Firma del prestador aplicada",
              nc.estado === "completado" ? "Ambas partes firmaron; se generó el PDF final." : "Ahora envía el enlace al cliente.",
            )
          }
        />
      )}
      <AppConfirmDialog
        open={modal === "revocar"}
        onClose={() => setModal(null)}
        tone="warning"
        icon={<Link2Off className="size-5" />}
        title="¿Revocar el enlace de firma?"
        description="El cliente ya no podrá abrirlo. Podrás generar uno nuevo cuando quieras."
        confirmLabel="Revocar"
        busyLabel="Revocando…"
        onConfirm={async () => {
          try {
            actualizado(await revocarEnlace(c.id), "Enlace revocado");
          } catch (e) {
            setToast({ variant: "error", title: "No se pudo revocar", message: e instanceof Error ? e.message : "" });
          }
        }}
      />
      <AppConfirmDialog
        open={modal === "cancelar"}
        onClose={() => setModal(null)}
        icon={<Ban className="size-5" />}
        title="¿Cancelar el contrato?"
        description="Se revoca el enlace de firma y el contrato queda cerrado. No se puede deshacer."
        confirmLabel="Cancelar contrato"
        busyLabel="Cancelando…"
        cancelLabel="Volver"
        onConfirm={async () => {
          try {
            actualizado(await cancelarContrato(c.id), "Contrato cancelado");
          } catch (e) {
            setToast({ variant: "error", title: "No se pudo cancelar", message: e instanceof Error ? e.message : "" });
          }
        }}
      />
    </div>
  );
}
