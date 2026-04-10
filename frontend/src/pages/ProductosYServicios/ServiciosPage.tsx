import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

import PageMeta from "@/components/common/PageMeta";
import { Link } from "react-router-dom";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";

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
  precio1: number;
  imagen_url?: string;
}

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const roundConceptoPrecio = (n: number) => Math.round(Math.max(0, n) * 100) / 100;

const CONCEPTO_IMAGEN_FOLDER = "productos/conceptos";

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

        let minQuality = 0.1;
        let maxQuality = 0.95;
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
  } catch { }
  return txt;
};

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const searchInputClass =
  "min-h-[40px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2 pl-9 pr-10 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 sm:min-h-[44px] sm:py-2.5";

const modalPanelClass =
  "rounded-xl border border-gray-200/70 bg-white/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:border-white/[0.07] dark:bg-gray-900/45 dark:shadow-none sm:p-5";

const modalLabelClass = "mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm";

export default function Servicios() {
  const asBool = (v: any, defaultValue: boolean) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true") return true;
      if (s === "false") return false;
    }
    return defaultValue;
  };

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  // Soporte para mayúsculas/minúsculas en la llave del módulo
  const modulePerms = permissions?.servicios || permissions?.Servicios || {};

  const canServiciosView = asBool(modulePerms.view, false);
  const canServiciosCreate = asBool(modulePerms.create, false);
  const canServiciosEdit = asBool(modulePerms.edit, false);
  const canServiciosDelete = asBool(modulePerms.delete, false);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const [activeView, setActiveView] = useState<"servicios" | "conceptos">("servicios");

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
    precio1: "",
    imagen_url: "",
  });
  const [conceptoImageUploading, setConceptoImageUploading] = useState(false);
  const conceptoInitialImagenRef = useRef<string>("");

  const deleteConceptoCloudinary = async (url: string) => {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;
    const token = getToken();
    await fetch(apiUrl("/api/ordenes/delete-image/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("permissions:updated" as any, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("permissions:updated" as any, sync);
    };
  }, []);

  const fetchServicios = async (page = 1, search = ""): Promise<Servicio[]> => {
    if (!canServiciosView) {
      setServicios([]);
      setTotalCount(0);
      setLoading(false);
      return [];
    }
    const token = getToken();
    if (!token) {
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
      } catch { }
    }
    const controller = new AbortController();
    listAbortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/servicios/?${query.toString()}`), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store" as RequestCache,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) {
        setServicios([]);
        setTotalCount(0);
        return [];
      }

      const list = Array.isArray((data as any)?.results) ? ((data as any).results as Servicio[]) : [];
      const count = typeof (data as any)?.count === "number" ? (data as any).count : list.length;
      setServicios(list);
      setTotalCount(count);
      return list;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
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
    const token = getToken();
    if (!token) {
      setConceptos([]);
      return;
    }
    setLoadingConceptos(true);
    try {
      const res = await fetch(apiUrl("/api/conceptos/?ordering=folio"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => ({ results: [] }));
      if (!res.ok) {
        setConceptos([]);
        return;
      }
      const list = Array.isArray((data as any)?.results) ? (data as any).results : Array.isArray(data) ? data : [];
      const mapped: Concepto[] = list.map((c: any, idx: number) => ({
        id: Number(c?.id ?? idx + 1),
        folio: String(c?.folio ?? c?.idx ?? c?.id ?? idx + 1),
        concepto: String(c?.concepto ?? c?.nombre ?? "").trim(),
        precio1: Number(c?.precio1 ?? c?.precio ?? 0),
        imagen_url: String(c?.imagen_url ?? "").trim(),
      }));
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
      const token = getToken();
      const resp = await fetch(apiUrl("/api/ordenes/upload-image/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
    setConceptoFormData({ folio: "", concepto: "", precio1: "", imagen_url: "" });
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
    const token = getToken();
    if (!token) return;

    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar servicios." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/servicios/${servicioToDelete.id}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

    const token = getToken();
    if (!token) {
      setModalError("No hay token de sesión.");
      return;
    }

    const url = editingServicio ? apiUrl(`/api/servicios/${editingServicio.id}/`) : apiUrl("/api/servicios/");
    const method = editingServicio ? "PUT" : "POST";
    const nombreServicio = formData.nombre;
    const isEditing = !!editingServicio;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
    setConceptoFormData({ folio: "", concepto: "", precio1: "", imagen_url: "" });
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
    const token = getToken();
    if (!token) {
      setConceptoModalError("No hay token de sesión.");
      return;
    }
    const basePrecio = Number(conceptoFormData.precio1 || 0);
    const precio1 = roundConceptoPrecio(basePrecio);
    const payload = {
      folio: String(conceptoFormData.folio).trim(),
      concepto: String(conceptoFormData.concepto).trim(),
      precio1,
      imagen_url: String(conceptoFormData.imagen_url || "").trim(),
    };
    const url = editingConcepto ? apiUrl(`/api/conceptos/${editingConcepto.id}/`) : apiUrl("/api/conceptos/");
    const method = editingConcepto ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
      setConceptoFormData({ folio: "", concepto: "", precio1: "", imagen_url: "" });
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
    const token = getToken();
    if (!token) return;
    if (!canServiciosDelete) {
      setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para eliminar conceptos." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/conceptos/${conceptoToDelete.id}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
        <PageMeta title="Servicios | Sistema" description="Gestión de servicios" />

        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]" aria-label="Migas de pan">
          <Link to="/" className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200">
            Inicio
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            /
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300">Servicios</span>
        </nav>

        {alert.show && <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />}

        {!canServiciosView ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white px-4 py-10 text-center text-xs text-gray-500 shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:text-gray-400 sm:text-sm">
            No tienes permiso para ver Servicios.
          </div>
        ) : (
          <>
            <header className={`flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
              <div className="flex min-w-0 gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
                  <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
                    Catálogo
                  </p>
                  <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Servicios y Conceptos</h1>
                  <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                    Administra, edita y elimina servicios y conceptos del catálogo.
                  </p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50/80 text-brand-600 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-brand-400 sm:h-10 sm:w-10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M6 6h12" />
                      <path d="M6 12h12" />
                      <path d="M6 18h12" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Total servicios</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.total}</p>
                  </div>
                </div>
              </div>
              <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 sm:h-10 sm:w-10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Activos</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.activos}</p>
                  </div>
                </div>
              </div>
              <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Inactivos</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{stats.inactivos}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
              <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
                <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, categoría o descripción"
                  className={searchInputClass}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>
            {activeView === "servicios" && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 sm:w-auto sm:min-h-0 lg:shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo servicio
              </button>
            )}
            {activeView === "conceptos" && (
              <button
                type="button"
                onClick={openCreateConcepto}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 sm:w-auto sm:min-h-0 lg:shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo concepto
              </button>
            )}
          </div>

            <div className="mt-1">
              <ComponentCard
                compact
                title="Listado"
                desc={activeView === "servicios" ? "Servicios según búsqueda y paginación del servidor." : "Conceptos del catálogo."}
                className={`overflow-hidden ${cardShellClass}`}
                actions={
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200/90 bg-white p-1 dark:border-white/[0.08] dark:bg-gray-900/40">
                      <button
                        type="button"
                        onClick={() => setActiveView("servicios")}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${activeView === "servicios"
                          ? "bg-brand-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"}`}
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("conceptos")}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${activeView === "conceptos"
                          ? "bg-brand-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"}`}
                      >
                        Conceptos
                      </button>
                    </div>
                  </div>
                }
              >
                <div className="p-2 pt-0">
                  <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-gray-50/40 dark:border-white/[0.06] dark:bg-gray-950/30">
                    <Table className="w-full min-w-[1000px] border-collapse">
                      <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 text-[11px] font-semibold text-gray-900 dark:border-white/[0.06] dark:bg-gray-900/80 dark:text-white">
                        {activeView === "servicios" ? (
                          <TableRow>
                            <TableCell isHeader className="w-[72px] min-w-[72px] whitespace-nowrap px-3 py-2 text-left text-gray-700 dark:text-gray-300">ID</TableCell>
                            <TableCell isHeader className="min-w-[160px] max-w-[220px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Nombre</TableCell>
                            <TableCell isHeader className="min-w-[140px] max-w-[200px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Categoría</TableCell>
                            <TableCell isHeader className="min-w-[200px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Descripción</TableCell>
                            <TableCell isHeader className="w-[100px] min-w-[100px] whitespace-nowrap px-3 py-2 text-center text-gray-700 dark:text-gray-300">Status</TableCell>
                            <TableCell isHeader className="w-[112px] min-w-[112px] whitespace-nowrap px-3 py-2 text-center text-gray-700 dark:text-gray-300">Acciones</TableCell>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableCell isHeader className="w-[56px] min-w-[56px] px-3 py-2 text-center text-gray-700 dark:text-gray-300">Img</TableCell>
                            <TableCell isHeader className="w-[140px] min-w-[140px] whitespace-nowrap px-3 py-2 text-left text-gray-700 dark:text-gray-300">Folio</TableCell>
                            <TableCell isHeader className="min-w-[280px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Concepto</TableCell>
                            <TableCell isHeader className="w-[160px] min-w-[160px] whitespace-nowrap px-3 py-2 text-left text-gray-700 dark:text-gray-300">Precio 1</TableCell>
                            <TableCell isHeader className="w-[112px] min-w-[112px] whitespace-nowrap px-3 py-2 text-center text-gray-700 dark:text-gray-300">Acciones</TableCell>
                          </TableRow>
                        )}
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                        {activeView === "servicios" && loading && (
                          <TableRow>
                            <TableCell className="px-3 py-3" colSpan={6}>Cargando...</TableCell>
                          </TableRow>
                        )}

                        {activeView === "servicios" && !loading && servicios.map((s, idx) => (
                          <TableRow key={s.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            <TableCell className="w-[72px] min-w-[72px] whitespace-nowrap px-3 py-2 align-middle">{startIndex + idx + 1}</TableCell>
                            <TableCell className="min-w-0 max-w-[220px] px-3 py-2 align-middle">
                              <span className="block truncate text-gray-900 dark:text-white" title={s.nombre}>{s.nombre}</span>
                            </TableCell>
                            <TableCell className="min-w-0 max-w-[200px] px-3 py-2 align-middle">
                              <span className="block truncate" title={s.categoria || ""}>{s.categoria || "-"}</span>
                            </TableCell>
                            <TableCell className="min-w-[200px] max-w-md px-3 py-2 align-middle">
                              <span className="block truncate" title={s.descripcion || ""}>{s.descripcion || "-"}</span>
                            </TableCell>
                            <TableCell className="w-[100px] min-w-[100px] whitespace-nowrap px-3 py-2 text-center align-middle">
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${s.activo !== false
                                  ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "border-gray-200/80 bg-gray-50/90 text-gray-700 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-300"}`}
                              >
                                {s.activo !== false ? "Activo" : "Inactivo"}
                              </span>
                            </TableCell>
                            <TableCell className="w-[112px] min-w-[112px] whitespace-nowrap px-3 py-2 text-center align-middle">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                <button
                                  onClick={() => handleEdit(s)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(s)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                                  title="Eliminar"
                                >
                                  <TrashBinIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {activeView === "servicios" && !servicios.length && !loading && (
                          <TableRow>
                            <TableCell className="px-3 py-2" colSpan={6}>
                              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Sin servicios</div>
                            </TableCell>
                          </TableRow>
                        )}

                        {activeView === "conceptos" && loadingConceptos && (
                          <TableRow>
                            <TableCell className="px-3 py-3" colSpan={5}>Cargando...</TableCell>
                          </TableRow>
                        )}

                        {activeView === "conceptos" && !loadingConceptos && filteredConceptos.map((c) => (
                          <TableRow key={c.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            <TableCell className="px-3 py-2 align-middle">
                              {c.imagen_url ? (
                                <img
                                  src={c.imagen_url}
                                  alt=""
                                  className="mx-auto h-10 w-10 rounded-md border border-gray-200/90 object-cover dark:border-white/[0.08]"
                                />
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2 align-middle">{c.folio}</TableCell>
                            <TableCell className="px-3 py-2 align-middle">{c.concepto || "-"}</TableCell>
                            <TableCell className="px-3 py-2 align-middle">{Number(c.precio1 || 0).toFixed(2)}</TableCell>
                            <TableCell className="w-[112px] min-w-[112px] whitespace-nowrap px-3 py-2 text-center align-middle">
                              <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                <button
                                  onClick={() => handleEditConcepto(c)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteConceptoClick(c)}
                                  className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                                  title="Eliminar"
                                >
                                  <TrashBinIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {activeView === "conceptos" && !loadingConceptos && !filteredConceptos.length && (
                          <TableRow>
                          <TableCell className="px-3 py-2" colSpan={5}>
                              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Sin conceptos</div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {activeView === "servicios" && !loading && totalCount > 0 && servicios.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5 sm:py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                          <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, totalCount)}</span> de{" "}
                          <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> servicios
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>

                          <div className="flex items-center gap-1">
                            {currentPage > 3 && (
                              <>
                                <button
                                  onClick={() => setCurrentPage(1)}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  1
                                </button>
                                {currentPage > 4 && <span className="px-1 text-gray-400">...</span>}
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
                                  onClick={() => setCurrentPage(page)}
                                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                                    ? "border-brand-500 bg-brand-500 text-white"
                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                                >
                                  {page}
                                </button>
                              ))}

                            {currentPage < totalPages - 2 && (
                              <>
                                {currentPage < totalPages - 3 && <span className="px-1 text-gray-400">...</span>}
                                <button
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  {totalPages}
                                </button>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          </>
        )}

        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          closeOnBackdropClick={false}
          className="mx-4 w-full max-w-3xl max-h-[92vh] p-0 overflow-hidden rounded-2xl border border-gray-200/75 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:mx-auto"
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className="relative shrink-0 border-b border-gray-200/60 bg-gray-50/80 px-6 py-5 pr-14 dark:border-white/[0.06] dark:bg-gray-950/40 sm:pr-16">
              <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-brand-500/80 dark:bg-brand-400/70" aria-hidden />
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/15 bg-white text-brand-700 shadow-sm dark:border-brand-400/20 dark:bg-gray-900/60 dark:text-brand-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Productos y servicios</p>
                  <h5 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl">
                    {editingServicio ? "Editar servicio" : "Nuevo servicio"}
                  </h5>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Captura y revisa los datos antes de guardar.</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col bg-gray-50/40 dark:bg-gray-950/20">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-6 custom-scrollbar sm:px-6">
                {modalError && <Alert variant="error" title="Error" message={modalError} showLink={false} />}

                <section className={modalPanelClass}>
                  <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Datos generales</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label className={modalLabelClass}>Nombre *</Label>
                      <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                      <Label className={modalLabelClass}>Categoría</Label>
                      <Input value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} />
                    </div>
                    <div>
                      <Label className={modalLabelClass}>Status</Label>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, activo: !prev.activo }))}
                        className={`w-full h-10 rounded-lg border px-3 text-sm shadow-theme-xs text-left transition-colors ${formData.activo
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "border-gray-200 bg-gray-50/70 text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"}`}
                      >
                        {formData.activo ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className={modalPanelClass}>
                  <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Descripción</p>
                  </div>
                  <Label className={modalLabelClass}>Descripción</Label>
                  <textarea
                    rows={4}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                  />
                </section>
              </div>

              <div className="shrink-0 border-t border-gray-200/70 bg-white px-5 py-4 dark:border-white/[0.08] dark:bg-gray-900 sm:px-6">
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-200/90 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/[0.1] dark:hover:bg-white/[0.05] sm:min-h-0 sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 sm:min-h-0 sm:w-auto"
                  >
                    {editingServicio ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

      <Modal
        isOpen={showConceptoModal}
        onClose={handleCloseConceptoModal}
        closeOnBackdropClick={false}
        className="mx-4 flex max-h-[min(92vh,920px)] w-full max-w-2xl flex-col p-0 overflow-hidden rounded-2xl border border-gray-200/75 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:mx-auto"
      >
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative shrink-0 border-b border-gray-200/60 bg-gray-50/80 px-6 py-5 pr-14 dark:border-white/[0.06] dark:bg-gray-950/40 sm:pr-16">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-brand-500/80 dark:bg-brand-400/70" aria-hidden />
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/15 bg-white text-brand-700 shadow-sm dark:border-brand-400/20 dark:bg-gray-900/60 dark:text-brand-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Servicios</p>
                <h5 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl">
                  {editingConcepto ? "Editar concepto" : "Nuevo concepto"}
                </h5>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Captura y revisa los datos antes de guardar.</p>
              </div>
            </div>
          </header>

          <form
            onSubmit={handleSubmitConcepto}
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-gray-50/40 dark:bg-gray-950/20"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-5 pb-6 custom-scrollbar sm:px-6">
              {conceptoModalError && <Alert variant="error" title="Error" message={conceptoModalError} showLink={false} />}

              <section className={modalPanelClass}>
                <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Datos del concepto</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label className={modalLabelClass}>Folio *</Label>
                    <Input value={conceptoFormData.folio} onChange={(e) => setConceptoFormData({ ...conceptoFormData, folio: e.target.value })} />
                  </div>
                  <div>
                    <Label className={modalLabelClass}>Precio base (sin IVA)</Label>
                    <Input
                      type="number"
                      min="0"
                      step={0.01}
                      value={conceptoFormData.precio1}
                      onChange={(e) => setConceptoFormData({ ...conceptoFormData, precio1: e.target.value })}
                    />
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                      Se guarda sin IVA. En cotización se agrega IVA 16% para el cálculo visual.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="concepto-field-text" className={modalLabelClass}>
                      Concepto *
                    </Label>
                    <textarea
                      id="concepto-field-text"
                      rows={4}
                      value={conceptoFormData.concepto}
                      onChange={(e) => setConceptoFormData({ ...conceptoFormData, concepto: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className={modalLabelClass}>Imagen </Label>
                    <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-lg hover:border-brand-500">
                      <div
                        {...getRootProps()}
                        className={`dropzone rounded-lg border-dashed border-gray-300 p-4 sm:p-5 ${isDragActive ? "border-brand-500 bg-gray-100 dark:bg-gray-800" : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                          }`}
                        id="concepto-imagen-upload"
                        role="button"
                        tabIndex={0}
                      >
                        <input {...getInputProps()} />
                        <div className="dz-message flex flex-col items-center m-0!">
                          <div className="mb-3 flex justify-center">
                            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              <svg
                                className="fill-current"
                                width="22"
                                height="22"
                                viewBox="0 0 29 28"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                                />
                              </svg>
                            </div>
                          </div>
                          <h4 className="mb-1 font-semibold text-gray-800 text-sm sm:text-base dark:text-white/90">
                            {conceptoImageUploading ? "Subiendo…" : isDragActive ? "Suelta aquí para subir" : "Haz clic o arrastra una imagen"}
                          </h4>
                          <span className="text-center mb-2 block w-full max-w-[320px] text-[12px] text-gray-700 dark:text-gray-400">
                            Formatos: PNG, JPG, WebP o SVG (una imagen)
                          </span>
                          <span className="font-medium underline text-[12px] text-brand-500">Buscar archivos</span>
                        </div>
                      </div>
                    </div>
                    {conceptoFormData.imagen_url ? (
                      <div className="relative group mt-3 max-h-48 w-full max-w-sm">
                        <img
                          src={conceptoFormData.imagen_url}
                          alt="Vista previa concepto"
                          className="max-h-48 w-full rounded-lg border-2 border-gray-300 object-contain dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeConceptoImage();
                          }}
                          disabled={conceptoImageUploading}
                          className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-error-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-700 disabled:opacity-50"
                          title="Eliminar imagen"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-gray-200/70 bg-white px-5 py-4 dark:border-white/[0.08] dark:bg-gray-900 sm:px-6">
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={handleCloseConceptoModal}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-200/90 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/[0.1] dark:hover:bg-white/[0.05] sm:min-h-0 sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 sm:min-h-0 sm:w-auto"
                >
                  {editingConcepto ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

        {servicioToDelete && (
          <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-[94vw] max-w-md p-0 overflow-hidden">
            <div>
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eliminar Servicio</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Esta acción no se puede deshacer</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar el servicio{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{servicioToDelete.nombre}</span>?
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
                >
                  <TrashBinIcon className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )}

      {conceptoToDelete && (
        <Modal isOpen={showDeleteConceptoModal} onClose={handleCancelDeleteConcepto} className="w-[94vw] max-w-md p-0 overflow-hidden">
          <div>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eliminar Concepto</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Esta acción no se puede deshacer</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar el concepto{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{conceptoToDelete.concepto}</span>?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end gap-3">
              <button
                onClick={handleCancelDeleteConcepto}
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteConcepto}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
              >
                <TrashBinIcon className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  )
}
