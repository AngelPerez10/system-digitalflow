import { useMemo, useState, useEffect, useRef } from "react";

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

import {
  estadosPorPais,
  formatPhoneE164,
  giroOptions,
  onlyDigits10,
  paisOptions,
  parsePhoneToForm,
  phoneCountryOptions,
} from "./clientesCatalogos";

interface Cliente {
  id: number;
  idx: number;
  nombre: string;
  direccion: string;
  telefono: string;
  fecha_creacion: string;

  giro?: string;
  correo?: string;
  calle?: string;
  numero_exterior?: string;
  interior?: string;
  colonia?: string;
  codigo_postal?: string;
  ciudad?: string;
  pais?: string;
  estado?: string;
  notas?: string;
  descuento_pct?: string | number | null;

  portal_web?: string;
  nombre_facturacion?: string;
  numero_facturacion?: string;
  domicilio_facturacion?: string;

  calle_envio?: string;
  numero_envio?: string;
  colonia_envio?: string;
  codigo_postal_envio?: string;
  pais_envio?: string;
  estado_envio?: string;
  ciudad_envio?: string;

  contactos?: ClienteContacto[];
  documento?: ClienteDocumento | null;
}

type ClienteContacto = {
  id?: number;
  cliente?: number;
  nombre_apellido: string;
  titulo: string;
  area_puesto: string;
  celular: string;
  correo: string;
  is_principal?: boolean;
};

type ClienteDocumento = {
  id: number;
  cliente: number;
  url: string;
  public_id: string;
  nombre_original: string;
  size_bytes: number | null;
};

const inputLikeClassName =
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

const selectLikeClassName =
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

const formatApiErrors = (txt: string) => {
  if (!txt) return "";
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === 'object') {
      return Object.entries(data)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
          if (typeof v === 'string') return `${k}: ${v}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .join("\n");
    }
  } catch {
    // ignore
  }
  return txt;
};

const isGoogleMapsLink = (value: string | null | undefined) => {
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

export default function Clientes() {
  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canClientesView = permissions?.clientes?.view !== false;
  const canClientesCreate = !!permissions?.clientes?.create;
  const canClientesEdit = !!permissions?.clientes?.edit;
  const canClientesDelete = !!permissions?.clientes?.delete;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  // Form state
  const [activeTab, setActiveTab] = useState<"general" | "more">("general");
  const [modalError, setModalError] = useState<string>("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deletedContactIds, setDeletedContactIds] = useState<number[]>([]);
  const [contactos, setContactos] = useState<ClienteContacto[]>([
    { nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" },
  ]);

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zoomRef = useRef<number>(15);
  const mapContainerId = "clientes-leaflet-map";

  const [formData, setFormData] = useState<any>({
    nombre: "",
    telefono_pais: "MX",
    telefono: "",
    direccion: "",

    giro: "",
    correo: "",
    calle: "",
    numero_exterior: "",
    interior: "",
    colonia: "",
    codigo_postal: "",
    ciudad: "",
    pais: "México",
    estado: "",
    notas: "",
    descuento_pct: null,

    portal_web: "",
    nombre_facturacion: "",
    numero_facturacion: "",
    domicilio_facturacion: "",

    calle_envio: "",
    numero_envio: "",
    colonia_envio: "",
    codigo_postal_envio: "",
    pais_envio: "México",
    estado_envio: "",
    ciudad_envio: "",
  });

  const estadosOptions = estadosPorPais[formData.pais || "México"] || estadosPorPais["México"] || [];
  const estadosEnvioOptions = estadosPorPais[formData.pais_envio || "México"] || estadosPorPais["México"] || [];

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
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

  useEffect(() => {
    if (!showMapModal) {
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
      const m2 = d.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (m2) {
        const lat = parseFloat(m2[1]);
        const lng = parseFloat(m2[2]);
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
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
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

        const had = initFromDireccion();
        if (!had && !selectedLocation) {
          setSelectedLocation({ lat: 19.0653, lng: -104.2831 });
        }

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

        if (selectedLocation) {
          markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
        }
      } catch {
        setAlert({ show: true, variant: 'error', title: 'Error de mapa', message: 'No se pudo cargar el mapa interactivo.' });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    })();
  }, [showMapModal]);

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

  const fetchClientes = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/clientes/'), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setClientes([]);
        return;
      }
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canClientesView) {
      setLoading(false);
      return;
    }
    fetchClientes();
  }, [canClientesView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingCliente && !canClientesCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    if (editingCliente && !canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }

    const token = getToken();
    const url = editingCliente ? apiUrl(`/api/clientes/${editingCliente.id}/`) : apiUrl('/api/clientes/');
    const method = editingCliente ? 'PUT' : 'POST';
    const clienteNombre = formData.nombre;
    const isEditing = !!editingCliente;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          telefono: formatPhoneE164(formData.telefono_pais, formData.telefono),
          descuento_pct: formData.descuento_pct === '' ? null : formData.descuento_pct,
        })
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        setModalError(formatApiErrors(txt) || 'No se pudo guardar el cliente.');
        return;
      }

      const saved = await response.json().catch(() => null);
      const clienteId = saved?.id || editingCliente?.id;
      if (!clienteId) {
        setModalError('No se pudo obtener el ID del cliente guardado.');
        return;
      }

      for (const id of deletedContactIds) {
        await fetch(apiUrl(`/api/cliente-contactos/${id}/`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }

      for (const c of contactos) {
        const payload = {
          nombre_apellido: (c.nombre_apellido || '').trim(),
          titulo: c.titulo || '',
          area_puesto: c.area_puesto || '',
          celular: onlyDigits10(c.celular || ''),
          correo: c.correo || '',
        };
        if (c.id) {
          await fetch(apiUrl(`/api/cliente-contactos/${c.id}/`), {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...payload, cliente: clienteId }),
          }).catch(() => null);
        } else {
          await fetch(apiUrl('/api/cliente-contactos/'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...payload, cliente: clienteId }),
          }).catch(() => null);
        }
      }

      if (documentFile) {
        const allowed = ['pdf', 'xls', 'xlsx', 'doc', 'docs', 'odt', 'ods'];
        const ext = (documentFile.name.split('.').pop() || '').toLowerCase();
        if (!allowed.includes(ext)) {
          setModalError('Formato no permitido para Documento.');
          return;
        }
        if (documentFile.size > 15 * 1024 * 1024) {
          setModalError('El documento excede 15MB.');
          return;
        }

        const fd = new FormData();
        fd.append('cliente', String(clienteId));
        fd.append('archivo', documentFile);

        const up = await fetch(apiUrl('/api/cliente-documentos/'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!up.ok) {
          const txt = await up.text().catch(() => '');
          setModalError(formatApiErrors(txt) || 'No se pudo subir el documento.');
          return;
        }
      }

      await fetchClientes();
      setShowModal(false);
      setFormData({
        nombre: "",
        telefono_pais: "MX",
        telefono: "",
        direccion: "",
        giro: "",
        correo: "",
        calle: "",
        numero_exterior: "",
        interior: "",
        colonia: "",
        codigo_postal: "",
        ciudad: "",
        pais: "México",
        estado: "",
        notas: "",
        descuento_pct: null,
        portal_web: "",
        nombre_facturacion: "",
        numero_facturacion: "",
        domicilio_facturacion: "",
        calle_envio: "",
        numero_envio: "",
        colonia_envio: "",
        codigo_postal_envio: "",
        pais_envio: "México",
        estado_envio: "",
        ciudad_envio: "",
      });
      setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
      setDeletedContactIds([]);
      setDocumentFile(null);
      setActiveTab('general');
      setEditingCliente(null);

      setAlert({
        show: true,
        variant: 'success',
        title: isEditing ? 'Cliente Actualizado' : 'Cliente Creado',
        message: isEditing
          ? `El cliente "${clienteNombre}" ha sido actualizado exitosamente.`
          : `El cliente "${clienteNombre}" ha sido creado exitosamente.`,
      });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setModalError(String(error));
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    if (!canClientesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setClienteToDelete(cliente);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    const token = getToken();
    try {
      const response = await fetch(apiUrl(`/api/clientes/${clienteToDelete.id}/`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchClientes();
        setShowDeleteModal(false);
        setAlert({
          show: true,
          variant: "success",
          title: "Cliente Eliminado",
          message: `El cliente "${clienteToDelete?.nombre}" ha sido eliminado exitosamente.`
        });
        setClienteToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClienteToDelete(null);
  };

  const handleEdit = (cliente: Cliente) => {
    if (!canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingCliente(cliente);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);

    const phoneParsed = parsePhoneToForm(cliente.telefono);
    setFormData({
      ...formData,
      nombre: cliente.nombre || "",
      telefono_pais: phoneParsed.phoneCountry,
      telefono: phoneParsed.phoneNational,
      direccion: cliente.direccion || "",
      giro: cliente.giro || "",
      correo: cliente.correo || "",
      calle: cliente.calle || "",
      numero_exterior: cliente.numero_exterior || "",
      interior: cliente.interior || "",
      colonia: cliente.colonia || "",
      codigo_postal: cliente.codigo_postal || "",
      ciudad: cliente.ciudad || "",
      pais: cliente.pais || "México",
      estado: cliente.estado || "",
      notas: cliente.notas || "",
      descuento_pct: (cliente.descuento_pct as any) ?? null,
      portal_web: cliente.portal_web || "",
      nombre_facturacion: cliente.nombre_facturacion || "",
      numero_facturacion: cliente.numero_facturacion || "",
      domicilio_facturacion: cliente.domicilio_facturacion || "",
      calle_envio: cliente.calle_envio || "",
      numero_envio: cliente.numero_envio || "",
      colonia_envio: cliente.colonia_envio || "",
      codigo_postal_envio: cliente.codigo_postal_envio || "",
      pais_envio: cliente.pais_envio || "México",
      estado_envio: cliente.estado_envio || "",
      ciudad_envio: cliente.ciudad_envio || "",
    });

    const cs = (cliente.contactos || []).map((c: any) => ({
      id: c.id,
      nombre_apellido: c.nombre_apellido || "",
      titulo: c.titulo || "",
      area_puesto: c.area_puesto || "",
      celular: c.celular || "",
      correo: c.correo || "",
      is_principal: c.is_principal,
    }));
    setContactos(cs.length ? cs : [{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);
    setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setFormData({
      nombre: "",
      telefono_pais: "MX",
      telefono: "",
      direccion: "",
      giro: "",
      correo: "",
      calle: "",
      numero_exterior: "",
      interior: "",
      colonia: "",
      codigo_postal: "",
      ciudad: "",
      pais: "México",
      estado: "",
      notas: "",
      descuento_pct: null,
      portal_web: "",
      nombre_facturacion: "",
      numero_facturacion: "",
      domicilio_facturacion: "",
      calle_envio: "",
      numero_envio: "",
      colonia_envio: "",
      codigo_postal_envio: "",
      pais_envio: "México",
      estado_envio: "",
      ciudad_envio: "",
    });
  };

  const openCreate = () => {
    setEditingCliente(null);
    setModalError("");
    setActiveTab("general");
    setDeletedContactIds([]);
    setDocumentFile(null);
    setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
    setFormData({
      nombre: "",
      telefono_pais: "MX",
      telefono: "",
      direccion: "",
      giro: "",
      correo: "",
      calle: "",
      numero_exterior: "",
      interior: "",
      colonia: "",
      codigo_postal: "",
      ciudad: "",
      pais: "México",
      estado: "",
      notas: "",
      descuento_pct: null,
      portal_web: "",
      nombre_facturacion: "",
      numero_facturacion: "",
      domicilio_facturacion: "",
      calle_envio: "",
      numero_envio: "",
      colonia_envio: "",
      codigo_postal_envio: "",
      pais_envio: "México",
      estado_envio: "",
      ciudad_envio: "",
    });
    setShowModal(true);
  };

  const shownList = useMemo(() => {
    if (!Array.isArray(clientes)) return [];
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c: Cliente) =>
      c.nombre.toLowerCase().includes(q) ||
      String(c.telefono || '').includes(q) ||
      String(c.direccion || '').toLowerCase().includes(q)
    );
  }, [clientes, searchTerm]);

  const totalPages = Math.ceil(shownList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClientes = shownList.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleConfirmMap = () => {
    if (!selectedLocation) {
      setShowMapModal(false);
      return;
    }
    const { lat, lng } = selectedLocation;
    setFormData({ ...formData, direccion: `https://www.google.com/maps?q=${lat},${lng}` });
    setShowMapModal(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta
        title="Clientes | Sistema Grupo Intrax GPS"
        description="Gestión de clientes para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Clientes" />

      {/* Alert */}
      {alert.show && (
        <Alert
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
          showLink={false}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                <path d="M20 22a8 8 0 1 0-16 0" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Clientes</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{clientes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Clientes</h2>
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
            onClick={() => {
              if (!canClientesCreate) {
                setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                return;
              }
              openCreate();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo Cliente
          </button>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="p-2">

          {/* Table - Responsive */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Empresa</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Ciudad</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Teléfono</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Contacto</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/3 text-gray-700 dark:text-gray-300">Dirección</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-1/6 text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                {currentClientes.map((cliente, idx) => (
                  <TableRow key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{startIndex + idx + 1000}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4 text-gray-900 dark:text-white">{cliente.nombre}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">
                      {(() => {
                        const ciudad = cliente.ciudad || '';
                        const estado = cliente.estado || '';
                        if (!ciudad && !estado) return <span className="text-gray-500">-</span>;
                        return (
                          <div className="leading-tight">
                            <div className="text-gray-900 dark:text-white truncate" title={ciudad || ''}>{ciudad || '-'}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={estado || ''}>{estado || '-'}</div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">
                      <a href={`tel:${cliente.telefono}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline">
                        {cliente.telefono}
                      </a>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4">
                      {(() => {
                        const principal = (cliente.contactos || []).find((c: any) => !!(c as any)?.is_principal) || (cliente.contactos || [])[0];
                        const nombre = (principal as any)?.nombre_apellido || '';
                        const correo = (principal as any)?.correo || '';
                        if (!nombre && !correo) return <span className="text-gray-500">-</span>;
                        return (
                          <div className="leading-tight">
                            <div className="text-gray-900 dark:text-white truncate" title={nombre || ''}>{nombre || '-'}</div>
                            {correo ? (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={correo}>{correo}</div>
                            ) : (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">-</div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/3">
                      {isGoogleMapsLink(cliente.direccion) ? (
                        <a
                          href={cliente.direccion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Ver ubicación
                        </a>
                      ) : (
                        <span className="block truncate" title={cliente.direccion}>{cliente.direccion}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center w-1/6">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                        {canClientesEdit && (
                          <button
                            onClick={() => handleEdit(cliente)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canClientesDelete && (
                          <button
                            onClick={() => handleDeleteClick(cliente)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                            title="Eliminar"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientes.length && (
                  <TableRow>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2 text-center text-sm text-gray-500">Sin clientes</TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {!loading && shownList.length > 0 && currentClientes.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, shownList.length)}</span> de{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{shownList.length}</span> clientes
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
                    {/* First Page */}
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

                    {/* Page Numbers */}
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

                    {/* Last Page */}
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

      {/* Modal Crear/Editar */}
      <Modal isOpen={showModal} onClose={handleCloseModal} className="w-full max-w-4xl p-0 overflow-hidden">
        <div>
          <div className="px-5 pt-5 pb-4 bg-linear-to-r from-brand-50 via-transparent to-transparent dark:from-gray-800/70 dark:via-gray-900/20 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 shadow-theme-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                  <path d="M20 22a8 8 0 1 0-16 0" />
                </svg>
              </span>
              <div className="flex-1">
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Captura y revisa los datos antes de guardar
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
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
                      <Label>Empresa *</Label>
                      <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                      <Label>Giro</Label>
                      <select
                        value={formData.giro || ""}
                        onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                        className={selectLikeClassName}
                      >
                        <option value="">Seleccione</option>
                        {giroOptions.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <div className="flex items-center gap-2">
                        <select
                          value={formData.telefono_pais || "MX"}
                          onChange={(e) => setFormData({ ...formData, telefono_pais: e.target.value })}
                          className={selectLikeClassName}
                        >
                          {phoneCountryOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => {
                            const value = (e.target.value || '').replace(/\D/g, '');
                            setFormData({ ...formData, telefono: value });
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={inputLikeClassName}
                          placeholder="Teléfono del cliente"
                          maxLength={10}
                        />
                        <a
                          href={onlyDigits10(formData.telefono || '') ? `tel:${onlyDigits10(formData.telefono || '')}` : undefined}
                          onClick={(e) => {
                            if (!onlyDigits10(formData.telefono || '')) e.preventDefault();
                          }}
                          className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${!onlyDigits10(formData.telefono || '') ? 'opacity-50 pointer-events-none' : ''}`}
                          title="Llamar"
                          aria-label="Llamar"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <div>
                      <Label>Correo</Label>
                      <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Calle *</Label>
                      <Input value={formData.calle} onChange={(e) => setFormData({ ...formData, calle: e.target.value })} />
                    </div>
                    <div>
                      <Label>Número exterior *</Label>
                      <Input value={formData.numero_exterior} onChange={(e) => setFormData({ ...formData, numero_exterior: e.target.value })} />
                    </div>
                    <div>
                      <Label>Interior</Label>
                      <Input value={formData.interior} onChange={(e) => setFormData({ ...formData, interior: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Colonia</Label>
                      <Input value={formData.colonia} onChange={(e) => setFormData({ ...formData, colonia: e.target.value })} />
                    </div>
                    <div>
                      <Label>Código postal</Label>
                      <Input value={formData.codigo_postal} onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })} />
                    </div>
                    <div>
                      <Label>Ciudad *</Label>
                      <Input value={formData.ciudad} onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>País *</Label>
                      <select
                        value={formData.pais || "México"}
                        onChange={(e) => {
                          const pais = e.target.value;
                          const nextEstados = estadosPorPais[pais] || estadosPorPais["México"] || [];
                          const nextEstado = nextEstados.includes(formData.estado) ? formData.estado : "";
                          setFormData({ ...formData, pais, estado: nextEstado });
                        }}
                        className={selectLikeClassName}
                      >
                        {paisOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Estado *</Label>
                      <select
                        value={formData.estado || ""}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className={selectLikeClassName}
                      >
                        <option value="">Seleccione</option>
                        {estadosOptions.map((est) => (
                          <option key={est} value={est}>{est}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Dirección</Label>
                    <div className="flex items-center justify-between gap-3 mb-1">
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
                        rows={3}
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 pr-12 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                        placeholder="Dirección, coordenadas o URL de Google Maps"
                      />
                      {!!formData.direccion?.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const direccion = String(formData.direccion || '').trim();
                            if (isGoogleMapsUrl(direccion) || direccion.includes('google.com/maps') || direccion.includes('maps.app.goo.gl')) {
                              window.open(direccion, '_blank');
                              return;
                            }
                            const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                            if (coordMatch) {
                              const lat = coordMatch[1];
                              const lng = coordMatch[2];
                              window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                              return;
                            }
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

                  <div>
                    <Label>Notas</Label>
                    <textarea
                      rows={4}
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Descuento %</Label>
                      <Input
                        type="number"
                        value={formData.descuento_pct ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormData({ ...formData, descuento_pct: v === "" ? null : Number(v) });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">CONTACTOS</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Mínimo 1 contacto. El primero es principal.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContactos(prev => ([...prev, { nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]))}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-blue-700"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {contactos.map((c, i) => (
                      <div key={c.id ?? i} className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Contacto {i + 1}{i === 0 ? " (Principal)" : ""}</p>
                          <button
                            type="button"
                            disabled={contactos.length <= 1}
                            onClick={() => {
                              setContactos(prev => {
                                const item = prev[i];
                                if (item?.id) setDeletedContactIds(ids => [...ids, item.id as number]);
                                const next = prev.filter((_, idx) => idx !== i);
                                return next.length ? next : [{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }];
                              });
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Nombre y apellido *</Label>
                            <Input
                              value={c.nombre_apellido}
                              onChange={(e) => setContactos(prev => prev.map((x, idx) => idx === i ? { ...x, nombre_apellido: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={c.titulo}
                              onChange={(e) => setContactos(prev => prev.map((x, idx) => idx === i ? { ...x, titulo: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <Label>Área / Puesto</Label>
                            <Input
                              value={c.area_puesto}
                              onChange={(e) => setContactos(prev => prev.map((x, idx) => idx === i ? { ...x, area_puesto: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <Label>Celular *</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="tel"
                                value={c.celular}
                                onChange={(e) => {
                                  const value = (e.target.value || '').replace(/\D/g, '');
                                  setContactos(prev => prev.map((x, idx) => idx === i ? { ...x, celular: value } : x));
                                }}
                                onKeyPress={(e) => {
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                                placeholder="Celular"
                                maxLength={10}
                              />
                              <a
                                href={onlyDigits10(c.celular || '') ? `tel:${onlyDigits10(c.celular || '')}` : undefined}
                                onClick={(e) => {
                                  if (!onlyDigits10(c.celular || '')) e.preventDefault();
                                }}
                                className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${!onlyDigits10(c.celular || '') ? 'opacity-50 pointer-events-none' : ''}`}
                                title="Llamar"
                                aria-label="Llamar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                                </svg>
                              </a>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Label>Correo</Label>
                            <Input
                              type="email"
                              value={c.correo}
                              onChange={(e) => setContactos(prev => prev.map((x, idx) => idx === i ? { ...x, correo: e.target.value } : x))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                    <table className="min-w-full text-[12px]">
                      <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Nombre</th>
                          <th className="px-3 py-2 text-left font-medium">Título</th>
                          <th className="px-3 py-2 text-left font-medium">Area</th>
                          <th className="px-3 py-2 text-left font-medium">Celular</th>
                          <th className="px-3 py-2 text-left font-medium">Correo</th>
                          <th className="px-3 py-2 text-center font-medium">Principal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                        {contactos.map((c, i) => (
                          <tr key={`row-${c.id ?? i}`} className="text-gray-700 dark:text-gray-200">
                            <td className="px-3 py-2">{c.nombre_apellido || '-'}</td>
                            <td className="px-3 py-2">{c.titulo || '-'}</td>
                            <td className="px-3 py-2">{c.area_puesto || '-'}</td>
                            <td className="px-3 py-2">
                              {onlyDigits10(c.celular || '').length ? (
                                <a href={`tel:${onlyDigits10(c.celular || '')}`} className="text-brand-600 hover:underline">
                                  {onlyDigits10(c.celular || '')}
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-3 py-2">{c.correo || '-'}</td>
                            <td className="px-3 py-2 text-center">{i === 0 || c.is_principal ? 'Si' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Documento</p>
                  {editingCliente?.documento?.url && (
                    <a
                      href={editingCliente.documento.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-brand-600 hover:underline"
                    >
                      {editingCliente.documento.nombre_original || "Ver documento"}
                    </a>
                  )}
                  <FileInput
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0] || null;
                      if (!f) {
                        setDocumentFile(null);
                        return;
                      }
                      const allowed = ['pdf', 'xls', 'xlsx', 'doc', 'docs', 'odt', 'ods'];
                      const ext = (f.name.split('.').pop() || '').toLowerCase();
                      if (!allowed.includes(ext)) {
                        setModalError('Documento inválido. Tipos permitidos: PDF, XLS, XLSX, DOC, DOCS, ODT, ODS.');
                        (e.target as HTMLInputElement).value = '';
                        setDocumentFile(null);
                        return;
                      }
                      const max = 15 * 1024 * 1024;
                      if (f.size > max) {
                        setModalError('Documento excede 15MB.');
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
                  <div>
                    <Label>Página/portal web</Label>
                    <Input value={formData.portal_web} onChange={(e) => setFormData({ ...formData, portal_web: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Facturación</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Nombre facturación</Label>
                      <Input value={formData.nombre_facturacion} onChange={(e) => setFormData({ ...formData, nombre_facturacion: e.target.value })} />
                    </div>
                    <div>
                      <Label>Número de Facturación (RFC para México)</Label>
                      <Input value={formData.numero_facturacion} onChange={(e) => setFormData({ ...formData, numero_facturacion: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Domicilio facturación</Label>
                      <Input value={formData.domicilio_facturacion} onChange={(e) => setFormData({ ...formData, domicilio_facturacion: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dirección de envío</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Calle de envío</Label>
                      <Input value={formData.calle_envio} onChange={(e) => setFormData({ ...formData, calle_envio: e.target.value })} />
                    </div>
                    <div>
                      <Label>Número de envío</Label>
                      <Input value={formData.numero_envio} onChange={(e) => setFormData({ ...formData, numero_envio: e.target.value })} />
                    </div>
                    <div>
                      <Label>Colonia de envío</Label>
                      <Input value={formData.colonia_envio} onChange={(e) => setFormData({ ...formData, colonia_envio: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Codigo Postal de envío</Label>
                      <Input value={formData.codigo_postal_envio} onChange={(e) => setFormData({ ...formData, codigo_postal_envio: e.target.value })} />
                    </div>
                    <div>
                      <Label>Ciudad de envío</Label>
                      <Input value={formData.ciudad_envio} onChange={(e) => setFormData({ ...formData, ciudad_envio: e.target.value })} />
                    </div>
                    <div>
                      <Label>Estado de envío</Label>
                      <select
                        value={formData.estado_envio || ""}
                        onChange={(e) => setFormData({ ...formData, estado_envio: e.target.value })}
                        className={selectLikeClassName}
                      >
                        <option value="">Seleccione</option>
                        {estadosEnvioOptions.map((est) => (
                          <option key={est} value={est}>{est}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>País de envío</Label>
                      <select
                        value={formData.pais_envio || "México"}
                        onChange={(e) => {
                          const pais_envio = e.target.value;
                          const nextEstados = estadosPorPais[pais_envio] || estadosPorPais["México"] || [];
                          const nextEstadoEnvio = nextEstados.includes(formData.estado_envio) ? formData.estado_envio : "";
                          setFormData({ ...formData, pais_envio, estado_envio: nextEstadoEnvio });
                        }}
                        className={selectLikeClassName}
                      >
                        {paisOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                </svg>
                {editingCliente ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Mapa */}
      <Modal isOpen={showMapModal} onClose={() => setShowMapModal(false)} className="w-[94vw] max-w-3xl p-0 overflow-hidden">
        <div>
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
              <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {selectedLocation ? (
                  <span>Lat: {selectedLocation.lat.toFixed(6)} | Lng: {selectedLocation.lng.toFixed(6)}</span>
                ) : (
                  <span>Selecciona un punto en el mapa</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedLocation}
                  onClick={handleConfirmMap}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Usar ubicación
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      {clienteToDelete && (
        <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-[94vw] max-w-md p-0 overflow-hidden">
          <div>
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Eliminar Cliente
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ¿Estás seguro de que deseas eliminar al cliente{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {clienteToDelete.nombre}
                </span>
                ?
              </p>
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                <p className="text-xs text-red-800 dark:text-red-300">
                  <strong>Advertencia:</strong> Todos los datos asociados a este cliente serán eliminados permanentemente.
                </p>
              </div>
            </div>

            {/* Footer */}
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