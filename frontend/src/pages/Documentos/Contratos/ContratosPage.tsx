/**
 * Documentos › Contratos — tablero de firma.
 *
 * Un contrato avanza Borrador → En firma → Completado, así que la vista por
 * defecto es un tablero por etapa (como un embudo) con tarjetas que muestran
 * el avance de las dos firmas; «Lista» ofrece la tabla clásica. Las cifras
 * clave viven dentro de la banda marina, igual que en Nueva cotización.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Columns3,
  FilePlus2,
  FileSignature,
  Files,
  List,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import { deleteContrato, listContratos, type Contrato, type ContratoEstado } from "./shared/contratoApi";
import { formatoDinero, formatoFecha, iniciales, relativo } from "./shared/contratoFormato";
import {
  btn,
  ESTADO_CONTRATO_TONE,
  folioText,
  focusRing,
  heroBand,
  heroDots,
  heroGlowBlue,
  heroGlowGold,
  heroIcon,
  iconBtnDanger,
  pageCardShellClass,
  pageSearchInputClass,
  pageWrap,
  sansStyle,
} from "./shared/contratoTokens";
import { EstadoPill, FirmasIndicator } from "./shared/ContratoUi";

type Vista = "tablero" | "lista";
type Etapa = "borrador" | "firma" | "completado" | "cancelado";

const ETAPAS: { key: Etapa; label: string; hint: string; estados: ContratoEstado[]; tono: ContratoEstado }[] = [
  { key: "borrador", label: "Borradores", hint: "Listos para revisar y enviar", estados: ["borrador"], tono: "borrador" },
  {
    key: "firma",
    label: "En firma",
    hint: "Esperando una o ambas firmas",
    estados: ["enviado", "firmado_cliente", "firmado_prestador"],
    tono: "enviado",
  },
  { key: "completado", label: "Completados", hint: "Firmados y sellados", estados: ["completado"], tono: "completado" },
  { key: "cancelado", label: "Cancelados", hint: "Cerrados sin firma", estados: ["cancelado"], tono: "cancelado" },
];

const VISTA_KEY = "contratos:vista";

function coincide(c: Contrato, q: string) {
  if (!q) return true;
  const t = q.toLowerCase();
  return [c.folio, c.cliente_razon_social, c.cliente_rfc, c.cliente_correo].some((v) => (v || "").toLowerCase().includes(t));
}

/* ------------------------------------------------------------------ tarjeta del tablero */

function TarjetaContrato({ c, i, onBorrar }: { c: Contrato; i: number; onBorrar?: () => void }) {
  const p = Boolean(c.firmado_prestador_at);
  const cl = Boolean(c.firmado_cliente_at);
  const firmas = Number(p) + Number(cl);
  return (
    <li className="cot-rise group relative" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
      <Link
        to={`/contratos/${c.id}`}
        className={cn(
          "block rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#D3D3D8] hover:shadow-[0_10px_24px_-14px_rgba(9,9,11,0.28)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]",
          focusRing,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={folioText}>{c.folio}</span>
          <span className="text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]" title={formatoFecha(c.updated_at, true)}>
            {relativo(c.updated_at)}
          </span>
        </div>
        <div className="mt-2.5 flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#17235B] text-[12px] font-semibold tracking-wide text-white dark:bg-[#1B2A63]">
            {iniciales(c.cliente_razon_social)}
          </span>
          <p className="line-clamp-2 min-w-0 text-[14px] font-semibold leading-snug text-[#09090B] dark:text-[#F8FAFC]">
            {c.cliente_razon_social}
          </p>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[#F4F4F5] px-2 text-[12px] font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
            {c.plan_mbps} Mbps · {c.vigencia_meses} m
          </span>
          <span className="text-[15px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
            {formatoDinero(c.precio_mensual)}
            <span className="text-[11px] font-normal text-[#A1A1AA]"> /mes</span>
          </span>
        </div>
        {c.estado !== "cancelado" && (
          <div className="mt-3.5 border-t border-[#F0F0F2] pt-3 dark:border-[#1F2A3C]">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-medium text-[#52525B] dark:text-[#B7C1D1]">
                {c.estado === "completado" ? "Sellado" : `${firmas} de 2 firmas`}
              </span>
              {c.enlace_activo && !cl ? (
                <span className="inline-flex items-center gap-1 text-[#1244D1] dark:text-[#9BB6FF]">
                  <span className="size-1.5 rounded-full bg-[#1B5CFF]" aria-hidden />
                  {c.enlace_activo.verificado ? "Cliente verificado" : "Enlace enviado"}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1" aria-hidden>
              {[p, cl].map((ok, k) => (
                <span key={k} className="h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]">
                  <span
                    className="cot-bar block h-full rounded-full bg-[#04724D] dark:bg-[#22A06B]"
                    style={{ transform: `scaleX(${ok ? 1 : 0})` }}
                  />
                </span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10.5px] uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">
              <span>Prestador</span>
              <span>Cliente</span>
            </div>
          </div>
        )}
      </Link>
      {onBorrar ? (
        <button
          type="button"
          onClick={onBorrar}
          aria-label={`Eliminar ${c.folio}`}
          className={cn(iconBtnDanger, "absolute right-2 top-9 size-8! opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100")}
        >
          <Trash2 aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ página */

export default function ContratosPage() {
  const navigate = useNavigate();
  const { isAdmin, permissions } = useAuth();
  const puedeCrear = isAdmin || permissions?.contratos?.create === true;
  const puedeBorrar = canDeleteInModule(permissions, isAdmin, "contratos");

  const [rows, setRows] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [vista, setVista] = useState<Vista>(() => {
    try {
      return localStorage.getItem(VISTA_KEY) === "lista" ? "lista" : "tablero";
    } catch {
      return "tablero";
    }
  });
  const [verCancelados, setVerCancelados] = useState(false);
  const [toast, setToast] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);
  const [borrar, setBorrar] = useState<Contrato | null>(null);
  const q = useDeferredValue(search.trim());

  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(VISTA_KEY, v);
    } catch {
      /* sin almacenamiento */
    }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await listContratos());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los contratos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(() => rows.filter((r) => coincide(r, q)), [rows, q]);
  const porEtapa = useMemo(() => {
    const m = {} as Record<Etapa, Contrato[]>;
    for (const e of ETAPAS) m[e.key] = visibles.filter((r) => e.estados.includes(r.estado));
    return m;
  }, [visibles]);
  const etapasVisibles = ETAPAS.filter((e) => e.key !== "cancelado" || verCancelados);
  const listaVisible = useMemo(
    () => (verCancelados ? visibles : visibles.filter((r) => r.estado !== "cancelado")),
    [visibles, verCancelados],
  );

  const kpis = useMemo(() => {
    const completados = rows.filter((r) => r.estado === "completado");
    return [
      { key: "total", label: "Contratos", icon: <Files className="size-3.5" />, value: rows.filter((r) => r.estado !== "cancelado").length.toLocaleString("es-MX") },
      { key: "firma", label: "En firma", icon: <FileSignature className="size-3.5" />, value: String(rows.filter((r) => ["enviado", "firmado_cliente", "firmado_prestador"].includes(r.estado)).length) },
      { key: "ok", label: "Completados", icon: <ShieldCheck className="size-3.5" />, value: String(completados.length) },
      { key: "mrr", label: "Mensualidad contratada", icon: <Wallet className="size-3.5" />, value: formatoDinero(completados.reduce((a, r) => a + Number(r.precio_mensual || 0), 0)) },
    ];
  }, [rows]);

  const confirmarBorrado = async () => {
    if (!borrar) return;
    const target = borrar;
    try {
      await deleteContrato(target.id);
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      setToast({ variant: "success", title: "Contrato eliminado", message: `Se eliminó ${target.folio}.` });
    } catch (e) {
      setToast({ variant: "error", title: "No se pudo eliminar", message: e instanceof Error ? e.message : "Intenta de nuevo." });
    }
  };

  const puedeBorrarFila = (c: Contrato) => puedeBorrar && c.estado !== "completado";
  const sinResultados = !loading && !error && listaVisible.length === 0;

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
      <div className={pageWrap}>
        <PageMeta title="Contratos | Sistema Grupo Intrax GPS" description="Contratos de servicio con firma electrónica" />
        {toast && <Alert variant={toast.variant} title={toast.title} message={toast.message} showLink={false} onClose={() => setToast(null)} />}

        {/* ============================ Banda ============================ */}
        <header className={cn("cot-rise rounded-[24px]", heroBand)} style={{ "--cot-i": 0 } as CSSProperties}>
          <div className={heroDots} aria-hidden />
          <div className={heroGlowBlue} aria-hidden />
          <div className={heroGlowGold} aria-hidden />
          <div className="relative px-5 pb-5 pt-5 sm:px-8 sm:pb-6 sm:pt-6">
            <nav className="flex items-center gap-1 text-[13px] text-white/55" aria-label="Migas de pan">
              <Link to="/" className="rounded px-0.5 transition-colors hover:text-white">
                Inicio
              </Link>
              <ChevronRight className="size-3.5 text-white/30" aria-hidden />
              <span>Documentos</span>
              <ChevronRight className="size-3.5 text-white/30" aria-hidden />
              <span className="font-medium text-white/90" aria-current="page">
                Contratos
              </span>
            </nav>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span className={heroIcon} aria-hidden>
                  <FileSignature className="size-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-1px] sm:text-[32px] sm:tracking-[-1.1px]">Contratos</h1>
                  <p className="mt-1.5 max-w-[58ch] text-[14px] leading-[22px] text-white/70 sm:text-[15px]">
                    De la captura al documento sellado: genera el contrato con la plantilla oficial, aplica la firma registrada del prestador y
                    recaba la del cliente con un enlace verificado.
                  </p>
                </div>
              </div>
              {puedeCrear ? (
                <Link
                  to="/contratos/nuevo"
                  className="cot-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#17235B] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)] hover:bg-[#EEF3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Plus className="size-4" aria-hidden /> Nuevo contrato
                </Link>
              ) : null}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-inset ring-white/10 md:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.key} className="min-w-0 bg-[#17235B]/85 px-4 py-3 dark:bg-[#1B2A63]/85">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-white/50">
                    {k.icon}
                    {k.label}
                  </dt>
                  <dd className="mt-1 truncate text-[20px] font-semibold tabular-nums tracking-[-0.4px] text-white">
                    <span key={loading ? "c" : k.value} className="cot-flash inline-block">
                      {loading ? "—" : k.value}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        {/* ============================ Barra de herramientas ============================ */}
        <div className="cot-rise flex flex-col gap-2.5 sm:flex-row sm:items-center" style={{ "--cot-i": 1 } as CSSProperties}>
          <div className="relative min-w-0 flex-1 sm:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8EA0B8]" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar folio, cliente, RFC o correo…"
              className={pageSearchInputClass}
              aria-label="Buscar contratos"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex min-w-11 items-center justify-center rounded-lg text-[#8EA0B8] hover:bg-gray-200/60 hover:text-[#52525B] dark:hover:bg-white/6"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-2 text-[13px] text-[#52525B] dark:text-[#B7C1D1]">
              <input type="checkbox" checked={verCancelados} onChange={(e) => setVerCancelados(e.target.checked)} className="size-4 accent-[#1B5CFF]" />
              Ver cancelados
            </label>
            <div className="relative inline-grid grid-cols-2 rounded-[12px] border border-[#E7E7EA] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A]" role="tablist" aria-label="Vista">
              <span
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[9px] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#243048] dark:ring-[#3A4661]"
                style={{ transform: vista === "lista" ? "translateX(100%)" : "none" }}
                aria-hidden
              />
              {(
                [
                  ["tablero", "Tablero", <Columns3 key="t" className="size-4" aria-hidden />],
                  ["lista", "Lista", <List key="l" className="size-4" aria-hidden />],
                ] as const
              ).map(([v, label, icon]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={vista === v}
                  onClick={() => cambiarVista(v)}
                  className={cn(
                    "relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-colors",
                    focusRing,
                    vista === v ? "text-[#09090B] dark:text-white" : "text-[#6E6E77] dark:text-[#8EA0B8]",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="cot-fade flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B42323] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]">
            {error}
            <button type="button" className={btn.secondary} onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : sinResultados ? (
          <div className={cn(pageCardShellClass, "cot-fade flex flex-col items-center px-6 py-16 text-center")} role="status">
            <span className="cot-tick mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
              {q ? <SearchX className="size-6" aria-hidden /> : <FilePlus2 className="size-6" aria-hidden />}
            </span>
            <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              {q ? "Ningún contrato coincide" : "Aún no hay contratos"}
            </p>
            <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
              {q ? "Prueba con otro folio, nombre o RFC." : "Captura los datos del cliente y el plan; el sistema arma el contrato con la plantilla oficial."}
            </p>
            {q ? (
              <button type="button" className={cn(btn.secondary, "mt-5")} onClick={() => setSearch("")}>
                Limpiar búsqueda
              </button>
            ) : puedeCrear ? (
              <Link to="/contratos/nuevo" className={cn(btn.primary, "mt-5")}>
                <Plus aria-hidden /> Crear el primero
              </Link>
            ) : null}
          </div>
        ) : vista === "tablero" ? (
          /* ============================ Tablero ============================ */
          <div
            key={`tablero-${verCancelados}`}
            className={cn("cot-fade grid gap-4", verCancelados ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}
          >
            {etapasVisibles.map((e, col) => {
              const tone = ESTADO_CONTRATO_TONE[e.tono];
              const items = porEtapa[e.key];
              return (
                <section
                  key={e.key}
                  aria-labelledby={`col-${e.key}`}
                  className="cot-rise flex min-w-0 flex-col rounded-[20px] border border-[#EEEEF0] bg-[#FAFAFB] p-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60"
                  style={{ "--cot-i": col + 2 } as CSSProperties}
                >
                  <header className="flex items-center justify-between gap-2 px-2 pb-2.5 pt-1.5">
                    <div className="min-w-0">
                      <h2 id={`col-${e.key}`} className="flex items-center gap-2 text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
                        {e.label}
                      </h2>
                      <p className="mt-0.5 truncate text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">{e.hint}</p>
                    </div>
                    <span
                      key={items.length}
                      className="cot-flash inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[12px] font-semibold tabular-nums text-[#52525B] ring-1 ring-[#E7E7EA] dark:bg-[#111827] dark:text-[#B7C1D1] dark:ring-[#273244]"
                    >
                      {loading ? "·" : items.length}
                    </span>
                  </header>
                  {loading ? (
                    <div className="space-y-2.5" aria-hidden>
                      {[0, 1].map((i) => (
                        <div key={i} className="h-[150px] animate-pulse rounded-[16px] bg-white dark:bg-[#111827]" />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <p className="rounded-[14px] border border-dashed border-[#E4E4E7] px-3 py-8 text-center text-[12.5px] text-[#A1A1AA] dark:border-[#273244] dark:text-[#64748B]">
                      Sin contratos aquí
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {items.map((c, i) => (
                        <TarjetaContrato key={c.id} c={c} i={i} onBorrar={puedeBorrarFila(c) ? () => setBorrar(c) : undefined} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* ============================ Lista ============================ */
          <section key="lista" className={cn("cot-fade", pageCardShellClass)} aria-label="Lista de contratos" aria-busy={loading || undefined}>
            {loading ? (
              <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="size-9 animate-pulse rounded-[10px] bg-[#F4F4F5] dark:bg-white/[0.06]" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-[#F4F4F5] dark:bg-white/[0.06]" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-[#E7E7EA] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
                      <th className="py-3 pl-6 pr-3 font-semibold">Contrato</th>
                      <th className="px-3 py-3 font-semibold">Servicio</th>
                      <th className="px-3 py-3 text-right font-semibold">Mensualidad</th>
                      <th className="px-3 py-3 font-semibold">Firmas</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold">Actualizado</th>
                      <th className="py-3 pl-3 pr-6">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaVisible.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{ "--cot-i": Math.min(i, 12) } as CSSProperties}
                        onClick={() => navigate(`/contratos/${r.id}`)}
                        className="cot-rise group cursor-pointer border-t border-[#F0F0F2] transition-colors first:border-t-0 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-3 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#17235B] text-[12px] font-semibold text-white dark:bg-[#1B2A63]">
                              {iniciales(r.cliente_razon_social)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                to={`/contratos/${r.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className={cn("block max-w-[22rem] truncate rounded text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC]", focusRing)}
                              >
                                {r.cliente_razon_social}
                              </Link>
                              <span className={folioText}>{r.folio}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-[#52525B] dark:text-[#B7C1D1]">
                          {r.plan_mbps} Mbps · {r.vigencia_meses} meses
                        </td>
                        <td className="px-3 py-3 text-right text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                          {formatoDinero(r.precio_mensual)}
                        </td>
                        <td className="px-3 py-3">
                          <FirmasIndicator prestador={Boolean(r.firmado_prestador_at)} cliente={Boolean(r.firmado_cliente_at)} />
                        </td>
                        <td className="px-3 py-3">
                          <EstadoPill estado={r.estado} />
                        </td>
                        <td className="px-3 py-3 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]" title={formatoFecha(r.updated_at, true)}>
                          {relativo(r.updated_at)}
                        </td>
                        <td className="py-3 pl-3 pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {puedeBorrarFila(r) ? (
                              <button
                                type="button"
                                className={cn(iconBtnDanger, "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100")}
                                aria-label={`Eliminar ${r.folio}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBorrar(r);
                                }}
                              >
                                <Trash2 aria-hidden />
                              </button>
                            ) : null}
                            <ChevronRight className="size-4 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && !error && listaVisible.length > 0 ? (
          <p className="cot-fade px-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
            {listaVisible.length.toLocaleString("es-MX")} {listaVisible.length === 1 ? "contrato" : "contratos"}
            {q ? <> para «{q}»</> : null}
          </p>
        ) : null}
      </div>

      <AppConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={confirmarBorrado}
        icon={<Trash2 className="size-5" />}
        title="¿Eliminar contrato?"
        description={`Se eliminará ${borrar?.folio ?? ""} y su enlace de firma dejará de funcionar. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
      />
    </div>
  );
}
