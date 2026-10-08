/**
 * Página pública donde EL CLIENTE firma su contrato (sin cuenta en el sistema).
 *
 * Flujo: bienvenida → código por correo → leer contrato → firmar → listo.
 * Antes de validar el código no se muestra ningún dato del contrato.
 *
 * Mismo lenguaje visual que el sistema (banda marina, dorado, azul de acción,
 * Geist) y transiciones `cot-*`: los pasos entran deslizándose en la dirección
 * en que se avanza; todo se apaga con `prefers-reduced-motion`.
 */
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Mail,
  PenLine,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { cn } from "@/lib/utils";
import { btn, cardShell, heroDots, heroGlowBlue, heroGlowGold, input as inputClass, sansStyle } from "../shared/contratoTokens";
import DocumentoViewer from "../shared/DocumentoViewer";
import { descargarBlob } from "../shared/descargarBlob";
import {
  descargarPdfFinal,
  enviarCodigo,
  FirmaApiError,
  firmar,
  obtenerDocumento,
  obtenerEstado,
  olvidarToken,
  tomarTokenDeUrl,
  verificarCodigo,
  type EstadoFirma,
} from "./firmaPublicaApi";

type Paso = "cargando" | "invalido" | "inicio" | "codigo" | "revisar" | "firmar" | "listo";

const ORDEN: Paso[] = ["inicio", "codigo", "revisar", "firmar", "listo"];
const PASOS_VISIBLES: { key: Paso; label: string; desc: string }[] = [
  { key: "codigo", label: "Verificar identidad", desc: "Código de 6 dígitos por correo" },
  { key: "revisar", label: "Revisar contrato", desc: "Lee el documento completo" },
  { key: "firmar", label: "Firmar", desc: "Tu nombre y tu firma" },
  { key: "listo", label: "Listo", desc: "Contrato sellado" },
];

/* ------------------------------------------------------------------ piezas */

function Mensaje({ tono, children }: { tono: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tono === "error" ? "alert" : "status"}
      className={cn(
        "cot-fade rounded-[12px] px-4 py-3 text-[14px] ring-1 ring-inset",
        tono === "error"
          ? "bg-[#FEF2F2] text-[#B42323] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]"
          : "bg-[#EEF3FF] text-[#1244D1] ring-[#D7E3FF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF] dark:ring-[#2C3F7A]",
      )}
    >
      {children}
    </p>
  );
}

/** Seis casillas para el código; acepta pegar el código completo. */
function CodigoInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  invalid: boolean;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setAt = (i: number, d: string) => {
    const base = value.padEnd(i, " ");
    const next = (base.slice(0, i) + d + base.slice(i + 1)).replace(/\D/g, "").slice(0, 6);
    onChange(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.length === 6) onComplete(next);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      onChange(value.slice(0, i - 1));
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pegado) return;
    e.preventDefault();
    onChange(pegado);
    refs.current[Math.min(pegado.length, 5)]?.focus();
    if (pegado.length === 6) onComplete(pegado);
  };

  return (
    <div className={cn("flex gap-2 sm:gap-2.5", invalid && "cot-shake")} role="group" aria-label="Código de verificación de 6 dígitos">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => onKey(e, i)}
          onPaste={onPaste}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={i === 0}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-14 w-full min-w-0 max-w-[3.25rem] rounded-[12px] border bg-white text-center font-mono text-[24px] font-semibold text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 sm:h-16 sm:text-[28px]",
            "focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.14)] dark:bg-[#0F172A] dark:text-[#F8FAFC]",
            d ? "border-[#1B5CFF]/50 dark:border-[#4B7CFF]/60" : "border-[#E4E4E7] dark:border-[#273244]",
            invalid && "border-[#E8A5A5]! focus:ring-[rgba(194,43,43,0.14)]!",
          )}
        />
      ))}
    </div>
  );
}

function ExitoCheck() {
  return (
    <span className="cot-pop-in mx-auto grid size-20 place-items-center rounded-full bg-[#E9F8F0] dark:bg-[#0F2A1C]">
      <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
        <circle cx="24" cy="24" r="20" fill="none" stroke="#04724D" strokeWidth="2.5" pathLength={1} className="cot-draw" />
        <path
          d="M15 24.5l6 6 12-13"
          fill="none"
          stroke="#04724D"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="cot-draw"
          style={{ "--cot-i": 4 } as CSSProperties}
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ página */

export default function FirmaContratoPublicaPage() {
  const [token] = useState(() => tomarTokenDeUrl());
  const sesionRef = useRef("");
  const [paso, setPasoRaw] = useState<Paso>("cargando");
  const [direccion, setDireccion] = useState<"next" | "back">("next");
  const [estado, setEstado] = useState<EstadoFirma | null>(null);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [espera, setEspera] = useState(0);
  const [doc, setDoc] = useState<{ blob: Blob; sha256: string } | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [firma, setFirma] = useState("");
  const [completado, setCompletado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const setPaso = useCallback((next: Paso) => {
    setPasoRaw((prev) => {
      setDireccion(ORDEN.indexOf(next) >= ORDEN.indexOf(prev) ? "next" : "back");
      return next;
    });
  }, []);

  // Al cambiar de paso, el foco va al título (lectores de pantalla y teclado).
  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [paso]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  const mostrarError = (msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  };

  const fallo = useCallback(
    (e: unknown) => {
      if (e instanceof FirmaApiError) {
        if (e.status === 404 || e.status === 410 || e.status === 423) {
          olvidarToken();
          setError(e.message);
          setPaso("invalido");
          return;
        }
        if (e.status === 401) {
          sesionRef.current = "";
          setDoc(null);
          setCodigo("");
          setAviso("");
          setError(e.message);
          setPaso("codigo");
          return;
        }
        if (typeof e.data.reenviar_en === "number") setEspera(e.data.reenviar_en);
        setError(e.message);
        setErrorKey((k) => k + 1);
        return;
      }
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    },
    [setPaso],
  );

  useEffect(() => {
    if (!token) {
      setError("Este enlace no es válido. Ábrelo de nuevo desde el correo que recibiste.");
      setPaso("invalido");
      return;
    }
    obtenerEstado(token)
      .then((s) => {
        setEstado(s);
        setEspera(s.reenviar_en);
        if (s.bloqueado) {
          setError("Por seguridad, este enlace se bloqueó tras varios intentos fallidos. Solicita uno nuevo.");
          setPaso("invalido");
        } else {
          setPaso(s.codigo_vigente ? "codigo" : "inicio");
        }
      })
      .catch(fallo);
  }, [token, fallo, setPaso]);

  const pedirCodigo = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await enviarCodigo(token);
      setEspera(r.reenviar_en);
      setCodigo("");
      setAviso(`Enviamos un código a ${r.correo}. Vence en 10 minutos.`);
      setPaso("codigo");
    } catch (e) {
      fallo(e);
    } finally {
      setBusy(false);
    }
  };

  const validarCodigo = async (valor = codigo) => {
    if (!/^\d{6}$/.test(valor)) {
      mostrarError("Escribe los 6 dígitos del código.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await verificarCodigo(token, valor);
      sesionRef.current = r.sesion;
      setAviso("");
      setPaso("revisar");
      setDoc(await obtenerDocumento(token, r.sesion));
    } catch (e) {
      if (e instanceof FirmaApiError && typeof e.data.intentos_restantes === "number") {
        mostrarError(`${e.message} Te quedan ${e.data.intentos_restantes} intento(s).`);
        setCodigo("");
      } else {
        fallo(e);
      }
    } finally {
      setBusy(false);
    }
  };

  const enviarFirma = async () => {
    if (!doc) return;
    setBusy(true);
    setError("");
    try {
      const r = await firmar(token, sesionRef.current, { firma, nombre: nombre.trim(), acepta, documento_sha256: doc.sha256 });
      setCompletado(r.completado);
      olvidarToken();
      setPaso("listo");
    } catch (e) {
      fallo(e);
    } finally {
      setBusy(false);
    }
  };

  const bajarFinal = async () => {
    setBusy(true);
    setError("");
    try {
      descargarBlob(await descargarPdfFinal(token, sesionRef.current), `Contrato_${estado?.folio || "firmado"}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar.");
    } finally {
      setBusy(false);
    }
  };

  const abrirDocumento = () => {
    if (!doc) return;
    const url = URL.createObjectURL(doc.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const puedeFirmar = acepta && nombre.trim().split(/\s+/).length >= 2 && Boolean(firma) && !busy;
  const titulo =
    "text-[26px] font-semibold leading-tight tracking-[-0.8px] text-[#09090B] outline-none sm:text-[30px] dark:text-[#F8FAFC]";
  const tarjeta = cn(cardShell, "p-6 shadow-[0_12px_32px_-18px_rgba(9,9,11,0.22)] sm:p-9");
  const anim = direccion === "next" ? "cot-step-next" : "cot-step-back";
  const idxVisible = PASOS_VISIBLES.findIndex((p) => p.key === paso);
  const conProgreso = idxVisible >= 0;

  return (
    <div className="min-h-dvh bg-[#F7F8FA] dark:bg-[#0B1220]" style={sansStyle}>
      <PageMeta title="Firma de contrato" description="Firma electrónica segura de contrato" />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />

      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        {/* ============================ Panel lateral (escritorio) / banda (celular) ============================ */}
        <aside className="cot-sheen relative overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63] lg:sticky lg:top-0 lg:h-dvh">
          <div className={heroDots} aria-hidden />
          <div className={heroGlowGold} aria-hidden />
          <div className={heroGlowBlue} aria-hidden />
          <div className="relative flex h-full flex-col px-5 pb-6 pt-5 sm:px-8 lg:px-9 lg:py-9">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/25">
                  <FileText className="size-4" aria-hidden />
                </span>
                <span className="truncate text-[15px] font-semibold tracking-[-0.2px]">{estado?.marca || "Firma de contrato"}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85 ring-1 ring-inset ring-white/15">
                <Lock className="size-3.5" aria-hidden /> Firma segura
              </span>
            </div>

            <div className="mt-6 lg:mt-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {estado ? `Contrato ${estado.folio}` : "Firma electrónica"}
              </p>
              <p className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.7px] lg:text-[30px]">Internet Dedicado</p>
              {estado ? <p className="mt-2 text-[14px] leading-relaxed text-white/65">Contrato de prestación de servicios con {estado.prestador}.</p> : null}
            </div>

            {conProgreso && (
              <div className="mt-5 lg:hidden">
                <div className="relative h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="cot-bar absolute inset-0 rounded-full bg-[#E6A23C]"
                    style={{ transform: `scaleX(${(idxVisible + 1) / PASOS_VISIBLES.length})` }}
                  />
                </div>
                <p className="mt-2 text-[12px] font-medium text-white/70">
                  Paso {idxVisible + 1} de {PASOS_VISIBLES.length} · {PASOS_VISIBLES[idxVisible]?.label}
                </p>
              </div>
            )}
            <ol className="mt-12 hidden space-y-1 lg:block" aria-label="Progreso de la firma">
              {PASOS_VISIBLES.map((p, idx) => {
                const hecho = conProgreso && idx < idxVisible;
                const actual = idx === idxVisible;
                return (
                  <li key={p.key} className="relative flex items-center gap-3.5 py-2.5" aria-current={actual ? "step" : undefined}>
                    {idx < PASOS_VISIBLES.length - 1 && (
                      <span className="absolute left-[15px] top-[42px] h-[calc(100%-26px)] w-0.5 overflow-hidden rounded-full bg-white/12" aria-hidden>
                        <span
                          className="block h-full w-full bg-[#E6A23C] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                          style={{ transform: `scaleY(${hecho ? 1 : 0})`, transformOrigin: "top" }}
                        />
                      </span>
                    )}
                    <span
                      className={cn(
                        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-500",
                        hecho ? "bg-[#E6A23C] text-[#17235B]" : actual ? "bg-white text-[#17235B]" : "bg-white/10 text-white/50",
                      )}
                    >
                      {hecho ? <Check className="cot-tick size-4" strokeWidth={3} aria-hidden /> : idx + 1}
                    </span>
                    <span>
                      <span className={cn("block text-[15px] font-semibold transition-colors", actual || hecho ? "text-white" : "text-white/45")}>
                        {p.label}
                      </span>
                      <span className={cn("block text-[12.5px] transition-colors", actual ? "text-white/65" : "text-white/35")}>{p.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <ul className="mt-auto hidden space-y-2.5 border-t border-white/10 pt-6 text-[12.5px] leading-relaxed text-white/60 lg:block">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#E6A23C]" aria-hidden />
                Tu identidad se confirma con un código enviado a tu correo.
              </li>
              <li className="flex gap-2.5">
                <Lock className="mt-0.5 size-4 shrink-0 text-[#E6A23C]" aria-hidden />
                El enlace es personal, vence y solo sirve para una firma.
              </li>
              <li className="flex gap-2.5">
                <FileText className="mt-0.5 size-4 shrink-0 text-[#E6A23C]" aria-hidden />
                Recibirás el contrato sellado con la constancia de firma.
              </li>
            </ul>
          </div>
        </aside>

        {/* ============================ Contenido ============================ */}
        <main className="relative mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 lg:flex lg:flex-col lg:justify-center lg:py-14">
        {paso === "cargando" && (
          <div className={cn(tarjeta, "grid place-items-center py-20")} aria-busy>
            <Loader2 className="size-7 animate-spin text-[#1B5CFF]" aria-label="Cargando" />
          </div>
        )}

        {paso === "invalido" && (
          <section className={cn(tarjeta, "cot-rise text-center")}>
            <span className="cot-pop-in mx-auto grid size-16 place-items-center rounded-2xl bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <ShieldAlert className="size-7" aria-hidden />
            </span>
            <h1 ref={tituloRef} tabIndex={-1} className={cn(titulo, "mt-5")}>
              Enlace no disponible
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">{error}</p>
          </section>
        )}

        {paso === "inicio" && estado && (
          <section key="inicio" className={cn(tarjeta, anim)}>
            <h1 ref={tituloRef} tabIndex={-1} className={titulo}>
              Tu contrato está listo para firma
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
              <strong className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{estado.prestador}</strong> te invita a revisar y
              firmar electrónicamente tu contrato de servicio de Internet Dedicado.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                {
                  icon: <Mail />,
                  text: (
                    <>
                      Te enviaremos un código de verificación a{" "}
                      <strong className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{estado.correo}</strong>.
                    </>
                  ),
                },
                { icon: <FileText />, text: <>Podrás leer el contrato completo antes de firmar.</> },
                { icon: <ShieldCheck />, text: <>Tu firma queda registrada con fecha, hora y la huella digital del documento.</> },
              ].map((item, i) => (
                <li
                  key={i}
                  className="cot-rise flex items-start gap-3 rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] p-3.5 text-[14px] text-[#3F3F46] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 dark:text-[#D6DEEA]"
                  style={{ "--cot-i": i + 1 } as CSSProperties}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF] [&_svg]:size-4">
                    {item.icon}
                  </span>
                  <span className="pt-1">{item.text}</span>
                </li>
              ))}
            </ul>
            {error && (
              <div className="mt-5">
                <Mensaje tono="error">{error}</Mensaje>
              </div>
            )}
            <button type="button" onClick={() => void pedirCodigo()} disabled={busy} className={cn(btn.primary, "mt-7 w-full sm:w-auto")}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
              {busy ? "Enviando código…" : "Enviar código"}
              {!busy && <ArrowRight aria-hidden />}
            </button>
          </section>
        )}

        {paso === "codigo" && (
          <section key="codigo" className={cn(tarjeta, anim)}>
            <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <h1 ref={tituloRef} tabIndex={-1} className={cn(titulo, "mt-4")}>
              Verifica tu identidad
            </h1>
            <p className="mt-2 text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Escribe el código de 6 dígitos que enviamos a{" "}
              <strong className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{estado?.correo || "tu correo"}</strong>.
            </p>
            {aviso && (
              <div className="mt-4">
                <Mensaje tono="info">{aviso}</Mensaje>
              </div>
            )}
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void validarCodigo();
              }}
            >
              <CodigoInput
                key={errorKey}
                value={codigo}
                onChange={(v) => {
                  setCodigo(v);
                  if (error) setError("");
                }}
                onComplete={(v) => void validarCodigo(v)}
                invalid={Boolean(error)}
                disabled={busy}
              />
              {error && (
                <div className="mt-4">
                  <Mensaje tono="error">{error}</Mensaje>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button type="submit" disabled={busy || codigo.length !== 6} className={btn.primary}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
                  {busy ? "Verificando…" : "Verificar"}
                </button>
                <button type="button" onClick={() => void pedirCodigo()} disabled={busy || espera > 0} className={btn.secondary}>
                  <RotateCcw aria-hidden />
                  {espera > 0 ? (
                    <span>
                      Reenviar en <span className="tabular-nums">{espera}</span> s
                    </span>
                  ) : (
                    "Reenviar código"
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {paso === "revisar" && (
          <section key="revisar" className={cn(anim, "space-y-4")}>
            <div className={cn(cardShell, "overflow-hidden")}>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C] sm:px-6">
                <div className="min-w-0">
                  <h1
                    ref={tituloRef}
                    tabIndex={-1}
                    className="text-[20px] font-semibold tracking-[-0.4px] text-[#09090B] outline-none dark:text-[#F8FAFC]"
                  >
                    Revisa tu contrato
                  </h1>
                  <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Lee el documento completo antes de continuar.</p>
                </div>
                {doc && (
                  <button type="button" onClick={abrirDocumento} className={cn(btn.ghost, "min-h-9! px-3! text-[13px]!")}>
                    <ExternalLink aria-hidden /> Abrir en pestaña
                  </button>
                )}
              </header>
              <div className="relative h-[66vh] min-h-[420px] bg-[#F4F4F5] dark:bg-[#0B1220]">
                {doc ? (
                  <DocumentoViewer blob={doc.blob} title="Contrato" className="cot-fade absolute inset-0" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <div className="flex w-56 flex-col items-center gap-3" aria-live="polite">
                      <div className="w-full space-y-2" aria-hidden>
                        {[100, 84, 92, 58].map((w, i) => (
                          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-[#E4E4E7] dark:bg-[#1F2A3C]">
                            <div
                              className="cot-write h-full rounded-full bg-[#1B5CFF]/60"
                              style={{ "--cot-i": i, width: `${w}%` } as CSSProperties}
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Preparando tu contrato…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {error && <Mensaje tono="error">{error}</Mensaje>}
            <label
              className={cn(
                cardShell,
                "flex cursor-pointer items-start gap-3 p-4 text-[14px] text-[#3F3F46] transition-colors duration-200 dark:text-[#D6DEEA]",
                acepta && "border-[#C9D7FF] bg-[#F5F8FF] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/30",
              )}
            >
              <input
                type="checkbox"
                checked={acepta}
                onChange={(e) => setAcepta(e.target.checked)}
                className="mt-0.5 size-4 accent-[#1B5CFF]"
                disabled={!doc}
              />
              He leído el contrato completo y acepto sus términos y condiciones.
            </label>
            <div className="flex justify-end">
              <button type="button" onClick={() => setPaso("firmar")} disabled={!acepta || !doc} className={cn(btn.primary, "w-full sm:w-auto")}>
                Continuar a firma <ArrowRight aria-hidden />
              </button>
            </div>
          </section>
        )}

        {paso === "firmar" && (
          <section key="firmar" className={cn(tarjeta, anim)}>
            <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.14)] text-[#B7791F] dark:text-[#E6A23C]">
              <PenLine className="size-5" aria-hidden />
            </span>
            <h1 ref={tituloRef} tabIndex={-1} className={cn(titulo, "mt-4")}>
              Firma el contrato
            </h1>
            <p className="mt-2 text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]">Escribe tu nombre completo y dibuja tu firma en el recuadro.</p>
            <label htmlFor="firma-nombre" className="mb-1.5 mt-6 block text-[13px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
              Nombre completo
            </label>
            <input id="firma-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" maxLength={255} className={inputClass} />
            <div className="mt-5 rounded-[14px] border border-[#E4E4E7] bg-white p-2 dark:border-[#273244]" data-signature-scroll-lock>
              <SignaturePad value={firma} onChange={setFirma} height={200} label="Firma" />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">
              Al firmar aceptas que esta firma electrónica tiene la misma validez que tu firma autógrafa, conforme a la Cláusula Vigésima
              Segunda del contrato. Registraremos fecha, hora, dirección IP y la huella del documento.
            </p>
            {error && (
              <div className="mt-4">
                <Mensaje tono="error">{error}</Mensaje>
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setPaso("revisar")} disabled={busy} className={btn.secondary}>
                <ArrowLeft aria-hidden /> Volver al documento
              </button>
              <button type="button" onClick={() => void enviarFirma()} disabled={!puedeFirmar} className={btn.primary}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <PenLine aria-hidden />}
                {busy ? "Firmando…" : "Firmar contrato"}
              </button>
            </div>
          </section>
        )}

        {paso === "listo" && (
          <section key="listo" className={cn(tarjeta, anim, "text-center")}>
            <ExitoCheck />
            <h1 ref={tituloRef} tabIndex={-1} className={cn(titulo, "mt-5")}>
              ¡Contrato firmado!
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
              {completado
                ? "Ambas partes firmaron. Te enviamos una copia del contrato sellado a tu correo; también puedes descargarla ahora."
                : `Gracias. Cuando ${estado?.prestador || "el prestador"} firme, recibirás el contrato sellado en tu correo.`}
            </p>
            {error && (
              <div className="mt-4">
                <Mensaje tono="error">{error}</Mensaje>
              </div>
            )}
            {completado && (
              <button
                type="button"
                onClick={() => void bajarFinal()}
                disabled={busy}
                className={cn(btn.primary, "cot-rise mt-6")}
                style={{ "--cot-i": 6 } as CSSProperties}
              >
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                {busy ? "Descargando…" : "Descargar contrato"}
              </button>
            )}
          </section>
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#A1A1AA] dark:text-[#64748B] lg:hidden">
          <Lock className="size-3" aria-hidden /> Enlace personal e intransferible. No lo compartas.
        </p>
        </main>
      </div>
    </div>
  );
}
