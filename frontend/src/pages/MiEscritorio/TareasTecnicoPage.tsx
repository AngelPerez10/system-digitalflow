import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { Modal } from "@/components/ui/modal";
import { useDropzone } from "react-dropzone";
import { apiUrl } from "@/config/api";
import { MobileTareaList } from "./MobileTareaCard";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

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
    } catch (e) {
      setTareas([]);
      setAlert({ show: true, variant: "error", title: "Error", message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    } finally {
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
      <div className="p-4 sm:p-6 space-y-4">
        <PageBreadcrumb pageTitle="Mis tareas" />

        {alert.show && (
          <div className="mb-2">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                </svg>
              </span>
              <div className="flex flex-col">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Tareas totales</p>
                <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{tareaStats.total}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-1a4 4 0 0 0-3-3.87" />
                  <path d="M4 21v-1a4 4 0 0 1 3-3.87" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className="flex flex-col">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Asignadas</p>
                <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{tareaStats.asignadas}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
              <div className="flex flex-col">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Con fotos</p>
                <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{tareaStats.conFotos}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tareas asignadas</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Solo tareas asignadas a tu usuario</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
            <div className="relative w-full sm:max-w-xs md:max-w-sm">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar"
                className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              )}
            </div>

            {canTareasCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14M4 12h16" strokeLinecap="round" />
                </svg>
                Nueva Tarea
              </button>
            )}
          </div>
        </div>

        <ComponentCard title="Listado" actions={null}>
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
                  <div className="min-w-[680px] md:min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-2xl bg-gray-100/70 dark:bg-gray-950/20 p-2">
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
                          className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/90 dark:bg-gray-900/50 p-3 shadow-theme-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{col.label}</div>
                            <div className="text-[11px] px-2 py-0.5 rounded-full bg-white/90 dark:bg-white/10 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300">
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
                                  className="group rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-gray-950/30 p-3 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-grab active:cursor-grabbing"
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

        <Modal isOpen={showModal} onClose={handleCloseModal} closeOnBackdropClick={false} className="w-[94vw] max-w-2xl max-h-[92vh] p-0 overflow-hidden">
          <div className="p-0 overflow-hidden rounded-2xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 3h6a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2Z" />
                    <path d="M7 7h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" />
                    <path d="M9 11h6" />
                    <path d="M9 15h3" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{editingTarea ? "Editar tarea" : "Nueva tarea"}</h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Describe la tarea y adjunta hasta 2 fotos.</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[72vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                      <path d="M14 2v4h4" />
                      <path d="M8 10h8" />
                      <path d="M8 14h8" />
                    </svg>
                    Descripción de la Tarea <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={4}
                    placeholder="Describe la tarea"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    Fotos (Máximo 2)
                  </label>
                  <div
                    {...getRootProps()}
                    className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${isDragActive
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
                      : "border-gray-300 hover:border-gray-400 dark:border-gray-700"} ${formData.fotos_urls.length >= 2 ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <input {...getInputProps()} />
                    <svg className="mb-2 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                      <path d="M12 10v6" />
                      <path d="M9 13h6" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.fotos_urls.length >= 2 ? "Máximo de fotos alcanzado" : "Arrastra fotos aquí o haz clic para seleccionar"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP (máx. 2 fotos)</p>
                  </div>

                  {formData.fotos_urls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {formData.fotos_urls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`Foto ${idx + 1}`} className="h-32 w-full rounded-lg object-cover" />
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ open: true, index: idx, url })}
                            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg hover:bg-red-600"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                  >
                    {editingTarea ? "Actualizar" : "Crear"} Tarea
                  </button>
                </div>
              </form>
            </div>
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
      </div>
    </>
  );
}
