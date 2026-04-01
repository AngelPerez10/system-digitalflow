import { useEffect, useMemo, useRef, useState } from "react";

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

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "info", title: "", message: "" });

  const [showModal, setShowModal] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [modalError, setModalError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    activo: true,
  });

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

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const stats = useMemo(() => {
    const total = totalCount || servicios.length;
    const activos = servicios.filter((s) => s.activo !== false).length;
    const inactivos = Math.max(0, servicios.length - activos);
    return { total, activos, inactivos };
  }, [servicios, totalCount]);

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
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Servicios</h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                  Administra, edita y elimina servicios del catálogo.
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
          </div>

          <div className="mt-1">
          <ComponentCard compact title="Listado" desc="Servicios según búsqueda y paginación del servidor." className={`overflow-hidden ${cardShellClass}`}>
            <div className="p-2 pt-0">
              <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-gray-50/40 dark:border-white/[0.06] dark:bg-gray-950/30">
                <Table className="w-full min-w-[920px] border-collapse">
                  <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 text-[11px] font-semibold text-gray-900 dark:border-white/[0.06] dark:bg-gray-900/80 dark:text-white">
                    <TableRow>
                      <TableCell isHeader className="w-[72px] min-w-[72px] whitespace-nowrap px-3 py-2 text-left text-gray-700 dark:text-gray-300">ID</TableCell>
                      <TableCell isHeader className="min-w-[160px] max-w-[220px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Nombre</TableCell>
                      <TableCell isHeader className="min-w-[140px] max-w-[200px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Categoría</TableCell>
                      <TableCell isHeader className="min-w-[200px] px-3 py-2 text-left text-gray-700 dark:text-gray-300">Descripción</TableCell>
                      <TableCell isHeader className="w-[100px] min-w-[100px] whitespace-nowrap px-3 py-2 text-center text-gray-700 dark:text-gray-300">Status</TableCell>
                      <TableCell isHeader className="w-[112px] min-w-[112px] whitespace-nowrap px-3 py-2 text-center text-gray-700 dark:text-gray-300">Acciones</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                    {loading && (
                      <TableRow>
                        <TableCell className="px-3 py-3" colSpan={6}>Cargando...</TableCell>
                      </TableRow>
                    )}

                    {!loading && servicios.map((s, idx) => (
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

                    {!servicios.length && !loading && (
                      <TableRow>
                        <TableCell className="px-3 py-2" colSpan={6}>
                          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Sin servicios</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && totalCount > 0 && servicios.length > 0 && (
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

      <Modal isOpen={showModal} onClose={handleCloseModal} closeOnBackdropClick={false} className="w-full max-w-3xl p-0 overflow-hidden">
        <div>
          <div className="border-b border-gray-100 px-5 pb-4 pt-5 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </span>
              <div className="flex-1">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">{editingServicio ? "Editar Servicio" : "Nuevo Servicio"}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Captura y revisa los datos antes de guardar</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
            {modalError && <Alert variant="error" title="Error" message={modalError} showLink={false} />}

            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nombre *</Label>
                  <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
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

              <div>
                <Label>Descripción</Label>
                <textarea
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30"
              >
                {editingServicio ? "Actualizar" : "Guardar"}
              </button>
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
      </div>
    </div>
  )
}
