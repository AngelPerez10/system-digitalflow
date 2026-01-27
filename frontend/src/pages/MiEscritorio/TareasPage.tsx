import { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { useDropzone } from "react-dropzone";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { MobileTareaList } from "./MobileTareaCard";

interface Tarea {
    id: number;
    usuario_asignado: number | null;
    usuario_asignado_username?: string;
    usuario_asignado_full_name?: string;
    descripcion: string;
    fotos_urls: string[];
    fecha_creacion: string;
    fecha_actualizacion: string;
    creado_por?: number;
    creado_por_username?: string;
}

interface Usuario {
    id: number;
    username?: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff?: boolean;
    is_superuser?: boolean;
}

export default function TareasPage() {
    const getPermissionsFromStorage = () => {
        try {
            const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };

    const getToken = () => {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    };

    const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

    const canTareasView = permissions?.tareas?.view !== false;
    const canTareasCreate = !!permissions?.tareas?.create;
    const canTareasEdit = !!permissions?.tareas?.edit;
    const canTareasDelete = !!permissions?.tareas?.delete;

    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [descripcionModal, setDescripcionModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });
    const [fotosModal, setFotosModal] = useState<{ open: boolean; urls: string[] }>({ open: false, urls: [] });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tareaToDelete, setTareaToDelete] = useState<Tarea | null>(null);
    const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({
        open: false,
        index: null,
        url: null
    });

    const [alert, setAlert] = useState<{
        show: boolean;
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    }>({ show: false, variant: "success", title: "", message: "" });

    const [modalAlert, setModalAlert] = useState<{
        show: boolean;
        variant: "success" | "error" | "warning" | "info";
        title: string;
        message: string;
    }>({ show: false, variant: "success", title: "", message: "" });

    const [formData, setFormData] = useState({
        usuario_asignado: null as number | null,
        descripcion: "",
        fotos_urls: [] as string[],
    });
    const [usuarioOpen, setUsuarioOpen] = useState(false);
    const [usuarioSearch, setUsuarioSearch] = useState('');

    useEffect(() => {
        fetchTareas();
        fetchUsuarios();
    }, []);

    useEffect(() => {
        const sync = () => setPermissions(getPermissionsFromStorage());
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    useEffect(() => {
        const token = getToken();
        if (!token) return;
        const load = async () => {
            try {
                const res = await fetch(apiUrl('/api/me/permissions/'), {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store' as RequestCache,
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) return;
                const p = JSON.stringify(data?.permissions || {});
                localStorage.setItem('permissions', p);
                sessionStorage.setItem('permissions', p);
                setPermissions(data?.permissions || {});
            } catch {
                // ignore
            }
        };
        load();
    }, []);

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
                    const canvas = document.createElement('canvas');
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
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    let quality = 0.9;
                    const compress = () => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Error al comprimir la imagen'));
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
                            'image/jpeg',
                            quality
                        );
                    };
                    compress();
                };
                img.onerror = () => reject(new Error('Error al cargar la imagen'));
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
        });
    };

    const onDropPhotos = async (acceptedFiles: File[]) => {
        const current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];
        const remainingSlots = 2 - current.length;
        if (remainingSlots <= 0) return;
        const files = acceptedFiles.slice(0, remainingSlots).filter(f => f.type.startsWith('image/'));
        const urls: string[] = [];
        for (const file of files) {
            try {
                const compressed = await compressImage(file, 50, 1400, 1400);
                const token = getToken();
                const resp = await fetch(apiUrl('/api/tareas/upload-image/'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ data_url: compressed, folder: 'tareas/fotos' }),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.url) urls.push(data.url as string);
                }
            } catch {
                // ignorar individualmente
            }
        }
        if (urls.length) {
            setFormData({ ...formData, fotos_urls: [...current, ...urls] });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropPhotos,
        accept: {
            'image/png': [],
            'image/jpeg': [],
            'image/webp': [],
            'image/svg+xml': [],
        },
    });

    const getPublicIdFromUrl = (url: string): string | null => {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const uploadIdx = parts.findIndex(p => p === 'upload');
            if (uploadIdx === -1) return null;
            const after = parts.slice(uploadIdx + 1);
            const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
            const pathParts = after.slice(startIdx);
            if (!pathParts.length) return null;
            const last = pathParts[pathParts.length - 1];
            const dot = last.lastIndexOf('.');
            pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
            return pathParts.join('/');
        } catch {
            return null;
        }
    };

    const handleDeletePhoto = async (index: number, url: string) => {
        const publicId = getPublicIdFromUrl(url);
        const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter((_, i) => i !== index);
        try {
            const token = getToken();
            if (publicId) {
                await fetch(apiUrl('/api/tareas/delete-image/'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ public_id: publicId }),
                });
            }
        } catch (e) {
            console.error('Error al eliminar foto:', e);
        } finally {
            setFormData({ ...formData, fotos_urls: updated });
            setConfirmDelete({ open: false, index: null, url: null });
        }
    };

    const openDescripcionModal = (t: Tarea) => {
        setDescripcionModal({ open: true, content: t.descripcion || '-' });
    };

    const openFotosModal = (t: Tarea) => {
        const urls = Array.isArray(t.fotos_urls) ? t.fotos_urls : [];
        setFotosModal({ open: true, urls });
    };

    const fetchUsuarios = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(apiUrl("/api/users/accounts/"), {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
                setUsuarios(rows);
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        }
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
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTareas(Array.isArray(data) ? data : []);
            } else {
                setTareas([]);
            }
        } catch (error) {
            console.error("Error al cargar tareas:", error);
            setTareas([]);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const missing: string[] = [];
        if (!formData.usuario_asignado) missing.push('Usuario Asignado');
        if (!formData.descripcion?.trim()) missing.push('Descripción');
        return { ok: missing.length === 0, missing };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEditing = !!editingTarea;
        if (isEditing && !canTareasEdit) {
            setModalAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para editar tareas.'
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        if (!isEditing && !canTareasCreate) {
            setModalAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para crear tareas.'
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        const token = getToken();

        const { ok, missing } = validateForm();
        if (!ok) {
            setModalAlert({
                show: true,
                variant: 'warning',
                title: 'Campos requeridos',
                message: `Faltan: ${missing.join(', ')}`
            });
            setTimeout(() => setModalAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }

        try {
            const url = editingTarea
                ? apiUrl(`/api/tareas/${editingTarea.id}/`)
                : apiUrl("/api/tareas/");
            const method = editingTarea ? "PUT" : "POST";

            const payload: any = { ...formData };
            const toNullIfEmpty = (v: any) => (typeof v === 'string' && v.trim() === '' ? null : v);
            payload.descripcion = toNullIfEmpty(payload.descripcion);

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                await fetchTareas();
                setShowModal(false);
                setFormData({
                    usuario_asignado: null,
                    descripcion: "",
                    fotos_urls: [],
                });
                setEditingTarea(null);

                setAlert({
                    show: true,
                    variant: "success",
                    title: isEditing ? "Tarea Actualizada" : "Tarea Creada",
                    message: isEditing
                        ? `La tarea ha sido actualizada exitosamente.`
                        : `La tarea ha sido creada exitosamente.`
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            } else {
                let errorMsg = 'Error al guardar la tarea';
                try {
                    const errorData = await response.json();
                    console.error('Error del servidor:', errorData);
                    errorMsg = (errorData?.detail || JSON.stringify(errorData)) || errorMsg;
                } catch {
                    errorMsg = await response.text();
                }
                setAlert({
                    show: true,
                    variant: "error",
                    title: "Error al guardar",
                    message: errorMsg
                });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
            }
        } catch (error) {
            console.error("Error al guardar tarea:", error);
            setAlert({
                show: true,
                variant: "error",
                title: "Error",
                message: String(error)
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
        }
    };

    const handleDeleteClick = (tarea: Tarea) => {
        if (!canTareasDelete) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para eliminar tareas.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        setTareaToDelete(tarea);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!tareaToDelete) return;
        if (!canTareasDelete) {
            setShowDeleteModal(false);
            setTareaToDelete(null);
            return;
        }

        const token = getToken();
        try {
            const response = await fetch(apiUrl(`/api/tareas/${tareaToDelete.id}/`), {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchTareas();
                setShowDeleteModal(false);

                setAlert({
                    show: true,
                    variant: "success",
                    title: "Tarea Eliminada",
                    message: `La tarea ha sido eliminada exitosamente.`
                });
                setTareaToDelete(null);
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
            }
        } catch (error) {
            console.error("Error al eliminar tarea:", error);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setTareaToDelete(null);
    };

    const handleEdit = (tarea: Tarea) => {
        if (!canTareasEdit) {
            setAlert({
                show: true,
                variant: 'error',
                title: 'Sin permiso',
                message: 'No tienes permisos para editar tareas.'
            });
            setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
            return;
        }
        setEditingTarea(tarea);
        setUsuarioSearch('');
        setUsuarioOpen(false);
        setFormData({
            usuario_asignado: tarea.usuario_asignado || null,
            descripcion: tarea.descripcion || "",
            fotos_urls: Array.isArray(tarea.fotos_urls) ? tarea.fotos_urls : [],
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            usuario_asignado: null,
            descripcion: "",
            fotos_urls: [],
        });
        setEditingTarea(null);
        setUsuarioSearch('');
        setUsuarioOpen(false);
    };

    const selectUsuario = (usuario: Usuario | null) => {
        if (usuario) {
            setFormData({
                ...formData,
                usuario_asignado: usuario.id,
            });
            const nombre = usuario.first_name || usuario.last_name
                ? `${usuario.first_name} ${usuario.last_name}`.trim()
                : usuario.username || usuario.email;
            setUsuarioSearch(nombre);
        } else {
            setFormData({
                ...formData,
                usuario_asignado: null,
            });
            setUsuarioSearch('');
        }
        setUsuarioOpen(false);
    };

    const filteredUsuarios = useMemo(() => {
        if (!usuarioSearch.trim()) return usuarios;
        const q = usuarioSearch.toLowerCase();
        return usuarios.filter(u => {
            const nombre = `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase();
            return nombre.includes(q);
        });
    }, [usuarios, usuarioSearch]);

    const shownList = useMemo(() => {
        if (!Array.isArray(tareas)) return [];
        const q = (searchTerm || '').trim().toLowerCase();
        return tareas.filter(t => {
            if (!q) return true;
            return (
                t.descripcion?.toLowerCase().includes(q) ||
                t.usuario_asignado_full_name?.toLowerCase().includes(q) ||
                t.usuario_asignado_username?.toLowerCase().includes(q)
            );
        });
    }, [tareas, searchTerm]);

    const tareaStats = useMemo(() => {
        const list = Array.isArray(tareas) ? tareas : [];
        const total = list.length;
        const asignadas = list.filter(t => !!t.usuario_asignado).length;
        const conFotos = list.filter(t => Array.isArray(t.fotos_urls) && t.fotos_urls.length > 0).length;
        return { total, asignadas, conFotos };
    }, [tareas]);

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return '-';
        }
    };

    return (
        <>
            <PageMeta title="Tareas" description="Gestión de tareas del sistema" />
            <div className="p-4 sm:p-6 space-y-4">
                <PageBreadcrumb pageTitle="Tareas" />

                {alert.show && (
                    <div className="mb-2">
                        <Alert
                            variant={alert.variant}
                            title={alert.title}
                            message={alert.message}
                            showLink={false}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
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
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Tareas</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
                        <div className="relative w-full sm:max-w-xs md:max-w-sm">
                            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                                <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
                                    onClick={() => setSearchTerm('')}
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
                                onClick={() => {
                                    setEditingTarea(null);
                                    setShowModal(true);
                                }}
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
                <ComponentCard
                    title="Listado"
                    actions={null}
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
                                <div className="text-xs text-gray-500 dark:text-gray-400">Crea una nueva tarea para empezar.</div>
                            </div>
                            {canTareasCreate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingTarea(null);
                                        setShowModal(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                            <div className="hidden md:block overflow-x-auto">
                            <Table className="w-full min-w-[760px] sm:min-w-0 sm:table-fixed">
                                <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sm:sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                                    <TableRow>
                                        <TableCell isHeader className="px-2 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-gray-700 dark:text-gray-300">Usuario</TableCell>
                                        <TableCell isHeader className="px-2 py-2 text-left w-1/5 min-w-[170px] whitespace-nowrap text-gray-700 dark:text-gray-300">Descripción</TableCell>
                                        <TableCell isHeader className="px-2 py-2 text-left w-[110px] min-w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fotos</TableCell>
                                        <TableCell isHeader className="px-2 py-2 text-left w-[130px] min-w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Creación</TableCell>
                                        {(canTareasEdit || canTareasDelete) && (
                                            <TableCell isHeader className="px-2 py-2 text-center w-[120px] min-w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-200">
                                    {shownList.map((tarea) => {
                                        const usuarioNombre = tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || '-';
                                        const initial = usuarioNombre && usuarioNombre !== '-' ? usuarioNombre.slice(0, 1).toUpperCase() : '-';
                                        return (
                                            <TableRow key={tarea.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                                <TableCell className="px-2 py-2 text-gray-900 dark:text-white w-2/5 min-w-[220px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 text-xs font-semibold">
                                                            {initial}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-medium truncate">{usuarioNombre}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-2 w-1/5 min-w-[170px] whitespace-normal">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDescripcionModal(tarea)}
                                                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                                                            title="Ver descripción"
                                                        >
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M14 2v4h4" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
                                                            Descripción
                                                        </button>

                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-2 w-[110px] min-w-[110px] whitespace-normal">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <button
                                                            type="button"
                                                            onClick={() => openFotosModal(tarea)}
                                                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                                                            title="Ver fotos"
                                                        >
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><circle cx="12" cy="13" r="3" /></svg>
                                                            Fotos
                                                        </button>

                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-2 whitespace-nowrap w-[130px] min-w-[130px]">
                                                    <div className="text-[12px] text-gray-700 dark:text-gray-300">{formatDate(tarea.fecha_creacion)}</div>
                                                </TableCell>
                                                {(canTareasEdit || canTareasDelete) && (
                                                    <TableCell className="px-2 py-2 text-center w-[120px] min-w-[120px]">
                                                        <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                                            {canTareasEdit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEdit(tarea)}
                                                                    className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                                                                    title="Editar"
                                                                    aria-label="Editar"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {canTareasDelete && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteClick(tarea)}
                                                                    className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                                                                    title="Eliminar"
                                                                    aria-label="Eliminar"
                                                                >
                                                                    <TrashBinIcon className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            </div>
                        </>
                    )}
                </ComponentCard>
            </div>

            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                className="w-[94vw] max-w-3xl max-h-[92vh] p-0 overflow-hidden"
            >
                <div className="p-0 overflow-hidden rounded-2xl">
                    {/* Encabezado del modal con icono y título */}
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
                                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                                    {editingTarea ? "Editar tarea" : "Nueva tarea"}
                                </h2>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Asigna un usuario, describe la tarea y adjunta hasta 2 fotos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                        {modalAlert.show && (
                            <div className="mb-2">
                                <Alert
                                    variant={modalAlert.variant}
                                    title={modalAlert.title}
                                    message={modalAlert.message}
                                    showLink={false}
                                />
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="min-w-0">
                                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                        <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-1a4 4 0 0 0-3-3.87" /><path d="M4 21v-1a4 4 0 0 1 3-3.87" /><circle cx="12" cy="7" r="4" /></svg>
                                        Usuario Asignado <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative min-w-0">
                                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-2-2" /></svg>
                                        <input
                                            value={usuarioSearch}
                                            onChange={(e) => { setUsuarioSearch(e.target.value); setUsuarioOpen(true); }}
                                            onFocus={() => setUsuarioOpen(true)}
                                            placeholder="Buscar usuario..."
                                            className="block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            {formData.usuario_asignado && (
                                                <button
                                                    type="button"
                                                    onClick={() => selectUsuario(null)}
                                                    className="h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setUsuarioOpen(o => !o)}
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                                aria-label="Abrir selector de usuario"
                                            >
                                                <svg className={`w-3.5 h-3.5 transition-transform ${usuarioOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none"><path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </button>
                                        </div>

                                        {usuarioOpen && (
                                            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto shadow-theme-md">
                                                <button
                                                    type="button"
                                                    onClick={() => selectUsuario(null)}
                                                    className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-brand-500/15 ${!formData.usuario_asignado ? 'bg-brand-50/60 dark:bg-brand-500/20 font-medium text-brand-700 dark:text-brand-300' : ''}`}
                                                >
                                                    Selecciona un usuario
                                                </button>
                                                {filteredUsuarios.map((u) => {
                                                    const nombre = (u.first_name || u.last_name)
                                                        ? `${u.first_name} ${u.last_name}`.trim()
                                                        : (u.username || u.email);
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => selectUsuario(u)}
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 text-[11px] font-semibold">
                                                                    {nombre.slice(0, 1).toUpperCase()}
                                                                </span>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[12px] font-medium text-gray-800 dark:text-gray-100 truncate">{nombre}</span>
                                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{u.email}</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {filteredUsuarios.length === 0 && (
                                                    <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">Sin resultados</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M14 2v4h4" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
                                    Descripción de la Tarea <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="descripcion"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={4}
                                    placeholder="Ej: Ocupo que me ayudes en algo en la oficina"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><circle cx="12" cy="13" r="3" /></svg>
                                    Fotos (Máximo 2)
                                </label>
                                <div
                                    {...getRootProps()}
                                    className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${isDragActive
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-700'
                                        } ${formData.fotos_urls.length >= 2 ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <input {...getInputProps()} />
                                    <svg className="mb-2 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                                        <path d="M12 10v6" />
                                        <path d="M9 13h6" />
                                    </svg>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {formData.fotos_urls.length >= 2
                                            ? 'Máximo de fotos alcanzado'
                                            : 'Arrastra fotos aquí o haz clic para seleccionar'}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP (máx. 2 fotos)</p>
                                </div>

                                {formData.fotos_urls.length > 0 && (
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        {formData.fotos_urls.map((url, idx) => (
                                            <div key={idx} className="relative">
                                                <img
                                                    src={url}
                                                    alt={`Foto ${idx + 1}`}
                                                    className="h-32 w-full rounded-lg object-cover"
                                                />
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

            {/* Modal de detalle - Descripción */}
            <Modal
                isOpen={descripcionModal.open}
                onClose={() => setDescripcionModal({ open: false, content: '' })}
                className="max-w-2xl w-[92vw]"
            >
                <div className="p-0 overflow-hidden rounded-2xl">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M14 2v4h4" /><path d="M8 10h8" /><path d="M8 14h8" /></svg>
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Descripción</h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Detalle completo de la tarea</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{descripcionModal.content || '-'}</pre>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
                        <button type="button" onClick={() => setDescripcionModal({ open: false, content: '' })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de detalle - Fotos */}
            <Modal
                isOpen={fotosModal.open}
                onClose={() => setFotosModal({ open: false, urls: [] })}
                className="max-w-3xl w-[92vw]"
            >
                <div className="p-0 overflow-hidden rounded-2xl">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><circle cx="12" cy="13" r="3" /></svg>
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
                                        <img
                                            src={url}
                                            alt={`Foto ${idx + 1}`}
                                            className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                        />
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
                        <button type="button" onClick={() => setFotosModal({ open: false, urls: [] })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showDeleteModal}
                onClose={handleCancelDelete}
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
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                Confirmar eliminación
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
                    </p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        ¿Estás seguro de que deseas eliminar esta foto?
                    </p>
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
        </>
    );
}
