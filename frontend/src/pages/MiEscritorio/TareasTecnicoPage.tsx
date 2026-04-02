import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { useDropzone } from "react-dropzone";
import { apiUrl } from "@/config/api";
import { MobileTareaList } from "./MobileTareaCard";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const searchInputClass =
  "min-h-[40px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2 pl-9 pr-10 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 sm:min-h-[44px] sm:py-2.5";

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 sm:text-[11px]";

const modalFieldLabelClass = "mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm";

const modalTextareaClass =
  "w-full min-h-[7.5rem] rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 resize-none";

const modalPanelClass =
  "rounded-xl border border-gray-200/70 bg-white/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:border-white/[0.07] dark:bg-gray-900/45 dark:shadow-none sm:p-5";

const modalRequiredMark = "ml-0.5 text-gray-400 dark:text-gray-500";

let tareasTecnicoTareasInFlight: Promise<any> | null = null;

interface Tarea {
  id: number;
  usuario_asignado: number | null;
  usuario_asignado_username?: string;
  usuario_asignado_full_name?: string;
  estado?: "BACKLOG" | "TODO" | "EN_PROGRESO" | "HECHO";
  orden?: number;
  descripcion: string;
  fotos_urls: string[];
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por?: number;
  creado_por_username?: string;
}

export default function TareasTecnicoPage() {
  const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

  const didLoadMeRef = useRef(false);
  const lastFetchedMyIdRef = useRef<number | null>(null);

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions] = useState<any>(() => getPermissionsFromStorage());
  const canTareasView = permissions?.tareas?.view !== false;
  const canTareasCreate = !!permissions?.tareas?.create;
  const canTareasEdit = !!permissions?.tareas?.edit;
  const canTareasDelete = !!permissions?.tareas?.delete;

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tareaToDelete, setTareaToDelete] = useState<Tarea | null>(null);
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({
    open: false,
    index: null,
    url: null,
  });

  const [me, setMe] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  const [descripcionModal, setDescripcionModal] = useState<{ open: boolean; content: string }>({ open: false, content: "" });
  const [fotosModal, setFotosModal] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });

  const openDescripcionModal = (t: Tarea) => setDescripcionModal({ open: true, content: t.descripcion || "-" });
  const openFotosModal = (t: Tarea) => setFotosModal({ open: true, urls: Array.isArray(t.fotos_urls) ? t.fotos_urls : [] });

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
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height / width) * maxWidth;
              width = maxWidth;
            } else {
              width = (width / height) * maxHeight;
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          let quality = 0.9;
          const compress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Error al comprimir la imagen"));
                  return;
                }
                const sizeKB = blob.size / 1024;
                if (sizeKB <= maxSizeKB || quality <= 0.1) {
                  const r = new FileReader();
                  r.readAsDataURL(blob);
                  r.onloadend = () => resolve(r.result as string);
                } else {
                  quality -= 0.1;
                  compress();
                }
              },
              "image/jpeg",
              quality
            );
          };
          compress();
        };
        img.onerror = () => reject(new Error("Error al cargar la imagen"));
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
    });
  };

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

  const [formData, setFormData] = useState({
    usuario_asignado: null as number | null,
    descripcion: "",
    fotos_urls: [] as string[],
  });

  const onDropPhotos = async (acceptedFiles: File[]) => {
    const current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];
    const remainingSlots = 2 - current.length;
    if (remainingSlots <= 0) return;
    const files = acceptedFiles.slice(0, remainingSlots).filter((f) => f.type.startsWith("image/"));
    const urls: string[] = [];
    for (const file of files) {
      try {
        const compressed = await compressImage(file, 50, 1400, 1400);
        const token = getToken();
        const resp = await fetch(apiUrl("/api/tareas/upload-image/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ data_url: compressed, folder: "tareas/fotos" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.url) urls.push(data.url as string);
        }
      } catch {
        // ignore
      }
    }
    if (urls.length) {
      setFormData({ ...formData, fotos_urls: [...current, ...urls] });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPhotos,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
  });

  const handleDeletePhoto = async (index: number, url: string) => {
    const publicId = getPublicIdFromUrl(url);
    const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter((_, i) => i !== index);
    try {
      const token = getToken();
      if (publicId) {
        await fetch(apiUrl("/api/tareas/delete-image/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ public_id: publicId }),
        });
      }
    } catch {
      // ignore
    } finally {
      setFormData({ ...formData, fotos_urls: updated });
      setConfirmDelete({ open: false, index: null, url: null });
    }
  };

  const validateForm = () => {
    const missing: string[] = [];
    if (!formData.descripcion?.trim()) missing.push("Descripción");
    return { ok: missing.length === 0, missing };
  };

  const openCreate = () => {
    if (!canTareasCreate) {
      setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para crear tareas." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }
    if (!myId) return;
    setEditingTarea(null);
    setFormData({ usuario_asignado: myId, descripcion: "", fotos_urls: [] });
    setShowModal(true);
  };

  const handleEdit = (t: Tarea) => {
    if (!canTareasEdit) {
      setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para editar tareas." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }
    if (!isOwnTask(t)) return;
    setEditingTarea(t);
    setFormData({
      usuario_asignado: t.usuario_asignado || myId,
      descripcion: t.descripcion || "",
      fotos_urls: Array.isArray(t.fotos_urls) ? t.fotos_urls : [],
    });
    setShowModal(true);
  };

  const handleDeleteClick = (t: Tarea) => {
    if (!canTareasDelete) {
      setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para eliminar tareas." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }
    if (!isOwnTask(t)) return;
    setTareaToDelete(t);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTareaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!tareaToDelete) return;
    if (!canTareasDelete) return;
    if (!isOwnTask(tareaToDelete)) return;
    const token = getToken();
    try {
      const response = await fetch(apiUrl(`/api/tareas/${tareaToDelete.id}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchTareas();
        setShowDeleteModal(false);
        setTareaToDelete(null);
        setAlert({ show: true, variant: "success", title: "Tarea Eliminada", message: "La tarea ha sido eliminada exitosamente." });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      }
    } catch {
      return;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTarea(null);
    setFormData({ usuario_asignado: myId, descripcion: "", fotos_urls: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingTarea;

    if (isEditing && !canTareasEdit) {
      setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para editar tareas." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }
    if (!isEditing && !canTareasCreate) {
      setAlert({ show: true, variant: "error", title: "Sin permiso", message: "No tienes permisos para crear tareas." });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }
    if (!myId) return;

    const { ok, missing } = validateForm();
    if (!ok) {
      setAlert({ show: true, variant: "warning", title: "Campos requeridos", message: `Faltan: ${missing.join(", ")}` });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const url = editingTarea ? apiUrl(`/api/tareas/${editingTarea.id}/`) : apiUrl("/api/tareas/");
      const method = editingTarea ? "PUT" : "POST";
      const payload: any = {
        usuario_asignado: myId,
        descripcion: formData.descripcion,
        fotos_urls: Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [],
      };
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        await fetchTareas();
        setShowModal(false);
        setEditingTarea(null);
        setFormData({ usuario_asignado: myId, descripcion: "", fotos_urls: [] });
        setAlert({
          show: true,
          variant: "success",
          title: isEditing ? "Tarea Actualizada" : "Tarea Creada",
          message: isEditing ? "La tarea ha sido actualizada exitosamente." : "La tarea ha sido creada exitosamente.",
        });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      } else {
        let errorMsg = "Error al guardar la tarea";
        try {
          const errorData = await response.json();
          errorMsg = (errorData?.detail || JSON.stringify(errorData)) || errorMsg;
        } catch {
          errorMsg = await response.text();
        }
        setAlert({ show: true, variant: "error", title: "Error al guardar", message: errorMsg });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4500);
      }
    } catch (e) {
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  useEffect(() => {
    if (me?.id) return;

    if (didLoadMeRef.current) return;
    didLoadMeRef.current = true;

    const token = getToken();
    if (!token) return;

    const guardKey = `tareas_tecnico_me_loaded:${token}`;
    try {
      if (sessionStorage.getItem(guardKey) === "1") return;
      sessionStorage.setItem(guardKey, "1");
    } catch {
      // ignore
    }

    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        setMe(data);
        try {
          localStorage.setItem("user", JSON.stringify(data));
          sessionStorage.setItem("user", JSON.stringify(data));
        } catch {}
      } catch {
        return;
      }
    };
    load();
  }, [me?.id]);

  const myId = useMemo(() => (me?.id ? Number(me.id) : null), [me?.id]);

  const myDisplayName = useMemo(() => {
    if (!me) return "Su usuario";
    const fn = [me.first_name, me.last_name].filter(Boolean).join(" ").trim();
    return fn || me.username || me.email || "Su usuario";
  }, [me]);

  const isOwnTask = (t: Tarea | null | undefined) => {
    if (!t) return false;
    if (!myId) return false;
    return Number(t.usuario_asignado) === myId;
  };

  const fetchTareas = async () => {
    try {
      if (!canTareasView) {
        setTareas([]);
        setLoading(false);
        return;
      }
      const token = getToken();
      if (!token) {
        setTareas([]);
        setLoading(false);
        return;
      }

      if (tareasTecnicoTareasInFlight) {
        await tareasTecnicoTareasInFlight;
        return;
      }

      tareasTecnicoTareasInFlight = (async () => {
        const response = await fetch(apiUrl("/api/tareas/"), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const rows = Array.isArray(data) ? data : [];
          const onlyMine = myId ? rows.filter((t: any) => Number(t.usuario_asignado) === myId) : [];
          setTareas(onlyMine);
        } else {
          setTareas([]);
        }
      })();

      await tareasTecnicoTareasInFlight;
      return;
    } catch (e) {
      setTareas([]);
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    } finally {
      tareasTecnicoTareasInFlight = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!myId) return;
    if (lastFetchedMyIdRef.current === myId) return;
    lastFetchedMyIdRef.current = myId;
    fetchTareas();
  }, [myId]);

  const shownList = useMemo(() => {
    if (!Array.isArray(tareas)) return [];
    const q = (searchTerm || "").trim().toLowerCase();
    return tareas.filter((t) => {
      if (!q) return true;
      return (
        String(t.descripcion || "").toLowerCase().includes(q) ||
        String(t.usuario_asignado_full_name || "").toLowerCase().includes(q) ||
        String(t.usuario_asignado_username || "").toLowerCase().includes(q)
      );
    });
  }, [tareas, searchTerm]);

  const tareaStats = useMemo(() => {
    const list = Array.isArray(tareas) ? tareas : [];
    const total = list.length;
    const asignadas = list.filter((t) => !!t.usuario_asignado).length;
    const conFotos = list.filter((t) => Array.isArray(t.fotos_urls) && t.fotos_urls.length > 0).length;
    return { total, asignadas, conFotos };
  }, [tareas]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "-";
    }
  };

  const KANBAN_COLUMNS = useMemo(
    () =>
      [
        { key: "TODO" as const, label: "Por hacer" },
        { key: "EN_PROGRESO" as const, label: "En proceso" },
        { key: "HECHO" as const, label: "Hecho" },
      ],
    []
  );

  const getEstado = (t: Tarea) => {
    const raw = (t.estado || "BACKLOG") as "BACKLOG" | (typeof KANBAN_COLUMNS)[number]["key"];
    return (raw === "BACKLOG" ? "TODO" : raw) as (typeof KANBAN_COLUMNS)[number]["key"];
  };

  const tasksByEstado = useMemo(() => {
    const grouped: Record<string, Tarea[]> = { TODO: [], EN_PROGRESO: [], HECHO: [] };
    for (const t of shownList) {
      grouped[getEstado(t)].push(t);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => {
        const ao = typeof a.orden === "number" ? a.orden : 0;
        const bo = typeof b.orden === "number" ? b.orden : 0;
        if (ao !== bo) return ao - bo;
        return String(b.fecha_creacion || "").localeCompare(String(a.fecha_creacion || ""));
      });
    }
    return grouped as Record<(typeof KANBAN_COLUMNS)[number]["key"], Tarea[]>;
  }, [shownList]);

  const updateTarea = async (id: number, patch: Partial<Pick<Tarea, "estado" | "orden">>) => {
    const token = getToken();
    if (!token) throw new Error("Sin token");
    const response = await fetch(apiUrl(`/api/tareas/${id}/`), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      let msg = "Error actualizando tarea";
      try {
        const data = await response.json();
        msg = data?.detail || JSON.stringify(data) || msg;
      } catch {
        msg = await response.text();
      }
      throw new Error(msg);
    }
  };

  const persistColumnOrders = async (estado: (typeof KANBAN_COLUMNS)[number]["key"], list: Tarea[]) => {
    await Promise.all(
      list.map((t, idx) => {
        const desiredOrden = idx;
        if (t.estado === estado && t.orden === desiredOrden) return Promise.resolve();
        return updateTarea(t.id, { estado, orden: desiredOrden });
      })
    );
  };

  const applyMovePure = (
    all: Tarea[],
    sourceId: number,
    destination: { estado: (typeof KANBAN_COLUMNS)[number]["key"]; index: number }
  ) => {
    const list = Array.isArray(all) ? [...all] : [];
    const srcIdx = list.findIndex((t) => t.id === sourceId);
    if (srcIdx < 0) return list;

    const task: Tarea = { ...list[srcIdx] };
    const fromEstado = getEstado(task);
    list.splice(srcIdx, 1);

    const destEstado = destination.estado;
    task.estado = destEstado;

    const destExisting = list
      .filter((t) => getEstado(t) === destEstado)
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
    const insertAt = Math.max(0, Math.min(destination.index, destExisting.length));
    destExisting.splice(insertAt, 0, task);
    destExisting.forEach((t, idx) => (t.orden = idx));

    const fromExisting =
      fromEstado === destEstado
        ? []
        : list
            .filter((t) => getEstado(t) === fromEstado)
            .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
    fromExisting.forEach((t, idx) => (t.orden = idx));

    const movedIds = new Set<number>([...destExisting, ...fromExisting].map((t) => t.id));
    const rest = list.filter((t) => !movedIds.has(t.id));
    return [...rest, ...fromExisting, ...destExisting];
  };

  const kanbanRootRef = useRef<HTMLDivElement | null>(null);
  const dndCleanupRef = useRef(new WeakMap<Element, () => void>());
  useEffect(() => {
    const root = kanbanRootRef.current;
    if (!root) return;
    return monitorForElements({
      onDrop: async ({ source, location }) => {
        const sourceData: any = source?.data;
        if (!sourceData || sourceData.type !== "tarea") return;
        const sourceId = Number(sourceData.id);
        if (!sourceId) return;

        const task = tareas.find((t) => t.id === sourceId);
        if (!isOwnTask(task)) return;

        const targets = location.current.dropTargets;
        const primary = targets && targets.length ? targets[0] : null;
        const destData: any = primary?.data;
        if (!destData) return;

        let destEstado: (typeof KANBAN_COLUMNS)[number]["key"] | null = null;
        let destIndex: number | null = null;

        if (destData.kind === "card") {
          destEstado = destData.estado;
          destIndex = Number(destData.index);
        }
        if (destData.kind === "column") {
          destEstado = destData.estado;
          destIndex = Number(destData.index);
        }

        if (!destEstado || destIndex === null || Number.isNaN(destIndex)) return;

        const prevSnapshot = tareas;
        const nextSnapshot = applyMovePure(prevSnapshot, sourceId, { estado: destEstado, index: destIndex });
        setTareas(nextSnapshot);

        try {
          const destList = nextSnapshot
            .filter((t) => getEstado(t) === destEstado)
            .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
          const fromTask = prevSnapshot.find((t) => t.id === sourceId);
          const fromEstado = fromTask ? getEstado(fromTask) : ("TODO" as (typeof KANBAN_COLUMNS)[number]["key"]);
          const fromList =
            fromEstado === destEstado
              ? []
              : nextSnapshot
                  .filter((t) => getEstado(t) === fromEstado)
                  .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

          await Promise.all([
            persistColumnOrders(destEstado, destList),
            fromEstado === destEstado ? Promise.resolve() : persistColumnOrders(fromEstado, fromList),
          ]);
        } catch (e) {
          setTareas(prevSnapshot);
          setAlert({ show: true, variant: "error", title: "No se pudo mover", message: String(e) });
          setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4500);
          await fetchTareas();
        }
      },
    });
  }, [tareas, myId]);

  return (
    <>
      <PageMeta title="Mis tareas" description="Tareas asignadas al técnico" />
      <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200"
            >
              Inicio
            </Link>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              /
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Mis tareas</span>
          </nav>

          {alert.show && (
            <div>
              <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
            </div>
          )}

          <header className={`flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${cardShellClass} p-4 sm:p-6`}>
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
                <svg
                  className="h-[18px] w-[18px] sm:h-6 sm:w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden
                >
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">Mi escritorio</p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Mis tareas</h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                  Solo ve lo asignado a usted. Cree tareas propias, arrastre tarjetas en el tablero y adjunte fotos como evidencia.
                </p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-50/80 text-brand-600 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-brand-400 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Tareas totales</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{tareaStats.total}</p>
                </div>
              </div>
            </div>

            <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-1a4 4 0 0 0-3-3.87" />
                    <path d="M4 21v-1a4 4 0 0 1 3-3.87" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Asignadas</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{tareaStats.asignadas}</p>
                </div>
              </div>
            </div>

            <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4 sm:col-span-2 lg:col-span-1`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Con fotos</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{tareaStats.conFotos}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por descripción o responsable…"
                className={searchInputClass}
                aria-label="Buscar tareas"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              )}
            </div>
            {canTareasCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 active:scale-[0.99] dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto sm:min-h-0"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nueva tarea
              </button>
            )}
          </div>

          <ComponentCard
            compact
            title="Tablero"
            desc="Arrastra tarjetas entre columnas para actualizar el estado. Solo puede editar o eliminar las tareas que le pertenecen. En móvil use el listado inferior."
            className={`overflow-hidden ${cardShellClass}`}
          >
            {!canTareasView ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                    <path d="M9 12h6" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Sin acceso</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">No tienes permisos para ver las tareas.</div>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Cargando tareas...
                </div>
              </div>
            ) : shownList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" />
                    <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" />
                    <path d="M9 11h6" />
                    <path d="M9 15h3" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">No hay tareas</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cree una nueva tarea para empezar.</div>
                </div>
                {canTareasCreate && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Crear tarea
                  </button>
                )}
              </div>
            ) : (
              <>
                <MobileTareaList
                tareas={shownList}
                startIndex={0}
                loading={loading}
                formatDate={(date: string) => formatDate(date)}
                onDescripcion={(t: any) => openDescripcionModal(t)}
                onFotos={(t: any) => openFotosModal(t)}
                onEdit={canTareasEdit ? (t: any) => handleEdit(t) : undefined}
                onDelete={canTareasDelete ? (t: any) => handleDeleteClick(t) : undefined}
                canEdit={canTareasEdit}
                canDelete={canTareasDelete}
              />

              <div ref={kanbanRootRef} className="hidden md:block">
                <div className="overflow-x-auto md:overflow-visible -mx-2 px-2">
                  <div className="min-w-[680px] md:min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 dark:border-white/[0.06] dark:bg-gray-950/30">
                    {KANBAN_COLUMNS.map((col) => {
                      const columnRef = (el: HTMLDivElement | null) => {
                        if (!el) return;
                        const existing = dndCleanupRef.current.get(el);
                        if (existing) existing();
                        const cleanup = dropTargetForElements({
                          element: el,
                          getData: () => ({
                            kind: "column",
                            estado: col.key,
                            index: (tasksByEstado[col.key] || []).length,
                          }),
                        });
                        dndCleanupRef.current.set(el, cleanup);
                      };

                      const list = tasksByEstado[col.key] || [];
                      return (
                        <div
                          key={col.key}
                          ref={columnRef}
                          className="rounded-xl border border-gray-200/80 bg-white dark:border-white/[0.06] dark:bg-gray-900/50 p-3 shadow-sm"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-white/[0.06]">
                            <div className="text-[12px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{col.label}</div>
                            <div className="text-[11px] tabular-nums rounded-full border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 font-medium text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-300">
                              {list.length}
                            </div>
                          </div>

                          <div className="space-y-2 min-h-[60px]">
                            {list.map((tarea, idx) => {
                              const usuarioNombre = tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || "-";
                              const initial = usuarioNombre && usuarioNombre !== "-" ? usuarioNombre.slice(0, 1).toUpperCase() : "-";
                              const canEditRow = canTareasEdit && isOwnTask(tarea);
                              const canDeleteRow = canTareasDelete && isOwnTask(tarea);

                              const cardRef = (el: HTMLDivElement | null) => {
                                if (!el) return;
                                const existing = dndCleanupRef.current.get(el);
                                if (existing) existing();
                                const cleanupDrag = draggable({
                                  element: el,
                                  getInitialData: () => ({ type: "tarea", id: tarea.id }),
                                });
                                const cleanupDrop = dropTargetForElements({
                                  element: el,
                                  getData: () => ({ kind: "card", estado: col.key, index: idx, id: tarea.id }),
                                });
                                dndCleanupRef.current.set(el, () => {
                                  cleanupDrag();
                                  cleanupDrop();
                                });
                              };

                              return (
                                <div
                                  key={tarea.id}
                                  ref={cardRef}
                                  className="group cursor-grab rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:cursor-grabbing dark:border-white/10 dark:bg-gray-950/30 dark:hover:border-white/20"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 text-xs font-semibold">
                                          {initial}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-[12px] font-medium text-gray-900 dark:text-white truncate">{usuarioNombre}</div>
                                          <div className="text-[11px] text-gray-500 dark:text-gray-400">{formatDate(tarea.fecha_creacion)}</div>
                                        </div>
                                      </div>
                                    </div>

                                    {(canEditRow || canDeleteRow) && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        {canEditRow && (
                                          <button
                                            type="button"
                                            onClick={() => handleEdit(tarea)}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                            title="Editar"
                                            aria-label="Editar"
                                          >
                                            <PencilIcon className="w-4 h-4" />
                                          </button>
                                        )}
                                        {canDeleteRow && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteClick(tarea)}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                                            title="Eliminar"
                                            aria-label="Eliminar"
                                          >
                                            <TrashBinIcon className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => openDescripcionModal(tarea)} className="text-[11px] text-blue-600 hover:underline dark:text-blue-400">
                                      Descripción
                                    </button>
                                    <button type="button" onClick={() => openFotosModal(tarea)} className="text-[11px] text-blue-600 hover:underline dark:text-blue-400">
                                      Fotos
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
            )}
          </ComponentCard>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        closeOnBackdropClick={false}
        className="flex max-h-[min(92vh,720px)] w-[min(96vw,36rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/75 p-0 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:max-w-xl"
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className="relative shrink-0 border-b border-gray-200/60 bg-gray-50/80 px-6 py-5 pr-14 dark:border-white/[0.06] dark:bg-gray-950/40 sm:pr-16">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-brand-500/80 dark:bg-brand-400/70" aria-hidden />
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-500/12 bg-white text-brand-700 shadow-sm dark:border-brand-400/15 dark:bg-gray-900/60 dark:text-brand-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                  <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                  <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                  <path d="M9 11h6M9 15h3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={sectionLabelClass}>Mi escritorio · Mis tareas</p>
                  {editingTarea ? (
                    <span className="rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                      Edición
                    </span>
                  ) : (
                    <span className="rounded-md border border-gray-200/80 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:bg-gray-900/60 dark:text-gray-400">
                      Nueva
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl">
                  {editingTarea ? "Editar tarea" : "Crear tarea"}
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  La tarea queda asignada a usted; describa el trabajo y adjunte hasta 2 fotos si aplica.
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col bg-gray-50/40 dark:bg-gray-950/20">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-6 sm:px-6 custom-scrollbar">
              <section className={modalPanelClass}>
                <div className="mb-4 flex flex-col gap-0.5 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                  <p className={sectionLabelClass}>Asignación</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Persona responsable</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En esta vista las tareas se registran siempre a su usuario.</p>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-gray-200/80 bg-gray-50/80 px-4 py-3 dark:border-white/[0.08] dark:bg-gray-950/40">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {myDisplayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{myDisplayName}</p>
                    {me?.email ? <p className="truncate text-xs text-gray-500 dark:text-gray-400">{String(me.email)}</p> : null}
                  </div>
                </div>
              </section>

              <section className={modalPanelClass}>
                <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                  <p className={sectionLabelClass}>Descripción</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Qué hay que hacer y en qué contexto.</p>
                </div>
                <label htmlFor="descripcion-tecnico" className={modalFieldLabelClass}>
                  Detalle de la tarea<span className={modalRequiredMark}>*</span>
                </label>
                <textarea
                  id="descripcion-tecnico"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={4}
                  placeholder="Ej. Revisar cableado en cuarto de servicio antes del viernes."
                  className={`${modalTextareaClass} mt-2`}
                />
              </section>

              <section className={modalPanelClass}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                  <div>
                    <p className={sectionLabelClass}>Evidencia</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Fotos adjuntas</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Opcional · PNG, JPG o WEBP · máx. 2</p>
                  </div>
                  <span className="tabular-nums text-xs font-medium text-gray-400 dark:text-gray-500">{formData.fotos_urls.length}/2</span>
                </div>
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-gray-300/80 bg-gray-50/60 px-4 py-5 transition-all dark:border-white/[0.12] dark:bg-gray-950/35 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${isDragActive ? "border-brand-400/70 bg-brand-500/[0.05] ring-2 ring-brand-500/20 dark:border-brand-400/50 dark:bg-brand-500/[0.08]" : "hover:border-gray-400/60 dark:hover:border-white/[0.18]"} ${formData.fotos_urls.length >= 2 ? "pointer-events-none opacity-45" : ""}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-500 dark:border-white/[0.08] dark:bg-gray-900/60 dark:text-gray-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                      <path d="M12 10v6M9 13h6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formData.fotos_urls.length >= 2 ? "Límite de 2 fotos" : "Añadir imágenes"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {formData.fotos_urls.length >= 2
                        ? "Elimine una foto para subir otra."
                        : "Arrastre archivos aquí o pulse para elegir desde su equipo."}
                    </p>
                  </div>
                </div>

                {formData.fotos_urls.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-3.5">
                    {formData.fotos_urls.map((url, idx) => (
                      <li
                        key={idx}
                        className="relative overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm dark:border-white/[0.08] dark:bg-gray-900/50 dark:shadow-none"
                      >
                        <img src={url} alt={`Vista previa ${idx + 1}`} className="aspect-[4/3] h-28 w-full object-cover sm:h-32" />
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ open: true, index: idx, url })}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/95 text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-error-600 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:text-error-400"
                          aria-label={`Eliminar foto ${idx + 1}`}
                        >
                          <TrashBinIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 sm:min-h-0 sm:w-auto sm:min-w-[10.5rem]"
                >
                  {editingTarea ? "Guardar cambios" : "Crear tarea"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} closeOnBackdropClick={false} className="w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path d="M8 6V4h8v2" strokeLinecap="round" />
                  <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                  <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar eliminación</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar esta tarea?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, index: null, url: null })}
          closeOnBackdropClick={false}
          className="w-full max-w-md"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path d="M8 6V4h8v2" strokeLinecap="round" />
                  <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                  <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Eliminar foto</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Se eliminará permanentemente.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">¿Estás seguro de que deseas eliminar esta foto?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ open: false, index: null, url: null })}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.index !== null && confirmDelete.url) {
                    handleDeletePhoto(confirmDelete.index, confirmDelete.url);
                  }
                }}
                className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={descripcionModal.open}
          onClose={() => setDescripcionModal({ open: false, content: "" })}
          closeOnBackdropClick={false}
          className="max-w-2xl w-[92vw]"
        >
          <div className="p-0 overflow-hidden rounded-2xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                    <path d="M14 2v4h4" />
                    <path d="M8 10h8" />
                    <path d="M8 14h8" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Descripción</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Detalle completo de la tarea</p>
                </div>
              </div>
            </div>
            <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">
                {descripcionModal.content || "-"}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
              <button
                type="button"
                onClick={() => setDescripcionModal({ open: false, content: "" })}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={fotosModal.open} onClose={() => setFotosModal({ open: false, urls: [] })} closeOnBackdropClick={false} className="max-w-3xl w-[92vw]">
          <div className="p-0 overflow-hidden rounded-2xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Fotos</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Imágenes adjuntas a la tarea</p>
                </div>
              </div>
            </div>
            <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {Array.isArray(fotosModal.urls) && fotosModal.urls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fotosModal.urls.map((url, idx) => (
                    <a
                      key={`${url}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40"
                    >
                      <img src={url} alt={`Foto ${idx + 1}`} className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/40 to-transparent">
                        <div className="text-[11px] text-white/95">Ver en tamaño completo</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/10 p-4 text-center text-gray-500 dark:text-gray-400">Sin fotos adjuntas</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
              <button
                type="button"
                onClick={() => setFotosModal({ open: false, urls: [] })}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
    </>
  );
}
