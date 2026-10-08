/**
 * Documentos › Contratos — listado con la misma anatomía que Órdenes y Proyectos:
 * migas, banda marina, tarjetas de resumen, búsqueda y barra de etapa.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, FilePenLine, FilePlus2, FileSignature, Files, Plus, Search, SearchX, ShieldCheck, Trash2, X } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { AppConfirmDialog } from "@/components/ui/modal-kit/ModalKit";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import { deleteContrato, listContratos, type Contrato } from "./shared/contratoApi";
import { formatoDinero, formatoFecha, iniciales, relativo } from "./shared/contratoFormato";
import {
  btn,
  erpPrimaryBtnClass,
  erpStatCardClass,
  folioText,
  focusRing,
  iconBtnDanger,
  pageCardShellClass,
  pageSearchInputClass,
  pageWrap,
  sansStyle,
} from "./shared/contratoTokens";
import { EstadoPill, FirmasIndicator } from "./shared/ContratoUi";

type EtapaFiltro = "todas" | "borrador" | "firma" | "completado";

const SEGMENTOS: {
  value: EtapaFiltro;
  label: string;
  countKey: "total" | "borrador" | "firma" | "completado";
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: "todas",
    label: "Todas",
    countKey: "total",
    activeClass: "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#243048] dark:text-white",
    dotClass: "bg-[#A1A1AA] dark:bg-[#64748B]",
  },
  {
    value: "borrador",
    label: "Borradores",
    countKey: "borrador",
    activeClass: "bg-[#F4F4F5] text-[#3F3F46] dark:bg-white/10 dark:text-[#F8FAFC]",
    dotClass: "bg-[#A1A1AA] dark:bg-[#64748B]",
  },
  {
    value: "firma",
    label: "En firma",
    countKey: "firma",
    activeClass: "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]",
    dotClass: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
  },
  {
    value: "completado",
    label: "Sellados",
    countKey: "completado",
    activeClass: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#22A06B]/15 dark:text-[#22A06B]",
    dotClass: "bg-[#04724D] dark:bg-[#22A06B]",
  },
];

const EN_FIRMA = new Set(["enviado", "firmado_cliente", "firmado_prestador"]);

function etapaDe(estado: string): EtapaFiltro {
  if (estado === "borrador" || estado === "completado") return estado;
  if (EN_FIRMA.has(estado)) return "firma";
  return "todas";
}

function EtapaSegment({
  etapa,
  conteos,
  onChange,
}: {
  etapa: EtapaFiltro;
  conteos: Record<"total" | "borrador" | "firma" | "completado", number>;
  onChange: (value: EtapaFiltro) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const focusTabAt = (index: number) => {
    const tabs = railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SEGMENTOS.length - 1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTabAt(index === last ? 0 : index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTabAt(index === 0 ? last : index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTabAt(last);
    }
  };
  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label="Filtrar por etapa"
      aria-orientation="horizontal"
      className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-[12px] bg-[#F4F4F5] p-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-[#0F172A] [&::-webkit-scrollbar]:hidden"
    >
      {SEGMENTOS.map((seg, index) => {
        const active = etapa === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(seg.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "cot-press inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.4)]",
              active ? seg.activeClass : "text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white",
            )}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", seg.dotClass)} aria-hidden />
            {seg.label}
            <span
              key={conteos[seg.countKey]}
              className={cn(
                "cot-flash inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular-nums",
                active ? "bg-black/10 dark:bg-white/15" : "bg-black/5 text-[#6E6E77] dark:bg-white/10 dark:text-[#8EA0B8]",
              )}
            >
              {conteos[seg.countKey].toLocaleString("es-MX")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function coincide(c: Contrato, q: string) {
  if (!q) return true;
  const t = q.toLowerCase();
  return [c.folio, c.cliente_razon_social, c.cliente_rfc, c.cliente_correo].some((v) => (v || "").toLowerCase().includes(t));
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
  const [etapa, setEtapa] = useState<EtapaFiltro>("todas");
  const [toast, setToast] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);
  const [borrar, setBorrar] = useState<Contrato | null>(null);
  const q = useDeferredValue(search.trim());

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
  const conteos = useMemo(() => {
    const activos = rows.filter((r) => r.estado !== "cancelado");
    return {
      total: activos.length,
      borrador: activos.filter((r) => r.estado === "borrador").length,
      firma: activos.filter((r) => EN_FIRMA.has(r.estado)).length,
      completado: activos.filter((r) => r.estado === "completado").length,
    };
  }, [rows]);
  const listaVisible = useMemo(
    () =>
      visibles.filter((r) => r.estado !== "cancelado" && (etapa === "todas" || etapaDe(r.estado) === etapa)),
    [visibles, etapa],
  );
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

        <nav className="cot-fade flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
          <Link
            to="/"
            className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/4 hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
          >
            Inicio
          </Link>
          <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
            /
          </span>
          <span className="text-[#6E6E77] dark:text-[#8EA0B8]">Documentos</span>
          <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
            /
          </span>
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
            Contratos
          </span>
        </nav>

        <header className="cot-rise cot-sheen relative overflow-hidden rounded-[24px] bg-[#17235B] text-white dark:bg-[#1B2A63]" style={{ "--cot-i": 0 } as CSSProperties}>
          <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
                <FileSignature className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Documentos</p>
                <h1 className="mt-1 text-[28px] font-bold leading-[1.15] tracking-[-1px] sm:text-[32px] sm:tracking-[-1.1px]">Contratos</h1>
                <p className="mt-1.5 max-w-[60ch] text-[15px] leading-5.5 tracking-[-0.1px] text-white/70">
                  Arma el contrato con la plantilla oficial, aplica la firma del prestador y recaba la del cliente.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85">
                <span className="size-1.5 rounded-full bg-[#4ADE80]" aria-hidden />
                {loading ? "—" : conteos.total.toLocaleString("es-MX")} {conteos.total === 1 ? "vigente" : "vigentes"}
              </span>
              {!loading && conteos.firma > 0 ? (
                <span className="cot-tick inline-flex h-9 items-center rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]">
                  {conteos.firma.toLocaleString("es-MX")} en firma
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen de contratos">
          {(
            [
              ["Vigentes", conteos.total, <Files key="v" className="size-4 sm:size-5" strokeWidth={1.8} />, "border-[#E7E7EA] bg-white/90 text-[#1B5CFF] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#4B7CFF]"],
              ["Borradores", conteos.borrador, <FilePenLine key="b" className="size-4 sm:size-5" strokeWidth={1.8} />, "border-[#E7E7EA] bg-[#F4F4F5] text-[#52525B] dark:border-[#273244] dark:bg-white/6 dark:text-[#B7C1D1]"],
              ["En firma", conteos.firma, <FileSignature key="f" className="size-4 sm:size-5" strokeWidth={1.8} />, "border-[#D7E3FF] bg-[#EEF3FF] text-[#1244D1] dark:border-[#4B7CFF]/30 dark:bg-[#1B2A63] dark:text-[#9BB6FF]"],
              ["Sellados", conteos.completado, <ShieldCheck key="s" className="size-4 sm:size-5" strokeWidth={1.8} />, "border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#22A06B]/30 dark:bg-[#22A06B]/10 dark:text-[#22A06B]"],
            ] as const
          ).map(([label, value, icon, iconClass], i) => (
            <div key={label} className={cn(erpStatCardClass, "cot-rise min-w-0")} style={{ "--cot-i": i + 1 } as CSSProperties}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10", iconClass)} aria-hidden>
                  {icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6E6E77] dark:text-[#8EA0B8] sm:text-[11px]">{label}</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
                    <span key={loading ? "c" : value} className="cot-flash inline-block">
                      {loading ? "—" : value.toLocaleString("es-MX")}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============================ Barra de herramientas ============================ */}
        <div className="cot-rise grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4" style={{ "--cot-i": 5 } as CSSProperties}>
          <div className="relative min-w-0">
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
          {puedeCrear ? (
            <Link to="/contratos/nuevo" className={cn(erpPrimaryBtnClass, "w-full sm:w-auto")}>
              <Plus className="size-4" aria-hidden /> Nuevo contrato
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="cot-fade flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B42323] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]">
            {error}
            <button type="button" className={btn.secondary} onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : (
          <section className={cn("cot-rise", pageCardShellClass)} style={{ "--cot-i": 6 } as CSSProperties} aria-labelledby="contratos-listado" aria-busy={loading || undefined}>
            <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]" aria-hidden>
                  <FileSignature className="size-4" />
                </span>
                <h2 id="contratos-listado" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Listado de contratos
                </h2>
              </div>
              <p className="mt-2 text-[14px] leading-5 text-[#52525B] dark:text-[#B7C1D1]">Resultados según la búsqueda y la etapa.</p>
              <div className="mt-3">
                <EtapaSegment etapa={etapa} conteos={conteos} onChange={setEtapa} />
              </div>
            </div>
            {loading ? (
              <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <div className="size-9 animate-pulse rounded-[10px] bg-[#F4F4F5] dark:bg-white/6" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-[#F4F4F5] dark:bg-white/6" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/6" />
                  </div>
                ))}
              </div>
            ) : sinResultados ? (
              <div className="cot-fade flex flex-col items-center px-6 py-16 text-center" role="status">
                <span className="cot-tick mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
                  {q ? <SearchX className="size-6" aria-hidden /> : <FilePlus2 className="size-6" aria-hidden />}
                </span>
                <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                  {q ? "Ningún contrato coincide" : etapa !== "todas" ? "Nada en esta etapa" : "Aún no hay contratos"}
                </p>
                <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
                  {q
                    ? "Prueba con otro folio, nombre o RFC."
                    : etapa !== "todas"
                      ? "Elige otra etapa o vuelve a ver todos los contratos."
                      : "Captura los datos del cliente y el plan; el sistema arma el contrato con la plantilla oficial."}
                </p>
                {q ? (
                  <button type="button" className={cn(btn.secondary, "mt-5")} onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </button>
                ) : etapa !== "todas" ? (
                  <button type="button" className={cn(btn.secondary, "mt-5")} onClick={() => setEtapa("todas")}>
                    Ver todos
                  </button>
                ) : puedeCrear ? (
                  <Link to="/contratos/nuevo" className={cn(btn.primary, "mt-5")}>
                    <Plus aria-hidden /> Crear el primero
                  </Link>
                ) : null}
              </div>
            ) : (
              <div key={etapa} className="cot-fade overflow-x-auto">
                <table className="w-full min-w-205 text-left">
                  <thead>
                    <tr className="border-b border-[#E7E7EA] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
                      <th scope="col" className="py-3 pl-6 pr-3 font-semibold">Contrato</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Servicio</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Mensualidad</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Firmas</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Actualizado</th>
                      <th scope="col" className="py-3 pl-3 pr-6">
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
                        className="cot-rise group cursor-pointer border-t border-[#F0F0F2] transition-colors first:border-t-0 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/2"
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
                                className={cn("block max-w-88 truncate rounded text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC]", focusRing)}
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
            {etapa === "borrador" ? " en borrador" : null}
            {etapa === "firma" ? " en firma" : null}
            {etapa === "completado" ? (listaVisible.length === 1 ? " sellado" : " sellados") : null}
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
