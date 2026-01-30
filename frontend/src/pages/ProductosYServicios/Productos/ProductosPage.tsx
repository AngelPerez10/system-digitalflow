import { useEffect, useState } from "react";

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
import FileInput from "@/components/form/input/FileInput";

interface ProductoMedia {
  id?: number;
  url?: string;
  public_id?: string;
  nombre_original?: string;
}

interface Producto {
  id: number;
  idx: number;
  nombre: string;
  unidad?: string;
  proveedor?: string;

  categoria?: string;
  descripcion?: string;
  precio_venta?: number | string | null;
  modelo?: string;
  codigo_fabrica?: string;
  fabricante_marca?: string;

  punto_pedido?: number | null;
  stock_inicial?: number | null;
  stock_minimo?: number | null;
  stock?: number | null;

  sku?: string;
  codigo_sat?: string;
  unidad_sat?: string;

  imagen?: ProductoMedia | null;
  documento?: ProductoMedia | null;
}

type AlertState = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

const TrashButton = ({ onClick, title, disabled }: { onClick: () => void; title: string; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    title={title}
    aria-label={title}
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4h8v2" strokeLinecap="round" />
      <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  </button>
);

const categoriaOptions = ["Por definir", "Producto", "Refacciones"] as const;
const unidadOptions = [
  "Por definir",
  "Conjunto",
  "Cubeta",
  "Gramo",
  "Galon",
  "Kilogramo",
  "Kit",
  "Libra",
  "Litros",
  "Metro cuadrado",
  "Metro cubico",
  "Metro",
  "Onza",
  "Pieza",
  "Rollo",
  "Saco",
  "Servicio",
  "Tramo",
] as const;
const proveedorOptions = ["Por definir"] as const;

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const formatApiErrors = (txt: string): string => {
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === 'object') {
      const parts: string[] = [];
      Object.entries(data).forEach(([k, v]) => {
        if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`);
        else if (typeof v === 'string') parts.push(`${k}: ${v}`);
      });
      return parts.join(' | ');
    }
  } catch { }
  return txt;
};

export default function Productos() {
  const asBool = (v: any, defaultValue: boolean) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return defaultValue;
  };

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canProductosView = asBool(permissions?.productos?.view, true);
  const canProductosCreate = asBool(permissions?.productos?.create, false);
  const canProductosEdit = asBool(permissions?.productos?.edit, false);
  const canProductosDelete = asBool(permissions?.productos?.delete, false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'more'>('general');

  const [alert, setAlert] = useState<AlertState>({ show: false, variant: 'info', title: '', message: '' });
  const [modalError, setModalError] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productoToDelete, setProductoToDelete] = useState<Producto | null>(null);

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
        const p = data?.permissions || {};
        const pStr = JSON.stringify(p);
        localStorage.setItem('permissions', pStr);
        sessionStorage.setItem('permissions', pStr);
        setPermissions(p);
        window.dispatchEvent(new Event('permissions:updated'));
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('permissions:updated' as any, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('permissions:updated' as any, sync);
    };
  }, []);

  const selectLikeClassName = "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Por definir",
    unidad: "Por definir",
    descripcion: "",
    precio_venta: "" as string | number | null,
    modelo: "",
    codigo_fabrica: "",
    proveedor: "Por definir",
    fabricante_marca: "",
    punto_pedido: 1 as string | number | null,
    stock_inicial: 1 as string | number | null,
    stock_minimo: 1 as string | number | null,
    sku: "",
    codigo_sat: "",
    unidad_sat: "",
  });

  const fetchProductos = async (page = 1, search = ""): Promise<Producto[]> => {
    if (!canProductosView) {
      setProductos([]);
      setTotalCount(0);
      setLoading(false);
      return [];
    }
    const token = getToken();
    if (!token) {
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(itemsPerPage),
      });
      if (search.trim()) query.set('search', search.trim());
      query.set('ordering', 'idx');

      const res = await fetch(apiUrl(`/api/productos/?${query.toString()}`), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) {
        setProductos([]);
        setTotalCount(0);
        return [];
      }
      const list = Array.isArray((data as any)?.results) ? ((data as any).results as Producto[]) : [];
      const count = typeof (data as any)?.count === 'number' ? (data as any).count : list.length;
      setProductos(list);
      setTotalCount(count);
      return list;
    } catch {
      setProductos([]);
      setTotalCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const refreshEditingProducto = (productoId: number, list?: Producto[]) => {
    const src = list || productos;
    const next = src.find((x) => x.id === productoId) || null;
    setEditingProducto(next);
  };

  useEffect(() => {
    fetchProductos(currentPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canProductosView, currentPage, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = productos;

  const openCreate = () => {
    if (!canProductosCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingProducto(null);
    setModalError('');
    setActiveTab('general');
    setImageFile(null);
    setDocumentFile(null);
    setFormData({
      nombre: "",
      categoria: "Por definir",
      unidad: "Por definir",
      descripcion: "",
      precio_venta: "",
      modelo: "",
      codigo_fabrica: "",
      proveedor: "Por definir",
      fabricante_marca: "",
      punto_pedido: 1,
      stock_inicial: 1,
      stock_minimo: 1,
      sku: "",
      codigo_sat: "",
      unidad_sat: "",
    });
    setShowModal(true);
  };

  const handleEdit = (p: Producto) => {
    if (!canProductosEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingProducto(p);
    setModalError('');
    setActiveTab('general');
    setImageFile(null);
    setDocumentFile(null);
    setFormData({
      nombre: p.nombre || "",
      categoria: p.categoria || "Por definir",
      unidad: p.unidad || "Por definir",
      descripcion: p.descripcion || "",
      precio_venta: (p.precio_venta as any) ?? "",
      modelo: p.modelo || "",
      codigo_fabrica: p.codigo_fabrica || "",
      proveedor: p.proveedor || "Por definir",
      fabricante_marca: p.fabricante_marca || "",
      punto_pedido: (p.punto_pedido as any) ?? "",
      stock_inicial: (p.stock_inicial as any) ?? "",
      stock_minimo: (p.stock_minimo as any) ?? "",
      sku: p.sku || "",
      codigo_sat: p.codigo_sat || "",
      unidad_sat: p.unidad_sat || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducto(null);
    setModalError('');
    setActiveTab('general');
    setImageFile(null);
    setDocumentFile(null);
  };

  const handleDeleteClick = (p: Producto) => {
    if (!canProductosDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }
    setProductoToDelete(p);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setProductoToDelete(null);
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!productoToDelete) return;
    const token = getToken();
    if (!token) return;

    if (!canProductosDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/productos/${productoToDelete.id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setAlert({ show: true, variant: 'error', title: 'Error', message: formatApiErrors(txt) || 'No se pudo eliminar el producto.' });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
        return;
      }
      await fetchProductos();
      setShowDeleteModal(false);
      setProductoToDelete(null);
      setAlert({ show: true, variant: 'success', title: 'Producto eliminado', message: 'El producto ha sido eliminado.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (e) {
      setAlert({ show: true, variant: 'error', title: 'Error', message: String(e) });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  const handleDeleteImagen = async () => {
    if (!editingProducto?.imagen?.id) return;
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(apiUrl(`/api/producto-imagenes/${editingProducto.imagen.id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo eliminar la imagen.');
        return;
      }

      const prevId = editingProducto.id;
      const list = await fetchProductos();
      refreshEditingProducto(prevId, list);
      setAlert({ show: true, variant: 'success', title: 'Imagen eliminada', message: 'La imagen ha sido eliminada.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (e) {
      setModalError(String(e));
    }
  };

  const handleDeleteDocumento = async () => {
    if (!editingProducto?.documento?.id) return;
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(apiUrl(`/api/producto-documentos/${editingProducto.documento.id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo eliminar el documento.');
        return;
      }

      const prevId = editingProducto.id;
      const list = await fetchProductos();
      refreshEditingProducto(prevId, list);
      setAlert({ show: true, variant: 'success', title: 'Documento eliminado', message: 'El documento ha sido eliminado.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (e) {
      setModalError(String(e));
    }
  };

  const uploadIfPresent = async (productoId: number, token: string) => {
    if (imageFile) {
      const allowed = ['jpeg', 'jpg', 'bmp', 'png'];
      const ext = (imageFile.name.split('.').pop() || '').toLowerCase();
      if (!allowed.includes(ext)) {
        throw new Error('Formato no permitido para Imagen.');
      }
      if (imageFile.size > 10 * 1024 * 1024) {
        throw new Error('La imagen excede 10MB.');
      }
      const fd = new FormData();
      fd.append('producto', String(productoId));
      fd.append('archivo', imageFile);
      const up = await fetch(apiUrl('/api/producto-imagenes/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!up.ok) {
        const txt = await up.text().catch(() => '');
        throw new Error(formatApiErrors(txt) || 'No se pudo subir la imagen.');
      }
    }

    if (documentFile) {
      const allowed = ['pdf', 'xls', 'xlsx', 'doc', 'docs', 'odt', 'ods', 'jpeg', 'jpg', 'bmp', 'png'];
      const ext = (documentFile.name.split('.').pop() || '').toLowerCase();
      if (!allowed.includes(ext)) {
        throw new Error('Formato no permitido para Documento informativo.');
      }
      if (documentFile.size > 10 * 1024 * 1024) {
        throw new Error('El documento excede 10MB.');
      }
      const fd = new FormData();
      fd.append('producto', String(productoId));
      fd.append('archivo', documentFile);
      const up = await fetch(apiUrl('/api/producto-documentos/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!up.ok) {
        const txt = await up.text().catch(() => '');
        throw new Error(formatApiErrors(txt) || 'No se pudo subir el documento.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!editingProducto && !canProductosCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    if (editingProducto && !canProductosEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar productos.' });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
      return;
    }

    const requiredMissing = [
      !String(formData.categoria || '').trim() ? 'Categoría de producto' : null,
      !String(formData.unidad || '').trim() ? 'Unidad' : null,
      !String(formData.descripcion || '').trim() ? 'Descripción' : null,
      formData.precio_venta === '' || formData.precio_venta === null ? 'Precio de venta' : null,
      formData.punto_pedido === '' || formData.punto_pedido === null ? 'Punto de Pedido' : null,
      formData.stock_inicial === '' || formData.stock_inicial === null ? 'Stock Inicial' : null,
      formData.stock_minimo === '' || formData.stock_minimo === null ? 'Stock Mínimo' : null,
    ].filter(Boolean) as string[];

    if (requiredMissing.length) {
      setModalError(`Faltan campos requeridos: ${requiredMissing.join(', ')}`);
      return;
    }

    const parseNumberOrThrow = (value: string | number | null | undefined, fieldLabel: string) => {
      if (value === '' || value === null || value === undefined) return null;
      const n = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isNaN(n)) {
        throw new Error(`El campo "${fieldLabel}" debe ser un número válido.`);
      }
      return n;
    };

    const token = getToken();
    if (!token) {
      setModalError('No hay token de sesión.');
      return;
    }

    const url = editingProducto ? apiUrl(`/api/productos/${editingProducto.id}/`) : apiUrl('/api/productos/');
    const method = editingProducto ? 'PUT' : 'POST';
    const nombreProducto = formData.nombre;
    const isEditing = !!editingProducto;

    try {
      const precioVentaNumber = parseNumberOrThrow(formData.precio_venta, 'Precio de venta');
      const puntoPedidoNumber = parseNumberOrThrow(formData.punto_pedido, 'Punto de Pedido');
      const stockInicialNumber = parseNumberOrThrow(formData.stock_inicial, 'Stock Inicial');
      const stockMinimoNumber = parseNumberOrThrow(formData.stock_minimo, 'Stock Mínimo');

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          precio_venta: precioVentaNumber,
          punto_pedido: puntoPedidoNumber,
          stock_inicial: stockInicialNumber,
          stock_minimo: stockMinimoNumber,
        }),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo guardar el producto.');
        return;
      }

      const saved = await response.json().catch(() => null);
      const productoId = saved?.id || editingProducto?.id;
      if (!productoId) {
        setModalError('No se pudo obtener el ID del producto guardado.');
        return;
      }

      try {
        await uploadIfPresent(productoId, token);
      } catch (err) {
        const msg = String(err || '');
        const isCloudinaryMissing = msg.toLowerCase().includes('cloudinary_url') || msg.toLowerCase().includes('cloudinary');
        if (!isCloudinaryMissing) {
          setModalError(msg);
          return;
        }

        await fetchProductos();
        setShowModal(false);
        setEditingProducto(null);
        setImageFile(null);
        setDocumentFile(null);

        setAlert({
          show: true,
          variant: 'warning',
          title: isEditing ? 'Producto actualizado' : 'Producto creado',
          message: 'El producto se guardó, pero no se pudieron subir archivos porque Cloudinary no está configurado.',
        });
        setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 3500);
        return;
      }

      await fetchProductos();
      setShowModal(false);
      setEditingProducto(null);
      setImageFile(null);
      setDocumentFile(null);

      setAlert({
        show: true,
        variant: 'success',
        title: isEditing ? 'Producto actualizado' : 'Producto creado',
        message: isEditing
          ? `El producto "${nombreProducto}" ha sido actualizado exitosamente.`
          : `El producto "${nombreProducto}" ha sido creado exitosamente.`,
      });
      setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2500);
    } catch (error) {
      setModalError(String(error));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Productos | Sistema" description="Gestión de productos" />
      <PageBreadcrumb pageTitle="Productos" />

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {!canProductosView ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver Productos.</div>
      ) : (
      <>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 7h-9" />
                <path d="M20 12h-9" />
                <path d="M20 17h-9" />
                <path d="M7 7h.01" />
                <path d="M7 12h.01" />
                <path d="M7 17h.01" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Productos</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Productos</h2>
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
          <button
            onClick={openCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/12 text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Unidad</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Nombre</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Precio</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Stock</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Proveedor</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-1/6 text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                {loading && (
                  <TableRow>
                    <TableCell className="px-2 py-2" colSpan={7}>Cargando...</TableCell>
                  </TableRow>
                )}

                {!loading && currentProductos.map((p, idx) => (
                  <TableRow key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-2 py-1.5 w-1/12 whitespace-nowrap">{startIndex + idx + 1}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{p.unidad || '-'}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4 text-gray-900 dark:text-white">{p.nombre}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{p.precio_venta ?? '-'}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{p.stock ?? '-'}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4">{p.proveedor || '-'}</TableCell>
                    <TableCell className="px-2 py-1.5 text-center w-1/6">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(p)}
                          className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                          title="Eliminar"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!productos.length && !loading && (
                  <TableRow>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2 text-center text-sm text-gray-500">Sin productos</TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalCount > 0 && currentProductos.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, totalCount)}</span> de{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> productos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                      .filter(page => {
                        if (totalPages <= 5) return true;
                        return Math.abs(page - currentPage) <= 2;
                      })
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
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
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      <Modal isOpen={showModal} onClose={handleCloseModal} className="w-full max-w-4xl p-0 overflow-hidden">
        <div>
          <div className="px-5 pt-5 pb-4 bg-linear-to-r from-brand-50 via-transparent to-transparent dark:from-gray-800/70 dark:via-gray-900/20 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 shadow-theme-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 7h-9" />
                  <path d="M20 12h-9" />
                  <path d="M20 17h-9" />
                  <path d="M7 7h.01" />
                  <path d="M7 12h.01" />
                  <path d="M7 17h.01" />
                </svg>
              </span>
              <div className="flex-1">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Captura y revisa los datos antes de guardar
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
            {modalError && (
              <Alert variant="error" title="Error" message={modalError} showLink={false} />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${activeTab === 'general'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                Datos generales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('more')}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${activeTab === 'more'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                Más información
              </button>
            </div>

            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Nombre *</Label>
                      <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                      <Label>Categoría de producto *</Label>
                      <select
                        value={formData.categoria || "Por definir"}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className={selectLikeClassName}
                      >
                        {categoriaOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Unidad *</Label>
                      <select
                        value={formData.unidad || "Por definir"}
                        onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                        className={selectLikeClassName}
                      >
                        {unidadOptions.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Proveedor</Label>
                      <select
                        value={formData.proveedor || "Por definir"}
                        onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                        className={selectLikeClassName}
                      >
                        {proveedorOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Precio 1 *</Label>
                      <Input
                        type="number"
                        value={formData.precio_venta ?? ''}
                        onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Modelo</Label>
                      <Input value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <Label>Descripción *</Label>
                    <textarea
                      rows={4}
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    
                    <div>
                      <Label>Código de fábrica</Label>
                      <Input value={formData.codigo_fabrica} onChange={(e) => setFormData({ ...formData, codigo_fabrica: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fabricante/Marca</Label>
                      <Input value={formData.fabricante_marca} onChange={(e) => setFormData({ ...formData, fabricante_marca: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Punto de Pedido *</Label>
                      <Input
                        type="number"
                        value={formData.punto_pedido ?? ''}
                        onChange={(e) => setFormData({ ...formData, punto_pedido: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Stock Inicial *</Label>
                      <Input
                        type="number"
                        value={formData.stock_inicial ?? ''}
                        onChange={(e) => setFormData({ ...formData, stock_inicial: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Stock Mínimo *</Label>
                      <Input
                        type="number"
                        value={formData.stock_minimo ?? ''}
                        onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Imagen del producto</p>
                  {editingProducto?.imagen?.url && (
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={editingProducto.imagen.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-brand-600 hover:underline truncate"
                        title={editingProducto.imagen.nombre_original || 'Ver imagen'}
                      >
                        {editingProducto.imagen.nombre_original || 'Ver imagen'}
                      </a>
                      <TrashButton
                        onClick={handleDeleteImagen}
                        title="Eliminar imagen"
                        disabled={!editingProducto?.imagen?.id}
                      />
                    </div>
                  )}
                  <FileInput
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0] || null;
                      if (!f) {
                        setImageFile(null);
                        return;
                      }
                      const allowed = ['jpeg', 'jpg', 'bmp', 'png'];
                      const ext = (f.name.split('.').pop() || '').toLowerCase();
                      if (!allowed.includes(ext)) {
                        setModalError('Formato no permitido para Imagen (jpeg, jpg, bmp, png).');
                        (e.target as HTMLInputElement).value = '';
                        setImageFile(null);
                        return;
                      }
                      if (f.size > 10 * 1024 * 1024) {
                        setModalError('La imagen excede 10MB.');
                        (e.target as HTMLInputElement).value = '';
                        setImageFile(null);
                        return;
                      }
                      setModalError('');
                      setImageFile(f);
                    }}
                  />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Documento informativo</p>
                  {editingProducto?.documento?.url && (
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={editingProducto.documento.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-brand-600 hover:underline truncate"
                        title={editingProducto.documento.nombre_original || 'Ver documento'}
                      >
                        {editingProducto.documento.nombre_original || 'Ver documento'}
                      </a>
                      <TrashButton
                        onClick={handleDeleteDocumento}
                        title="Eliminar documento"
                        disabled={!editingProducto?.documento?.id}
                      />
                    </div>
                  )}
                  <FileInput
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0] || null;
                      if (!f) {
                        setDocumentFile(null);
                        return;
                      }
                      const allowed = ['pdf', 'xls', 'xlsx', 'doc', 'docs', 'odt', 'ods', 'jpeg', 'jpg', 'bmp', 'png'];
                      const ext = (f.name.split('.').pop() || '').toLowerCase();
                      if (!allowed.includes(ext)) {
                        setModalError('Formato no permitido para Documento informativo.');
                        (e.target as HTMLInputElement).value = '';
                        setDocumentFile(null);
                        return;
                      }
                      if (f.size > 10 * 1024 * 1024) {
                        setModalError('El documento excede 10MB.');
                        (e.target as HTMLInputElement).value = '';
                        setDocumentFile(null);
                        return;
                      }
                      setModalError('');
                      setDocumentFile(f);
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'more' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>SKU</Label>
                      <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                    </div>
                    <div>
                      <Label>Código SAT</Label>
                      <Input value={formData.codigo_sat} onChange={(e) => setFormData({ ...formData, codigo_sat: e.target.value })} />
                    </div>
                    <div>
                      <Label>Unidad SAT</Label>
                      <Input value={formData.unidad_sat} onChange={(e) => setFormData({ ...formData, unidad_sat: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                {editingProducto ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {productoToDelete && (
        <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-[94vw] max-w-md p-0 overflow-hidden">
          <div>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eliminar Producto</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Esta acción no se puede deshacer</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar el producto{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{productoToDelete.nombre}</span>?
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
  );
}
