import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import { apiUrl } from "@/config/api";
import { formatApiErrors } from "@/utils/apiUtils";
import { Cliente, ClienteContacto } from "@/types/cliente";
import {
    estadosPorPais,
    formatPhoneE164,
    onlyDigits10,
    paisOptions,
    parsePhoneToForm,
    phoneCountryOptions,
} from "@/pages/ContactosNegocio/Clientes/clientesCatalogos";

interface ClienteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cliente: Cliente) => void;
    editingCliente?: Cliente | null;
    permissions?: any;
}

const inputLikeClassName =
    "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

const selectLikeClassName =
    "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";

export const ClienteFormModal: React.FC<ClienteFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingCliente,
    permissions,
}) => {
    const [formData, setFormData] = useState<any>({
        nombre: "",
        telefono_pais: "MX",
        telefono: "",
        direccion: "",
        correo: "",
        calle: "",
        numero_exterior: "",
        interior: "",
        colonia: "",
        codigo_postal: "",
        ciudad: "",
        pais: "México",
        estado: "",
        localidad: "",
        municipio: "",
        rfc: "",
        curp: "",
        aplica_retenciones: false,
        desglosar_ieps: false,
        numero_precio: "1",
        limite_credito: "",
        dias_credito: "",
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
        tipo: "EMPRESA",
        is_prospecto: false,
    });

    const [contactos, setContactos] = useState<ClienteContacto[]>([
        { nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" },
    ]);
    const [deletedContactIds, setDeletedContactIds] = useState<number[]>([]);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'more'>('general');
    const [modalError, setModalError] = useState("");
    const [saving, setSaving] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const zoomRef = useRef<number>(15);
    const mapContainerId = "clientes-modal-leaflet-map";

    const canClientesCreate = !!permissions?.clientes?.create;

    useEffect(() => {
        if (isOpen && editingCliente) {
            const parsed = parsePhoneToForm(editingCliente.telefono);
            setFormData({
                ...editingCliente,
                telefono_pais: parsed.phoneCountry,
                telefono: parsed.phoneNational,
                descuento_pct: editingCliente.descuento_pct ?? null,
                limite_credito: editingCliente.limite_credito ?? "",
                dias_credito: editingCliente.dias_credito ?? "",
                numero_precio: editingCliente.numero_precio || "1",
                is_prospecto: editingCliente.is_prospecto || false,
            });
            setContactos(
                editingCliente.contactos && editingCliente.contactos.length
                    ? editingCliente.contactos
                    : [{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]
            );
            setDeletedContactIds([]);
            setDocumentFile(null);
            setActiveTab('general');
            setModalError("");
        } else if (isOpen) {
            setFormData({
                nombre: "",
                telefono_pais: "MX",
                telefono: "",
                direccion: "",
                correo: "",
                calle: "",
                numero_exterior: "",
                interior: "",
                colonia: "",
                codigo_postal: "",
                ciudad: "",
                pais: "México",
                estado: "",
                localidad: "",
                municipio: "",
                rfc: "",
                curp: "",
                aplica_retenciones: false,
                desglosar_ieps: false,
                numero_precio: "1",
                limite_credito: "",
                dias_credito: "",
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
                tipo: "EMPRESA",
                is_prospecto: false,
            });
            setContactos([{ nombre_apellido: "", titulo: "", area_puesto: "", celular: "", correo: "" }]);
            setDeletedContactIds([]);
            setDocumentFile(null);
            setActiveTab('general');
            setModalError("");
        }
    }, [isOpen, editingCliente]);

    // MAP LOGIC
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
            } catch (err) {
                console.error("Map error:", err);
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

    const handleConfirmMap = () => {
        if (selectedLocation) {
            setFormData({
                ...formData,
                direccion: `https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`
            });
            setShowMapModal(false);
        }
    };

    const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError("");

        if (!editingCliente && !canClientesCreate && permissions) {
            // Only check if permissions object is provided
        }

        // Validación de campos requeridos
        const missingFields: string[] = [];
        if (!formData.nombre?.trim()) missingFields.push(formData.tipo === 'PERSONA_FISICA' ? 'Persona Física' : formData.tipo === 'PROVEEDOR' ? 'Proveedor' : 'Empresa');
        if (!formData.telefono?.trim() || !onlyDigits10(formData.telefono)) missingFields.push('Teléfono (10 dígitos)');

        const primerContacto = contactos[0];
        if (!primerContacto?.nombre_apellido?.trim()) missingFields.push('Nombre y apellido del contacto');
        if (!primerContacto?.celular?.trim() || !onlyDigits10(primerContacto.celular)) missingFields.push('Celular del contacto (10 dígitos)');

        if (missingFields.length > 0) {
            setModalError(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
            return;
        }

        setSaving(true);
        const token = getToken();
        const url = editingCliente ? apiUrl(`/api/clientes/${editingCliente.id}/`) : apiUrl('/api/clientes/');
        const method = editingCliente ? 'PUT' : 'POST';

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
                    limite_credito: formData.limite_credito === "" ? 0 : formData.limite_credito,
                    dias_credito: formData.dias_credito === "" ? 0 : formData.dias_credito,
                })
            });

            if (!response.ok) {
                const txt = await response.text().catch(() => '');
                setModalError(formatApiErrors(txt) || 'No se pudo guardar el cliente.');
                setSaving(false);
                return;
            }

            const saved = await response.json().catch(() => null);
            const clienteId = saved?.id || editingCliente?.id;

            if (!clienteId) {
                setModalError('No se pudo obtener el ID del cliente guardado.');
                setSaving(false);
                return;
            }

            // Handle Contacts
            for (const id of deletedContactIds) {
                await fetch(apiUrl(`/api/cliente-contactos/${id}/`), {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => null);
            }

            for (const c of contactos) {
                if (!c.nombre_apellido.trim()) continue;
                const payload = {
                    cliente: clienteId,
                    nombre_apellido: (c.nombre_apellido || '').trim(),
                    titulo: c.titulo || '',
                    area_puesto: c.area_puesto || '',
                    celular: c.celular ? onlyDigits10(c.celular) : '',
                    correo: c.correo || '',
                    is_principal: contactos.indexOf(c) === 0,
                };
                if (c.id) {
                    await fetch(apiUrl(`/api/cliente-contactos/${c.id}/`), {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    }).catch(() => null);
                } else {
                    await fetch(apiUrl('/api/cliente-contactos/'), {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    }).catch(() => null);
                }
            }

            // Handle Document
            if (documentFile) {
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
                    setSaving(false);
                    return;
                }
            }

            onSuccess(saved);
            onClose();
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            setModalError(String(error));
        } finally {
            setSaving(false);
        }
    };

    const estadosOptions = estadosPorPais[formData.pais] || estadosPorPais["México"] || [];
    const estadosEnvioOptions = estadosPorPais[formData.pais_envio] || estadosPorPais["México"] || [];

    const isGoogleMapsUrl = (value: string | null | undefined) => {
        if (!value) return false;
        const s = String(value).trim();
        if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
        return s.includes('google.com/maps') || s.includes('maps.app.goo.gl');
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-4xl p-0 overflow-hidden">
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
                                    <div className="md:col-span-2">
                                        <Label>Prospecto</Label>
                                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!formData.is_prospecto}
                                                onChange={(e) => setFormData({ ...formData, is_prospecto: e.target.checked })}
                                                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700"
                                            />
                                            Es prospecto
                                        </label>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label>Tipo de Identificador</Label>
                                        <select
                                            value={formData.tipo || "EMPRESA"}
                                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                            className={selectLikeClassName}
                                        >
                                            <option value="EMPRESA">Empresa</option>
                                            <option value="PERSONA_FISICA">Persona Física</option>
                                            <option value="PROVEEDOR">Proveedor</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <Label>
                                            {formData.tipo === 'PERSONA_FISICA'
                                                ? 'Persona Física *'
                                                : formData.tipo === 'PROVEEDOR'
                                                    ? 'Proveedor *'
                                                    : 'Empresa *'}
                                        </Label>
                                        <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Correo</Label>
                                        <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
                                    </div>
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
                                            className={inputLikeClassName}
                                            placeholder="Teléfono del cliente"
                                            maxLength={10}
                                        />
                                        <a
                                            href={onlyDigits10(formData.telefono || '') ? `tel:${onlyDigits10(formData.telefono || '')}` : undefined}
                                            onClick={(e) => {
                                                if (!onlyDigits10(formData.telefono || '')) e.preventDefault();
                                            }}
                                            className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors ${!onlyDigits10(formData.telefono || '') ? 'opacity-50 pointer-events-none' : ''}`}
                                            title="Llamar"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>RFC</Label>
                                        <Input value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} placeholder="RFC del cliente" />
                                    </div>
                                    <div>
                                        <Label>CURP</Label>
                                        <Input value={formData.curp} onChange={(e) => setFormData({ ...formData, curp: e.target.value })} placeholder="CURP del cliente" />
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
                                        <Label>Ciudad</Label>
                                        <Input value={formData.ciudad} onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Municipio *</Label>
                                        <Input value={formData.municipio} onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Localidad</Label>
                                        <Input value={formData.localidad} onChange={(e) => setFormData({ ...formData, localidad: e.target.value })} />
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
                                            {estadosOptions.map((est: string) => (
                                                <option key={est} value={est}>{est}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <Label>Dirección</Label>
                                        <button
                                            type="button"
                                            onClick={() => setShowMapModal(true)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
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
                                                    const d = String(formData.direccion || '').trim();
                                                    if (isGoogleMapsUrl(d)) { window.open(d, '_blank'); return; }
                                                    const m = d.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                                                    if (m) { window.open(`https://www.google.com/maps?q=${m[1]},${m[2]}`, '_blank'); return; }
                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`, '_blank');
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
                                    <Label>Comentarios</Label>
                                    <textarea
                                        rows={4}
                                        value={formData.notas}
                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 shadow-theme-xs outline-none resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Descuento %</Label>
                                        <Input
                                            type="number"
                                            value={formData.descuento_pct ?? ""}
                                            onChange={(e: any) => {
                                                const v = e.target.value;
                                                setFormData({ ...formData, descuento_pct: v === "" ? null : Number(v) });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Configuración Fiscal y Crédito</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <Label>Lista de clientes</Label>
                                        <select
                                            value={formData.numero_precio || "1"}
                                            onChange={(e) => setFormData({ ...formData, numero_precio: e.target.value })}
                                            className={selectLikeClassName}
                                        >
                                            <option value="1">Precio 1</option>
                                            <option value="2">Precio 2</option>
                                            <option value="3">Precio 3</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Límite de Crédito</Label>
                                        <Input
                                            type="number"
                                            value={formData.limite_credito}
                                            onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Días de Crédito</Label>
                                        <Input
                                            type="number"
                                            value={formData.dias_credito}
                                            onChange={(e) => setFormData({ ...formData, dias_credito: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/5">
                                    <div>
                                        <Label>APLICA RETENCIONES (S/N)</Label>
                                        <Input
                                            value={formData.aplica_retenciones ? "S" : "N"}
                                            onChange={(e) => setFormData({ ...formData, aplica_retenciones: e.target.value.toUpperCase() === "S" })}
                                        />
                                    </div>
                                    <div>
                                        <Label>DESGLOSAR IEPS (S/N)</Label>
                                        <Input
                                            value={formData.desglosar_ieps ? "S" : "N"}
                                            onChange={(e) => setFormData({ ...formData, desglosar_ieps: e.target.value.toUpperCase() === "S" })}
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
                                                            className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs outline-none text-gray-800 dark:text-gray-200 focus:border-brand-500 dark:focus:border-brand-400"
                                                            placeholder="Celular"
                                                            maxLength={10}
                                                        />
                                                        <a
                                                            href={onlyDigits10(c.celular || '') ? `tel:${onlyDigits10(c.celular || '')}` : undefined}
                                                            onClick={(e) => {
                                                                if (!onlyDigits10(c.celular || '')) e.preventDefault();
                                                            }}
                                                            className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors ${!onlyDigits10(c.celular || '') ? 'opacity-50 pointer-events-none' : ''}`}
                                                            title="Llamar"
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

                                {/* Resumen de Contactos */}
                                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/20 shadow-theme-xs">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left font-medium">Nombre</th>
                                                <th className="px-3 py-2.5 text-left font-medium">Área</th>
                                                <th className="px-3 py-2.5 text-left font-medium">Celular</th>
                                                <th className="px-3 py-2.5 text-left font-medium">Correo</th>
                                                <th className="px-3 py-2.5 text-center font-medium">Principal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                                            {contactos.map((c, i) => (
                                                <tr key={`sum-${c.id ?? i}`} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-3 py-2">{c.nombre_apellido || '-'}</td>
                                                    <td className="px-3 py-2">{c.area_puesto || '-'}</td>
                                                    <td className="px-3 py-2">
                                                        {c.celular ? (
                                                            <a href={`tel:${c.celular}`} className="text-brand-600 dark:text-brand-400 hover:underline">{c.celular}</a>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2">{c.correo || '-'}</td>
                                                    <td className="px-3 py-2 text-center text-[10px] font-bold">
                                                        {i === 0 ? (
                                                            <span className="text-brand-600 dark:text-brand-400">SI</span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-600">NO</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                                            {estadosEnvioOptions.map((est: string) => (
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
                                            setModalError('Formato no permitido. Tipos: PDF, XLS, XLSX, DOC, DOCS, ODT, ODS.');
                                            (e.target as HTMLInputElement).value = '';
                                            setDocumentFile(null);
                                            return;
                                        }
                                        if (f.size > 15 * 1024 * 1024) {
                                            setModalError('El documento excede 15MB.');
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

                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1 border-t border-gray-100 dark:border-white/10 mt-4 px-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                            </svg>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M5 12l4 4L19 6" strokeLinecap="round" />
                            </svg>
                            {saving ? "Guardando..." : (editingCliente ? "Actualizar" : "Guardar")}
                        </button>
                    </div>
                </form>

                {/* Sub-Modal Mapa */}
                <Modal
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    className="w-[94vw] max-w-3xl p-0 overflow-hidden"
                >
                    <div className="bg-white dark:bg-gray-900">
                        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden shadow-theme-xs">
                                <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {selectedLocation ? (
                                        <a
                                            href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                            </svg>
                                            <span>{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</span>
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <span>Selecciona un punto en el mapa</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowMapModal(false)}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedLocation}
                                        onClick={handleConfirmMap}
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-lg text-[12px] font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                                    >
                                        Usar ubicación
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </Modal>
    );
};
