import { useEffect, useRef, useState } from "react";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
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
  const canServiciosView = asBool(permissions?.servicios?.view, true);
  const canServiciosCreate = asBool(permissions?.servicios?.create, false);
  const canServiciosEdit = asBool(permissions?.servicios?.edit, false);
  const canServiciosDelete = asBool(permissions?.servicios?.delete, false);

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
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Servicios | Sistema" description="Gestión de servicios" />
      <PageBreadcrumb pageTitle="Servicios" />

      {alert.show && <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />}

      {!canServiciosView ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver Servicios.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6h12" />
                    <path d="M6 12h12" />
                    <path d="M6 18h12" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Servicios</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Servicios</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
              <div className="relative w-full sm:max-w-xs md:max-w-sm">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70"
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

              <button
                onClick={openCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo Servicio
              </button>
            </div>
          </div>

          <ComponentCard title="Listado">
            <div className="p-2">
              <div className="overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                    <TableRow>
                      <TableCell isHeader className="px-3 py-2 text-left w-[72px] text-gray-700 dark:text-gray-300">ID</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-left w-[220px] text-gray-700 dark:text-gray-300">Nombre</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-left w-[200px] text-gray-700 dark:text-gray-300">Categoría</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Descripción</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-center w-[120px] text-gray-700 dark:text-gray-300">Status</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-center w-[120px] text-gray-700 dark:text-gray-300">Acciones</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                    {loading && (
                      <TableRow>
                        <TableCell className="px-2 py-2" colSpan={6}>Cargando...</TableCell>
                      </TableRow>
                    )}

                    {!loading && servicios.map((s, idx) => (
                      <TableRow key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <TableCell className="px-3 py-1.5 w-[72px] whitespace-nowrap">{startIndex + idx + 1}</TableCell>
                        <TableCell className="px-3 py-1.5 w-[220px] text-gray-900 dark:text-white truncate">{s.nombre}</TableCell>
                        <TableCell className="px-3 py-1.5 w-[200px] truncate">{s.categoria || "-"}</TableCell>
                        <TableCell className="px-3 py-1.5">
                          <span className="block max-w-[640px] truncate" title={s.descripcion || ""}>{s.descripcion || "-"}</span>
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-center w-[120px]">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.activo !== false
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"}`}
                          >
                            {s.activo !== false ? "Activo" : "Inactivo"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-center w-[120px]">
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
                        <TableCell className="px-2 py-2" colSpan={6}>
                          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Sin servicios</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && totalCount > 0 && servicios.length > 0 && (
                <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
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
        </>
      )}

      <Modal isOpen={showModal} onClose={handleCloseModal} closeOnBackdropClick={false} className="w-full max-w-3xl p-0 overflow-hidden">
        <div>
          <div className="px-5 pt-5 pb-4 bg-linear-to-r from-brand-50 via-transparent to-transparent dark:from-gray-800/70 dark:via-gray-900/20 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 shadow-theme-xs">
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
  )
}
