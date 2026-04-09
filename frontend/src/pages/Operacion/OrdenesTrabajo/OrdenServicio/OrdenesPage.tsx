import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import { PencilIcon, TrashBinIcon, TimeIcon } from "@/icons";
import { MobileOrderList } from "./MobileOrderCard";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Cliente } from "@/types/cliente";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import LevantamientoForm from "../OrdenLevantamiento/LevantamientoForm";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

const searchInputClass =
  "min-h-[40px] w-full rounded-lg border border-gray-200/90 bg-gray-50/90 py-2 pl-9 pr-10 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 sm:min-h-[44px] sm:py-2.5";

interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

interface Orden {
  id: number;
  idx: number;
  folio?: string | null;
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
  quien_instalo?: number | null;
  quien_entrego?: number | null;
  firma_encargado_url: string;
  firma_cliente_url: string;
  fotos_urls: string[];
  pdf_url?: string;
  fecha_creacion: string;
  tipo_orden?: 'servicio_tecnico' | 'levantamiento' | string;
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
let ordenesPageSignatureLastLoadAt = 0;

const getCurrentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
let ordenesPageClientesLastLoadAt = 0;
const ORDENES_PAGE_INIT_THROTTLE_MS = 800;

export default function Ordenes() {
  const navigate = useNavigate();
  const location = useLocation();

  const formNonceRef = useRef(0);
  const formScrollRef = useRef<HTMLFormElement>(null);

  const levantamientoSnapshotRef = useRef<{ payload: any; dibujo_url: string; cerco_materiales?: any[] } | null>(null);

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
  const [showModal, setShowModal] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState<Orden | null>(null);

  const [activeTab, setActiveTab] = useState<"orden" | "cliente">("cliente");
  const [editingOrden, setEditingOrden] = useState<Orden | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Por defecto no filtramos por mes; evitamos que órdenes nuevas queden ocultas
  // si caen fuera del mes “actual” según cuándo se abrió la pantalla.
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({ open: false, index: null, url: null });
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  // Filtros
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'' | 'pendiente' | 'resuelto'>('');
  const [filterServicio, setFilterServicio] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [tipoOrden, setTipoOrden] = useState<'servicio_tecnico' | 'levantamiento' | 'instalaciones' | 'mantenimiento'>('servicio_tecnico');

  const isReadOnly = editingOrden ? !canOrdenesEdit : !canOrdenesCreate;

  const tipoOrdenLabel = useMemo(() => {
    switch (tipoOrden) {
      case 'levantamiento':
        return 'Levantamiento';
      case 'instalaciones':
        return 'Instalaciones';
      case 'mantenimiento':
        return 'Mantenimiento';
      case 'servicio_tecnico':
      default:
        return 'Servicio';
    }
  }, [tipoOrden]);

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

  const [mySignatureUrl, setMySignatureUrl] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const now = Date.now();
    if (now - ordenesPageSignatureLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesPageSignatureLastLoadAt = now;
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/me/signature/'), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store' as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const url = data?.url || '';
        setMySignatureUrl(url);
      } catch {
        return;
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

  const normalizeStatus = (value: unknown) => String(value || "").trim().toLowerCase();
  const parseYearMonth = (value: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isFinite(year) || month < 1 || month > 12) return null;
    return { year, month };
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

  // Abrir modal de nueva orden con tipo "levantamiento" al llegar desde /levantamiento (Nueva Orden)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nueva') === 'levantamiento' && canOrdenesCreate) {
      setShowModal(true);
      setTipoOrden('levantamiento');
      setActiveTab('cliente');
      setEditingOrden(null);
      navigate('/ordenes', { replace: true });
    }
  }, [location.search, canOrdenesCreate, navigate]);

  useEffect(() => {
    const now = Date.now();
    if (now - ordenesPageInitialDataLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesPageInitialDataLastLoadAt = now;
    loadServiciosDisponibles();
    fetchOrdenes();
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
    const nonce = formNonceRef.current;
    const publicId = getPublicIdFromUrl(url);
    const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter((_, i) => i !== index);

    setDeletingPhoto(true);
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
      if (formNonceRef.current === nonce) {
        setFormData((prev) => ({ ...prev, fotos_urls: updated }));
      }
      setConfirmDelete({ open: false, index: null, url: null });
      setDeletingPhoto(false);
    }
  };

  const getNowHHMM = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const round2 = (v: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
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
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          // Evita fondos negros al convertir imágenes con transparencia a JPEG.
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          ctx?.drawImage(img, 0, 0, width, height);

          // Búsqueda binaria para encontrar la calidad óptima más rápido
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
                    reject(new Error('Error al comprimir la imagen'));
                    return;
                  }
                  const r = new FileReader();
                  r.readAsDataURL(blob);
                  r.onloadend = () => resolve(r.result as string);
                },
                'image/jpeg',
                finalQuality
              );
              return;
            }

            attempts++;
            const midQuality = (low + high) / 2;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Error al comprimir la imagen'));
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
              'image/jpeg',
              midQuality
            );
          };

          binarySearchCompress(minQuality, maxQuality);
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
    });
  };

  const onDropPhotos = async (acceptedFiles: File[]) => {
    const nonce = formNonceRef.current;
    const current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];
    const remainingSlots = 5 - current.length;

    if (remainingSlots <= 0) return;
    const files = acceptedFiles.slice(0, remainingSlots).filter(f => f.type.startsWith('image/'));

    const uploadOne = async (file: File): Promise<string | null> => {
      try {
        // Comprimir localmente para subir payload pequeño (80KB para mejor balance)
        const compressed = await compressImage(file, 80, 1400, 1400);

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
        if (!resp.ok) return null;
        const data = await resp.json().catch(() => null);
        return data?.url ? String(data.url) : null;
      } catch {
        return null;
      }
    };

    const concurrency = 5;
    const urls: string[] = [];
    for (let i = 0; i < files.length; i += concurrency) {
      const chunk = files.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map(uploadOne));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) urls.push(r.value);
      }
    }

    if (urls.length && formNonceRef.current === nonce) {
      setFormData((prev) => {
        const prevCurrent = Array.isArray(prev.fotos_urls) ? prev.fotos_urls : [];
        return { ...prev, fotos_urls: [...prevCurrent, ...urls] };
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPhotos,
    multiple: true,
    maxFiles: 5,
    accept: {
      'image/png': [],
      'image/jpeg': [],
      'image/webp': [],
      'image/svg+xml': [],
    },
  });

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
    folio: "",
    cliente_id: null as number | null,
    contacto_id: null as number | null,
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
    quien_instalo: null as number | null,
    quien_entrego: null as number | null,
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
  const [clienteSearch, setClienteSearch] = useState('');

  useEffect(() => {
    const now = Date.now();
    if (now - ordenesPageClientesLastLoadAt < ORDENES_PAGE_INIT_THROTTLE_MS) return;
    ordenesPageClientesLastLoadAt = now;
    fetchClientes(clienteSearch);
  }, [clienteSearch]);

  const [tecnicoSearch, setTecnicoSearch] = useState('');
  const [quienInstaloSearch, setQuienInstaloSearch] = useState('');
  const [quienEntregoSearch, setQuienEntregoSearch] = useState('');

  const [servicioSearch, setServicioSearch] = useState('');

  const [tecnicoSignatureUrl, setTecnicoSignatureUrl] = useState<string>('');
  const tecnicoSignatureCacheRef = useRef<Record<number, string>>({});

  // Modales de detalles
  const [problematicaModal, setProblematicaModal] = useState<{ open: boolean, content: string }>({ open: false, content: '' });
  const [serviciosModal, setServiciosModal] = useState<{ open: boolean; content: string[] }>({ open: false, content: [] });
  const [comentarioModal, setComentarioModal] = useState<{ open: boolean; content: string }>({ open: false, content: '' });

  const loadTecnicoSignature = async (userId: number | null) => {
    if (!userId) {
      setTecnicoSignatureUrl('');
      return;
    }

    const cached = tecnicoSignatureCacheRef.current[userId];
    if (typeof cached === 'string') {
      setTecnicoSignatureUrl(cached);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(apiUrl(`/api/users/accounts/${userId}/signature/`), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const url = (data as any)?.url || '';
      tecnicoSignatureCacheRef.current[userId] = url;
      setTecnicoSignatureUrl(url);
    } catch {
      return;
    }
  };

  const validateForm = () => {
    const missing: string[] = [];
    if (!formData.cliente_id) missing.push('Cliente');

    if (!formData.telefono_cliente?.trim()) missing.push('Teléfono');
    if (!Array.isArray(formData.servicios_realizados) || formData.servicios_realizados.length === 0) missing.push('Servicios Realizados');

    return { ok: missing.length === 0, missing };
  };

  const fetchClientes = async (search = "") => {
    try {
      const token = getToken();
      if (!token) return;

      const query = new URLSearchParams({
        search: search.trim(),
        page_size: '20', // Limit results for dropdown
      });

      const response = await fetch(apiUrl(`/api/clientes/?${query.toString()}`), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data) ? data : (data.results || []);
        setClientes(rows);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  const handleClienteSuccess = (newCliente: Cliente) => {
    fetchClientes();
    selectCliente(newCliente as any);
    setShowClienteModal(false);
  };

  const fetchUsuarios = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const commonHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      } as HeadersInit;

      let response = await fetch(apiUrl("/api/ordenes/tecnico-opciones/"), { headers: commonHeaders });
      if (!response.ok) {
        response = await fetch(apiUrl("/api/users/accounts/"), { headers: commonHeaders });
      }

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
        setUsuarios(rows);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const loadServiciosDisponibles = async () => {
    const fallbackServicios = [
      'ALARMAS',
      'RASTREO',
      'INTERNET',
      'GPS',
      'SENSOR DE GASOLINA',
      'SENSOR DE TEMPERATURA',
      'CAMARA',
      'DASHCAM',
      'VENTA DE PRODUCTO',
    ];

    const token = getToken();
    if (!token) {
      setServiciosDisponibles(fallbackServicios);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/servicios/?page=1&page_size=500&ordering=idx'), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setServiciosDisponibles(fallbackServicios);
        return;
      }

      const results = Array.isArray((data as any)?.results) ? ((data as any).results as ServicioCatalogo[]) : [];
      const names = results
        .filter((s) => s && typeof s.nombre === 'string' && s.nombre.trim() && s.activo !== false)
        .map((s) => s.nombre.trim());

      const merged = Array.from(new Set([...(names.length ? names : fallbackServicios)]));
      setServiciosDisponibles(merged);
      localStorage.setItem('servicios_disponibles', JSON.stringify(merged));
    } catch {
      setServiciosDisponibles(fallbackServicios);
    }
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

      const response = await fetch(apiUrl(`/api/ordenes/?_ts=${Date.now()}`), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        cache: "no-store" as RequestCache,
      });

      if (response.ok) {
        const data = await response.json();
        const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : [];
        console.debug("[OrdenesPage] fetchOrdenes idx:", rows.map((r: any) => Number(r?.idx || 0)).filter((n: number) => Number.isFinite(n)));
        setOrdenes(rows);
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
    if (isSaving) return;
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
      setIsSaving(true);
      const url = editingOrden
        ? apiUrl(`/api/ordenes/${editingOrden.id}/`)
        : apiUrl("/api/ordenes/");
      const method = editingOrden ? "PUT" : "POST";

      // Construir payload, omitiendo tecnico_asignado si es null y contacto_id (solo uso interno)
      const payload: any = { ...formData };
      delete payload.firma_encargado_url;
      delete payload.contacto_id;
      if (payload.tecnico_asignado == null) {
        delete payload.tecnico_asignado;
      }
      if (payload.quien_instalo == null) {
        delete payload.quien_instalo;
      }
      if (payload.quien_entrego == null) {
        delete payload.quien_entrego;
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
        const savedOrden = await response.json();
        const cid = payload?.cliente_id;

        if (cid && (payload?.direccion || payload?.telefono_cliente)) {
          const existingCliente = clientes.find(c => c.id === cid);
          const updates: any = {};

          const hasClienteDireccion = !!existingCliente?.direccion && String(existingCliente.direccion).trim() !== '';
          const hasClienteTelefono = !!existingCliente?.telefono && String(existingCliente.telefono).trim() !== '';

          if (!hasClienteDireccion && payload?.direccion) {
            updates.direccion = String(payload.direccion);
          }
          if (!hasClienteTelefono && payload?.telefono_cliente) {
            updates.telefono = String(payload.telefono_cliente);
          }

          if (Object.keys(updates).length > 0) {
            await fetch(apiUrl(`/api/clientes/${cid}/`), {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updates),
            }).catch(() => null);
          }
        }

        if (cid && (payload?.nombre_cliente || payload?.telefono_cliente)) {
          const nombre = String(payload?.nombre_cliente || '').trim();
          const celular = String(payload?.telefono_cliente || '').trim();
          const contactoIdToUpdate = formData.contacto_id != null ? Number(formData.contacto_id) : null;

          // Solo actualizar un contacto existente seleccionado explícitamente.
          // No crear contactos nuevos automáticamente aquí para evitar duplicados.
          if (contactoIdToUpdate != null) {
            const body: any = {};
            if (nombre) body.nombre_apellido = nombre;
            if (celular) body.celular = celular;
            if (Object.keys(body).length > 0) {
              await fetch(apiUrl(`/api/cliente-contactos/${contactoIdToUpdate}/`), {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
              }).catch(() => null);
            }
          }
        }

        if (savedOrden && savedOrden.id) {
          setOrdenes((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex((o) => (o as any).id === savedOrden.id);
            if (idx >= 0) {
              const copy = list.slice();
              copy[idx] = savedOrden;
              return copy;
            }
            return [savedOrden, ...list];
          });
        }

        if (tipoOrden === 'levantamiento' && savedOrden?.id && levantamientoSnapshotRef.current) {
          const snap = levantamientoSnapshotRef.current;
          await fetch(apiUrl(`/api/ordenes/${savedOrden.id}/levantamiento/`), {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              payload: snap.payload || {},
              dibujo_url: snap.dibujo_url || '',
            }),
          }).catch(() => null);

          try {
            const payloadTipo = String(snap.payload?.tipo || '').toLowerCase();
            const cercoItems = Array.isArray((snap as any).cerco_materiales) ? (snap as any).cerco_materiales : [];
            if (payloadTipo === 'cerco' && cercoItems.length > 0) {
              const todayIso = new Date().toISOString().slice(0, 10);
              const cid = (savedOrden as any).cliente_id ?? null;
              const clienteNombre = String((savedOrden as any).cliente || '').trim();
              const contactoNombre = String((savedOrden as any).nombre_cliente || '').trim();

              const subtotalRaw = cercoItems.reduce((acc: number, it: any) => {
                const qty = Number(it.cantidad || 0);
                const price = Number(it.precio_lista || 0);
                if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
                return acc + qty * price;
              }, 0);
              const subtotal = round2(subtotalRaw);
              const ivaPct = 16;
              const iva = round2(subtotal * (ivaPct / 100));
              const total = round2(subtotal + iva);

              const cotPayload: any = {
                cliente_id: cid != null ? Number(cid) : null,
                cliente: clienteNombre,
                prospecto: !cid,
                contacto: contactoNombre,
                // usar un valor válido para choices de medio_contacto (ver backend MEDIO_CONTACTO_CHOICES)
                medio_contacto: 'OTRO',
                status: 'PENDIENTE',
                fecha: todayIso,
                subtotal,
                descuento_cliente_pct: 0,
                iva_pct: ivaPct,
                iva,
                total,
                texto_arriba_precios: 'A continuación cotización solicitada:',
                terminos:
                  "TÉRMINOS Y CONDICIONES\n\n" +
                  "- Se requiere 60% de anticipo para iniciar trabajos y 40% al finalizar la instalación.\n" +
                  "- No se programan trabajos sin anticipo confirmado.\n" +
                  "- Precios expresados en pesos mexicanos.\n" +
                  "- Vigencia de la cotización: 15 días naturales.\n" +
                  "- Los equipos cuentan con 1 año de garantía por defectos de fábrica.\n" +
                  "- La mano de obra y configuraciones tienen 3 meses de garantía.\n" +
                  "- La garantía no aplica por mal uso, golpes, humedad, variaciones de voltaje o manipulación por terceros.\n" +
                  "- La cotización incluye únicamente los conceptos especificados; trabajos adicionales se cotizan aparte.\n" +
                  "- El cliente deberá proporcionar accesos, energía eléctrica y condiciones adecuadas para la instalación.\n" +
                  "- Retrasos por causas externas no son responsabilidad de Grupo Intrax.\n" +
                  "- Los equipos son propiedad de Grupo Intrax hasta liquidar el pago total.\n" +
                  "- El anticipo no es reembolsable en caso de cancelación.\n" +
                  "- La aceptación de la cotización implica conformidad con estos términos.",
                // Para evitar errores de validación de URL en el backend,
                // NO enviamos thumbnail_url en la creación automática desde levantamiento.
                items: cercoItems.map((it: any, index: number) => ({
                  producto_externo_id: String(it.producto_externo_id || ''),
                  producto_nombre: String(it.producto_nombre || ''),
                  producto_descripcion: String(it.producto_descripcion || ''),
                  unidad: String(it.unidad || ''),
                  cantidad: round2(Number(it.cantidad || 0)),
                  precio_lista: round2(Number(it.precio_lista || 0)),
                  descuento_pct: 0,
                  orden: index,
                })),
              };

              try {
                const ordenMarker = `ORDEN #${savedOrden.id}`;
                // Buscar si ya existe una cotización ligada a esta orden
                let existingCotizacionId: number | null = null;
                try {
                  const searchParam = encodeURIComponent(ordenMarker);
                  const searchRes = await fetch(apiUrl(`/api/cotizaciones/?search=${searchParam}`), {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    cache: 'no-store' as RequestCache,
                  });
                  if (searchRes.ok) {
                    const data = await searchRes.json().catch(() => null);
                    if (Array.isArray(data) && data.length > 0 && data[0]?.id != null) {
                      existingCotizacionId = Number(data[0].id);
                    }
                  }
                } catch (searchErr) {
                  console.warn('No se pudo buscar cotización existente para la orden desde levantamiento (OrdenesPage):', searchErr);
                }

                const isUpdate = existingCotizacionId != null;
                const cotUrl = isUpdate
                  ? apiUrl(`/api/cotizaciones/${existingCotizacionId}/`)
                  : apiUrl('/api/cotizaciones/');
                const cotMethod = isUpdate ? 'PUT' : 'POST';

                const cotRes = await fetch(cotUrl, {
                  method: cotMethod,
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(cotPayload),
                });

                if (!cotRes.ok) {
                  let detail: any = null;
                  try {
                    detail = await cotRes.json();
                  } catch {
                    try {
                      detail = await cotRes.text();
                    } catch {
                      detail = null;
                    }
                  }
                  console.warn(
                    `No se pudo ${isUpdate ? 'actualizar' : 'crear'} la cotización desde levantamiento (OrdenesPage). Status:`,
                    cotRes.status,
                    'Detalle:',
                    typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2),
                  );
                }
              } catch (cotErr) {
                console.error('Error de red al guardar cotización desde levantamiento (OrdenesPage):', cotErr);
              }
            }
          } catch (e) {
            console.error('Error creando cotización desde levantamiento (OrdenesPage):', e);
          }

          setOrdenes((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex((o) => (o as any).id === savedOrden.id);
            if (idx >= 0) {
              const copy = list.slice();
              copy[idx] = { ...copy[idx], tipo_orden: 'levantamiento' as const };
              return copy;
            }
            return prev;
          });
        }

        // Refresh from backend to avoid any stale client state/caching.
        await fetchOrdenes();

        setShowModal(false);
        setActiveTab("cliente");
        setFormData({
          folio: "",
          cliente_id: null,
          contacto_id: null,
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
          quien_instalo: null,
          quien_entrego: null,
          firma_encargado_url: "",
          firma_cliente_url: "",
          fotos_urls: []
        });
        setEditingOrden(null);

        setAlert({
          show: true,
          variant: "success",
          title: isEditing ? "Orden Actualizada" : "Orden Creada",
          message: isEditing
            ? `La orden para "${ordenCliente}" ha sido actualizada exitosamente.`
            : `La orden para "${ordenCliente}" ha sido creada exitosamente.`,
        });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      } else {
        // Mostrar error detallado
        let errorMsg = 'Error al guardar la orden';
        const raw = await response.text().catch(() => '');
        try {
          const errorData = raw ? JSON.parse(raw) : null;
          console.error('Error del servidor:', errorData);
          errorMsg = (errorData?.detail || JSON.stringify(errorData)) || errorMsg;
        } catch {
          errorMsg = raw || errorMsg;
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
    } finally {
      setIsSaving(false);
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
      } else {
        if (response.status === 403) {
          setAlert({ show: true, variant: "error", title: "Sin permisos", message: "No tienes permisos para eliminar esta orden." });
        } else if (response.status === 404) {
          setAlert({ show: true, variant: "error", title: "No encontrada", message: "La orden no existe o ya no tienes acceso." });
        } else {
          setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo eliminar la orden." });
        }
        await fetchOrdenes();
        setShowDeleteModal(false);
        setOrdenToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3500);
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
    formNonceRef.current += 1;
    if (!canOrdenesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar órdenes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingOrden(orden);
    setTecnicoSearch('');
    setActiveTab("cliente");
    const orderType = (orden as any)?.tipo_orden;
    setTipoOrden(String(orderType || '').toLowerCase() === 'levantamiento' ? 'levantamiento' : 'servicio_tecnico');

    setFormData({
      folio: ((orden as any).folio ?? '').toString(),
      cliente_id: orden.cliente_id || null,
      contacto_id: null,
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
      quien_instalo: (orden as any).quien_instalo ? Number((orden as any).quien_instalo) : null,
      quien_entrego: (orden as any).quien_entrego ? Number((orden as any).quien_entrego) : null,
      firma_encargado_url: mySignatureUrl || orden.firma_encargado_url || "",
      firma_cliente_url: orden.firma_cliente_url || "",
      fotos_urls: Array.isArray(orden.fotos_urls) ? orden.fotos_urls : []
    });
    setShowModal(true);
  };

  const handleEditRef = useRef(handleEdit);
  handleEditRef.current = handleEdit;

  const abrirOrdenFromQueryDoneRef = useRef<string | null>(null);

  // Desde historial global (MonthlyTarget): /ordenes?abrir=<id> abre el modal de edición de esa orden
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("abrir");
    if (!raw) {
      abrirOrdenFromQueryDoneRef.current = null;
      return;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      navigate("/ordenes", { replace: true });
      return;
    }
    if (loading) return;

    const doneKey = `abrir-${id}`;
    if (abrirOrdenFromQueryDoneRef.current === doneKey) return;

    const open = async () => {
      let orden: Orden | undefined = ordenes.find((o) => o.id === id);
      if (!orden) {
        const token = getToken();
        if (!token) return;
        try {
          const res = await fetch(apiUrl(`/api/ordenes/${id}/`), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            cache: "no-store" as RequestCache,
          });
          if (res.ok) {
            orden = (await res.json()) as Orden;
          }
        } catch {
          /* ignore */
        }
      }
      if (!orden) {
        navigate("/ordenes", { replace: true });
        return;
      }
      abrirOrdenFromQueryDoneRef.current = doneKey;
      handleEditRef.current(orden);
      navigate("/ordenes", { replace: true });
    };

    void open();
  }, [loading, ordenes, location.search, navigate]);

  const handleCloseModal = () => {
    formNonceRef.current += 1;
    setShowModal(false);
    setActiveTab("cliente");
    setTipoOrden('servicio_tecnico');
    setFormData({
      folio: "",
      cliente_id: null,
      contacto_id: null,
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
      quien_instalo: null,
      quien_entrego: null,
      firma_encargado_url: mySignatureUrl || "",
      firma_cliente_url: "",
      fotos_urls: []
    });
    setEditingOrden(null);
    // Limpiar estados de búsqueda de dropdowns
    setClienteSearch('');
    setTecnicoSearch('');
    setQuienInstaloSearch('');
    setQuienEntregoSearch('');
    setServicioSearch('');
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
      if (selectedMonth) {
        const month = selectedMonth; // YYYY-MM
        const fecha = (o.fecha_inicio || o.fecha_creacion || '').toString();
        const matchMonth = fecha.startsWith(month);
        if (!matchMonth) return false;
      }
      // filtro por status
      if (filterStatus && normalizeStatus(o.status) !== normalizeStatus(filterStatus)) return false;
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

  const startIndex = 0;
  const currentOrdenes = shownList;

  const clienteActions = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();

    const base = (clientes || [])
      .flatMap((c) => {
        const contactos = Array.isArray((c as any).contactos) ? ((c as any).contactos as any[]) : [];

        // Sin contactos => 1 sola opción (empresa)
        if (!contactos.length) {
          const labelBase = (c.nombre || '-').toString();
          return [
            {
              id: String(c.id),
              label: labelBase,
              icon: (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">
                  {(labelBase || '?').slice(0, 1).toUpperCase()}
                </span>
              ),
              description: c.telefono || '-',
              short: '',
              end: '',
              __cliente: c,
              __contacto: null,
            },
          ];
        }

        // Con contactos => duplicar empresa por contacto
        return contactos.map((ct, idx) => {
          const labelBase = (c.nombre || '-').toString();
          const contactoNombre = String(ct?.nombre_apellido || '').trim();
          const contactoTel = String(ct?.celular || '').trim();
          const label = contactoNombre ? `${labelBase} - ${contactoNombre}` : labelBase;

          return {
            id: `${String(c.id)}::${String(ct?.id ?? idx)}`,
            label,
            icon: (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">
                {(labelBase || '?').slice(0, 1).toUpperCase()}
              </span>
            ),
            description: contactoTel || c.telefono || '-',
            short: '',
            end: '',
            __cliente: c,
            __contacto: ct,
          };
        });
      })
      .filter((a: any) => {
        if (!q) return true;
        const label = String(a?.label || '').toLowerCase();
        const desc = String(a?.description || '').toLowerCase();
        return label.includes(q) || desc.includes(q);
      });

    const newAction = {
      id: "__new__",
      label: "Nuevo Cliente",
      icon: (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14M4 12h16" strokeLinecap="round" />
          </svg>
        </span>
      ),
      description: "Crear cliente",
      short: '',
      end: '',
    };

    return [newAction, ...base];
  }, [clientes, clienteSearch]);

  const buildTecnicoActions = (searchValue: string) => {
    const q = searchValue.trim().toLowerCase();
    return (usuarios || [])
      .filter((u) => {
        if (!q) return true;
        const nombre = (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email).toLowerCase();
        return nombre.includes(q);
      })
      .map((u) => {
        const nombre = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
        return {
          id: String(u.id),
          label: nombre,
          icon: (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">
              {nombre.slice(0, 1).toUpperCase()}
            </span>
          ),
          description: u.email,
          short: '',
          end: '',
        };
      });
  };

  const tecnicoActions = useMemo(() => buildTecnicoActions(tecnicoSearch), [usuarios, tecnicoSearch]);
  const quienInstaloActions = useMemo(() => buildTecnicoActions(quienInstaloSearch), [usuarios, quienInstaloSearch]);
  const quienEntregoActions = useMemo(() => buildTecnicoActions(quienEntregoSearch), [usuarios, quienEntregoSearch]);

  const servicioActions = useMemo(() => {
    const q = servicioSearch.trim().toLowerCase();
    const base = serviciosDisponibles
      .filter((s) => {
        const matches = !q || s.toLowerCase().includes(q);
        const notSelected = !formData.servicios_realizados.includes(s);
        return matches && notSelected;
      })
      .map((s) => ({
        id: s,
        label: s,
        icon: (
          <svg className='w-4 h-4 text-brand-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
          </svg>
        ),
        description: "Servicio disponible",
        short: '',
        end: '',
      }));

    if (q !== "" && !serviciosDisponibles.some(s => s.toLowerCase() === q)) {
      return [
        {
          id: "__new__",
          label: `Crear "${servicioSearch.trim()}"`,
          icon: (
            <svg className='w-4 h-4 text-brand-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M12 5v14M5 12h14M4 12h16' />
            </svg>
          ),
          description: "Nuevo servicio",
          short: '',
          end: '',
        },
        ...base
      ];
    }

    return base;
  }, [serviciosDisponibles, servicioSearch, formData.servicios_realizados]);

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      const contactoPrincipal = (cliente.contactos || []).find((c: any) => c.is_principal) || (cliente.contactos || [])[0];
      const nombreContacto = contactoPrincipal?.nombre_apellido || '';

      setFormData({
        ...formData,
        cliente_id: cliente.id,
        contacto_id: null,
        cliente: cliente.nombre,
        direccion: cliente.direccion,
        telefono_cliente: cliente.telefono ?? '',
        nombre_cliente: nombreContacto
      });
      setClienteSearch(cliente.nombre);
    } else {
      setFormData({
        ...formData,
        cliente_id: null,
        contacto_id: null,
        cliente: '',
        nombre_cliente: '',
        direccion: '',
        telefono_cliente: ''
      });
      setClienteSearch('');
    }
  };

  const selectTecnico = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData({ ...formData, tecnico_asignado: usuario.id });
      const nombre = usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email;
      setTecnicoSearch(nombre);
      loadTecnicoSignature(usuario.id);
    } else {
      setFormData({ ...formData, tecnico_asignado: null });
      setTecnicoSearch('');
      setTecnicoSignatureUrl('');
    }
  };

  const selectQuienInstalo = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData({ ...formData, quien_instalo: usuario.id });
      const nombre = usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email;
      setQuienInstaloSearch(nombre);
    } else {
      setFormData({ ...formData, quien_instalo: null });
      setQuienInstaloSearch('');
    }
  };

  const selectQuienEntrego = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData({ ...formData, quien_entrego: usuario.id });
      const nombre = usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email;
      setQuienEntregoSearch(nombre);
    } else {
      setFormData({ ...formData, quien_entrego: null });
      setQuienEntregoSearch('');
    }
  };

  useEffect(() => {
    const tecnicoId = formData?.tecnico_asignado != null ? Number(formData.tecnico_asignado) : null;
    if (!tecnicoId) {
      setTecnicoSignatureUrl('');
      return;
    }
    loadTecnicoSignature(tecnicoId);
  }, [formData?.tecnico_asignado]);

  const addServicio = (servicio: string) => {
    // Selección ÚNICA: reemplazar la lista por el servicio elegido
    setFormData({
      ...formData,
      servicios_realizados: [servicio]
    });
    // Limpiar búsqueda y cerrar dropdown
    setServicioSearch('');
  };

  const statsMonthKey = selectedMonth || getCurrentYearMonth();

  const ordenStats = useMemo(() => {
    const list = Array.isArray(ordenes) ? ordenes : [];

    const monthList = list.filter((o) => {
      const base = (o.fecha_inicio || o.fecha_creacion || '').toString();
      return base.startsWith(statsMonthKey);
    });

    const completedMonth = monthList.filter((o) => (o.status || '').toString().toLowerCase() === 'resuelto');
    const pendingMonth = monthList.filter((o) => (o.status || '').toString().toLowerCase() === 'pendiente');

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
      monthPending: pendingMonth.length,
      estrella: best?.cliente || '—',
      estrellaServices: best?.services || 0,
    };
  }, [ordenes, statsMonthKey]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
    <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
      <PageMeta
        title="Órdenes de Trabajo | Sistema Grupo Intrax GPS"
        description="Gestión de órdenes de servicio para el sistema de administración Grupo Intrax GPS"
      />
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
        aria-label="Migas de pan"
      >
        <Link to="/" className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200">
          Inicio
        </Link>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden>
          /
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">Órdenes de trabajo</span>
      </nav>

      {alert.show && (
        <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
      )}

      <header className={`flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
            <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
              Operación
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Órdenes de trabajo</h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
              Administra órdenes de servicio, fotos, firmas y PDF. Filtra por estado, servicio o fecha en el listado.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
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
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Órdenes del mes</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{ordenStats.monthTotal}</p>
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
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Completadas</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{ordenStats.monthCompleted}</p>
            </div>
          </div>
        </div>

        <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200 sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Pendientes</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900 dark:text-white sm:text-lg">{ordenStats.monthPending}</p>
            </div>
          </div>
        </div>
        <div className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500 sm:text-[10px]">Cliente estrella</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">{ordenStats.estrella}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Servicios: {ordenStats.estrellaServices}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
        <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio, cliente, técnico o estado…"
            className={searchInputClass}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
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
          onClick={() => {
            formNonceRef.current += 1;
            if (!canOrdenesCreate) {
              setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear órdenes.' });
              setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
              return;
            }
            if (!editingOrden) {
              const today = new Date().toISOString().slice(0, 10);
              setFormData({
                ...formData,
                fecha_inicio: formData.fecha_inicio || today,
                hora_inicio: getNowHHMM(),
              });
            }
            setTipoOrden('servicio_tecnico');
            setActiveTab("cliente");
            setShowModal(true);
          }}
          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/35 active:scale-[0.99] sm:w-auto sm:min-h-0 lg:shrink-0"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Nueva orden
        </button>
      </div>

      <ComponentCard
        compact
        title="Listado"
        desc="Resultados según búsqueda y filtros. En pantallas pequeñas desplázate horizontalmente si hace falta."
        className={`overflow-visible ${cardShellClass}`}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            {/* Filtro desplegable */}
            <div className={`relative w-full ${filterOpen ? "z-[100]" : "z-0"}`} ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-300/90 hover:bg-white dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:hover:border-white/[0.12] dark:hover:bg-gray-900/40 sm:w-auto sm:min-w-[86px]"
              >

                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7h13" />
                  <path d="M3 12h10" />
                  <path d="M3 17h7" />
                  <path d="M18 7v10" />
                  <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filtros
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-[110] mt-2 w-72 max-h-[min(80vh,24rem)] overflow-auto rounded-xl border border-gray-200/70 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10">
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="h-10 w-full rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 text-sm text-gray-800 outline-none focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:focus:bg-gray-900/60"
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
                      className="bg-brand-600 hover:bg-brand-700 h-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterStatus(''); setFilterServicio([]); setFilterDate(''); setFilterOpen(false); }}
                      className="h-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="p-2 pt-0">
          <MobileOrderList
            ordenes={currentOrdenes}
            startIndex={startIndex}
            loading={loading}
            formatDate={formatYmdToDMY}
            onPdf={(id) => navigate(`/ordenes/${id}/pdf`)}
            onEdit={canOrdenesEdit ? handleEdit : undefined}
            onDelete={canOrdenesDelete ? handleDeleteClick : undefined}
            canEdit={canOrdenesEdit}
            canDelete={canOrdenesDelete}
            usuarios={usuarios}
          />
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40">
            <Table className="w-full min-w-[900px] table-fixed sm:min-w-0 xl:min-w-full">
              <TableHeader className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10 text-[11px] font-semibold text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-[90px] min-w-[80px] whitespace-nowrap text-gray-700 dark:text-gray-300">Folio</TableCell>
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
                  const folioDisplay = (orden?.folio ?? '').toString().trim() || (orden.idx ?? (startIndex + idx + 1));

                  const tecnico = usuarios.find(u => u.id === (orden as any).tecnico_asignado);
                  const tecnicoNombre = tecnico
                    ? (tecnico.first_name && tecnico.last_name ? `${tecnico.first_name} ${tecnico.last_name}` : tecnico.email)
                    : ((orden as any).nombre_encargado || '-');
                  return (
                    <TableRow key={orden.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <TableCell className="px-2 py-2 whitespace-nowrap w-[90px] min-w-[80px]">{folioDisplay}</TableCell>
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
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                            <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                              <g>
                                <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
                                <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
                                <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
                                <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
                              </g>
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
                    <TableCell className="px-2 py-2 text-center text-[12px] text-gray-500">Sin órdenes</TableCell>
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
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return;
                      const d = new Date(ym.year, ym.month - 2, 1);
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      setSelectedMonth(`${d.getFullYear()}-${mm}`);
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
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return selectedMonth ? selectedMonth : 'Todos los meses';
                      return new Date(ym.year, ym.month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const ym = parseYearMonth(selectedMonth);
                      if (!ym) return;
                      const dt = new Date(ym.year, ym.month - 1, 1);
                      dt.setMonth(dt.getMonth() + 1);
                      const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                      setSelectedMonth(next);
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Mes siguiente"
                  >
                    <svg className="w-4 h-4 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6 6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Modales de detalle */}
      <Modal isOpen={problematicaModal.open} onClose={() => setProblematicaModal({ open: false, content: '' })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
        <div className="p-0 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Problemática</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Detalle completo reportado por el cliente</p>
              </div>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-800 dark:text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="whitespace-pre-wrap wrap-break-word leading-relaxed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 p-3">{problematicaModal.content || '-'}</pre>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 text-right">
            <button type="button" onClick={() => setProblematicaModal({ open: false, content: '' })} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cerrar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={serviciosModal.open} onClose={() => setServiciosModal({ open: false, content: [] })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
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

      <Modal isOpen={comentarioModal.open} onClose={() => setComentarioModal({ open: false, content: '' })} closeOnBackdropClick={false} className="max-w-2xl w-[92vw]">
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
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        closeOnBackdropClick={false}
        closeOnEscape={!confirmDelete.open}
        className="w-[94vw] max-w-4xl max-h-[92vh] p-0 overflow-hidden"
      >
        <div>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10">
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {editingOrden ? 'Editar' : 'Nueva'} Orden de {tipoOrdenLabel}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Captura y revisa los datos antes de guardar
                </p>
              </div>
            </div>
          </div>

          {/* Body */}

          <form ref={formScrollRef} onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

            {/* Modal Alert */}
            {modalAlert.show && (
              <div className="mb-4">
                <Alert variant={modalAlert.variant} title={modalAlert.title} message={modalAlert.message} showLink={false} />
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("cliente")}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${activeTab === "cliente"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
              >
                Datos del cliente
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("orden")}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${activeTab === "orden"
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
              >
                Datos de la orden
              </button>
            </div>

            {activeTab === "orden" && (
              <>
                {/* Selector de Tipo de Orden */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de Orden de Trabajo</h4>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Selecciona el tipo de orden</label>
                    <select
                      value={tipoOrden}
                      onChange={(e) => setTipoOrden(e.target.value as any)}
                      disabled={!!editingOrden || isReadOnly}
                      className={`w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 text-sm px-3 shadow-theme-xs outline-none ${!!editingOrden || isReadOnly ? 'bg-gray-100 text-gray-600 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-400' : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'}`}
                    >
                      <option value="servicio_tecnico">Servicio Técnico</option>
                      <option value="levantamiento">Levantamiento</option>
                      <option value="instalaciones">Instalaciones</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {activeTab === "cliente" && (
              <>
                {/* SECCIÓN 1: Detalles Generales */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles Generales</h4>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                    {editingOrden && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Folio</label>
                        <input
                          type="text"
                          value={(formData as any).folio || ''}
                          onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                          className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                          placeholder="Ej: ATX2000"
                        />
                      </div>
                    )}
                    {/* 1. Cliente con ActionSearchBar */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <ActionSearchBar
                          actions={clienteActions as any}
                          showAllActions={true}
                          defaultOpen={false}
                          label="Cliente"
                          placeholder="Buscar cliente por nombre o teléfono..."
                          value={clienteSearch || formData.cliente || ''}
                          onQueryChange={(q: string) => setClienteSearch(q)}

                          onSelectAction={(action: any) => {
                            if (action?.id === '__new__') {
                              setShowClienteModal(true);
                              return;
                            }
                            const rawId = String(action?.id ?? '');
                            const clienteIdStr = rawId.includes('::') ? rawId.split('::')[0] : rawId;
                            const id = Number(clienteIdStr);
                            const c = (clientes || []).find((x) => Number(x.id) === id);
                            if (!c) return;

                            const contacto = action?.__contacto;
                            if (contacto) {
                              setFormData({
                                ...formData,
                                cliente_id: c.id,
                                contacto_id: contacto?.id != null ? Number(contacto.id) : null,
                                cliente: c.nombre,
                                direccion: c.direccion,
                                telefono_cliente: String(contacto?.celular || c.telefono || ''),
                                nombre_cliente: String(contacto?.nombre_apellido || ''),
                              });
                              setClienteSearch(String(action?.label || c.nombre || ''));
                              return;
                            }

                            selectCliente(c);
                          }}
                        />
                      </div>
                      {(formData.cliente_id || formData.cliente) && (
                        <button
                          type="button"
                          onClick={() => selectCliente(null)}

                          aria-label="Limpiar selección"
                          className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition mt-[20px]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4"
                          >
                            <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
                            <path d="M18 11l-4.3-4.3" />
                          </svg>
                        </button>
                      )}
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
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <ActionSearchBar
                            actions={tecnicoActions as any}
                            defaultOpen={false}
                            label="Técnico Asignado"
                            placeholder="Buscar técnico..."
                            value={tecnicoSearch || (formData.tecnico_asignado ? (() => {
                              const tecnicoId = Number(formData.tecnico_asignado);
                              const u = usuarios.find(u => u.id === tecnicoId);
                              return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : '';
                            })() : '')}
                            onQueryChange={(q: string) => setTecnicoSearch(q)}

                            onSelectAction={(action: any) => {
                              const id = Number(action?.id);
                              const u = (usuarios || []).find((x) => Number(x.id) === id);
                              if (u) selectTecnico(u);
                            }}
                          />
                        </div>
                        {formData.tecnico_asignado && (
                          <button
                            type="button"
                            onClick={() => selectTecnico(null)}
                            aria-label="Limpiar selección"
                            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition mt-[20px]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-4 h-4"
                            >
                              <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
                              <path d="M18 11l-4.3-4.3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <ActionSearchBar
                            actions={quienInstaloActions as any}
                            defaultOpen={false}
                            label="¿Quien instaló?"
                            placeholder="Buscar técnico..."
                            value={quienInstaloSearch || (formData.quien_instalo ? (() => {
                              const tecnicoId = Number(formData.quien_instalo);
                              const u = usuarios.find(u => u.id === tecnicoId);
                              return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : '';
                            })() : '')}
                            onQueryChange={(q: string) => setQuienInstaloSearch(q)}
                            onSelectAction={(action: any) => {
                              const id = Number(action?.id);
                              const u = (usuarios || []).find((x) => Number(x.id) === id);
                              if (u) selectQuienInstalo(u);
                            }}
                          />
                        </div>
                        {formData.quien_instalo && (
                          <button
                            type="button"
                            onClick={() => selectQuienInstalo(null)}
                            aria-label="Limpiar selección"
                            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition mt-[20px]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
                              <path d="M18 11l-4.3-4.3" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <ActionSearchBar
                            actions={quienEntregoActions as any}
                            defaultOpen={false}
                            label="¿Quien entregó?"
                            placeholder="Buscar técnico..."
                            value={quienEntregoSearch || (formData.quien_entrego ? (() => {
                              const tecnicoId = Number(formData.quien_entrego);
                              const u = usuarios.find(u => u.id === tecnicoId);
                              return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : '';
                            })() : '')}
                            onQueryChange={(q: string) => setQuienEntregoSearch(q)}
                            onSelectAction={(action: any) => {
                              const id = Number(action?.id);
                              const u = (usuarios || []).find((x) => Number(x.id) === id);
                              if (u) selectQuienEntrego(u);
                            }}
                          />
                        </div>
                        {formData.quien_entrego && (
                          <button
                            type="button"
                            onClick={() => selectQuienEntrego(null)}
                            aria-label="Limpiar selección"
                            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition mt-[20px]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
                              <path d="M18 11l-4.3-4.3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "cliente" && (
              <>
                {/* SECCIÓN 2: Detalles del Cliente */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles del Cliente</h4>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                    {/* Teléfono - Solo números */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Teléfono</label>
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
              </>
            )}

            {tipoOrden === 'levantamiento' && (
              <div className={activeTab === 'orden' ? '' : 'hidden'}>
                <LevantamientoForm
                  ordenId={editingOrden?.id ?? null}
                  disabled={isReadOnly}
                  onSnapshot={(snapshot) => {
                    levantamientoSnapshotRef.current = snapshot;
                  }}
                />
              </div>
            )}

            {activeTab === "orden" && (
              <>
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

                    {/* Servicios Realizados con ActionSearchBar */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <ActionSearchBar
                          actions={servicioActions as any}
                          defaultOpen={false}
                          label="Servicios Realizados"
                          placeholder="Buscar o agregar servicio..."
                          value={servicioSearch}
                          onQueryChange={(q: string) => setServicioSearch(q)}
                          onSelectAction={(action: any) => {
                            if (action?.id === '__new__') {
                              const nuevoServicio = servicioSearch.trim();
                              if (nuevoServicio && !serviciosDisponibles.includes(nuevoServicio)) {
                                setServiciosDisponibles([...serviciosDisponibles, nuevoServicio]);
                              }
                              addServicio(nuevoServicio);
                              return;
                            }
                            addServicio(action.id);
                          }}
                        />
                      </div>
                      {formData.servicios_realizados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, servicios_realizados: [] })}
                          aria-label="Limpiar selección"
                          className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition mt-[20px]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4"
                          >
                            <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
                            <path d="M18 11l-4.3-4.3" />
                          </svg>
                        </button>
                      )}
                    </div>

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
              </>
            )}

            {activeTab === "cliente" && (
              <>
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
              </>
            )}

            {activeTab === "cliente" && (
              <>
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
                        value={tecnicoSignatureUrl || mySignatureUrl || formData.firma_encargado_url}
                        disabled={true}
                        onChange={() => { }}
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
                    {/* Modal Confirmación eliminar foto (type="button" evita submit del formulario padre) */}
                    <Modal
                      isOpen={confirmDelete.open}
                      onClose={() => {
                        if (!deletingPhoto) setConfirmDelete({ open: false, index: null, url: null });
                      }}
                      closeOnBackdropClick={false}
                      showCloseButton={!deletingPhoto}
                      className="max-w-sm p-6 z-[100000]"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="text-center">
                          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                            {deletingPhoto ? (
                              <svg className="h-7 w-7 animate-spin text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                          </div>
                          <h5 className="mt-4 font-semibold text-gray-800 text-theme-lg dark:text-white/90">
                            {deletingPhoto ? 'Eliminando imagen…' : 'Confirmar eliminación'}
                          </h5>
                          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {deletingPhoto
                              ? 'Por favor espera; esto puede tardar unos segundos.'
                              : 'Esta acción no se puede deshacer. ¿Eliminar la imagen seleccionada?'}
                          </p>
                        </div>
                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            type="button"
                            disabled={deletingPhoto}
                            onClick={() => setConfirmDelete({ open: false, index: null, url: null })}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 center dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deletingPhoto}
                            onClick={() => {
                              if (confirmDelete.index != null && confirmDelete.url) {
                                void handleDeletePhoto(confirmDelete.index, confirmDelete.url);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingPhoto && (
                              <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            {deletingPhoto ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    </Modal>
                  </div>
                </div>
              </>
            )}

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
              {activeTab === 'cliente' ? (
                <button
                  key="cliente-next"
                  type="button"
                  disabled={isSaving}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('orden');
                    requestAnimationFrame(() => {
                      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Siguiente
                </button>
              ) : (
                <button
                  key="orden-submit"
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isSaving ? 'Guardando...' : (editingOrden ? 'Actualizar' : 'Guardar')}
                </button>
              )}
            </div>
          </form>

        </div>

      </Modal>

      {/* Modal Eliminar */}
      {ordenToDelete && (
        <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} closeOnBackdropClick={false} className="w-full max-w-md mx-4 sm:mx-auto">
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
        closeOnBackdropClick={false}
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
                if (!window.isSecureContext) {
                  setAlert({ show: true, variant: 'warning', title: 'Se requiere conexión segura', message: 'La geolocalización requiere HTTPS (o localhost). Abre el sistema con HTTPS o en localhost e inténtalo de nuevo.' });
                  setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3200);
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setSelectedLocation({ lat: latitude, lng: longitude });
                    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    setFormData((prev) => ({ ...prev, direccion: url }));
                    setShowMapModal(false);
                    setSelectedLocation(null);
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

      <ClienteFormModal
        isOpen={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSuccess={handleClienteSuccess}
        editingCliente={null}
        permissions={permissions}
      />
    </div>
    </div>
  );
}