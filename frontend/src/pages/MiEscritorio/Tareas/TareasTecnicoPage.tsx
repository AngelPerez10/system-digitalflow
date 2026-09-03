import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { Modal } from "@/components/ui/modal";
import { useDropzone } from "react-dropzone";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { MobileTareaList } from "../MobileTareaCard";
import { PencilIcon, TrashBinIcon } from "../../../icons";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

/* --------------------------------------------------------------------------
   Mismo sistema que `TareasPage`, `Perfil/ProfilePage`, `Configuracion/*`:
   marino + dorado sobre lienzo blanco, azul eléctrico como único acento de
   acción, líneas de 1 px. En oscuro, la familia slate del contenedor de la
   app (lienzo #0f172a → panel #111827 → tarjeta hundida #1B2539).
   -------------------------------------------------------------------------- */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const panelClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const sunkenCardClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

const searchInputClass =
  "h-12 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-10 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] sm:h-11";

const inputBaseClass =
  "w-full rounded-[10px] border border-[#E7E7EA] bg-white text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const modalTextareaClass = `${inputBaseClass} min-h-[7.5rem] resize-none px-4 py-3`;

const fieldLabelClass =
  "mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

const requiredMark = "ml-0.5 text-[#C22B2B] dark:text-[#F87171]";

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:w-full sm:h-11";

const secondaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:w-full sm:h-11";

const dangerBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full sm:h-11";

/* --- Sistema de modales — cascarón blanco, cabecera marina, cuerpo en
   lienzo y pie hundido con las acciones ancladas. --- */
const modalShellClass =
  "flex max-h-[min(92vh,820px)] w-[min(94vw,40rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-xl";

const modalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";
const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";
const modalEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
const modalTitleClass = "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";
const modalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";
const modalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6";
const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";
const modalSectionClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

type AlertVariant = "success" | "error" | "warning" | "info";
type AlertState = { show: boolean; variant: AlertVariant; title: string; message: string };

const alertTone: Record<AlertVariant, { border: string; bg: string; dot: string; title: string; msg: string }> = {
  success: {
    border: "border-[#BFE6D4] dark:border-[#1E5A42]",
    bg: "bg-[#E9F8F0] dark:bg-[#0F2A1C]",
    dot: "bg-[#04724D] dark:bg-[#4ADE80]",
    title: "text-[#04724D] dark:text-[#4ADE80]",
    msg: "text-[#04724D]/85 dark:text-[#4ADE80]/80",
  },
  error: {
    border: "border-[#F6CFCF] dark:border-[#7F1D1D]",
    bg: "bg-[#FEF2F2] dark:bg-[#3F1518]",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    title: "text-[#C22B2B] dark:text-[#F87171]",
    msg: "text-[#C22B2B]/85 dark:text-[#F87171]/80",
  },
  warning: {
    border: "border-[rgba(230,162,60,0.4)] dark:border-[rgba(230,162,60,0.3)]",
    bg: "bg-[rgba(230,162,60,0.10)] dark:bg-[rgba(230,162,60,0.10)]",
    dot: "bg-[#9A6B15] dark:bg-[#E6A23C]",
    title: "text-[#9A6B15] dark:text-[#E6A23C]",
    msg: "text-[#9A6B15]/85 dark:text-[#E6A23C]/85",
  },
  info: {
    border: "border-[rgba(27,92,255,0.28)] dark:border-[rgba(75,124,255,0.3)]",
    bg: "bg-[rgba(27,92,255,0.06)] dark:bg-[rgba(75,124,255,0.10)]",
    dot: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    title: "text-[#1B5CFF] dark:text-[#4B7CFF]",
    msg: "text-[#1B5CFF]/85 dark:text-[#4B7CFF]/85",
  },
};

function InlineAlert({ variant, title, message }: { variant: AlertVariant; title: string; message: string }) {
  const tone = alertTone[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        <p className={`mt-0.5 text-[13px] ${tone.msg}`}>{message}</p>
      </div>
    </div>
  );
}

const iconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

let tareasFlight: Promise<void> | null = null;
interface Tarea { id: number; usuario_asignado: number | null; usuario_asignado_username?: string; usuario_asignado_full_name?: string; estado?: "BACKLOG" | "TODO" | "EN_PROGRESO" | "HECHO"; orden?: number; descripcion: string; fotos_urls: string[]; fecha_creacion: string; fecha_actualizacion: string; creado_por?: number; creado_por_username?: string; }
function rowsFromResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const maybeResults = (data as { results?: unknown }).results;
    return Array.isArray(maybeResults) ? (maybeResults as T[]) : [];
  }
  return [];
}

const COL_TONE: Record<string, { dot: string }> = {
  TODO: { dot: "bg-[#1B5CFF] dark:bg-[#4B7CFF]" },
  EN_PROGRESO: { dot: "bg-[#E6A23C]" },
  HECHO: { dot: "bg-[#04724D] dark:bg-[#4ADE80]" },
};

export default function TareasTecnicoPage() {
  const taskFormTitleId = useId();
  const descModalTitleId = useId();
  const fotosModalTitleId = useId();
  const deleteModalTitleId = useId();
  const deletePhotoModalTitleId = useId();
  const { permissions, user } = useAuth();
  const tareasPerms = permissions?.tareas ?? {};
  const V = tareasPerms?.view === true; const C = tareasPerms?.create === true; const E = tareasPerms?.edit === true; const D = tareasPerms?.delete === true;
  const lastIdRef = useRef<number | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState("");
  const [statFilter, setStatFilter] = useState<"all" | "asignadas" | "conFotos">("all");
  const [showModal, setShowModal] = useState(false); const [delM, setDelM] = useState(false); const [delTarget, setDelTarget] = useState<Tarea | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Tarea | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; index: number | null; url: string | null }>({ open: false, index: null, url: null });
  const me = user;
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", title: "", message: "" });
  const [mAlert, setMAlert] = useState<AlertState>({ show: false, variant: "success", title: "", message: "" });
  const [descM, setDescM] = useState<{ open: boolean; content: string }>({ open: false, content: "" }); const [fotosM, setFotosM] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });
  const openDesc = (t: Tarea) => setDescM({ open: true, content: t.descripcion || "-" }); const openFotos = (t: Tarea) => setFotosM({ open: true, urls: Array.isArray(t.fotos_urls) ? t.fotos_urls : [] });

  const compress = async (f: File, maxKB: number): Promise<string> => new Promise((res, rej) => { const fr = new FileReader(); fr.readAsDataURL(f); fr.onload = e => { const img = new Image(); img.src = e.target?.result as string; img.onload = () => { const c = document.createElement("canvas"); let w = img.width, h = img.height; if (w > 1400 || h > 1400) { if (w > h) { h = (h / w) * 1400; w = 1400; } else { w = (w / h) * 1400; h = 1400; } } c.width = w; c.height = h; c.getContext("2d")?.drawImage(img, 0, 0, w, h); let q = 0.9; const comp = () => c.toBlob(b => { if (!b) { rej(new Error("err")); return; } if (b.size / 1024 <= maxKB || q <= 0.1) { const r2 = new FileReader(); r2.readAsDataURL(b); r2.onloadend = () => res(r2.result as string); } else { q -= 0.1; comp(); } }, "image/jpeg", q); comp(); }; img.onerror = () => rej(new Error("err")); }; fr.onerror = () => rej(new Error("err")); });
  const publicId = (url: string): string | null => { try { const u = new URL(url); const pi = u.pathname.split("/").findIndex(p => p === "upload"); if (pi === -1) return null; const a = u.pathname.split("/").slice(pi + 1); const si = a.length && /^v\d+$/i.test(a[0]) ? 1 : 0; const pp = a.slice(si); if (!pp.length) return null; const last = pp[pp.length - 1]; const dot = last.lastIndexOf("."); pp[pp.length - 1] = dot > 0 ? last.substring(0, dot) : last; return pp.join("/"); } catch { return null; } };

  const [form, setForm] = useState({ usuario_asignado: null as number | null, descripcion: "", fotos_urls: [] as string[] });
  const onDrop = async (accepted: File[]) => { const cur = form.fotos_urls ?? []; const remain = 2 - cur.length; if (remain <= 0) return; const files = accepted.slice(0, remain).filter(f => f.type.startsWith("image/")); const urls: string[] = []; for (const f of files) { try { const c = await compress(f, 50); const r = await fetchApi("/api/tareas/upload-image/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data_url: c, folder: "tareas/fotos" }) }); if (r.ok) { const d = await r.json(); if (d?.url) urls.push(d.url as string); } } catch { /* ignorar error de red */ } } if (urls.length) setForm({ ...form, fotos_urls: [...cur, ...urls] }); };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/png": [], "image/jpeg": [], "image/webp": [], "image/svg+xml": [] } });
  const deletePhoto = async (index: number, url: string) => { const pid = publicId(url); const upd = (form.fotos_urls ?? []).filter((_, i) => i !== index); try { if (pid) await fetchApi("/api/tareas/delete-image/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public_id: pid }) }); } catch { /* ignorar error de red */ } finally { setForm({ ...form, fotos_urls: upd }); setConfirmDel({ open: false, index: null, url: null }); } };
  const validate = () => { const m: string[] = []; if (!form.descripcion?.trim()) m.push("Descripción"); return { ok: m.length === 0, missing: m }; };

  const openCreate = () => { if (!C) { setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para crear." }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 3000); return; } if (!myId) return; setEditing(null); setForm({ usuario_asignado: myId, descripcion: "", fotos_urls: [] }); setShowModal(true); };
  const edit = (t: Tarea) => { if (!E) { setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para editar." }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 3500); return; } if (!isOwn(t)) return; setEditing(t); setForm({ usuario_asignado: t.usuario_asignado || myId, descripcion: t.descripcion || "", fotos_urls: Array.isArray(t.fotos_urls) ? t.fotos_urls : [] }); setShowModal(true); };
  const delClick = (t: Tarea) => { if (!D) { setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para eliminar." }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 3500); return; } if (!isOwn(t)) return; setDelTarget(t); setDelM(true); };
  const delCancel = () => { if (deleting) return; setDelM(false); setDelTarget(null); };
  const delConfirm = async () => {
    if (!delTarget || !D || !isOwn(delTarget) || deleting) return;
    const id = delTarget.id;
    setDeleting(true);
    try {
      const r = await fetchApi(`/api/tareas/${id}/`, { method: "DELETE" });
      if (r.ok || r.status === 404) {
        setTareas((prev) => prev.filter((t) => t.id !== id));
        setDelM(false);
        setDelTarget(null);
        setAlert({ show: true, variant: "success", title: "Eliminada", message: "Tarea eliminada." });
        setTimeout(() => setAlert((p) => ({ ...p, show: false })), 2500);
        void fetchTareas({ force: true });
      } else {
        let em = "No se pudo eliminar la tarea.";
        try {
          const ed = await r.json();
          em = (ed?.detail as string) || em;
        } catch {
          /* cuerpo no JSON */
        }
        setAlert({ show: true, variant: "error", title: "Error", message: em });
        setTimeout(() => setAlert((p) => ({ ...p, show: false })), 4000);
      }
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "Error de red al eliminar." });
      setTimeout(() => setAlert((p) => ({ ...p, show: false })), 4000);
    } finally {
      setDeleting(false);
    }
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm({ usuario_asignado: myId, descripcion: "", fotos_urls: [] }); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); const isE = !!editing; if (isE && !E) { setMAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para editar." }); setTimeout(() => setMAlert(p => ({ ...p, show: false })), 3500); return; } if (!isE && !C) { setMAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para crear." }); setTimeout(() => setMAlert(p => ({ ...p, show: false })), 3500); return; } if (!myId) return; const { ok, missing } = validate(); if (!ok) { setMAlert({ show: true, variant: "warning", title: "Campos requeridos", message: `Faltan: ${missing.join(", ")}` }); setTimeout(() => setMAlert(p => ({ ...p, show: false })), 3500); return; } try { const u = editing ? `/api/tareas/${editing.id}/` : "/api/tareas/"; const r = await fetchApi(u, { method: isE ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_asignado: myId, descripcion: form.descripcion, fotos_urls: form.fotos_urls ?? [] }) }); if (r.ok) { await fetchTareas(); setShowModal(false); setEditing(null); setForm({ usuario_asignado: myId, descripcion: "", fotos_urls: [] }); setAlert({ show: true, variant: "success", title: isE ? "Actualizada" : "Creada", message: isE ? "Tarea actualizada." : "Tarea creada." }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 2500); } else { let em = "Error al guardar"; try { const ed = await r.json(); em = ed?.detail || JSON.stringify(ed) || em; } catch { em = await r.text(); } setAlert({ show: true, variant: "error", title: "Error", message: em }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 4500); } } catch (er) { setAlert({ show: true, variant: "error", title: "Error", message: String(er) }); setTimeout(() => setAlert(p => ({ ...p, show: false })), 3000); } };

  const myId = useMemo(() => (me?.id ? Number(me.id) : null), [me?.id]);
  const myName = useMemo(() => { if (!me) return "Su usuario"; const fn = [me.first_name, me.last_name].filter(Boolean).join(" ").trim(); return fn || me.username || me.email || "Su usuario"; }, [me]);
  const isOwn = (t: Tarea | null | undefined) => !!(t && myId && Number(t.usuario_asignado) === myId);

  const fetchTareas = async (opts?: { force?: boolean }) => {
    try {
      if (!V) { setTareas([]); setLoading(false); return; }
      if (tareasFlight) {
        await tareasFlight;
        if (!opts?.force) return;
      }
      tareasFlight = (async () => {
        const r = await fetchApi("/api/tareas/", { headers: { "Content-Type": "application/json" } });
        if (r.ok) {
          const d = await r.json();
          const rows = rowsFromResponse<Tarea>(d);
          setTareas(myId ? rows.filter((x) => Number(x.usuario_asignado) === myId) : []);
        } else setTareas([]);
      })();
      await tareasFlight;
    } catch {
      setTareas([]);
    } finally {
      tareasFlight = null;
      setLoading(false);
    }
  };
  useEffect(() => { if (!V) { lastIdRef.current = null; setTareas([]); setLoading(false); return; } if (!myId || lastIdRef.current === myId) return; lastIdRef.current = myId; fetchTareas(); }, [myId, V]);

  const shown = useMemo(() => {
    if (!Array.isArray(tareas)) return [];
    const q = (search || "").trim().toLowerCase();
    return tareas.filter(t => {
      if (q && !(String(t.descripcion || "").toLowerCase().includes(q) || String(t.usuario_asignado_full_name || "").toLowerCase().includes(q) || String(t.usuario_asignado_username || "").toLowerCase().includes(q))) return false;
      if (statFilter === "asignadas" && !t.usuario_asignado) return false;
      if (statFilter === "conFotos" && !(Array.isArray(t.fotos_urls) && t.fotos_urls.length > 0)) return false;
      return true;
    });
  }, [tareas, search, statFilter]);
  const fmtDate = (d: string | null | undefined) => { if (!d) return "-"; try { return new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }); } catch { return "-"; } };
  const stats = useMemo(() => { const l = Array.isArray(tareas) ? tareas : []; return { total: l.length, asignadas: l.filter(t => !!t.usuario_asignado).length, conFotos: l.filter(t => Array.isArray(t.fotos_urls) && t.fotos_urls.length > 0).length }; }, [tareas]);

  const COLS = useMemo(() => [{ key: "TODO" as const, label: "Por hacer" }, { key: "EN_PROGRESO" as const, label: "En proceso" }, { key: "HECHO" as const, label: "Hecho" }], []);
  const getE = (t: Tarea) => { const r = (t.estado || "BACKLOG") as "BACKLOG" | (typeof COLS)[number]["key"]; return (r === "BACKLOG" ? "TODO" : r) as (typeof COLS)[number]["key"]; };
  const byE = useMemo(() => { const g: Record<string, Tarea[]> = { TODO: [], EN_PROGRESO: [], HECHO: [] }; for (const t of shown) g[getE(t)].push(t); for (const k of Object.keys(g)) g[k].sort((a, b) => { const ao = a.orden ?? 0; const bo = b.orden ?? 0; if (ao !== bo) return ao - bo; return String(b.fecha_creacion || "").localeCompare(String(a.fecha_creacion || "")); }); return g as Record<(typeof COLS)[number]["key"], Tarea[]>; }, [shown]);

  const patch = async (id: number, p: Partial<Pick<Tarea, "estado" | "orden">>) => { const r = await fetchApi(`/api/tareas/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.detail || "Error"); } };
  const persist = async (columnEstado: (typeof COLS)[number]["key"], list: Tarea[], before: Tarea[]) => {
    await Promise.all(
      list.map((t, i) => {
        const prevRow = before.find((x) => x.id === t.id);
        if (prevRow && getE(prevRow) === columnEstado && (prevRow.orden ?? 0) === i) {
          return Promise.resolve();
        }
        return patch(t.id, { estado: columnEstado, orden: i });
      })
    );
    tareasFlight = null;
  };
  const move = (all: Tarea[], sid: number, d: { estado: (typeof COLS)[number]["key"]; index: number }) => { const list = [...all]; const si = list.findIndex(t => t.id === sid); if (si < 0) return list; const task = { ...list[si] }; const from = getE(task); list.splice(si, 1); task.estado = d.estado; const dl = list.filter(t => getE(t) === d.estado).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)); dl.splice(Math.max(0, Math.min(d.index, dl.length)), 0, task); dl.forEach((t, i) => (t.orden = i)); const fl = from === d.estado ? [] : list.filter(t => getE(t) === from).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)); fl.forEach((t, i) => (t.orden = i)); const moved = new Set([...dl, ...fl].map(t => t.id)); return [...list.filter(t => !moved.has(t.id)), ...fl, ...dl]; };

  const rootRef = useRef<HTMLDivElement | null>(null); const cm = useRef(new WeakMap<Element, () => void>());
  const tareasRef = useRef(tareas);
  tareasRef.current = tareas;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return monitorForElements({
      onDrop: async ({ source, location }) => {
        const sd = source?.data as { type?: string; id?: unknown } | undefined;
        if (!sd || sd.type !== "tarea") return;
        const sid = Number(sd.id);
        if (!sid) return;
        const prev = tareasRef.current;
        if (!isOwn(prev.find((t) => t.id === sid))) return;
        const dd = location.current.dropTargets?.[0]?.data as { kind?: string; estado?: (typeof COLS)[number]["key"]; index?: unknown } | undefined;
        if (!dd) return;
        let de: (typeof COLS)[number]["key"] | null = null;
        let di: number | null = null;
        if (dd.kind === "card") { de = dd.estado ?? null; di = Number(dd.index); }
        else if (dd.kind === "column") { de = dd.estado ?? null; di = Number(dd.index); }
        if (!de || di === null || Number.isNaN(di)) return;
        if (!prev.some((t) => t.id === sid)) return;
        const next = move(prev, sid, { estado: de, index: di });
        setTareas(next);
        try {
          const dl = next.filter((t) => getE(t) === de).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          const ft = prev.find((t) => t.id === sid);
          const fe = ft ? getE(ft) : "TODO";
          const fl = fe === de ? [] : next.filter((t) => getE(t) === fe).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          await Promise.all([persist(de, dl, prev), fe !== de ? persist(fe, fl, prev) : Promise.resolve()]);
        } catch {
          await fetchTareas({ force: true });
        }
      },
    });
  }, [loading, tareas.length, myId]);

  return (
    <>
      <PageMeta title="Mis tareas" description="Tareas asignadas al técnico" />
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1400px]" style={sheetFontStyle}>
          <nav
            className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
            >
              Inicio
            </Link>
            <span aria-hidden className="text-[#D3D3D8] dark:text-[#3A4661]">
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Mis tareas</span>
          </nav>

          {alert.show && (
            <div className="mb-4">
              <InlineAlert variant={alert.variant} title={alert.title} message={alert.message} />
            </div>
          )}

          <div className="space-y-5">
            {/* Banda marina de cabecera con los conteos a la derecha. */}
            <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                    <svg {...iconSvgProps} className="size-5">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Mi escritorio</p>
                    <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                      Mis tareas
                    </h1>
                    <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                      Solo ve lo asignado a usted. Arrastre tarjetas en el tablero y adjunte fotos como evidencia.
                    </p>
                  </div>
                </div>

                {/* Los conteos son el filtro: mismo patrón de píldoras que
                    `Configuracion/GestionUsuario` y `Tareas/TareasPage`. */}
                <div
                  className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto"
                  role="group"
                  aria-label="Filtrar tareas"
                >
                  {([
                    { value: "all" as const, label: "Totales", count: stats.total },
                    { value: "asignadas" as const, label: "Asignadas", count: stats.asignadas },
                    { value: "conFotos" as const, label: "Con evidencia", count: stats.conFotos },
                  ]).map((chip) => {
                    const active = statFilter === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setStatFilter(chip.value)}
                        aria-pressed={active}
                        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                          active ? "bg-[#E6A23C] text-[#17235B]" : "bg-white/10 text-white/80 hover:bg-white/[0.16] hover:text-white"
                        }`}
                      >
                        <span className="text-[15px] font-semibold tabular-nums">{chip.count}</span>
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <svg {...iconSvgProps} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar en su cartera…"
                  className={searchInputClass}
                  aria-label="Buscar tareas"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1.5 mr-1.5 inline-flex h-8 min-w-[32px] items-center justify-center rounded-[8px] text-[#A1A1AA] transition-colors hover:bg-[#FAFAFA] hover:text-[#52525B] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC]"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>
              {C && (
                <button type="button" onClick={openCreate} className={primaryBtnClass}>
                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nueva tarea
                </button>
              )}
            </div>

            <section className={panelClass} aria-labelledby="mis-tareas-board-heading">
              <div className="border-b border-[#E7E7EA] px-5 py-4 dark:border-[#273244] sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg {...iconSvgProps} className="size-4">
                      <rect x="3" y="4" width="18" height="17" rx="2.2" />
                      <path d="M3 9.5h18M9 4v17" />
                    </svg>
                  </span>
                  <h2 id="mis-tareas-board-heading" className={sectionLabelClass}>
                    Tablero Kanban
                  </h2>
                </div>
                <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                  Arrastra tarjetas entre columnas. Solo puede editar lo suyo.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                {!V ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[#FAFAFA] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#8EA0B8]">
                      <svg {...iconSvgProps} className="size-7">
                        <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                        <path d="M9 12h6" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin acceso</div>
                      <div className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">No tienes permisos para ver las tareas.</div>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2.5 text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      <svg {...iconSvgProps} className="size-4.5 animate-spin" strokeWidth={2}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Cargando tareas...
                    </div>
                  </div>
                ) : shown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                      <svg {...iconSvgProps} className="size-7">
                        <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" />
                        <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" />
                        <path d="M9 11h6M9 15h3" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">No hay tareas</div>
                      <div className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Cree una nueva tarea para empezar.</div>
                    </div>
                    {C && (
                      <button type="button" onClick={openCreate} className={primaryBtnClass}>
                        <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Crear tarea
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <MobileTareaList tareas={shown} startIndex={0} loading={loading} formatDate={(d: string) => fmtDate(d)} onDescripcion={openDesc} onFotos={openFotos} onEdit={E ? edit : undefined} onDelete={D ? delClick : undefined} canEdit={E} canDelete={D} />
                    <div ref={rootRef} className="hidden md:block">
                      <div className="-mx-1 overflow-x-auto px-1 md:overflow-visible">
                        <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-2.5" aria-label="Sus tareas por estado en tres columnas">
                          <caption className="sr-only">Tres columnas: por hacer, en proceso y hecho. Arrastre tarjetas para cambiar estado.</caption>
                          <colgroup><col className="w-[33.333%]" /><col className="w-[33.333%]" /><col className="w-[33.333%]" /></colgroup>
                          <thead>
                            <tr>
                              {COLS.map(col => {
                                const count = (byE[col.key] || []).length;
                                const tone = COL_TONE[col.key];
                                return (
                                  <th key={`hd-${col.key}`} scope="col" className="rounded-[14px] border border-[#E7E7EA] bg-[#FAFAFA] px-4 py-3 text-left align-bottom dark:border-[#273244] dark:bg-[#1B2539]">
                                    <div className="flex items-center gap-2">
                                      <span className={`size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden />
                                      <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#09090B] dark:text-[#F8FAFC]">{col.label}</span>
                                    </div>
                                    <span className="mt-1.5 block font-mono text-[10px] tabular-nums font-medium text-[#6E6E77] dark:text-[#8EA0B8]">{count} tarea{count !== 1 ? "s" : ""}</span>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="align-top">
                              {COLS.map(col => {
                                const cr = (el: HTMLTableCellElement | null) => { if (!el) return; cm.current.get(el)?.(); const c = dropTargetForElements({ element: el, getData: () => ({ kind: "column", estado: col.key, index: (byE[col.key] || []).length }) }); cm.current.set(el, c); };
                                const list = byE[col.key] || [];
                                return (
                                  <td key={col.key} ref={cr} className="rounded-[14px] border border-dashed border-[#E7E7EA] bg-white p-2.5 align-top dark:border-[#273244] dark:bg-[#111827]/50">
                                    <div className="flex min-h-[60px] flex-col gap-2">
                                      {list.map((t, idx) => {
                                        const name = t.usuario_asignado_full_name || t.usuario_asignado_username || "—";
                                        const ini = name !== "—" ? name.slice(0, 1).toUpperCase() : "?";
                                        const fc = Array.isArray(t.fotos_urls) ? t.fotos_urls.length : 0;
                                        const canE = E && isOwn(t);
                                        const canD = D && isOwn(t);
                                        const rr = (el: HTMLDivElement | null) => { if (!el) return; cm.current.get(el)?.(); const d = draggable({ element: el, getInitialData: () => ({ type: "tarea", id: t.id }) }); const tgt = dropTargetForElements({ element: el, getData: () => ({ kind: "card", estado: col.key, index: idx, id: t.id }) }); cm.current.set(el, () => { d(); tgt(); }); };
                                        return (
                                          <div key={t.id} ref={rr} className={`${sunkenCardClass} group cursor-grab p-3 transition-colors hover:border-[#D3D3D8] active:cursor-grabbing dark:hover:border-[#3A4661]`}>
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[11px] font-bold text-[#9A6B15] dark:text-[#E6A23C]">{ini}</span>
                                                  <div className="min-w-0">
                                                    <div className="truncate text-[12px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{name}</div>
                                                    <div className="text-[10px] text-[#6E6E77] dark:text-[#8EA0B8]"><span>#{t.id}</span> · <time dateTime={t.fecha_creacion}>{fmtDate(t.fecha_creacion)}</time></div>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex shrink-0 items-center gap-0.5">
                                                {(canE || canD) && (
                                                  <>
                                                    {canE && <button type="button" onClick={() => edit(t)} className="inline-flex size-7 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:hover:text-[#4B7CFF]" aria-label={`Editar tarea ${t.id}`} title="Editar"><PencilIcon className="size-3.5" /></button>}
                                                    {canD && <button type="button" onClick={() => delClick(t)} className="inline-flex size-7 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#C22B2B]/50 hover:text-[#C22B2B] dark:border-[#273244] dark:bg-[#111827] dark:hover:text-[#F87171]" aria-label={`Eliminar tarea ${t.id}`} title="Eliminar"><TrashBinIcon className="size-3.5" /></button>}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#E7E7EA] pt-2 dark:border-[#273244]">
                                              <button type="button" onClick={() => openDesc(t)} className="text-[11px] font-medium text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]">Descripción</button>
                                              <span className="select-none text-[#D3D3D8] dark:text-[#3A4661]">|</span>
                                              <button type="button" onClick={() => openFotos(t)} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B5CFF] hover:underline dark:text-[#4B7CFF]">Fotos{fc > 0 ? ` (${fc})` : ""}</button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Modal: crear / editar tarea */}
      <Modal isOpen={showModal} onClose={closeModal} closeOnBackdropClick={false} className={modalShellClass} ariaLabelledBy={taskFormTitleId}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className={modalHeaderClass}>
            <div className="flex items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg {...iconSvgProps} className="size-5">
                  <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" />
                  <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" />
                  <path d="M9 11h6M9 15h3" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={modalEyebrowClass}>Mi escritorio · Mis tareas</p>
                  {editing ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">Edición</span>
                  ) : (
                    <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Nueva</span>
                  )}
                </div>
                <h2 id={taskFormTitleId} className={`mt-1 ${modalTitleClass}`}>{editing ? "Editar tarea" : "Crear tarea"}</h2>
                <p className={modalSubtitleClass}>La tarea queda asignada a usted; describa el trabajo y adjunte hasta 2 fotos si aplica.</p>
              </div>
            </div>
          </header>
          <form onSubmit={submit} className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <div className={modalBodyClass}>
              {mAlert.show && <InlineAlert variant={mAlert.variant} title={mAlert.title} message={mAlert.message} />}

              <section className={modalSectionClass}>
                <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg {...iconSvgProps} className="size-4">
                      <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                      <circle cx="12" cy="7.5" r="3.8" />
                    </svg>
                  </span>
                  <p className={sectionLabelClass}>Asignación</p>
                </div>
                <p className="-mt-2 mb-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  En esta vista las tareas se registran siempre a su usuario.
                </p>
                <div className={`${sunkenCardClass} flex items-center gap-3 border-[#E7E7EA] bg-white px-4 py-3 dark:border-[#273244] dark:bg-[#111827]`}>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(230,162,60,0.16)] text-[14px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                    {myName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{myName}</p>
                    {me?.email ? <p className="truncate text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">{String(me.email)}</p> : null}
                  </div>
                </div>
              </section>

              <section className={modalSectionClass}>
                <div className="mb-3 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                    <svg {...iconSvgProps} className="size-4">
                      <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                      <path d="M14 2v4h4" />
                      <path d="M8 10h8M8 14h8" />
                    </svg>
                  </span>
                  <p className={sectionLabelClass}>Descripción</p>
                </div>
                <p className="-mt-1 mb-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Qué hay que hacer y en qué contexto.
                </p>
                <label htmlFor="descripcion-tecnico" className={fieldLabelClass}>
                  Detalle de la tarea<span className={requiredMark}>*</span>
                </label>
                <textarea
                  id="descripcion-tecnico"
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={4}
                  placeholder="Ej. Revisar cableado en cuarto de servicio antes del viernes."
                  className={modalTextareaClass}
                />
              </section>

              <section className={modalSectionClass}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(23,35,91,0.10)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>Evidencia</p>
                  </div>
                  <span className="tabular-nums text-[12px] font-medium text-[#A1A1AA] dark:text-[#8EA0B8]">{form.fotos_urls.length}/2</span>
                </div>
                <p className="-mt-1 mb-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Opcional · PNG, JPG o WEBP · máx. 2
                </p>
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col gap-3 rounded-[14px] border border-dashed border-[#D3D3D8] bg-white px-4 py-5 transition-colors dark:border-[#3A4661] dark:bg-[#111827] sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                    isDragActive
                      ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] ring-4 ring-[rgba(27,92,255,0.14)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]"
                      : "hover:border-[#1B5CFF]/50 dark:hover:border-[#4B7CFF]/50"
                  } ${form.fotos_urls.length >= 2 ? "pointer-events-none opacity-45" : ""}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] text-[#6E6E77] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#8EA0B8]">
                    <svg {...iconSvgProps} className="size-6">
                      <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                      <path d="M12 10v6M9 13h6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                      {form.fotos_urls.length >= 2 ? "Límite de 2 fotos" : "Añadir imágenes"}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      {form.fotos_urls.length >= 2 ? "Elimine una foto para subir otra." : "Arrastre archivos aquí o pulse para elegir desde su equipo."}
                    </p>
                  </div>
                </div>
                {form.fotos_urls.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-3.5">
                    {form.fotos_urls.map((url, idx) => (
                      <li key={idx} className="relative overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                        <img src={url} alt={`Vista previa ${idx + 1}`} className="aspect-[4/3] h-28 w-full object-cover sm:h-32" />
                        <button
                          type="button"
                          onClick={() => setConfirmDel({ open: true, index: idx, url })}
                          className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-[10px] border border-white/20 bg-white/95 text-[#52525B] shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-[#C22B2B] dark:border-white/10 dark:bg-[#111827]/90 dark:text-[#F8FAFC] dark:hover:text-[#F87171]"
                          aria-label={`Eliminar foto ${idx + 1}`}
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className={modalFooterClass}>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={closeModal} className={secondaryBtnClass}>Cancelar</button>
                <button type="submit" className={primaryBtnClass}>{editing ? "Guardar cambios" : "Crear tarea"}</button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal: descripción completa */}
      <Modal isOpen={descM.open} onClose={() => setDescM({ open: false, content: "" })} closeOnBackdropClick={false} className={`${modalSmallShellClass} max-w-2xl`} ariaLabelledBy={descModalTitleId}>
        <header className={modalHeaderClass}>
          <div className="flex items-center gap-3">
            <span className={modalHeaderIconClass}>
              <svg {...iconSvgProps} className="size-5">
                <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <path d="M14 2v4h4" />
                <path d="M8 10h8M8 14h8" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={modalEyebrowClass}>Mis tareas</p>
              <h3 id={descModalTitleId} className={`mt-1 ${modalTitleClass}`}>Descripción</h3>
            </div>
          </div>
        </header>
        <div className="max-h-[60vh] overflow-y-auto bg-white p-5 dark:bg-[#111827] custom-scrollbar">
          <pre className={`${sunkenCardClass} whitespace-pre-wrap p-3.5 text-[13px] leading-relaxed text-[#09090B] dark:text-[#F8FAFC]`}>
            {descM.content || "—"}
          </pre>
        </div>
        <div className={modalFooterClass}>
          <div className="flex justify-end">
            <button type="button" onClick={() => setDescM({ open: false, content: "" })} className={secondaryBtnClass}>Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Modal: fotos adjuntas */}
      <Modal isOpen={fotosM.open} onClose={() => setFotosM({ open: false, urls: [] })} closeOnBackdropClick={false} className={`${modalSmallShellClass} max-w-3xl`} ariaLabelledBy={fotosModalTitleId}>
        <header className={modalHeaderClass}>
          <div className="flex items-center gap-3">
            <span className={modalHeaderIconClass}>
              <svg {...iconSvgProps} className="size-5">
                <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={modalEyebrowClass}>Mis tareas</p>
              <h3 id={fotosModalTitleId} className={`mt-1 ${modalTitleClass}`}>Fotos</h3>
            </div>
          </div>
        </header>
        <div className="max-h-[70vh] overflow-y-auto bg-white p-5 dark:bg-[#111827] custom-scrollbar">
          {Array.isArray(fotosM.urls) && fotosM.urls.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fotosM.urls.map((url, idx) => (
                <a
                  key={`${url}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]"
                >
                  <img src={url} alt={`Foto ${idx + 1}`} className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2">
                    <div className="text-[11px] text-white/95">Ver en tamaño completo</div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={`${sunkenCardClass} border-dashed p-4 text-center text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]`}>
              Sin fotos adjuntas
            </div>
          )}
        </div>
        <div className={modalFooterClass}>
          <div className="flex justify-end">
            <button type="button" onClick={() => setFotosM({ open: false, urls: [] })} className={secondaryBtnClass}>Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Modal: confirmar eliminación de tarea */}
      <Modal isOpen={delM} onClose={delCancel} closeOnBackdropClick={false} className={modalSmallShellClass} ariaLabelledBy={deleteModalTitleId}>
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg {...iconSvgProps} className="size-5">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </span>
            <div>
              <h3 id={deleteModalTitleId} className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                Confirmar eliminación
              </h3>
              <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <p className="mb-6 text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
            ¿Estás seguro de que deseas eliminar esta tarea?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={delCancel} disabled={deleting} className={secondaryBtnClass}>Cancelar</button>
            <button type="button" onClick={delConfirm} disabled={deleting} className={dangerBtnClass} aria-busy={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: confirmar eliminación de foto */}
      <Modal isOpen={confirmDel.open} onClose={() => setConfirmDel({ open: false, index: null, url: null })} closeOnBackdropClick={false} className={modalSmallShellClass} ariaLabelledBy={deletePhotoModalTitleId}>
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg {...iconSvgProps} className="size-5">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </span>
            <div>
              <h3 id={deletePhotoModalTitleId} className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                Eliminar foto
              </h3>
              <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Se eliminará permanentemente.</p>
            </div>
          </div>
          <p className="mb-6 text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
            ¿Estás seguro de que deseas eliminar esta foto?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmDel({ open: false, index: null, url: null })} className={secondaryBtnClass}>Cancelar</button>
            <button
              type="button"
              onClick={() => { if (confirmDel.index !== null && confirmDel.url) deletePhoto(confirmDel.index, confirmDel.url); }}
              className={dangerBtnClass}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
