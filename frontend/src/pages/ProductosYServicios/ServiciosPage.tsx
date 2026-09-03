import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

import { useAuth } from "@/context/AuthContext";
import PageMeta from "@/components/common/PageMeta";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { TrashBinIcon } from "@/icons";

/* --------------------------------------------------------------------------
   Mismo sistema que `Perfil/ProfilePage`, `Configuracion/GestionUsuario`,
   `MiEscritorio/Tareas` y `ContactosNegocio/Clientes`: marino + dorado sobre
   lienzo blanco, azul eléctrico como único acento de acción, líneas de 1 px.
   En oscuro, la familia slate del contenedor (lienzo #0f172a → panel #111827
   → tarjeta hundida #1B2539).
   -------------------------------------------------------------------------- */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const panelClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const inputFieldToneClass =
  "border-[#E7E7EA] bg-white text-[#09090B] caret-[#09090B] scheme-light placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:caret-[#F8FAFC] dark:scheme-dark dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#09090B] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#111827] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F8FAFC]";

const searchInputClass =
  `h-12 w-full rounded-[10px] border pl-10 pr-10 text-[15px] tracking-[-0.1px] outline-none transition-colors sm:h-11 ${inputFieldToneClass}`;

const inputBaseClass =
  `w-full rounded-[10px] border text-[15px] tracking-[-0.1px] outline-none transition-colors ${inputFieldToneClass}`;

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

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

const actionDangerBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#C22B2B]/50 hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C22B2B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#F87171]/50 dark:hover:text-[#F87171]";

const pagerBtnClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#09090B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048]";

const modalShellClass =
  "flex max-h-[min(92vh,860px)] w-[min(94vw,44rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-2xl";

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

function RowActions({
  name,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  name: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canEdit && !canDelete) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]">
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={actionBtnClass}
          title="Editar"
          aria-label={`Editar ${name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
          </svg>
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className={actionDangerBtnClass}
          title="Eliminar"
          aria-label={`Eliminar ${name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="m6 6 1 14h10l1-14" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function statusBadgeClass(activo: boolean) {
  return activo
    ? "bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]"
    : "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#8EA0B8]";
}

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

const formatPrecioMxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number.isFinite(n) ? n : 0);

interface Servicio {
  id: number;
  idx: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

interface Concepto {
  id: number;
  folio: string;
  concepto: string;
  descripcion?: string;
  precio1: number;
  imagen_url?: string;
}

type AlertState = {
  show: boolean;
  variant: AlertVariant;
  title: string;
  message: string;
};

const roundConceptoPrecio = (n: number) => Math.round(Math.max(0, n) * 100) / 100;

const CONCEPTO_IMAGEN_FOLDER = "productos/conceptos";
const CONCEPTO_DESCRIPCION_MAX = 2000;

const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;
    const after = parts.slice(uploadIdx + 1);
    const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
    const pathParts = after.slice(startIdx);
    if (!pathParts.length) return null;
    const last = pathParts[pathParts.length - 1];
    const dot = last.lastIndexOf(".");
    pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
    return pathParts.join("/");
  } catch {
    return null;
  }
};

const compressImage = async (
  file: File,
  maxSizeKB: number,
  maxWidth: number = 1400,
  maxHeight: number = 1400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx?.drawImage(img, 0, 0, width, height);

        const minQuality = 0.1;
        const maxQuality = 0.95;
        let attempts = 0;
        const maxAttempts = 8;

        const binarySearchCompress = (low: number, high: number) => {
          if (attempts >= maxAttempts || high - low < 0.01) {
            const finalQuality = (low + high) / 2;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Error al comprimir la imagen"));
                  return;
                }
                const r = new FileReader();
                r.readAsDataURL(blob);
                r.onloadend = () => resolve(r.result as string);
              },
              "image/jpeg",
              finalQuality
            );
            return;
          }

          attempts++;
          const midQuality = (low + high) / 2;
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Error al comprimir la imagen"));
                return;
              }
              const sizeKB = blob.size / 1024;
              if (Math.abs(sizeKB - maxSizeKB) < 5) {
                const r = new FileReader();
                r.readAsDataURL(blob);
                r.onloadend = () => resolve(r.result as string);
              } else if (sizeKB > maxSizeKB) {
                binarySearchCompress(low, midQuality);
              } else {
                binarySearchCompress(midQuality, high);
              }
            },
            "image/jpeg",
            midQuality
          );
        };

        binarySearchCompress(minQuality, maxQuality);
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
  });
};

const formatApiErrors = (txt: string): string => {
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === "object") {
      const parts: string[] = [];
      Object.entries(data).forEach(([k, v]) => {
        if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
        else if (typeof v === "string") parts.push(`${k}: ${v}`);
      });
      return parts.join(" | ");
    }
  } catch {
    // Mantener texto original si el payload no es JSON estructurado
  }
  return txt;
};

export default function Servicios() {
  const servicioModalTitleId = useId();
  const conceptoModalTitleId = useId();
  const deleteServicioTitleId = useId();
  const deleteConceptoTitleId = useId();
  const { permissions, isAdmin } = useAuth();
  const asBool = (v: unknown, defaultValue: boolean) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true") return true;
      if (s === "false") return false;
    }
    return defaultValue;
  };

  // Soporte para mayúsculas/minúsculas en la llave del módulo
  const modulePerms = permissions?.servicios || permissions?.Servicios || {};

  const canServiciosView = isAdmin || asBool(modulePerms.view, false);
  const canServiciosCreate = isAdmin || asBool(modulePerms.create, false);
  const canServiciosEdit = isAdmin || asBool(modulePerms.edit, false);
  const canServiciosDelete = isAdmin || asBool(modulePerms.delete, false);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const [activeView, setActiveView] = useState<"servicios" | "conceptos">("servicios");
  const [viewMode, setViewMode] = useState<"table" | "cards">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "cards" : "table",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "info", title: "", message: "" });

  const [showModal, setShowModal] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [modalError, setModalError] = useState("");
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<Concepto | null>(null);
  const [conceptoModalError, setConceptoModalError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [showDeleteConceptoModal, setShowDeleteConceptoModal] = useState(false);
  const [conceptoToDelete, setConceptoToDelete] = useState<Concepto | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    activo: true,
  });
  const [conceptoFormData, setConceptoFormData] = useState({
    folio: "",
    concepto: "",
    descripcion: "",
    precio1: "",
    imagen_url: "",
  });
  const [conceptoImageUploading, setConceptoImageUploading] = useState(false);
  const conceptoInitialImagenRef = useRef<string>("");

  const deleteConceptoCloudinary = async (url: string) => {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;
    await fetchApi("/api/ordenes/delete-image/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchServicios = async (page = 1, search = ""): Promise<Servicio[]> => {
    if (!canServiciosView) {
      setServicios([]);
      setTotalCount(0);
      setLoading(false);
      return [];
    }

    const query = new URLSearchParams({
      page: String(page),
      page_size: String(itemsPerPage),
    });
    if (search.trim()) query.set("search", search.trim());
    query.set("ordering", "idx");

    const requestKey = `servicios:list:${query.toString()}`;

    if (inFlightKeyRef.current === requestKey) {
      return [];
    }

    inFlightKeyRef.current = requestKey;

    if (listAbortRef.current) {
      try {
        listAbortRef.current.abort();
      } catch {
        // AbortController puede lanzar si la petición ya terminó
      }
    }
    const controller = new AbortController();
    listAbortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetchApi(`/api/servicios/?${query.toString()}`, {
        method: "GET",
        cache: "no-store" as RequestCache,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) {
        setServicios([]);
        setTotalCount(0);
        return [];
      }

      const payload = data as { results?: unknown; count?: unknown };
      const list = Array.isArray(payload.results) ? (payload.results as Servicio[]) : [];
      const count = typeof payload.count === "number" ? payload.count : list.length;
      setServicios(list);
      setTotalCount(count);
      return list;
    } catch (e: unknown) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        return [];
      }
      setServicios([]);
      setTotalCount(0);
      return [];
    } finally {
      setLoading(false);
      if (inFlightKeyRef.current === requestKey) {
        inFlightKeyRef.current = null;
      }
    }
  };

  useEffect(() => {
    fetchServicios(currentPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canServiciosView, currentPage, debouncedSearch]);

  const fetchConceptos = async () => {
    if (!canServiciosView) {
      setConceptos([]);
      return;
    }
    setLoadingConceptos(true);
    try {
      const mapped: Concepto[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= 20) {
        const res = await fetchApi(`/api/conceptos/?ordering=folio&page_size=200&page=${page}`, {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => ({ results: [] }));
        if (!res.ok) {
          setConceptos([]);
          return;
        }
        const list = Array.isArray((data as { results?: unknown })?.results)
          ? ((data as { results: unknown[] }).results)
          : Array.isArray(data)
            ? data
            : [];
        const count = typeof (data as { count?: unknown })?.count === "number"
          ? (data as { count: number }).count
          : list.length;
        totalPages = Math.max(1, Math.ceil(count / 200));
        for (let idx = 0; idx < list.length; idx++) {
          const c = list[idx] as Record<string, unknown>;
          mapped.push({
            id: Number(c?.id ?? mapped.length + 1),
            folio: String(c?.folio ?? c?.idx ?? c?.id ?? mapped.length + 1),
            concepto: String(c?.concepto ?? c?.nombre ?? "").trim(),
            descripcion: String(c?.descripcion ?? "").trim(),
            precio1: Number(c?.precio1 ?? c?.precio ?? 0),
            imagen_url: String(c?.imagen_url ?? "").trim(),
          });
        }
        if (list.length === 0) break;
        page += 1;
      }
      setConceptos(mapped);
    } catch {
      setConceptos([]);
    } finally {
      setLoadingConceptos(false);
    }
  };

  useEffect(() => {
    fetchConceptos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canServiciosView]);

  const filteredConceptos = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return conceptos;
    return conceptos.filter((c) =>
      c.folio.toLowerCase().includes(q) ||
      c.concepto.toLowerCase().includes(q) ||
      (c.descripcion || "").toLowerCase().includes(q) ||
      String(c.precio1).toLowerCase().includes(q)
    );
  }, [conceptos, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const stats = useMemo(() => {
    const total = totalCount || servicios.length;
    const activos = servicios.filter((s) => s.activo !== false).length;
    const inactivos = Math.max(0, servicios.length - activos);
    return { total, activos, inactivos };
  }, [servicios, totalCount]);

  const onDropConceptoImage = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles.find((f) => f.type.startsWith("image/"));
    if (!file) return;
    setConceptoModalError("");
    setConceptoImageUploading(true);
    try {
      const compressed = await compressImage(file, 80, 1400, 1400);
      const resp = await fetchApi("/api/ordenes/upload-image/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_url: compressed, folder: CONCEPTO_IMAGEN_FOLDER }),
      });
      if (!resp.ok) {
        setConceptoModalError("No se pudo subir la imagen.");
        return;
      }
      const data = await resp.json().catch(() => null);
      const newUrl = data?.url ? String(data.url) : "";
      if (!newUrl) {
        setConceptoModalError("No se pudo subir la imagen.");
        return;
      }
      setConceptoFormData((prev) => ({ ...prev, imagen_url: newUrl }));
    } catch (err) {
      setConceptoModalError(String(err));
    } finally {
      setConceptoImageUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropConceptoImage,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] },
    maxFiles: 1,
    disabled: conceptoImageUploading,
    multiple: false,
  });

  const openCreate = () => {
    if (!canServiciosCreate) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    setEditingServicio(null);
    setModalError("");
    setFormData({ nombre: "", descripcion: "", categoria: "", activo: true });
    setShowModal(true);
  };

  const openCreateConcepto = () => {
    if (!canServiciosCreate) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingConcepto(null);
    setConceptoModalError("");
    conceptoInitialImagenRef.current = "";
    setConceptoFormData({ folio: "", concepto: "", descripcion: "", precio1: "", imagen_url: "" });
    setShowConceptoModal(true);
  };

  const handleEdit = (s: Servicio) => {
    if (!canServiciosEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    setEditingServicio(s);
    setModalError("");
    setFormData({
      nombre: s.nombre || "",
      descripcion: s.descripcion || "",
      categoria: s.categoria || "",
      activo: s.activo !== false,
    });
    setShowModal(true);
  };

  const handleEditConcepto = (c: Concepto) => {
    if (!canServiciosEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingConcepto(c);
    setConceptoModalError("");
    const precioBase = roundConceptoPrecio(Number(c.precio1 ?? 0));
    conceptoInitialImagenRef.current = (c.imagen_url || "").trim();
    setConceptoFormData({
      folio: c.folio || "",
      concepto: c.concepto || "",
      descripcion: c.descripcion || "",
      precio1: String(precioBase),
      imagen_url: c.imagen_url || "",
    });
    setShowConceptoModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingServicio(null);
    setModalError("");
  };

  const handleDeleteClick = (s: Servicio) => {
    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setServicioToDelete(s);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setServicioToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConceptoClick = (c: Concepto) => {
    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setConceptoToDelete(c);
    setShowDeleteConceptoModal(true);
  };

  const handleCancelDeleteConcepto = () => {
    setConceptoToDelete(null);
    setShowDeleteConceptoModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!servicioToDelete) return;

    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    try {
      const res = await fetchApi(`/api/servicios/${servicioToDelete.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setAlert({ show: true, variant: "error", title: "Error", message: formatApiErrors(txt) || "No se pudo eliminar el servicio." });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
        return;
      }

      await fetchServicios(currentPage, debouncedSearch);
      setShowDeleteModal(false);
      setServicioToDelete(null);
      setAlert({ show: true, variant: "success", title: "Servicio eliminado", message: "El servicio ha sido eliminado." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (e) {
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingServicio && !canServiciosCreate) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    if (editingServicio && !canServiciosEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    const requiredMissing = [!String(formData.nombre || "").trim() ? "Nombre del servicio" : null].filter(Boolean) as string[];
    if (requiredMissing.length) {
      setModalError(`Faltan campos requeridos: ${requiredMissing.join(", ")}`);
      return;
    }

    const url = editingServicio ? `/api/servicios/${editingServicio.id}/` : "/api/servicios/";
    const method = editingServicio ? "PUT" : "POST";
    const nombreServicio = formData.nombre;
    const isEditing = !!editingServicio;

    try {
      const response = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: String(formData.nombre || "").trim(),
          descripcion: String(formData.descripcion || ""),
          categoria: String(formData.categoria || ""),
          activo: !!formData.activo,
        }),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        setModalError(formatApiErrors(txt) || "No se pudo guardar el servicio.");
        return;
      }

      await fetchServicios(currentPage, debouncedSearch);
      setShowModal(false);
      setEditingServicio(null);

      setAlert({
        show: true,
        variant: "success",
        title: isEditing ? "Servicio actualizado" : "Servicio creado",
        message: isEditing
          ? `El servicio "${nombreServicio}" ha sido actualizado exitosamente.`
          : `El servicio "${nombreServicio}" ha sido creado exitosamente.`,
      });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (error) {
      setModalError(String(error));
    }
  };

  const handleCloseConceptoModal = async () => {
    const url = (conceptoFormData.imagen_url || "").trim();
    const initial = conceptoInitialImagenRef.current;
    if (url && url !== initial) {
      try {
        await deleteConceptoCloudinary(url);
      } catch {
        /* ignore */
      }
    }
    setShowConceptoModal(false);
    setEditingConcepto(null);
    setConceptoModalError("");
    setConceptoFormData({ folio: "", concepto: "", descripcion: "", precio1: "", imagen_url: "" });
    conceptoInitialImagenRef.current = "";
  };

  const removeConceptoImage = async () => {
    const url = (conceptoFormData.imagen_url || "").trim();
    if (!url) return;
    setConceptoImageUploading(true);
    try {
      await deleteConceptoCloudinary(url);
    } finally {
      setConceptoFormData((prev) => ({ ...prev, imagen_url: "" }));
      setConceptoImageUploading(false);
    }
  };

  const handleSubmitConcepto = async (e: React.FormEvent) => {
    e.preventDefault();
    setConceptoModalError("");
    if (!editingConcepto && !canServiciosCreate) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para crear conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    if (editingConcepto && !canServiciosEdit) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para editar conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    if (!String(conceptoFormData.folio).trim() || !String(conceptoFormData.concepto).trim()) {
      setConceptoModalError("Faltan campos requeridos: Folio y Concepto.");
      return;
    }
    const folio = String(conceptoFormData.folio).trim();
    const folioKey = folio.toLowerCase();
    const folioDuplicado = conceptos.some(
      (c) =>
        c.folio.trim().toLowerCase() === folioKey &&
        String(c.id) !== String(editingConcepto?.id ?? "")
    );
    if (folioDuplicado) {
      setConceptoModalError(`Ya existe un concepto con el folio "${folio}". No se puede agregar duplicado.`);
      return;
    }
    const descripcion = String(conceptoFormData.descripcion || "").trim();
    if (descripcion.length > CONCEPTO_DESCRIPCION_MAX) {
      setConceptoModalError(`La descripción no puede superar ${CONCEPTO_DESCRIPCION_MAX} caracteres.`);
      return;
    }
    const basePrecio = Number(conceptoFormData.precio1 || 0);
    const precio1 = roundConceptoPrecio(basePrecio);
    const payload = {
      folio,
      concepto: String(conceptoFormData.concepto).trim(),
      descripcion,
      precio1,
      imagen_url: String(conceptoFormData.imagen_url || "").trim(),
    };
    const url = editingConcepto ? `/api/conceptos/${editingConcepto.id}/` : "/api/conceptos/";
    const method = editingConcepto ? "PUT" : "POST";
    try {
      const response = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        setConceptoModalError(formatApiErrors(txt) || "No se pudo guardar el concepto.");
        return;
      }
      await fetchConceptos();
      setShowConceptoModal(false);
      setEditingConcepto(null);
      setConceptoFormData({ folio: "", concepto: "", descripcion: "", precio1: "", imagen_url: "" });
      conceptoInitialImagenRef.current = "";
      setAlert({
        show: true,
        variant: "success",
        title: editingConcepto ? "Concepto actualizado" : "Concepto creado",
        message: editingConcepto ? "El concepto ha sido actualizado." : "El concepto ha sido creado.",
      });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (error) {
      setConceptoModalError(String(error));
    }
  };

  const handleConfirmDeleteConcepto = async () => {
    if (!conceptoToDelete) return;
    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    try {
      const res = await fetchApi(`/api/conceptos/${conceptoToDelete.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setAlert({ show: true, variant: "error", title: "Error", message: formatApiErrors(txt) || "No se pudo eliminar el concepto." });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
        return;
      }
      await fetchConceptos();
      setShowDeleteConceptoModal(false);
      setConceptoToDelete(null);
      setAlert({ show: true, variant: "success", title: "Concepto eliminado", message: "El concepto ha sido eliminado." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (e) {
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  const viewToggleBtnClass = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:cursor-not-allowed disabled:opacity-45 ${
      active
        ? "bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.08)] dark:bg-[#111827] dark:text-[#4B7CFF]"
        : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
    }`;

  return (
    <div className="min-h-[calc(100dvh-5rem)] w-full min-w-0 overflow-x-hidden">
      <div
        className="mx-auto w-full max-w-[min(100%,1400px)] space-y-5 px-3 pb-10 pt-4 sm:px-5 sm:pb-12 sm:pt-6 md:px-6 lg:px-8"
        style={sheetFontStyle}
      >
        <PageMeta title="Servicios | Sistema" description="Gestión de servicios y conceptos para cotizaciones" />

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
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Servicios</span>
        </nav>

        {alert.show && (
          <div className="mb-4">
            <InlineAlert variant={alert.variant} title={alert.title} message={alert.message} />
          </div>
        )}

        {!canServiciosView ? (
          <div className="rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] px-4 py-10 text-center text-[15px] text-[#52525B] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#B7C1D1] sm:px-6">
            No tienes permiso para ver Servicios.
          </div>
        ) : (
          <div className="space-y-5">
            <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                    <svg {...iconSvgProps} className="size-5">
                      <path d="M4 7h16" />
                      <path d="M4 12h16" />
                      <path d="M4 17h10" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                      Productos y servicios
                    </p>
                    <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                      Servicios y conceptos
                    </h1>
                    <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                      Administra el catálogo de servicios y los conceptos con precio e imagen que alimentan las cotizaciones.
                    </p>
                  </div>
                </div>

                <div
                  className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto"
                  role="group"
                  aria-label="Cambiar catálogo"
                >
                  {([
                    { value: "servicios" as const, label: "Servicios", count: stats.total },
                    { value: "conceptos" as const, label: "Conceptos", count: conceptos.length },
                  ]).map((chip) => {
                    const active = activeView === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setActiveView(chip.value)}
                        aria-pressed={active}
                        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                          active
                            ? "bg-[#E6A23C] text-[#17235B]"
                            : "bg-white/10 text-white/80 hover:bg-white/[0.16] hover:text-white"
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="relative min-w-0">
                <svg {...iconSvgProps} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeView === "servicios"
                      ? "Buscar por nombre, categoría o descripción…"
                      : "Buscar por folio, concepto, descripción o precio…"
                  }
                  className={searchInputClass}
                  aria-label={activeView === "servicios" ? "Buscar servicios" : "Buscar conceptos"}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 w-10 items-center justify-center rounded-[8px] text-[#A1A1AA] transition-colors hover:bg-[#FAFAFA] hover:text-[#52525B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC]"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>
              {activeView === "servicios" && canServiciosCreate && (
                <button type="button" onClick={openCreate} className={primaryBtnClass}>
                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo servicio
                </button>
              )}
              {activeView === "conceptos" && canServiciosCreate && (
                <button type="button" onClick={openCreateConcepto} className={primaryBtnClass}>
                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nuevo concepto
                </button>
              )}
            </div>

            <section className={panelClass} aria-labelledby="servicios-list-heading">
              <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <rect x="3" y="4" width="18" height="17" rx="2.2" />
                        <path d="M3 9.5h18" />
                      </svg>
                    </span>
                    <h2 id="servicios-list-heading" className={sectionLabelClass}>
                      {activeView === "servicios" ? "Listado de servicios" : "Listado de conceptos"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {activeView === "servicios" && (
                      <p className="text-[12px] font-medium tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">
                        {stats.activos} activos · {stats.inactivos} inactivos en esta página
                      </p>
                    )}
                    <div
                      className="flex items-center gap-0.5 rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] p-0.5 dark:border-[#273244] dark:bg-[#1B2539]"
                      role="group"
                      aria-label="Cambiar vista del listado"
                    >
                      <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        title="Vista tabla"
                        aria-label="Vista tabla"
                        aria-pressed={viewMode === "table"}
                        className={viewToggleBtnClass(viewMode === "table")}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 6h16" />
                          <path d="M4 12h16" />
                          <path d="M4 18h16" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("cards")}
                        title="Vista tarjetas"
                        aria-label="Vista tarjetas"
                        aria-pressed={viewMode === "cards"}
                        className={viewToggleBtnClass(viewMode === "cards")}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                  {viewMode === "table"
                    ? activeView === "servicios"
                      ? "Servicios según búsqueda y paginación del servidor. En pantallas pequeñas usa tarjetas o desplázate horizontalmente."
                      : "Conceptos del catálogo con precio base e imagen. En pantallas pequeñas usa tarjetas o desplázate horizontalmente."
                    : activeView === "servicios"
                      ? "Servicios según búsqueda y paginación del servidor."
                      : "Conceptos del catálogo con precio base e imagen."}
                </p>
              </div>

              <div className="p-2 sm:p-3">
                {viewMode === "cards" ? (
                  <div>
                    {activeView === "servicios" && loading && (
                      <div className="flex items-center justify-center gap-2.5 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-[14px] text-[#6E6E77] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#8EA0B8]" role="status">
                        <svg {...iconSvgProps} className="size-4 animate-spin" strokeWidth={2}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Cargando…
                      </div>
                    )}
                    {activeView === "servicios" && !loading && servicios.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {servicios.map((s) => (
                          <article
                            key={s.id}
                            className="flex flex-col gap-3 rounded-[16px] border border-[#E7E7EA] bg-white p-3 dark:border-[#273244] dark:bg-[#1B2539]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{s.nombre}</p>
                                <p className="mt-0.5 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">{s.categoria || "Sin categoría"}</p>
                              </div>
                              <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(s.activo !== false)}`}>
                                {s.activo !== false ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-[13px] text-[#52525B] dark:text-[#B7C1D1]">{s.descripcion || "Sin descripción"}</p>
                            <div className="mt-auto flex justify-end">
                              <RowActions
                                name={`servicio ${s.nombre}`}
                                canEdit={canServiciosEdit}
                                canDelete={canServiciosDelete}
                                onEdit={() => handleEdit(s)}
                                onDelete={() => handleDeleteClick(s)}
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {activeView === "servicios" && !loading && !servicios.length && (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-center dark:border-[#273244] dark:bg-[#1B2539]">
                        <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                          <svg {...iconSvgProps} className="size-7">
                            <path d="M4 7h16M4 12h16M4 17h10" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin servicios</p>
                          <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            {searchTerm.trim() ? "Ajusta la búsqueda o crea un servicio." : "Crea un servicio para empezar el catálogo."}
                          </p>
                        </div>
                        {canServiciosCreate && (
                          <button type="button" onClick={openCreate} className={primaryBtnClass}>
                            <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Nuevo servicio
                          </button>
                        )}
                      </div>
                    )}
                    {activeView === "conceptos" && loadingConceptos && (
                      <div className="flex items-center justify-center gap-2.5 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-[14px] text-[#6E6E77] dark:border-[#273244] dark:bg-[#1B2539] dark:text-[#8EA0B8]" role="status">
                        <svg {...iconSvgProps} className="size-4 animate-spin" strokeWidth={2}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Cargando…
                      </div>
                    )}
                    {activeView === "conceptos" && !loadingConceptos && filteredConceptos.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredConceptos.map((c) => (
                          <article
                            key={c.id}
                            className="flex gap-3 rounded-[16px] border border-[#E7E7EA] bg-white p-3 dark:border-[#273244] dark:bg-[#1B2539]"
                          >
                            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]">
                              {c.imagen_url ? (
                                <img src={c.imagen_url} alt={`Imagen de ${c.concepto || c.folio}`} className="size-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-[#A1A1AA]" aria-hidden>—</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{c.concepto || "Sin nombre"}</p>
                              <p className="mt-0.5 font-mono text-[12px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">{c.folio}</p>
                              <p className="mt-1 text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{formatPrecioMxn(Number(c.precio1 || 0))}</p>
                              <div className="mt-2">
                                <RowActions
                                  name={`concepto ${c.concepto || c.folio}`}
                                  canEdit={canServiciosEdit}
                                  canDelete={canServiciosDelete}
                                  onEdit={() => handleEditConcepto(c)}
                                  onDelete={() => handleDeleteConceptoClick(c)}
                                />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {activeView === "conceptos" && !loadingConceptos && !filteredConceptos.length && (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-center dark:border-[#273244] dark:bg-[#1B2539]">
                        <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                          <svg {...iconSvgProps} className="size-7">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin conceptos</p>
                          <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            {searchTerm.trim() ? "Ajusta la búsqueda o crea un concepto." : "Crea un concepto con precio para usarlo en cotizaciones."}
                          </p>
                        </div>
                        {canServiciosCreate && (
                          <button type="button" onClick={openCreateConcepto} className={primaryBtnClass}>
                            <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Nuevo concepto
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                <div className="overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
                  <Table className="w-full min-w-[820px] sm:min-w-0 xl:min-w-full">
                    <TableHeader className="sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]">
                      {activeView === "servicios" ? (
                        <TableRow>
                          <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-[#52525B] dark:text-[#B7C1D1]">ID</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[200px] text-[#52525B] dark:text-[#B7C1D1]">Nombre</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left w-[160px] text-[#52525B] dark:text-[#B7C1D1]">Categoría</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[180px] max-w-[280px] text-[#52525B] dark:text-[#B7C1D1]">Descripción</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-center w-[110px] text-[#52525B] dark:text-[#B7C1D1]">Estado</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-[#52525B] dark:text-[#B7C1D1]">Acción</TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-[#52525B] dark:text-[#B7C1D1]">Imagen</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Folio</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[200px] text-[#52525B] dark:text-[#B7C1D1]">Concepto</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left min-w-[180px] max-w-[280px] text-[#52525B] dark:text-[#B7C1D1]">Descripción</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Precio</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-[#52525B] dark:text-[#B7C1D1]">Acción</TableCell>
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody className="divide-y divide-[#EDEDED] text-[12px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb]">
                      {activeView === "servicios" && loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="px-3 py-8 text-center text-[#6E6E77] dark:text-[#8EA0B8]">
                            <div className="inline-flex items-center gap-2 text-[15px]">
                              <svg {...iconSvgProps} className="h-4.5 w-4.5 animate-spin" strokeWidth={2}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                              Cargando servicios…
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {activeView === "servicios" && !loading && servicios.map((s, idx) => (
                        <TableRow key={s.id} className="hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                          <TableCell className="px-3 py-2 w-[64px] whitespace-nowrap font-semibold tabular-nums">{startIndex + idx + 1}</TableCell>
                          <TableCell className="px-3 py-2 min-w-[200px] max-w-[280px]">
                            <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={s.nombre}>{s.nombre}</span>
                          </TableCell>
                          <TableCell className="px-3 py-2 w-[160px] whitespace-nowrap">
                            {s.categoria || <span className="text-[#A1A1AA]">—</span>}
                          </TableCell>
                          <TableCell className="max-w-[280px] overflow-hidden px-3 py-2">
                            <span className="block truncate" title={s.descripcion || undefined}>
                              {s.descripcion || <span className="text-[#A1A1AA]">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center w-[110px]">
                            <span
                              className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${statusBadgeClass(s.activo !== false)}`}
                            >
                              {s.activo !== false ? "Activo" : "Inactivo"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center w-[100px]">
                            <RowActions
                              name={s.nombre}
                              canEdit={canServiciosEdit}
                              canDelete={canServiciosDelete}
                              onEdit={() => handleEdit(s)}
                              onDelete={() => handleDeleteClick(s)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {activeView === "servicios" && !servicios.length && !loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="px-3 py-10">
                            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                              <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                                <svg {...iconSvgProps} className="size-7">
                                  <path d="M4 7h16M4 12h16M4 17h10" />
                                </svg>
                              </span>
                              <div>
                                <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin servicios</p>
                                <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                  {searchTerm.trim() ? "Ajusta la búsqueda o crea un servicio." : "Crea un servicio para empezar el catálogo."}
                                </p>
                              </div>
                              {canServiciosCreate && (
                                <button type="button" onClick={openCreate} className={primaryBtnClass}>
                                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                                    <path d="M12 5v14M5 12h14" />
                                  </svg>
                                  Nuevo servicio
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {activeView === "conceptos" && loadingConceptos && (
                        <TableRow>
                          <TableCell colSpan={6} className="px-3 py-8 text-center text-[#6E6E77] dark:text-[#8EA0B8]">
                            <div className="inline-flex items-center gap-2 text-[15px]">
                              <svg {...iconSvgProps} className="h-4.5 w-4.5 animate-spin" strokeWidth={2}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                              Cargando conceptos…
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {activeView === "conceptos" && !loadingConceptos && filteredConceptos.map((c) => (
                        <TableRow key={c.id} className="hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                          <TableCell className="px-3 py-2 w-[64px] align-middle">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]">
                              {c.imagen_url ? (
                                <img
                                  src={c.imagen_url}
                                  alt={`Imagen de ${c.concepto || c.folio}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[10px] text-[#A1A1AA]" aria-hidden>—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-medium tabular-nums">{c.folio}</TableCell>
                          <TableCell className="px-3 py-2 min-w-[200px] max-w-[280px]">
                            <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={c.concepto || ""}>
                              {c.concepto || <span className="font-normal text-[#A1A1AA]">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[280px] overflow-hidden px-3 py-2">
                            <span className="block truncate" title={c.descripcion || undefined}>
                              {c.descripcion || <span className="text-[#A1A1AA]">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-semibold text-[#09090B] dark:text-[#F8FAFC] tabular-nums">
                            {formatPrecioMxn(Number(c.precio1 || 0))}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center w-[100px]">
                            <RowActions
                              name={c.concepto || c.folio}
                              canEdit={canServiciosEdit}
                              canDelete={canServiciosDelete}
                              onEdit={() => handleEditConcepto(c)}
                              onDelete={() => handleDeleteConceptoClick(c)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {activeView === "conceptos" && !loadingConceptos && !filteredConceptos.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="px-3 py-10">
                            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                              <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                                <svg {...iconSvgProps} className="size-7">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6" />
                                </svg>
                              </span>
                              <div>
                                <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin conceptos</p>
                                <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                  {searchTerm.trim() ? "Ajusta la búsqueda o crea un concepto." : "Crea un concepto con precio para usarlo en cotizaciones."}
                                </p>
                              </div>
                              {canServiciosCreate && (
                                <button type="button" onClick={openCreateConcepto} className={primaryBtnClass}>
                                  <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                                    <path d="M12 5v14M5 12h14" />
                                  </svg>
                                  Nuevo concepto
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>

              {activeView === "servicios" && !loading && totalCount > 0 && servicios.length > 0 && (
                <div className="border-t border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:px-5 sm:py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">
                      Mostrando <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{startIndex + 1}</span> a{" "}
                      <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{Math.min(endIndex, totalCount)}</span> de{" "}
                      <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{totalCount}</span> servicios
                    </p>

                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto" role="navigation" aria-label="Paginación de servicios">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={pagerBtnClass}
                        aria-label="Página anterior"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>

                      <div className="flex items-center gap-1">
                        {currentPage > 3 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCurrentPage(1)}
                              className={pagerBtnClass}
                              aria-label="Ir a la página 1"
                            >
                              1
                            </button>
                            {currentPage > 4 && <span className="px-1 text-[#A1A1AA]" aria-hidden>…</span>}
                          </>
                        )}

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            if (totalPages <= 5) return true;
                            return Math.abs(page - currentPage) <= 2;
                          })
                          .map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              aria-label={`Ir a la página ${page}`}
                              aria-current={currentPage === page ? "page" : undefined}
                              className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] ${
                                currentPage === page
                                  ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                                  : "border-[#E7E7EA] bg-white text-[#09090B] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-white/[0.06]"
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="px-1 text-[#A1A1AA]" aria-hidden>…</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(totalPages)}
                              className={pagerBtnClass}
                              aria-label={`Ir a la página ${totalPages}`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={pagerBtnClass}
                        aria-label="Página siguiente"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <Modal
          mobileBottomSheet
          isOpen={showModal}
          onClose={handleCloseModal}
          closeOnBackdropClick={false}
          ariaLabelledBy={servicioModalTitleId}
          className={modalShellClass}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className={modalHeaderClass}>
              <div className="flex min-w-0 items-start gap-3.5">
                <span className={modalHeaderIconClass}>
                  <svg {...iconSvgProps} className="size-5">
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h10" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={modalEyebrowClass}>Productos y servicios</p>
                    {editingServicio ? (
                      <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">Edición</span>
                    ) : (
                      <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Nuevo</span>
                    )}
                  </div>
                  <h2 id={servicioModalTitleId} className={`mt-1 ${modalTitleClass}`}>
                    {editingServicio ? "Editar servicio" : "Nuevo servicio"}
                  </h2>
                  <p className={modalSubtitleClass}>Captura y revisa los datos antes de guardar.</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              <div className={modalBodyClass}>
                {modalError && (
                  <InlineAlert
                    variant={modalError.startsWith("Faltan campos") ? "warning" : "error"}
                    title={modalError.startsWith("Faltan campos") ? "Faltan campos" : "Error"}
                    message={modalError}
                  />
                )}

                <section className={modalSectionClass}>
                  <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>Datos generales</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label htmlFor="servicio-nombre" className={fieldLabelClass}>
                        Nombre<span className={requiredMark}>*</span>
                      </label>
                      <input
                        id="servicio-nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className={`${inputBaseClass} h-12 px-4 sm:h-11`}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="servicio-categoria" className={fieldLabelClass}>Categoría</label>
                      <input
                        id="servicio-categoria"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className={`${inputBaseClass} h-12 px-4 sm:h-11`}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <p className={fieldLabelClass} id="servicio-status-label">Estado</p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.activo}
                        aria-labelledby="servicio-status-label"
                        onClick={() => setFormData((prev) => ({ ...prev, activo: !prev.activo }))}
                        className={`inline-flex h-12 w-full items-center justify-between rounded-[10px] border px-4 text-[15px] font-medium scheme-light transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:scheme-dark sm:h-11 ${
                          formData.activo
                            ? "border-[#BFE6D4] bg-[#E9F8F0] text-[#04724D] dark:border-[#1E5A42] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                            : "border-[#E7E7EA] bg-white text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1]"
                        }`}
                      >
                        {formData.activo ? "Activo" : "Inactivo"}
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            formData.activo ? "bg-[#04724D]" : "bg-[#D3D3D8] dark:bg-[#3A4661]"
                          }`}
                          aria-hidden
                        >
                          <span
                            className={`inline-block size-4 rounded-full bg-white transition-transform ${
                              formData.activo ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>
                </section>

                <section className={modalSectionClass}>
                  <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(23,35,91,0.10)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                        <path d="M14 2v4h4" />
                        <path d="M8 10h8M8 14h8" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>Descripción</p>
                  </div>
                  <label htmlFor="servicio-descripcion" className={fieldLabelClass}>Descripción</label>
                  <textarea
                    id="servicio-descripcion"
                    rows={4}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalle del servicio (opcional)"
                    className={modalTextareaClass}
                  />
                </section>
              </div>

              <div className={modalFooterClass}>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button type="button" onClick={handleCloseModal} className={secondaryBtnClass}>
                    Cancelar
                  </button>
                  <button type="submit" className={primaryBtnClass}>
                    <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    {editingServicio ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        <Modal
          mobileBottomSheet
          isOpen={showConceptoModal}
          onClose={handleCloseConceptoModal}
          closeOnBackdropClick={false}
          ariaLabelledBy={conceptoModalTitleId}
          className={modalShellClass}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className={modalHeaderClass}>
              <div className="flex min-w-0 items-start gap-3.5">
                <span className={modalHeaderIconClass}>
                  <svg {...iconSvgProps} className="size-5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={modalEyebrowClass}>Servicios · Conceptos</p>
                    {editingConcepto ? (
                      <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">Edición</span>
                    ) : (
                      <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Nuevo</span>
                    )}
                  </div>
                  <h2 id={conceptoModalTitleId} className={`mt-1 ${modalTitleClass}`}>
                    {editingConcepto ? "Editar concepto" : "Nuevo concepto"}
                  </h2>
                  <p className={modalSubtitleClass}>Captura folio, precio e imagen antes de guardar.</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmitConcepto} className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
              <div className={modalBodyClass}>
                {conceptoModalError && (
                  <InlineAlert
                    variant={/ya existe/i.test(conceptoModalError) || conceptoModalError.startsWith("Faltan campos") ? "warning" : "error"}
                    title={/ya existe/i.test(conceptoModalError) ? "Advertencia" : conceptoModalError.startsWith("Faltan campos") ? "Faltan campos" : "Error"}
                    message={conceptoModalError}
                  />
                )}

                <section className={modalSectionClass}>
                  <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg {...iconSvgProps} className="size-4">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>Datos del concepto</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="concepto-field-folio" className={fieldLabelClass}>
                        Folio<span className={requiredMark}>*</span>
                      </label>
                      <input
                        id="concepto-field-folio"
                        value={conceptoFormData.folio}
                        onChange={(e) => {
                          setConceptoModalError("");
                          setConceptoFormData({ ...conceptoFormData, folio: e.target.value });
                        }}
                        className={`${inputBaseClass} h-12 px-4 sm:h-11`}
                        autoComplete="off"
                        aria-invalid={Boolean(conceptoModalError && /folio/i.test(conceptoModalError))}
                      />
                    </div>
                    <div>
                      <label htmlFor="concepto-field-precio" className={fieldLabelClass}>Precio base (sin IVA)</label>
                      <input
                        id="concepto-field-precio"
                        type="number"
                        min="0"
                        step={0.01}
                        value={conceptoFormData.precio1}
                        onChange={(e) => setConceptoFormData({ ...conceptoFormData, precio1: e.target.value })}
                        className={`${inputBaseClass} h-12 px-4 sm:h-11`}
                        aria-describedby="concepto-precio-hint"
                      />
                      <p id="concepto-precio-hint" className="mt-1.5 text-[12px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        Se guarda sin IVA. En cotización se agrega IVA 16% para el cálculo visual.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="concepto-field-text" className={fieldLabelClass}>
                        Concepto<span className={requiredMark}>*</span>
                      </label>
                      <textarea
                        id="concepto-field-text"
                        rows={4}
                        value={conceptoFormData.concepto}
                        onChange={(e) => setConceptoFormData({ ...conceptoFormData, concepto: e.target.value })}
                        placeholder="Nombre o título del concepto para cotizaciones"
                        className={modalTextareaClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="concepto-field-descripcion" className={fieldLabelClass}>Descripción</label>
                      <textarea
                        id="concepto-field-descripcion"
                        rows={3}
                        maxLength={CONCEPTO_DESCRIPCION_MAX}
                        value={conceptoFormData.descripcion}
                        onChange={(e) => setConceptoFormData({ ...conceptoFormData, descripcion: e.target.value })}
                        placeholder="Detalle adicional del concepto (opcional)"
                        className={`${inputBaseClass} min-h-[6rem] resize-none px-4 py-3`}
                        aria-describedby="concepto-descripcion-hint"
                      />
                      <p id="concepto-descripcion-hint" className="mt-1.5 text-[12px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        Máximo {CONCEPTO_DESCRIPCION_MAX} caracteres.
                      </p>
                    </div>
                  </div>
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
                      <p className={sectionLabelClass}>Imagen</p>
                    </div>
                  </div>
                  <p className="-mt-1 mb-3 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Opcional · PNG, JPG, WebP o SVG · una imagen
                  </p>
                  <div
                    {...getRootProps()}
                    className={`flex cursor-pointer flex-col gap-3 rounded-[14px] border border-dashed px-4 py-5 scheme-light transition-colors dark:scheme-dark sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
                      isDragActive
                        ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] ring-4 ring-[rgba(27,92,255,0.14)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]"
                        : "border-[#D3D3D8] bg-white hover:border-[#1B5CFF]/50 dark:border-[#3A4661] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/50"
                    } ${conceptoImageUploading ? "pointer-events-none opacity-45" : ""}`}
                    aria-label="Subir imagen del concepto"
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
                        {conceptoImageUploading ? "Subiendo…" : isDragActive ? "Suelta aquí para subir" : "Añadir imagen"}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                        Arrastre un archivo aquí o pulse para elegir desde su equipo.
                      </p>
                    </div>
                  </div>
                  {conceptoFormData.imagen_url ? (
                    <div className="relative mt-4 max-w-sm overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                      <img
                        src={conceptoFormData.imagen_url}
                        alt="Vista previa del concepto"
                        className="aspect-[4/3] max-h-48 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeConceptoImage();
                        }}
                        disabled={conceptoImageUploading}
                        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-[10px] border border-white/20 bg-white/95 text-[#52525B] shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C22B2B] disabled:opacity-50 dark:border-white/10 dark:bg-[#111827]/90 dark:text-[#F8FAFC] dark:hover:text-[#F87171]"
                        aria-label="Eliminar imagen del concepto"
                      >
                        <TrashBinIcon className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>

              <div className={modalFooterClass}>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button type="button" onClick={handleCloseConceptoModal} className={secondaryBtnClass}>
                    Cancelar
                  </button>
                  <button type="submit" className={primaryBtnClass}>
                    <svg {...iconSvgProps} className="size-[18px]" strokeWidth={2}>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    {editingConcepto ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        {servicioToDelete && (
          <Modal
            mobileBottomSheet
            isOpen={showDeleteModal}
            onClose={handleCancelDelete}
            ariaLabelledBy={deleteServicioTitleId}
            className={modalSmallShellClass}
          >
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
                  <h3 id={deleteServicioTitleId} className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                    Eliminar servicio
                  </h3>
                  <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <p className="text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
                ¿Estás seguro de que deseas eliminar el servicio{" "}
                <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{servicioToDelete.nombre}</span>?
              </p>
              <div className="mt-3 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] p-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                <p className="text-[13px] text-[#C22B2B] dark:text-[#F87171]">
                  <strong>Advertencia:</strong> el registro se eliminará de forma permanente.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={handleCancelDelete} className={secondaryBtnClass}>
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmDelete} className={dangerBtnClass}>
                  <TrashBinIcon className="size-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )}

        {conceptoToDelete && (
          <Modal
            mobileBottomSheet
            isOpen={showDeleteConceptoModal}
            onClose={handleCancelDeleteConcepto}
            ariaLabelledBy={deleteConceptoTitleId}
            className={modalSmallShellClass}
          >
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
                  <h3 id={deleteConceptoTitleId} className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                    Eliminar concepto
                  </h3>
                  <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <p className="text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
                ¿Estás seguro de que deseas eliminar el concepto{" "}
                <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{conceptoToDelete.concepto}</span>?
              </p>
              <div className="mt-3 rounded-[12px] border border-[#F6CFCF] bg-[#FEF2F2] p-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                <p className="text-[13px] text-[#C22B2B] dark:text-[#F87171]">
                  <strong>Advertencia:</strong> el folio dejará de estar disponible en cotizaciones.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={handleCancelDeleteConcepto} className={secondaryBtnClass}>
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmDeleteConcepto} className={dangerBtnClass}>
                  <TrashBinIcon className="size-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
