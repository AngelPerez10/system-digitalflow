import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { useDropzone } from "react-dropzone";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon, TimeIcon } from "../../icons";

interface Cliente {
  id: number;
  idx: number;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface Orden {
  id: number;
  idx: number;
  cliente_id: number | null;
  cliente: string;
  direccion: string;
  telefono_cliente: string;
  problematica: string;
  servicios_realizados: string[];
  status: 'pendiente' | 'resuelto';
  comentario_tecnico: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string;
  hora_termino: string;
  nombre_encargado: string;
  nombre_cliente: string;
  tecnico_asignado?: number | null;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  pdf_url?: string;
  fecha_creacion: string;
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

let ordenesPagePermissionsLastLoadAt = 0;
let ordenesPageInitialDataLastLoadAt = 0;
const ORDENES_PAGE_INIT_THROTTLE_MS = 800;

export default function Ordenes() {
  const navigate = useNavigate();

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canOrdenesView = permissions?.ordenes?.view !== false;
  const canOrdenesCreate = !!permissions?.ordenes?.create;
  const canOrdenesEdit = !!permissions?.ordenes?.edit;
  const canOrdenesDelete = !!permissions?.ordenes?.delete;

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);
  const [editingOrden, setEditingOrden] = useState<Orden | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({ open: false, index: null, url: null });
  // Filtros
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'' | 'pendiente' | 'resuelto'>('');
  const [filterServicio, setFilterServicio] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const now = Date.now();
    if (now - ordenesPagePermissionsLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesPagePermissionsLastLoadAt = now;
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

  const formatYmdToDMY = (ymd: string | null | undefined) => {
    if (!ymd) return '-';
    const s = ymd.toString().slice(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return '-';
    const dt = new Date(y, m - 1, d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  const isGoogleMapsUrl = (value: string | null | undefined) => {
    if (!value) return false;
    const s = String(value).trim();
    if (!s) return false;
    if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
    try {
      const u = new URL(s);
      const host = (u.hostname || '').toLowerCase();
      const href = u.href.toLowerCase();
      if (host === 'maps.app.goo.gl') return true;
      if (host.endsWith('google.com') && href.includes('/maps')) return true;
      return false;
    } catch {
      return false;
    }
  };

  // Cerrar dropdown de filtros al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!filterRef.current) return;
      const target = e.target as Node;
      // No cerrar si el click ocurre dentro del calendario de flatpickr (apendado al body)
      if ((target as Element)?.closest && (target as Element).closest('.flatpickr-calendar')) {
        return;
      }
      if (!filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
    };
    if (filterOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  useEffect(() => {
    const now = Date.now();
    if (now - ordenesPageInitialDataLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesPageInitialDataLastLoadAt = now;
    loadServiciosDisponibles();
    fetchOrdenes();
    fetchClientes();
    fetchUsuarios();
  }, []);

  const getPublicIdFromUrl = (url: string): string | null => {
    try {
      // Example: https://res.cloudinary.com/<cloud>/image/upload/v1234567/ordenes/fotos/abc123.jpg
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex(p => p === 'upload');
      if (uploadIdx === -1) return null;
      const after = parts.slice(uploadIdx + 1); // [v123456, ordenes, fotos, abc123.jpg]
      // Drop version if present (starts with 'v' followed by digits)
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
      // Eliminar de Cloudinary
      if (publicId) {
        await fetch(apiUrl('/api/ordenes/delete-image/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ public_id: publicId }),
        });
      }
      // Si estamos editando una orden existente, actualizar solo fotos_urls en backend
      if (editingOrden && editingOrden.id) {
        const response = await fetch(apiUrl(`/api/ordenes/${editingOrden.id}/update-photos/`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fotos_urls: updated }),
        });

        if (response.ok) {
          const updatedOrden = await response.json();
          // Actualizar el estado editingOrden con los datos actualizados
          setEditingOrden(updatedOrden);
          // Recargar lista de órdenes para reflejar el cambio
          await fetchOrdenes();
        } else {
          console.error('Error al actualizar fotos en backend:', await response.text());
        }
      }
    } catch (e) {
      console.error('Error al eliminar foto:', e);
    } finally {
      setFormData({ ...formData, fotos_urls: updated });
      setConfirmDelete({ open: false, index: null, url: null });
    }
  };

  const getNowHHMM = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
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
    const remainingSlots = 5 - current.length;
    if (remainingSlots <= 0) return;
    const files = acceptedFiles.slice(0, remainingSlots).filter(f => f.type.startsWith('image/'));
    const urls: string[] = [];
    for (const file of files) {
      try {
        // Comprimir localmente para subir payload pequeño
        const compressed = await compressImage(file, 50, 1400, 1400);
        // Subir al backend (Cloudinary)
        const token = getToken();
        const resp = await fetch(apiUrl('/api/ordenes/upload-image/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ data_url: compressed, folder: 'ordenes/fotos' }),
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


  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Alert state for Modal
  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Form state
  const [formData, setFormData] = useState({
    cliente_id: null as number | null,
    cliente: "",
    direccion: "",
    telefono_cliente: "",
    nombre_cliente: "",
    problematica: "",
    servicios_realizados: [] as string[],
    status: "pendiente" as 'pendiente' | 'resuelto',
    comentario_tecnico: "",
    fecha_inicio: new Date().toISOString().split('T')[0],
    hora_inicio: "",
    fecha_finalizacion: "",
    hora_termino: "",
    nombre_encargado: "",
    tecnico_asignado: null as number | null,
    firma_encargado_url: "",
    firma_cliente_url: "",
    fotos_urls: [] as string[]
  });

  // Estado para modal de mapa
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zoomRef = useRef<number>(15);
  const mapContainerId = 'leaflet-map';

  // Cargar Leaflet en demanda e inicializar mapa al abrir modal
  useEffect(() => {
    if (!showMapModal) {
      // Limpieza al cerrar
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const initFromDireccion = () => {
      const d = (formData.direccion || '').trim();
      const m = d.match(/q=([\-\d\.]+),([\-\d\.]+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      return false;
    };

    const ensureLeaflet = async () => {
      const w: any = window as any;
      if (w.L) return w.L;
      // CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      // JS
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById('leaflet-js')) return resolve();
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Leaflet load error'));
        document.body.appendChild(script);
      });
      return (window as any).L;
    };

    (async () => {
      try {
        const L = await ensureLeaflet();

        // Inicializar selectedLocation
        const had = initFromDireccion();
        if (!had && !selectedLocation) {
          setSelectedLocation({ lat: 19.0653, lng: -104.2831 });
        }

        // Crear mapa
        const container = document.getElementById(mapContainerId);
        if (!container) return;
        const center = selectedLocation || { lat: 19.0653, lng: -104.2831 };
        const map = L.map(container).setView([center.lat, center.lng], zoomRef.current || 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        map.on('zoomend', () => {
          try { zoomRef.current = map.getZoom(); } catch { }
        });
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
        });
        mapRef.current = map;

        // Colocar marker inicial si hay selectedLocation
        if (selectedLocation) {
          markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
        }
      } catch (err) {
        setAlert({ show: true, variant: 'error', title: 'Error de mapa', message: 'No se pudo cargar el mapa interactivo.' });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    })();
  }, [showMapModal]);

  // Sincronizar marker y vista cuando cambia selectedLocation
  useEffect(() => {
    const L: any = (window as any).L;
    if (!mapRef.current || !selectedLocation || !L) return;
    const map = mapRef.current;
    const currentZoom = typeof zoomRef.current === 'number' ? zoomRef.current : map.getZoom?.() || 15;
    map.setView([selectedLocation.lat, selectedLocation.lng], currentZoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    } else {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
    }
  }, [selectedLocation]);

  // Estados para dropdowns personalizados
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [tecnicoOpen, setTecnicoOpen] = useState(false);
  const [tecnicoSearch, setTecnicoSearch] = useState('');
  const [servicioOpen, setServicioOpen] = useState(false);
  const [servicioSearch, setServicioSearch] = useState('');

  // Modales de detalles
  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean, content: string }>({ open: false, content: '' });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({ open: false, content: [] });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });
  const validateForm = () => {
    const missing: string[] = [];
    if (!formData.cliente_id) missing.push('Cliente');

    if (!formData.telefono_cliente?.trim()) missing.push('Teléfono');
    if (!Array.isArray(formData.servicios_realizados) || formData.servicios_realizados.length === 0) missing.push('Servicios Realizados');

    return { ok: missing.length === 0, missing };
  };

  const fetchClientes = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(apiUrl("/api/clientes/"), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClientes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const commonHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      } as HeadersInit;

      const response = await fetch(apiUrl("/api/users/accounts/"), { headers: commonHeaders });

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
        setUsuarios(rows);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const loadServiciosDisponibles = () => {
    // Lista oficial por defecto (forzar uso y reescribir localStorage)
    const defaultServicios = [
      'ALARMAS',
      'VIDEOVIGILANCIA',
      'CONTROLES DE ACCESO',
      'CERCOS ELECTRIFICADOS',
      'REDES DE COMUNICACIÓN',
      'AIRES ACONDICIONADOS',
      'CALENTADORES SOLARES',
      'PANELES SOLARES',
      'TIERRA FÍSICA',
      'TRABAJOS ELÉCTRICOS',
      'TORRE ARRIOSTRADA',
      'RASTREADOR GPS',
      'DASHCAM',
      'VENTA DE PRODUCTO',
    ];
    setServiciosDisponibles(defaultServicios);
    localStorage.setItem('servicios_disponibles', JSON.stringify(defaultServicios));
  };

  const fetchOrdenes = async () => {
    try {
      if (!canOrdenesView) {
        setOrdenes([]);
        setLoading(false);
        return;
      }
      const token = getToken();
      if (!token) {
        console.warn("No hay token de autenticación");
        setOrdenes([]);
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl("/api/ordenes/"), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrdenes(Array.isArray(data) ? data : []);
      } else if (response.status === 401) {
        console.error("Token inválido o expirado");
        setOrdenes([]);
      } else if (response.status === 403) {
        console.error("Acceso prohibido");
        setOrdenes([]);
      } else {
        console.error("Error al cargar órdenes:", response.status);
        setOrdenes([]);
      }
    } catch (error) {
      console.error("Error al cargar órdenes:", error);
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();

    // Reglas: Cliente, Dirección, Teléfono, Servicios Realizados y Fecha de Inicio son requeridos
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

    // Guardar el cliente antes de limpiar el formulario
    const ordenCliente = formData.cliente;
    const isEditing = !!editingOrden;

    try {
      const url = editingOrden
        ? apiUrl(`/api/ordenes/${editingOrden.id}/`)
        : apiUrl("/api/ordenes/");
      const method = editingOrden ? "PUT" : "POST";

      // Construir payload, omitiendo tecnico_asignado si es null
      const payload: any = { ...formData };
      if (payload.tecnico_asignado == null) {
        delete payload.tecnico_asignado;
      }

      // Saneamiento: convertir strings vacíos a null en campos opcionales
      const toNullIfEmpty = (v: any) => (typeof v === 'string' && v.trim() === '' ? null : v);
      payload.direccion = toNullIfEmpty(payload.direccion);
      payload.telefono_cliente = toNullIfEmpty(payload.telefono_cliente);
      payload.problematica = toNullIfEmpty(payload.problematica);
      payload.comentario_tecnico = toNullIfEmpty(payload.comentario_tecnico);
      payload.fecha_inicio = toNullIfEmpty(payload.fecha_inicio);
      payload.hora_inicio = toNullIfEmpty(payload.hora_inicio);
      payload.fecha_finalizacion = toNullIfEmpty(payload.fecha_finalizacion);
      payload.hora_termino = toNullIfEmpty(payload.hora_termino);
      payload.nombre_encargado = toNullIfEmpty(payload.nombre_encargado);
      payload.nombre_cliente = toNullIfEmpty(payload.nombre_cliente);
      payload.firma_encargado_url = toNullIfEmpty(payload.firma_encargado_url);
      payload.firma_cliente_url = toNullIfEmpty(payload.firma_cliente_url);
      // Asegurar arreglo para servicios_realizados
      if (!Array.isArray(payload.servicios_realizados)) payload.servicios_realizados = [];

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Recargar la lista completa de órdenes
        await fetchOrdenes();
        setShowModal(false);
        setFormData({
          cliente_id: null,
          cliente: "",
          direccion: "",
          telefono_cliente: "",
          nombre_cliente: "",
          problematica: "",
          servicios_realizados: [],
          status: "pendiente",
          comentario_tecnico: "",
          fecha_inicio: new Date().toISOString().split('T')[0],
          hora_inicio: "",
          fecha_finalizacion: "",
          hora_termino: "",
          nombre_encargado: "",
          tecnico_asignado: null,
          firma_encargado_url: "",
          firma_cliente_url: "",
          fotos_urls: []
        });
        setEditingOrden(null);

        // Show success alert (3s)
        setAlert({
          show: true,
          variant: "success",
          title: isEditing ? "Orden Actualizada" : "Orden Creada",
          message: isEditing
            ? `La orden para "${ordenCliente}" ha sido actualizada exitosamente.`
            : `La orden para "${ordenCliente}" ha sido creada exitosamente.`
        });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      } else {
        // Mostrar error detallado
        let errorMsg = 'Error al guardar la orden';
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
      console.error("Error al guardar orden:", error);
      setAlert({
        show: true,
        variant: "error",
        title: "Error",
        message: String(error)
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    }
  };

  const handleDeleteClick = (orden: Orden) => {
    if (!canOrdenesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setOrdenToDelete(orden);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!ordenToDelete) return;

    const token = getToken();
    try {
      const response = await fetch(apiUrl(`/api/ordenes/${ordenToDelete.id}/`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchOrdenes();
        setShowDeleteModal(false);

        // Show success alert (3s)
        setAlert({
          show: true,
          variant: "success",
          title: "Orden Eliminada",
          message: `La orden para "${ordenToDelete?.cliente}" ha sido eliminada exitosamente.`
        });
        setOrdenToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error al eliminar orden:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setOrdenToDelete(null);
  };

  const handleEdit = (orden: Orden) => {
    if (!canOrdenesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingOrden(orden);
    setTecnicoSearch('');
    setTecnicoOpen(false);
    setFormData({
      cliente_id: orden.cliente_id || null,
      cliente: orden.cliente || "",
      direccion: orden.direccion || "",
      telefono_cliente: orden.telefono_cliente || "",
      nombre_cliente: orden.nombre_cliente || "",
      nombre_encargado: orden.nombre_encargado || "",
      problematica: orden.problematica || "",
      servicios_realizados: orden.servicios_realizados || [],
      comentario_tecnico: orden.comentario_tecnico || "",
      status: orden.status || "pendiente",
      fecha_inicio: orden.fecha_inicio || "",
      hora_inicio: orden.hora_inicio || "",
      fecha_finalizacion: orden.fecha_finalizacion || "",
      hora_termino: orden.hora_termino || "",
      tecnico_asignado: orden.tecnico_asignado ? Number(orden.tecnico_asignado) : null,
      firma_encargado_url: orden.firma_encargado_url || "",
      firma_cliente_url: orden.firma_cliente_url || "",
      fotos_urls: Array.isArray(orden.fotos_urls) ? orden.fotos_urls : []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      cliente_id: null,
      cliente: "",
      direccion: "",
      telefono_cliente: "",
      nombre_cliente: "",
      problematica: "",
      servicios_realizados: [],
      status: "pendiente",
      comentario_tecnico: "",
      fecha_inicio: new Date().toISOString().split('T')[0],
      hora_inicio: "",
      fecha_finalizacion: "",
      hora_termino: "",
      nombre_encargado: "",
      tecnico_asignado: null,
      firma_encargado_url: "",
      firma_cliente_url: "",
      fotos_urls: []
    });
    setEditingOrden(null);
    // Limpiar estados de búsqueda de dropdowns
    setClienteSearch('');
    setTecnicoSearch('');
    setServicioSearch('');
    setClienteOpen(false);
    setTecnicoOpen(false);
    setServicioOpen(false);
  };

  const shownList = useMemo(() => {
    if (!Array.isArray(ordenes)) return [];
    const q = (searchTerm || '').trim().toLowerCase();
    const list = ordenes.filter(o => {
      // filtro por texto
      const matchText = !q || (
        o.cliente?.toLowerCase().includes(q) ||
        o.telefono_cliente?.includes(q) ||
        o.problematica?.toLowerCase().includes(q) ||
        o.nombre_encargado?.toLowerCase().includes(q)
      );
      if (!matchText) return false;
      // filtro por mes
      if (!selectedMonth) return true;
      const month = selectedMonth; // YYYY-MM
      const fecha = (o.fecha_inicio || o.fecha_creacion || '').toString();
      const matchMonth = fecha.startsWith(month);
      if (!matchMonth) return false;
      // filtro por status
      if (filterStatus && o.status !== filterStatus) return false;
      // filtro por servicio realizado (debe contener TODOS los seleccionados)
      if (filterServicio && filterServicio.length > 0) {
        const ordenServicios = Array.isArray(o.servicios_realizados) ? o.servicios_realizados : [];
        const allSelected = filterServicio.every(sel => ordenServicios.includes(sel));
        if (!allSelected) return false;
      }
      // filtro por fecha exacta (YYYY-MM-DD)
      if (filterDate) {
        const base = (o.fecha_inicio || o.fecha_creacion || '').toString();
        if (!base.startsWith(filterDate)) return false;
      }
      return true;
    });
    const toTs = (v: any) => {
      if (!v) return 0;
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? t : 0;
    };
    // Más recientes arriba
    return list.slice().sort((a, b) => {
      const ai = toTs((a as any).fecha_inicio) || 0;
      const bi = toTs((b as any).fecha_inicio) || 0;
      if (bi !== ai) return bi - ai;

      const ac = toTs((a as any).fecha_creacion) || 0;
      const bc = toTs((b as any).fecha_creacion) || 0;
      if (bc !== ac) return bc - ac;

      const aid = Number((a as any).id || 0);
      const bid = Number((b as any).id || 0);
      return bid - aid;
    });
  }, [ordenes, searchTerm, selectedMonth, filterStatus, filterServicio, filterDate]);

  // Paginación
  // Paginación por mes (mostrar todas las órdenes del mes seleccionado)
  const startIndex = 0;
  const currentOrdenes = shownList;

  // Funciones para dropdowns personalizados
  const filteredClientes = clientes.filter(c => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.nombre || '').toLowerCase().includes(q) || (c.telefono || '').toLowerCase().includes(q);
  });

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      setFormData({
        ...formData,
        cliente_id: cliente.id,
        cliente: cliente.nombre,
        direccion: cliente.direccion,
        telefono_cliente: cliente.telefono
      });
      setClienteSearch(cliente.nombre);
    } else {
      setFormData({
        ...formData,
        cliente_id: null,
        cliente: '',
        nombre_cliente: '',
        direccion: '',
        telefono_cliente: ''
      });
      setClienteSearch('');
    }
    setClienteOpen(false);
  };

  const filteredTecnicos = usuarios
    .filter((u) => !(u.is_superuser || u.is_staff))
    .filter(u => {
      const q = tecnicoSearch.trim().toLowerCase();
      if (!q) return true;
      const nombre = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
      return nombre.toLowerCase().includes(q);
    });

  const selectTecnico = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData({ ...formData, tecnico_asignado: usuario.id });
      const nombre = usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email;
      setTecnicoSearch(nombre);
    } else {
      setFormData({ ...formData, tecnico_asignado: null });
      setTecnicoSearch('');
    }
    setTecnicoOpen(false);
  };

  const filteredServicios = serviciosDisponibles.filter(s => {
    const q = servicioSearch.trim().toLowerCase();
    const matches = !q || s.toLowerCase().includes(q);
    const notSelected = !formData.servicios_realizados.includes(s);
    return matches && notSelected;
  });

  const addServicio = (servicio: string) => {
    // Selección ÚNICA: reemplazar la lista por el servicio elegido
    setFormData({
      ...formData,
      servicios_realizados: [servicio]
    });
    // Limpiar búsqueda y cerrar dropdown
    setServicioSearch('');
    setServicioOpen(false);
  };

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const ordenStats = useMemo(() => {
    const list = Array.isArray(ordenes) ? ordenes : [];

    const monthList = list.filter((o) => {
      const base = (o.fecha_inicio || o.fecha_creacion || '').toString();
      return base.startsWith(currentMonthKey);
    });

    const completedMonth = monthList.filter((o) => (o.status || '').toString().toLowerCase() === 'resuelto');

    const byCliente: Record<string, { cliente: string; services: number }> = {};
    for (const o of monthList) {
      const name = (o.cliente || o.nombre_cliente || '—').toString().trim() || '—';
      const key = (o.cliente_id != null ? String(o.cliente_id) : name) || name;
      const services = Array.isArray(o.servicios_realizados) ? o.servicios_realizados.length : 0;
      if (!byCliente[key]) byCliente[key] = { cliente: name, services: 0 };
      byCliente[key].services += services;
    }

    let best: { cliente: string; services: number } | null = null;
    for (const k of Object.keys(byCliente)) {
      const cur = byCliente[k];
      if (!best || cur.services > best.services) best = cur;
    }

    return {
      monthTotal: monthList.length,
      monthCompleted: completedMonth.length,
      estrella: best?.cliente || '—',
      estrellaServices: best?.services || 0,
    };
  }, [ordenes, currentMonthKey]);

  const handleReindexIdx = async () => {
    const token = getToken();
    if (!token) {
      setAlert({ show: true, variant: 'warning', title: 'Sesión', message: 'No hay token de autenticación.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setReindexing(true);
    try {
      const resp = await fetch(apiUrl('/api/ordenes/reindex/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (resp.ok) {
        await fetchOrdenes();
        setAlert({ show: true, variant: 'success', title: 'Reordenado', message: 'Se reordenaron los IDS correctamente.' });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      } else {
        let msg = 'No se pudo reordenar los IDS.';
        try {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const err = await resp.json();
            msg = (err?.detail || JSON.stringify(err)) || msg;
          } else {
            msg = (await resp.text()) || msg;
          }
        } catch { }
        setAlert({ show: true, variant: 'error', title: 'Error', message: String(msg) });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
      }
    } catch (e) {
      setAlert({ show: true, variant: 'error', title: 'Error', message: String(e) });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta
        title="Órdenes de Servicio | Sistema Grupo Intrax GPS"
        description="Gestión de órdenes de servicio para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Órdenes de Servicio" />

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Órdenes del mes</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{ordenStats.monthTotal}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Completadas</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{ordenStats.monthCompleted}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cliente estrella</p>
              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{ordenStats.estrella}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Servicios: {ordenStats.estrellaServices}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Órdenes</h2>
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
          <button
            onClick={() => {
              if (!canOrdenesCreate) {
                setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear órdenes.' });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                return;
              }
              // Prefill Hora Inicio con la hora del sistema al crear
              if (!editingOrden) {
                const today = new Date().toISOString().slice(0, 10);
                setFormData({
                  ...formData,
                  fecha_inicio: formData.fecha_inicio || today,
                  hora_inicio: getNowHHMM(),
                });
              }
              setShowModal(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14M4 12h16" strokeLinecap="round" />
            </svg>
            Nueva Orden
          </button>
        </div>
      </div>

      <ComponentCard
        title="Listado"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            {/* Filtro desplegable */}
            <div className="relative w-full" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                className="shadow-theme-xs flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:min-w-[80px] text-xs leading-none whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filtros
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-72 max-h-80 overflow-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Servicios Realizados</label>
                    <div className="grid grid-cols-1 gap-2">
                      {serviciosDisponibles.map((srv) => {
                        const checked = filterServicio.includes(srv);
                        return (
                          <label key={srv} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFilterServicio((prev) => {
                                  if (e.target.checked) return Array.from(new Set([...(prev || []), srv]));
                                  return (prev || []).filter(s => s !== srv);
                                });
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span>{srv}</span>
                          </label>
                        );
                      })}
                    </div>
                    {filterServicio.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Seleccionados: {filterServicio.length}</div>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                    <div className="relative w-full">
                      <DatePicker
                        id="filtro-fecha"
                        label={undefined as any}
                        placeholder="Seleccionar fecha"
                        defaultDate={filterDate || undefined}
                        appendToBody={true}
                        onChange={(_dates: any, currentDateString: string) => {
                          setFilterDate(currentDateString || "");
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="bg-brand-600 hover:bg-brand-700 h-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterStatus(''); setFilterServicio([]); setFilterDate(''); setFilterOpen(false); }}
                      className="h-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleReindexIdx}
              disabled={reindexing}
              className="shadow-theme-xs flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:min-w-[100px] disabled:opacity-60 disabled:cursor-not-allowed text-xs leading-none whitespace-nowrap"
              title="Reasigna IDX a 1..N para quitar huecos"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7h13" strokeLinecap="round" />
                <path d="M3 12h10" strokeLinecap="round" />
                <path d="M3 17h7" strokeLinecap="round" />
                <path d="M18 7v10" strokeLinecap="round" />
                <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {reindexing ? 'Reordenando...' : 'Reordenar'}
            </button>
          </div>
        }
      >
        <div className="p-2">


          <div className="overflow-x-auto">
            <Table className="w-full min-w-[900px] sm:min-w-0 sm:table-fixed">
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sm:sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-[70px] min-w-[60px] whitespace-nowrap text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-2/5 min-w-[220px] whitespace-nowrap text-gray-700 dark:text-gray-300">Cliente</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/5 min-w-[220px] text-gray-700 dark:text-gray-300">Detalles</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[130px] min-w-[130px] whitespace-nowrap text-gray-700 dark:text-gray-300">Fechas</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-[160px] min-w-[160px] whitespace-nowrap text-gray-700 dark:text-gray-300">Técnico</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[110px] min-w-[110px] whitespace-nowrap text-gray-700 dark:text-gray-300">Estado</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-[120px] min-w-[120px] whitespace-nowrap text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-200">
                {currentOrdenes.map((orden, idx) => {
                  const fecha = orden.fecha_inicio || orden.fecha_creacion || '';
                  const fechaFmt = fecha ? formatYmdToDMY(fecha) : '-';
                  const finFmt = orden.fecha_finalizacion ? formatYmdToDMY(orden.fecha_finalizacion) : '-';
                  const tecnico = usuarios.find(u => u.id === (orden as any).tecnico_asignado);
                  const tecnicoNombre = tecnico
                    ? (tecnico.first_name && tecnico.last_name ? `${tecnico.first_name} ${tecnico.last_name}` : tecnico.email)
                    : ((orden as any).nombre_encargado || '-');
                  return (
                    <TableRow key={orden.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[70px] min-w-[60px]">{orden.idx ?? (startIndex + idx + 1)}</TableCell>
                      <TableCell className="px-2 py-2 text-gray-900 dark:text-white w-1/5 min-w-[220px]">
                        <div className="font-medium truncate">{orden.cliente || 'Sin cliente'}</div>
                        {orden.direccion && (
                          isGoogleMapsUrl(orden.direccion) ? (
                            <a href={orden.direccion} target="_blank" rel="noreferrer" className="block text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate">{orden.direccion}</a>
                          ) : (
                            <span className="block text-[11px] text-gray-600 dark:text-gray-400 truncate" title={orden.direccion}>{orden.direccion}</span>
                          )
                        )}
                        {orden.telefono_cliente && (
                          <a href={`tel:${orden.telefono_cliente}`} className="inline-block text-[11px] text-gray-600 dark:text-gray-400">{orden.telefono_cliente}</a>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 w-2/5 min-w-[220px] whitespace-normal">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => setProblematicaModal({ open: true, content: orden.problematica || '-' })}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver problemática"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
                            Problemática
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiciosModal({ open: true, content: Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [] })}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver servicios realizados"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            Servicios
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[130px] min-w-[130px]">
                        <div className="text-[12px] text-gray-700 dark:text-gray-300">
                          <div><span className="text-gray-500">Inicio:</span> {fechaFmt}</div>
                          <div><span className="text-gray-500">Fin:</span> {finFmt}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[160px] min-w-[160px]">
                        <div className="space-y-1">
                          <div className="text-[12px] text-gray-700 dark:text-gray-300 truncate">{tecnicoNombre}</div>
                          <button
                            type="button"
                            onClick={() => setComentarioModal({ open: true, content: (orden.comentario_tecnico || '') as string })}
                            className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline dark:text-blue-400"
                            title="Ver comentario del técnico"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
                            Comentarios
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center w-[110px] min-w-[110px]">
                        {orden.status === 'resuelto' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resuelto</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center w-[120px] min-w-[120px]">
                        <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/ordenes/${orden.id}/pdf`)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-red-400 hover:text-red-600 dark:hover:border-red-500 transition"
                            title="Ver PDF"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                              <path d="M7 15h10" />
                              <path d="M7 18h7" />
                            </svg>
                          </button>
                          {canOrdenesEdit && (
                            <button
                              onClick={() => handleEdit(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canOrdenesDelete && (
                            <button
                              onClick={() => handleDeleteClick(orden)}
                              className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                              title="Eliminar"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!loading && shownList.length === 0) && (
                  <TableRow>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2 text-center text-[12px] text-gray-500">Sin órdenes para el mes seleccionado</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                    <TableCell className="px-2 py-2">&nbsp;</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {!loading && (
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between sm:gap-4 flex-wrap">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium text-gray-900 dark:text-white">{shownList.length > 0 ? 1 : 0}</span> a{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{shownList.length > 0 ? shownList.length : 0}</span> de{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{shownList.length}</span> órdenes
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const d = new Date(y, m - 2, 1);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        setSelectedMonth(`${d.getFullYear()}-${mm}`);
                      } catch { }
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Mes anterior"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="min-w-[130px] sm:min-w-[160px] text-center text-[11px] sm:text-[12px] text-gray-700 dark:text-gray-300">
                    {(() => {
                      try {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                      } catch {
                        return selectedMonth;
                      }
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const d = new Date(y, m, 1);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        setSelectedMonth(`${d.getFullYear()}-${mm}`);
                      } catch { }
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Mes siguiente"
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

      {/* Modales de detalle */}
      <Modal isOpen={problematicaModal.open} onClose={() => setProblematicaModal({ open: false, content: '' })} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Problemática</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Detalle completo reportado por el cliente</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="whitespace-pre-wrap wrap-break-word break-all leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{problematicaModal.content || '-'}</pre>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setProblematicaModal({ open: false, content: '' })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={serviciosModal.open} onClose={() => setServiciosModal({ open: false, content: [] })} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Servicios Realizados</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Listado de servicios registrados</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {Array.isArray(serviciosModal.content) && serviciosModal.content.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviciosModal.content.map((s: string, i: number) => (
                  <li key={i} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/10 p-4 text-center text-gray-500 dark:text-gray-400">Sin servicios registrados</div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setServiciosModal({ open: false, content: [] })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={comentarioModal.open} onClose={() => setComentarioModal({ open: false, content: '' })} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Comentario del Técnico</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Observaciones y notas del técnico</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{comentarioModal.content || '-'}</pre>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setComentarioModal({ open: false, content: '' })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Modal Crear/Editar */}
      <Modal isOpen={showModal} onClose={handleCloseModal} className="w-[94vw] max-w-4xl max-h-[92vh] p-0 overflow-hidden">
        <div>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {editingOrden ? 'Editar Orden' : 'Nueva Orden'}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Captura y revisa los datos antes de guardar
                </p>
              </div>
            </div>
          </div>

          {/* Body */}

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

            {/* Modal Alert */}
            {modalAlert.show && (
              <div className="mb-4">
                <Alert variant={modalAlert.variant} title={modalAlert.title} message={modalAlert.message} showLink={false} />
              </div>
            )}

            {/* SECCIÓN 1: Detalles Generales */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles Generales</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                {/* 1. Cliente con dropdown personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente</label>
                  <div className="relative">
                    <div className="relative">
                      <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                      <input
                        value={clienteSearch || (formData.cliente_id ? clientes.find(c => c.id === formData.cliente_id)?.nombre || '' : formData.cliente || '')}
                        onChange={(e) => { setClienteSearch(e.target.value); setClienteOpen(true); }}
                        onFocus={() => setClienteOpen(true)}
                        placeholder='Buscar cliente por nombre o teléfono...'
                        className='block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      />
                      <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                        {(formData.cliente_id || formData.cliente) && (
                          <button type='button' onClick={() => { selectCliente(null); }} className='h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition'>Limpiar</button>
                        )}
                        <button type='button' onClick={() => setClienteOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition'>
                          <svg className={`w-3.5 h-3.5 transition-transform ${clienteOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                        </button>
                      </div>
                    </div>
                    {clienteOpen && (
                      <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
                        <button type='button' onClick={() => selectCliente(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-gray-800 dark:text-white ${!formData.cliente_id ? 'bg-brand-50/60 dark:bg-gray-800/50 font-medium text-brand-700 dark:text-white' : ''}`}>Selecciona cliente</button>
                        {filteredClientes.map(c => (
                          <button key={c.id} type='button' onClick={() => selectCliente(c)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition'>
                            <div className='flex items-center gap-2'>
                              <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                {(c.nombre || '?').slice(0, 1).toUpperCase()}
                              </span>
                              <div className='flex flex-col'>
                                <span className='text-[12px] font-medium text-gray-800 dark:text-gray-100'>{c.nombre || '-'}</span>
                                <span className='text-[11px] text-gray-500 dark:text-gray-400'>{c.telefono || '-'}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                        {filteredClientes.length === 0 && (
                          <div className='px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400'>Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Nombre del Cliente y Técnico Asignado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre del Cliente</label>
                    <input
                      type="text"
                      value={formData.nombre_cliente}
                      onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                      placeholder="Nombre completo del cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Técnico Asignado</label>
                    <div className="relative">
                      <div className="relative">
                        <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                        <input
                          value={tecnicoSearch || (formData.tecnico_asignado ? (() => {
                            const tecnicoId = Number(formData.tecnico_asignado);
                            const u = usuarios.find(u => u.id === tecnicoId);
                            return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : '';
                          })() : '')}
                          onChange={(e) => { setTecnicoSearch(e.target.value); setTecnicoOpen(true); }}
                          onFocus={() => setTecnicoOpen(true)}
                          placeholder='Buscar técnico...'
                          className='block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        />
                        <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                          {formData.tecnico_asignado && (
                            <button type='button' onClick={() => selectTecnico(null)} className='h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition'>Limpiar</button>
                          )}
                          <button type='button' onClick={() => setTecnicoOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition'>
                            <svg className={`w-3.5 h-3.5 transition-transform ${tecnicoOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                          </button>
                        </div>
                      </div>
                      {tecnicoOpen && (
                        <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
                          <button type='button' onClick={() => selectTecnico(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-gray-800 dark:text-white ${!formData.tecnico_asignado ? 'bg-brand-50/60 dark:bg-gray-800/50 font-medium text-brand-700 dark:text-white' : ''}`}>Selecciona técnico</button>
                          {filteredTecnicos.map(u => {
                            const nombre = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
                            return (
                              <button key={u.id} type='button' onClick={() => selectTecnico(u)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition'>
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                    {nombre.slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className='flex flex-col'>
                                    <span className='text-[12px] font-medium text-gray-800 dark:text-gray-100'>{nombre}</span>
                                    <span className='text-[11px] text-gray-500 dark:text-gray-400'>{u.email}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {filteredTecnicos.length === 0 && (
                            <div className='px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400'>Sin resultados</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Detalles del Cliente */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles del Cliente</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                {/* Teléfono - Solo números */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Teléfono</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={formData.telefono_cliente}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, telefono_cliente: value });
                      }}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                      placeholder="Teléfono del cliente"
                      maxLength={10}
                    />
                    <a
                      href={formData.telefono_cliente ? `tel:${formData.telefono_cliente}` : undefined}
                      onClick={(e) => {
                        if (!formData.telefono_cliente) e.preventDefault();
                      }}
                      className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${!formData.telefono_cliente ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Llamar"
                      aria-label="Llamar"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Dirección con botones */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Dirección</label>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Seleccionar en mapa
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 pr-12 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                      placeholder="Dirección, coordenadas o URL de Google Maps"
                    />
                    {formData.direccion && (
                      <button
                        type="button"
                        onClick={() => {
                          const direccion = formData.direccion.trim();

                          // Detectar si es una URL de Google Maps
                          if (direccion.includes('google.com/maps') || direccion.includes('maps.app.goo.gl')) {
                            window.open(direccion, '_blank');
                            return;
                          }

                          // Detectar si son coordenadas (formato: lat,lng)
                          const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                          if (coordMatch) {
                            const lat = coordMatch[1];
                            const lng = coordMatch[2];
                            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                            return;
                          }

                          // Si es texto normal, buscar
                          const query = encodeURIComponent(direccion);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                        }}
                        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        title="Abrir en Google Maps"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Descripción de la Orden */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Descripción de la Orden</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                {/* Problemática */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Problemática</label>
                  <textarea
                    value={formData.problematica}
                    onChange={(e) => setFormData({ ...formData, problematica: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                    placeholder="Describe el problema reportado"
                  />
                </div>

                {/* Servicios Realizados con dropdown personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Servicios Realizados</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="relative">
                        <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                        <input
                          value={servicioSearch}
                          onChange={(e) => { setServicioSearch(e.target.value); setServicioOpen(true); }}
                          onFocus={() => setServicioOpen(true)}
                          placeholder='Buscar o agregar servicio...'
                          className='block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-12 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        />
                        <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                          <button type='button' onClick={() => setServicioOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition'>
                            <svg className={`w-3.5 h-3.5 transition-transform ${servicioOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                          </button>
                        </div>
                      </div>
                      {servicioOpen && (
                        <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
                          {filteredServicios.map((s, idx) => (
                            <button key={idx} type='button' onClick={() => addServicio(s)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition'>
                              <div className='flex items-center gap-2'>
                                <svg className='w-4 h-4 text-brand-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' /></svg>
                                <span className='text-[12px] font-medium text-gray-800 dark:text-gray-100'>{s}</span>
                              </div>
                            </button>
                          ))}
                          {filteredServicios.length === 0 && servicioSearch.trim() && (
                            <button type='button' onClick={() => {
                              const nuevoServicio = servicioSearch.trim();
                              if (nuevoServicio && !serviciosDisponibles.includes(nuevoServicio)) {
                                setServiciosDisponibles([...serviciosDisponibles, nuevoServicio]);
                              }
                              addServicio(nuevoServicio);
                            }} className='w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-500/15 text-brand-600 dark:text-brand-400 transition'>
                              <div className='flex items-center gap-2'>
                                <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M12 5v14M5 12h14' /></svg>
                                <span className='text-[12px] font-medium'>Crear "{servicioSearch.trim()}"</span>
                              </div>
                            </button>
                          )}
                          {filteredServicios.length === 0 && !servicioSearch.trim() && (
                            <div className='px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400'>Escribe para buscar o crear</div>
                          )}
                        </div>
                      )}
                    </div>
                    {formData.servicios_realizados.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.servicios_realizados.map((servicio, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-md text-xs"
                          >
                            {servicio}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  servicios_realizados: formData.servicios_realizados.filter((_, i) => i !== index)
                                });
                              }}
                              className="hover:text-brand-900 dark:hover:text-brand-100 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comentario del Técnico */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario del Técnico</label>
                  <textarea
                    value={formData.comentario_tecnico}
                    onChange={(e) => setFormData({ ...formData, comentario_tecnico: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                    placeholder="Observaciones del técnico..."
                  />
                </div>

                {/* Estado del Problema */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Estado del Problema</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pendiente' | 'resuelto' })}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                  >
                    <option value="pendiente">No, pendiente</option>
                    <option value="resuelto">Sí, problema resuelto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: Detalles de Tiempo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles de Tiempo</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                {/* Fechas de Inicio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      id="fecha-inicio"
                      label="Fecha Inicio"
                      placeholder="Seleccionar fecha"
                      defaultDate={formData.fecha_inicio || undefined}
                      onChange={(_dates, currentDateString) => {
                        setFormData({ ...formData, fecha_inicio: currentDateString || "" });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hora-inicio">Hora Inicio</Label>
                    <div className="relative">
                      <Input
                        type="time"
                        id="hora-inicio"
                        name="hora-inicio"
                        value={formData.hora_inicio}
                        onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      />
                      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                        <TimeIcon className="size-6" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fechas de Finalización */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      id="fecha-finalizacion"
                      label="Fecha Finalización"
                      placeholder="Seleccionar fecha"
                      defaultDate={formData.fecha_finalizacion || undefined}
                      onChange={(_dates, currentDateString) => {
                        setFormData({ ...formData, fecha_finalizacion: currentDateString || "" });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hora-termino">Hora Término</Label>
                    <div className="relative">
                      <Input
                        type="time"
                        id="hora-termino"
                        name="hora-termino"
                        value={formData.hora_termino}
                        onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
                      />
                      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                        <TimeIcon className="size-6" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: Firmas y Archivos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Firmas y Archivos</h4>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                {/* Firmas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SignaturePad
                    label="Firma del Encargado"
                    value={formData.firma_encargado_url}
                    onChange={(signature) => setFormData({ ...formData, firma_encargado_url: signature })}
                    width={400}
                    height={250}
                  />
                  <SignaturePad
                    label="Firma del Cliente"
                    value={formData.firma_cliente_url}
                    onChange={(signature) => setFormData({ ...formData, firma_cliente_url: signature })}
                    width={400}
                    height={250}
                  />
                </div>

                {/* Subida de Fotos - Dropzone con dz-message */}
                <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-lg hover:border-brand-500">
                  <div
                    {...getRootProps()}
                    className={`dropzone rounded-lg border-dashed border-gray-300 p-4 sm:p-5 ${isDragActive ? "border-brand-500 bg-gray-100 dark:bg-gray-800" : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                      }`}
                    id="fotos-upload"
                    role="button"
                    tabIndex={0}
                  >
                    {/* Input oculto */}
                    <input {...getInputProps()} />

                    <div className="dz-message flex flex-col items-center m-0!">
                      {/* Contenedor del icono */}
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

                      {/* Contenido de texto */}
                      <h4 className="mb-1 font-semibold text-gray-800 text-sm sm:text-base dark:text-white/90">
                        {isDragActive ? "Suelta aquí para subir" : "Haz clic o arrastra imágenes (máx. 5)"}
                      </h4>

                      <span className="text-center mb-2 block w-full max-w-[320px] text-[12px] text-gray-700 dark:text-gray-400">
                        Formatos: PNG, JPG, WebP o SVG
                      </span>

                      <span className="font-medium underline text-[12px] text-brand-500">
                        Buscar archivos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Previsualizaciones y eliminar */}
                {Array.isArray(formData.fotos_urls) && formData.fotos_urls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
                    {formData.fotos_urls.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-700" />
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ open: true, index, url: preview })}
                          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-error-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-700"
                          title="Eliminar imagen"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Modal Confirmación eliminar foto */}
                <Modal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, index: null, url: null })} className="max-w-sm p-6">
                  <div className='flex flex-col gap-4'>
                    <div className='text-center'>
                      <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30'>
                        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                      </div>
                      <h5 className='mt-4 font-semibold text-gray-800 text-theme-lg dark:text-white/90'>Confirmar eliminación</h5>
                      <p className='mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400'>Esta acción no se puede deshacer. ¿Eliminar la imagen seleccionada?</p>
                    </div>
                    <div className='flex justify-center gap-3 pt-2'>
                      <button onClick={() => setConfirmDelete({ open: false, index: null, url: null })} className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 center dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3'>Cancelar</button>
                      <button onClick={() => { if (confirmDelete.index != null && confirmDelete.url) { handleDeletePhoto(confirmDelete.index, confirmDelete.url); } }} className='rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-500'>Eliminar</button>
                    </div>
                  </div>
                </Modal>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {editingOrden ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Eliminar */}
      {ordenToDelete && (
        <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-full max-w-md mx-4 sm:mx-auto">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30">
              <svg className="w-6 h-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
              ¿Eliminar Orden?
            </h3>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar la orden para <span className="font-semibold">{ordenToDelete.cliente}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Mapa Interactivo */}
      <Modal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        className="w-[96vw] sm:w-[90vw] md:w-[80vw] max-w-3xl mx-0 sm:mx-auto"
      >
        <div className="p-0 overflow-hidden max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl">
          {/* Header */}
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  Seleccionar Ubicación
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Haz clic en el mapa para seleccionar la ubicación
                </p>
              </div>
            </div>
          </div>

          {/* Body - Mapa */}
          <div className="p-4 sm:p-5 flex-1 overflow-auto">
            <div className="space-y-4">
              {/* Mapa interactivo (Leaflet) */}
              <div className="relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div id="leaflet-map" className="absolute inset-0" />
              </div>

              {/* Input manual de coordenadas */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  O ingresa las coordenadas manualmente
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Latitud (ej: 19.0653)"
                      value={selectedLocation?.lat || ''}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        if (!isNaN(lat)) {
                          setSelectedLocation({
                            lat,
                            lng: selectedLocation?.lng || -104.2831
                          });
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Longitud (ej: -104.2831)"
                      value={selectedLocation?.lng || ''}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        if (!isNaN(lng)) {
                          setSelectedLocation({
                            lat: selectedLocation?.lat || 19.0653,
                            lng
                          });
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                    />
                  </div>
                </div>
                {selectedLocation && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    URL: https://www.google.com/maps?q={selectedLocation.lat},{selectedLocation.lng}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) {
                  setAlert({ show: true, variant: 'warning', title: 'Geolocalización no disponible', message: 'Tu navegador no soporta geolocalización.' });
                  setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setSelectedLocation({ lat: latitude, lng: longitude });
                  },
                  () => {
                    setAlert({ show: true, variant: 'warning', title: 'No se pudo obtener ubicación', message: 'Activa permisos de ubicación e inténtalo de nuevo.' });
                    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                  },
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300/40 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Usar mi ubicación
            </button>
            <button
              type="button"
              onClick={() => {
                const loc = selectedLocation || { lat: 19.0653, lng: -104.2831 };
                const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                setFormData({ ...formData, direccion: url });
                setShowMapModal(false);
                setSelectedLocation(null);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Usar esta ubicación
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}