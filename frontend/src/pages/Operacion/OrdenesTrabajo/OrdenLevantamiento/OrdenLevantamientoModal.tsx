import { useState, useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { apiUrl } from "@/config/api";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import LevantamientoForm from "./LevantamientoForm";
import SignaturePad from "@/components/ui/signature/SignaturePad";
import { TimeIcon } from "@/icons";
import { Cliente } from "@/types/cliente";

interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  activo?: boolean;
}

interface Usuario {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface OrdenServicioModalProps {
  open: boolean;
  onClose: () => void;
  orden: any | null;
  forceTipoOrden?: "levantamiento";
  onSaved: (savedOrden: any) => void;
  getToken: () => string | null;
  /** Nueva orden: fecha de inicio sugerida (YYYY-MM-DD). Si no se envía, se usa hoy. */
  defaultFechaInicioForNewOrden?: string;
  /** Texto del mes seleccionado en el listado (solo informativo en el formulario de levantamiento). */
  levantamientoListadoMonthLabel?: string;
}

const initialFormData = {
  folio: "",
  cliente_id: null as number | null,
  contacto_id: null as number | null,
  cliente: "",
  direccion: "",
  telefono_cliente: "",
  nombre_cliente: "",
  problematica: "",
  servicios_realizados: [] as string[],
  status: "pendiente" as "pendiente" | "resuelto",
  comentario_tecnico: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  hora_inicio: "",
  fecha_finalizacion: "",
  hora_termino: "",
  nombre_encargado: "",
  tecnico_asignado: null as number | null,
  quien_instalo: null as number | null,
  quien_entrego: null as number | null,
  firma_encargado_url: "",
  firma_cliente_url: "",
  fotos_urls: [] as string[],
};

export default function OrdenServicioModal({
  open,
  onClose,
  orden,
  forceTipoOrden,
  onSaved,
  getToken,
  defaultFechaInicioForNewOrden,
  levantamientoListadoMonthLabel,
}: OrdenServicioModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);

  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<"cliente" | "orden">("cliente");
  const tipoOrden = forceTipoOrden === "levantamiento" ? "levantamiento" : (orden?.tipo_orden || "levantamiento");
  const [clienteSearch, setClienteSearch] = useState("");
  const [tecnicoSearch, setTecnicoSearch] = useState("");
  const [quienInstaloSearch, setQuienInstaloSearch] = useState("");
  const [quienEntregoSearch, setQuienEntregoSearch] = useState("");
  const [servicioSearch, setServicioSearch] = useState("");
  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null; url: string | null }>({
    open: false,
    index: null,
    url: null,
  });
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const formScrollRef = useRef<HTMLFormElement | null>(null);
  const formNonceRef = useRef(0);
  const levantamientoSnapshotRef = useRef<{ payload: any; dibujo_url: string; cerco_materiales?: any[] } | null>(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zoomRef = useRef<number>(15);
  const mapContainerId = "leaflet-map-orden-lev-modal";

  // Cargar Leaflet e inicializar mapa al abrir modal (mismo flujo que OrdenesPage)
  useEffect(() => {
    if (!showMapModal) {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const parseCoordsFromDireccion = (): { lat: number; lng: number } | null => {
      const d = (formData.direccion || "").trim();
      const m = d.match(/q=([\-\d\.]+),([\-\d\.]+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      return null;
    };

    const ensureLeaflet = async () => {
      const w: any = window as any;
      if (w.L) return w.L;
      if (!document.getElementById("leaflet-css-lev")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-lev";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById("leaflet-js-lev")) return resolve();
        const script = document.createElement("script");
        script.id = "leaflet-js-lev";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Leaflet load error"));
        document.body.appendChild(script);
      });
      return (window as any).L;
    };

    (async () => {
      try {
        const L = await ensureLeaflet();
        const parsed = parseCoordsFromDireccion();
        const initialCenter = parsed || { lat: 19.0653, lng: -104.2831 };
        setSelectedLocation(initialCenter);
        const container = document.getElementById(mapContainerId);
        if (!container) return;
        const map = L.map(container).setView([initialCenter.lat, initialCenter.lng], zoomRef.current || 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.on("zoomend", () => {
          try {
            zoomRef.current = map.getZoom();
          } catch {
            /* ignore */
          }
        });
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
        });
        mapRef.current = map;
        markerRef.current = L.marker([initialCenter.lat, initialCenter.lng]).addTo(map);
      } catch {
        setModalAlert({
          show: true,
          variant: "error",
          title: "Error de mapa",
          message: "No se pudo cargar el mapa interactivo.",
        });
        setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 3000);
      }
    })();
  }, [showMapModal]);

  useEffect(() => {
    const L: any = (window as any).L;
    if (!mapRef.current || !selectedLocation || !L) return;
    const map = mapRef.current;
    const currentZoom = typeof zoomRef.current === "number" ? zoomRef.current : map.getZoom?.() || 15;
    map.setView([selectedLocation.lat, selectedLocation.lng], currentZoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    } else {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
    }
  }, [selectedLocation]);

  const handleCloseModal = () => {
    formNonceRef.current += 1;
    setShowMapModal(false);
    setActiveTab("cliente");
    onClose();
  };

  // Load data when modal opens
  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;

    const load = async () => {
      try {
        const [clientesRes, serviciosRes] = await Promise.all([
          fetch(apiUrl("/api/clientes/?search=&page_size=50"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/servicios/?page=1&page_size=500&ordering=idx"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        let usuariosRes = await fetch(apiUrl("/api/ordenes/tecnico-opciones/"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!usuariosRes.ok) {
          usuariosRes = await fetch(apiUrl("/api/users/accounts/"), {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        if (clientesRes.ok) {
          const data = await clientesRes.json();
          const rows = Array.isArray(data) ? data : data?.results || [];
          setClientes(rows);
        }
        if (usuariosRes.ok) {
          const data = await usuariosRes.json();
          const rows = Array.isArray(data) ? data : data?.results || [];
          setUsuarios(rows);
        }
        if (serviciosRes.ok) {
          const data = await serviciosRes.json().catch(() => null);
          const results = Array.isArray(data?.results) ? data.results : [];
          const names = (results as ServicioCatalogo[])
            .filter((s) => s?.nombre?.trim() && s.activo !== false)
            .map((s) => s.nombre.trim());
          setServiciosDisponibles(Array.from(new Set(names.length ? names : [])));
        }
      } catch (e) {
        console.error("Error loading modal data:", e);
      }
    };
    load();
  }, [open, getToken]);

  // Initialize form when orden changes or modal opens
  useEffect(() => {
    if (!open) return;
    if (orden) {
      setFormData({
        folio: (orden.folio ?? "").toString(),
        cliente_id: orden.cliente_id ?? null,
        contacto_id: null,
        cliente: orden.cliente ?? "",
        direccion: orden.direccion ?? "",
        telefono_cliente: orden.telefono_cliente ?? "",
        nombre_cliente: orden.nombre_cliente ?? "",
        nombre_encargado: orden.nombre_encargado ?? "",
        problematica: orden.problematica ?? "",
        servicios_realizados: Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [],
        comentario_tecnico: orden.comentario_tecnico ?? "",
        status: orden.status ?? "pendiente",
        fecha_inicio: orden.fecha_inicio ?? "",
        hora_inicio: orden.hora_inicio ?? "",
        fecha_finalizacion: orden.fecha_finalizacion ?? "",
        hora_termino: orden.hora_termino ?? "",
        tecnico_asignado: orden.tecnico_asignado != null ? Number(orden.tecnico_asignado) : null,
        quien_instalo: orden.quien_instalo != null ? Number(orden.quien_instalo) : null,
        quien_entrego: orden.quien_entrego != null ? Number(orden.quien_entrego) : null,
        firma_encargado_url: orden.firma_encargado_url ?? "",
        firma_cliente_url: orden.firma_cliente_url ?? "",
        fotos_urls: Array.isArray(orden.fotos_urls) ? orden.fotos_urls : [],
      });
      setClienteSearch(orden.cliente ?? "");
      const tid = orden.tecnico_asignado != null ? Number(orden.tecnico_asignado) : null;
      if (tid) {
        const u = usuarios.find((x) => x.id === tid);
        if (u) setTecnicoSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
      } else setTecnicoSearch("");
      const quienInstaloId = orden.quien_instalo != null ? Number(orden.quien_instalo) : null;
      if (quienInstaloId) {
        const u = usuarios.find((x) => x.id === quienInstaloId);
        if (u) setQuienInstaloSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
      } else setQuienInstaloSearch("");
      const quienEntregoId = orden.quien_entrego != null ? Number(orden.quien_entrego) : null;
      if (quienEntregoId) {
        const u = usuarios.find((x) => x.id === quienEntregoId);
        if (u) setQuienEntregoSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
      } else setQuienEntregoSearch("");
    } else {
      const fechaIni =
        (defaultFechaInicioForNewOrden && String(defaultFechaInicioForNewOrden).trim()) ||
        new Date().toISOString().split("T")[0];
      setFormData({ ...initialFormData, fecha_inicio: fechaIni });
      setClienteSearch("");
      setTecnicoSearch("");
      setQuienInstaloSearch("");
      setQuienEntregoSearch("");
      setServicioSearch("");
    }
  }, [open, orden?.id, defaultFechaInicioForNewOrden]);

  // Sync tecnicoSearch when usuarios load and we're editing with tecnico_asignado
  useEffect(() => {
    if (!open || !formData.tecnico_asignado || !usuarios.length) return;
    const u = usuarios.find((x) => x.id === formData.tecnico_asignado);
    if (u) setTecnicoSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
  }, [open, formData.tecnico_asignado, usuarios]);

  useEffect(() => {
    if (!open || !formData.quien_instalo || !usuarios.length) return;
    const u = usuarios.find((x) => x.id === formData.quien_instalo);
    if (u) setQuienInstaloSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
  }, [open, formData.quien_instalo, usuarios]);

  useEffect(() => {
    if (!open || !formData.quien_entrego || !usuarios.length) return;
    const u = usuarios.find((x) => x.id === formData.quien_entrego);
    if (u) setQuienEntregoSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
  }, [open, formData.quien_entrego, usuarios]);

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      const contactoPrincipal =
        (cliente.contactos || []).find((c: any) => c.is_principal) || (cliente.contactos || [])[0];
      setFormData((prev) => ({
        ...prev,
        cliente_id: cliente.id,
        contacto_id: null,
        cliente: cliente.nombre,
        direccion: cliente.direccion ?? "",
        telefono_cliente: cliente.telefono ?? "",
        nombre_cliente: String(contactoPrincipal?.nombre_apellido ?? ""),
      }));
      setClienteSearch(cliente.nombre);
    } else {
      setFormData((prev) => ({
        ...prev,
        cliente_id: null,
        contacto_id: null,
        cliente: "",
        nombre_cliente: "",
        direccion: "",
        telefono_cliente: "",
      }));
      setClienteSearch("");
    }
  };

  const selectTecnico = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData((prev) => ({ ...prev, tecnico_asignado: usuario.id }));
      setTecnicoSearch(usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email);
    } else {
      setFormData((prev) => ({ ...prev, tecnico_asignado: null }));
      setTecnicoSearch("");
    }
  };

  const selectQuienInstalo = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData((prev) => ({ ...prev, quien_instalo: usuario.id }));
      setQuienInstaloSearch(usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email);
    } else {
      setFormData((prev) => ({ ...prev, quien_instalo: null }));
      setQuienInstaloSearch("");
    }
  };

  const selectQuienEntrego = (usuario: Usuario | null) => {
    if (usuario) {
      setFormData((prev) => ({ ...prev, quien_entrego: usuario.id }));
      setQuienEntregoSearch(usuario.first_name && usuario.last_name ? `${usuario.first_name} ${usuario.last_name}` : usuario.email);
    } else {
      setFormData((prev) => ({ ...prev, quien_entrego: null }));
      setQuienEntregoSearch("");
    }
  };

  const addServicio = (servicio: string) => {
    if (!servicio.trim()) return;
    setFormData((prev) => ({ ...prev, servicios_realizados: [servicio.trim()] }));
    setServicioSearch("");
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
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
          }
          ctx?.drawImage(img, 0, 0, width, height);

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
                    reject(new Error("Error al comprimir la imagen"));
                    return;
                  }
                  const r = new FileReader();
                  r.readAsDataURL(blob);
                  r.onloadend = () => resolve(r.result as string);
                },
                "image/jpeg",
                finalQuality
              );
              return;
            }

            attempts++;
            const midQuality = (low + high) / 2;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Error al comprimir la imagen"));
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
              "image/jpeg",
              midQuality
            );
          };

          binarySearchCompress(minQuality, maxQuality);
        };
        img.onerror = () => reject(new Error("Error al cargar la imagen"));
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
    });
  };

  const onDropPhotos = async (acceptedFiles: File[]) => {
    const nonce = formNonceRef.current;
    const current = Array.isArray(formData.fotos_urls) ? formData.fotos_urls : [];
    const remainingSlots = 5 - current.length;
    if (remainingSlots <= 0) return;

    const files = acceptedFiles.slice(0, remainingSlots).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const token = getToken();
    if (!token) return;

    const uploadOne = async (file: File): Promise<string | null> => {
      try {
        const compressed = await compressImage(file, 80, 1400, 1400);
        const resp = await fetch(apiUrl("/api/ordenes/upload-image/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ data_url: compressed, folder: "ordenes/fotos" }),
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
        if (r.status === "fulfilled" && r.value) urls.push(r.value);
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
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
  });

  const getPublicIdFromUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split("/").filter(Boolean);
      const uploadIndex = pathParts.findIndex((p) => p === "upload");
      if (uploadIndex === -1) return null;
      const publicIdParts = pathParts.slice(uploadIndex + 2);
      if (!publicIdParts.length) return null;
      const last = publicIdParts[publicIdParts.length - 1];
      const dot = last.lastIndexOf(".");
      publicIdParts[publicIdParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
      return publicIdParts.join("/");
    } catch {
      return null;
    }
  };

  const handleDeletePhoto = async (index: number, url: string) => {
    const updated = (Array.isArray(formData.fotos_urls) ? formData.fotos_urls : []).filter((_, i) => i !== index);
    setDeletingPhoto(true);
    try {
      const token = getToken();
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        await fetch(apiUrl("/api/ordenes/delete-image/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ public_id: publicId }),
        });
      }
      if (orden && orden.id) {
        const response = await fetch(apiUrl(`/api/ordenes/${orden.id}/update-photos/`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fotos_urls: updated }),
        });
        if (response.ok) {
          const updatedOrden = await response.json().catch(() => null);
          if (updatedOrden) {
            setFormData((prev) => ({ ...prev, fotos_urls: Array.isArray(updatedOrden.fotos_urls) ? updatedOrden.fotos_urls : updated }));
          } else {
            setFormData((prev) => ({ ...prev, fotos_urls: updated }));
          }
        } else {
          setFormData((prev) => ({ ...prev, fotos_urls: updated }));
        }
      } else {
        setFormData((prev) => ({ ...prev, fotos_urls: updated }));
      }
    } catch {
      setFormData((prev) => ({ ...prev, fotos_urls: updated }));
    } finally {
      setConfirmDelete({ open: false, index: null, url: null });
      setDeletingPhoto(false);
    }
  };

  const clienteActions = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    const base = (clientes || [])
      .flatMap((c) => {
        const contactos = Array.isArray((c as any).contactos) ? (c as any).contactos : [];
        if (!contactos.length) {
          const labelBase = (c.nombre || "-").toString();
          return [
            {
              id: String(c.id),
              label: labelBase,
              icon: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">{(labelBase || "?").slice(0, 1).toUpperCase()}</span>,
              description: c.telefono || "-",
              short: "",
              end: "",
              __cliente: c,
              __contacto: null,
            },
          ];
        }
        return contactos.map((ct: any, idx: number) => {
          const labelBase = (c.nombre || "-").toString();
          const contactoNombre = String(ct?.nombre_apellido ?? "").trim();
          const label = contactoNombre ? `${labelBase} - ${contactoNombre}` : labelBase;
          return {
            id: `${c.id}::${ct?.id ?? idx}`,
            label,
            icon: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">{(labelBase || "?").slice(0, 1).toUpperCase()}</span>,
            description: String(ct?.celular || c.telefono || "").trim() || "-",
            short: "",
            end: "",
            __cliente: c,
            __contacto: ct,
          };
        });
      })
      .filter((a: any) => {
        if (!q) return true;
        const label = String(a?.label ?? "").toLowerCase();
        const desc = String(a?.description ?? "").toLowerCase();
        return label.includes(q) || desc.includes(q);
      });
    return base;
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
          icon: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold">{nombre.slice(0, 1).toUpperCase()}</span>,
          description: u.email,
          short: "",
          end: "",
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
        icon: <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        description: "Servicio disponible",
        short: "",
        end: "",
      }));
    if (q !== "" && !serviciosDisponibles.some((s) => s.toLowerCase() === q)) {
      return [
        {
          id: "__new__",
          label: `Crear "${servicioSearch.trim()}"`,
          icon: <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14M4 12h16" /></svg>,
          description: "Nuevo servicio",
          short: "",
          end: "",
        },
        ...base,
      ];
    }
    return base;
  }, [serviciosDisponibles, servicioSearch, formData.servicios_realizados]);

  const validate = () => {
    const missing: string[] = [];
    if (!formData.cliente_id && !(formData.cliente && formData.cliente.trim())) missing.push("Cliente");
    if (!(formData.direccion && formData.direccion.trim()) && !(formData.telefono_cliente && formData.telefono_cliente.trim()))
      missing.push("Dirección o Teléfono");
    if (!Array.isArray(formData.servicios_realizados) || formData.servicios_realizados.length === 0) missing.push("Servicios realizados");
    if (!(formData.fecha_inicio && formData.fecha_inicio.trim())) missing.push("Fecha de inicio");
    return { ok: missing.length === 0, missing };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const token = getToken();
    if (!token) return;

    const { ok, missing } = validate();
    if (!ok) {
      setModalAlert({
        show: true,
        variant: "warning",
        title: "Campos requeridos",
        message: `Faltan: ${missing.join(", ")}`,
      });
      setTimeout(() => setModalAlert((prev) => ({ ...prev, show: false })), 3500);
      return;
    }

    try {
      setIsSaving(true);
      const url = orden?.id ? apiUrl(`/api/ordenes/${orden.id}/`) : apiUrl("/api/ordenes/");
      const method = orden?.id ? "PUT" : "POST";

      const payload: any = { ...formData };
      delete payload.firma_encargado_url;
      delete payload.contacto_id;
      if (payload.tecnico_asignado == null) delete payload.tecnico_asignado;
      if (payload.quien_instalo == null) delete payload.quien_instalo;
      if (payload.quien_entrego == null) delete payload.quien_entrego;

      const toNullIfEmpty = (v: any) => (typeof v === "string" && v.trim() === "" ? null : v);
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
      if (!Array.isArray(payload.servicios_realizados)) payload.servicios_realizados = [];

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = "Error al guardar la orden";
        try {
          const err = await response.json().catch(() => null);
          errorMsg = (err?.detail || JSON.stringify(err)) || errorMsg;
        } catch {
          errorMsg = await response.text().catch(() => errorMsg);
        }
        setModalAlert({ show: true, variant: "error", title: "Error al guardar", message: errorMsg });
        setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 5000);
        return;
      }

      const savedOrden = await response.json();
      const cid = payload?.cliente_id;

      if (cid && (payload?.direccion || payload?.telefono_cliente)) {
        const existingCliente = clientes.find((c) => c.id === cid);
        const updates: any = {};
        const hasDir = !!existingCliente?.direccion && String(existingCliente.direccion).trim() !== "";
        const hasTel = !!existingCliente?.telefono && String(existingCliente.telefono).trim() !== "";
        if (!hasDir && payload?.direccion) updates.direccion = String(payload.direccion);
        if (!hasTel && payload?.telefono_cliente) updates.telefono = String(payload.telefono_cliente);
        if (Object.keys(updates).length > 0) {
          await fetch(apiUrl(`/api/clientes/${cid}/`), {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }).catch(() => null);
        }
      }

      if (cid && (payload?.nombre_cliente || payload?.telefono_cliente)) {
        const existingCliente = clientes.find((c) => c.id === cid);
        const contactos = Array.isArray((existingCliente as any)?.contactos) ? (existingCliente as any).contactos : [];
        const nombre = String(payload?.nombre_cliente ?? "").trim();
        const celular = String(payload?.telefono_cliente ?? "").trim();
        const contactoIdToUpdate = formData.contacto_id != null ? Number(formData.contacto_id) : null;
        let contactUpdated = false;
        if (contactoIdToUpdate != null && (nombre || celular)) {
          const body: any = {};
          if (nombre) body.nombre_apellido = nombre;
          if (celular) body.celular = celular;
          if (Object.keys(body).length > 0) {
            const res = await fetch(apiUrl(`/api/cliente-contactos/${contactoIdToUpdate}/`), {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }).catch(() => null);
            if (res?.ok) contactUpdated = true;
          }
        }
        if (!contactUpdated) {
          const target = contactos.find((c: any) => c?.is_principal) || contactos[0];
          if (target?.id && (nombre || celular)) {
            const body: any = {};
            if (nombre) body.nombre_apellido = nombre;
            if (celular) body.celular = celular;
            if (Object.keys(body).length > 0) {
              await fetch(apiUrl(`/api/cliente-contactos/${target.id}/`), {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }).catch(() => null);
            }
          } else if (nombre || celular) {
            await fetch(apiUrl("/api/cliente-contactos/"), {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                cliente: cid,
                nombre_apellido: nombre || (existingCliente?.nombre || ""),
                titulo: "",
                area_puesto: "",
                celular: celular || (existingCliente?.telefono || ""),
                correo: "",
                is_principal: true,
              }),
            }).catch(() => null);
          }
        }
      }

      if (tipoOrden === "levantamiento" && savedOrden?.id && levantamientoSnapshotRef.current) {
        const snap = levantamientoSnapshotRef.current;
        await fetch(apiUrl(`/api/ordenes/${savedOrden.id}/levantamiento/`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ payload: snap.payload || {}, dibujo_url: snap.dibujo_url || "" }),
        }).catch(() => null);

        try {
          const payloadTipo = String(snap.payload?.tipo || '').toLowerCase();
          const cercoItems = Array.isArray((snap as any).cerco_materiales) ? (snap as any).cerco_materiales : [];
          if (payloadTipo === 'cerco' && cercoItems.length > 0) {
            const todayIso = new Date().toISOString().slice(0, 10);
            const cid = (savedOrden as any).cliente_id ?? null;
            const clienteNombre = String((savedOrden as any).cliente || '').trim();
            const contactoNombre = String((savedOrden as any).nombre_cliente || '').trim();

            const toFiniteNumber = (v: unknown, fallback = 0) => {
              const n = typeof v === "number" ? v : Number(v);
              return Number.isFinite(n) ? n : fallback;
            };
            const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

            const subtotal = round2(
              cercoItems.reduce((acc: number, it: any) => {
                const qty = toFiniteNumber(it.cantidad, 0);
                const price = toFiniteNumber(it.precio_lista, 0);
                return acc + qty * price;
              }, 0)
            );
            const ivaPct = 16;
            const iva = round2(subtotal * (ivaPct / 100));
            const total = round2(subtotal + iva);

            const sanitizeThumbnailUrl = (raw: unknown): string => {
              const s = typeof raw === "string" ? raw.trim() : "";
              if (!s) return "";
              // Django URLField rechaza URLs con espacios, así que las normalizamos.
              const candidate = s.replace(/\s+/g, "%20");
              try {
                const u = new URL(candidate);
                const proto = u.protocol.toLowerCase();
                if (proto === "http:" || proto === "https:") return u.href;
                return "";
              } catch {
                return "";
              }
            };

            const cotPayload: any = {
              cliente_id: cid != null ? Number(cid) : null,
              cliente: clienteNombre,
              prospecto: !cid,
              contacto: contactoNombre,
              // DRF valida `choices` del campo; si no tenemos info, mandamos un valor válido.
              medio_contacto: 'OTRO',
              status: 'PENDIENTE',
              fecha: todayIso,
              subtotal,
              descuento_cliente_pct: 0,
              iva_pct: ivaPct,
              iva,
              total,
              texto_arriba_precios: 'A continuación cotización solicitada:',
              terminos: '',
              items: cercoItems.map((it: any, index: number) => ({
                producto_externo_id: String(it.producto_externo_id || ''),
                producto_nombre: String(it.producto_nombre || ''),
                producto_descripcion: String(it.producto_descripcion || ''),
                unidad: String(it.unidad || ''),
                thumbnail_url: sanitizeThumbnailUrl(it.thumbnail_url),
                cantidad: round2(toFiniteNumber(it.cantidad, 0)),
                precio_lista: round2(toFiniteNumber(it.precio_lista, 0)),
                descuento_pct: round2(toFiniteNumber(it.descuento_pct, 0)),
                orden: index,
              })),
            };

            const cotRes = await fetch(apiUrl('/api/cotizaciones/'), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(cotPayload),
            }).catch(() => null as any);

            if (cotRes && cotRes.ok) {
              // Para que la UI de `CotizacionesPage` se refresque al crear desde otro módulo.
              window.dispatchEvent(new Event('cotizaciones:updated'));
            }

            if (cotRes && !cotRes.ok) {
              let details = "";
              try {
                const err = await cotRes.json();
                details = err?.detail || JSON.stringify(err);
              } catch {
                details = await cotRes.text().catch(() => "");
              }
              console.error("Error creando cotización desde levantamiento:", details, cotPayload);
              setModalAlert({
                show: true,
                variant: "warning",
                title: "Orden guardada",
                message: details
                  ? `La orden se guardó, pero la cotización no se pudo crear. Detalle: ${details}`
                  : "La orden se guardó, pero la cotización no se pudo crear.",
              });
              window.setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 6000);
            }
          }
        } catch (e) {
          // No bloquear el guardado de la orden si falla la cotización
          console.error('Error creando cotización desde levantamiento:', e);
        }
      }

      onSaved(savedOrden);
      onClose();
    } catch (err) {
      console.error("Error saving order:", err);
      setModalAlert({
        show: true,
        variant: "error",
        title: "Error",
        message: String(err),
      });
      setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const title = orden?.id ? "Editar Orden de Levantamiento" : "Nueva Orden de Levantamiento";

  return (
    <>
    <Modal
      isOpen={open}
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
                {title}
              </h5>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Captura y revisa los datos del levantamiento antes de guardar
              </p>
            </div>
          </div>
        </div>

        <form
          ref={formScrollRef}
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
          {modalAlert.show && (
            <div className="mb-4">
              <Alert variant={modalAlert.variant} title={modalAlert.title} message={modalAlert.message} showLink={false} />
            </div>
          )}

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
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <ActionSearchBar
                        actions={clienteActions as any}
                        showAllActions={true}
                        defaultOpen={false}
                        label="Cliente"
                        placeholder="Buscar cliente..."
                        value={clienteSearch || formData.cliente || ""}
                        onQueryChange={(q: string) => setClienteSearch(q)}
                        onSelectAction={(action: any) => {
                          const rawId = String(action?.id ?? "");
                          const clienteIdStr = rawId.includes("::") ? rawId.split("::")[0] : rawId;
                          const id = Number(clienteIdStr);
                          const c = clientes.find((x) => Number(x.id) === id);
                          if (!c) return;
                          const contacto = action?.__contacto;
                          if (contacto) {
                            setFormData((prev) => ({
                              ...prev,
                              cliente_id: c.id,
                              contacto_id: contacto?.id != null ? Number(contacto.id) : null,
                              cliente: c.nombre,
                              direccion: c.direccion ?? "",
                              telefono_cliente: String(contacto?.celular || c.telefono || ""),
                              nombre_cliente: String(contacto?.nombre_apellido ?? ""),
                            }));
                            setClienteSearch(String(action?.label || c.nombre || ""));
                          } else {
                            selectCliente(c);
                          }
                        }}
                      />
                    </div>
                    {(formData.cliente_id || formData.cliente) && (
                      <button type="button" onClick={() => selectCliente(null)} aria-label="Limpiar cliente" className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 mt-[20px]">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" /><path d="M18 11l-4.3-4.3" /></svg>
                      </button>
                    )}
                  </div>
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
                          actions={quienInstaloActions as any}
                          defaultOpen={false}
                          label="Técnico Asignado"
                          placeholder="Buscar técnico..."
                          value={
                            tecnicoSearch ||
                            (formData.tecnico_asignado
                              ? (() => {
                                const tecnicoId = Number(formData.tecnico_asignado);
                                const u = usuarios.find((u) => u.id === tecnicoId);
                                return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : "";
                              })()
                              : "")
                          }
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
                          actions={quienEntregoActions as any}
                          defaultOpen={false}
                          label="¿Quien instaló?"
                          placeholder="Buscar técnico..."
                          value={quienInstaloSearch || (formData.quien_instalo ? (() => {
                            const tecnicoId = Number(formData.quien_instalo);
                            const u = usuarios.find((u) => u.id === tecnicoId);
                            return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : "";
                          })() : "")}
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
                          actions={tecnicoActions as any}
                          defaultOpen={false}
                          label="¿Quien entregó?"
                          placeholder="Buscar técnico..."
                          value={quienEntregoSearch || (formData.quien_entrego ? (() => {
                            const tecnicoId = Number(formData.quien_entrego);
                            const u = usuarios.find((u) => u.id === tecnicoId);
                            return u ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email) : "";
                          })() : "")}
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

              {/* SECCIÓN: Detalles del Cliente (dirección y teléfono) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Detalles del Cliente</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  {/* Dirección con botones (igual que OrdenesPage) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Dirección</label>
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                            if (direccion.includes("google.com/maps") || direccion.includes("maps.app.goo.gl")) {
                              window.open(direccion, "_blank");
                              return;
                            }
                            const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                            if (coordMatch) {
                              const lat = coordMatch[1];
                              const lng = coordMatch[2];
                              window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                              return;
                            }
                            const query = encodeURIComponent(direccion);
                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
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
                    <Label>Teléfono</Label>
                    <Input
                      type="tel"
                      value={formData.telefono_cliente}
                      onChange={(e) => setFormData({ ...formData, telefono_cliente: e.target.value.replace(/\D/g, "") })}
                      placeholder="Teléfono"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: Tiempos de la orden */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tiempos de la orden</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  {/* Fechas de Inicio (igual que OrdenesPage) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <DatePicker
                        id="modal-fecha-inicio"
                        label="Fecha Inicio"
                        placeholder="Seleccionar fecha"
                        defaultDate={formData.fecha_inicio || undefined}
                        onChange={(_dates, currentDateString) => {
                          setFormData({ ...formData, fecha_inicio: currentDateString || "" });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="modal-hora-inicio">Hora Inicio</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          id="modal-hora-inicio"
                          name="modal-hora-inicio"
                          value={formData.hora_inicio}
                          onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                        />
                        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                          <TimeIcon className="size-6" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fechas de Finalización (igual que OrdenesPage) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <DatePicker
                        id="modal-fecha-finalizacion"
                        label="Fecha Finalización"
                        placeholder="Seleccionar fecha"
                        defaultDate={formData.fecha_finalizacion || undefined}
                        onChange={(_dates, currentDateString) => {
                          setFormData({ ...formData, fecha_finalizacion: currentDateString || "" });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="modal-hora-termino">Hora Término</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          id="modal-hora-termino"
                          name="modal-hora-termino"
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

              {/* SECCIÓN: Descripción de la Orden */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Descripción de la Orden</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  <div>
                    <Label>Problemática</Label>
                    <textarea
                      value={formData.problematica}
                      onChange={(e) => setFormData({ ...formData, problematica: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2"
                      placeholder="Describe el problema"
                    />
                  </div>
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
                          if (action?.id === "__new__") {
                            const nuevo = servicioSearch.trim();
                            if (nuevo && !serviciosDisponibles.includes(nuevo)) setServiciosDisponibles([...serviciosDisponibles, nuevo]);
                            addServicio(nuevo);
                          } else {
                            addServicio(action.id);
                          }
                        }}
                      />
                    </div>
                  </div>
                  {formData.servicios_realizados.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.servicios_realizados.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-md text-xs"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                servicios_realizados: formData.servicios_realizados.filter((_, idx) => idx !== i),
                              })
                            }
                            className="hover:text-brand-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div>
                    <Label>Estado del Problema</Label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as "pendiente" | "resuelto" })
                      }
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>
                  <div>
                    <Label>Comentario del Técnico</Label>
                    <textarea
                      value={formData.comentario_tecnico}
                      onChange={(e) => setFormData({ ...formData, comentario_tecnico: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2"
                      placeholder="Observaciones..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: Firmas y Archivos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Firmas y Archivos</h4>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                  {/* Firmas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SignaturePad
                    label="Firma del Encargado"
                    value={formData.firma_encargado_url}
                    disabled={true}
                    onChange={() => {}}
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
                      id="fotos-upload-levantamiento"
                      role="button"
                      tabIndex={0}
                    >
                      {/* Input oculto */}
                      <input {...getInputProps()} />

                      <div className="dz-message flex flex-col items-center m-0!">
                        {/* Contenedor del icono */}
                        <div className="mb-3 flex justify-center">
                          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                            <svg className="fill-current" width="22" height="22" viewBox="0 0 29 28" xmlns="http://www.w3.org/2000/svg">
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
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ open: true, index, url: preview })}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-error-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-700"
                            title="Eliminar imagen"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
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
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          )}
                        </div>
                        <h5 className="mt-4 font-semibold text-gray-800 text-theme-lg dark:text-white/90">
                          {deletingPhoto ? "Eliminando imagen…" : "Confirmar eliminación"}
                        </h5>
                        <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {deletingPhoto
                            ? "Por favor espera; esto puede tardar unos segundos."
                            : "Esta acción no se puede deshacer. ¿Eliminar la imagen seleccionada?"}
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
                          {deletingPhoto ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  </Modal>
                </div>
              </div>
            </>
          )}

          {activeTab === "orden" && (
            <>
              {tipoOrden === "levantamiento" && (
                <div className="mt-4">
                  <LevantamientoForm
                    ordenId={orden?.id ?? null}
                    listadoMesEtiqueta={!orden ? levantamientoListadoMonthLabel : undefined}
                    onSnapshot={(snapshot) => {
                      levantamientoSnapshotRef.current = snapshot;
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Footer Buttons (igual que OrdenesPage) */}
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
            {activeTab === "cliente" ? (
              <button
                key="cliente-next"
                type="button"
                disabled={isSaving}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab("orden");
                  requestAnimationFrame(() => {
                    formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
                {isSaving ? "Guardando..." : orden?.id ? "Actualizar" : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>

      {/* Modal Mapa Interactivo (igual que OrdenesPage; id de contenedor único) */}
      <Modal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        closeOnBackdropClick={false}
        className="w-[96vw] sm:w-[90vw] md:w-[80vw] max-w-3xl mx-0 sm:mx-auto"
      >
        <div className="p-0 overflow-hidden max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div id={mapContainerId} className="absolute inset-0" />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  O ingresa las coordenadas manualmente
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Latitud (ej: 19.0653)"
                      value={selectedLocation?.lat ?? ""}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        if (!isNaN(lat)) {
                          setSelectedLocation({
                            lat,
                            lng: selectedLocation?.lng ?? -104.2831,
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
                      value={selectedLocation?.lng ?? ""}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        if (!isNaN(lng)) {
                          setSelectedLocation({
                            lat: selectedLocation?.lat ?? 19.0653,
                            lng,
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
                  setModalAlert({
                    show: true,
                    variant: "warning",
                    title: "Geolocalización no disponible",
                    message: "Tu navegador no soporta geolocalización.",
                  });
                  setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 2500);
                  return;
                }
                if (!window.isSecureContext) {
                  setModalAlert({
                    show: true,
                    variant: "warning",
                    title: "Se requiere conexión segura",
                    message:
                      "La geolocalización requiere HTTPS (o localhost). Abre el sistema con HTTPS o en localhost e inténtalo de nuevo.",
                  });
                  setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 3200);
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
                    setModalAlert({
                      show: true,
                      variant: "warning",
                      title: "No se pudo obtener ubicación",
                      message: "Activa permisos de ubicación e inténtalo de nuevo.",
                    });
                    setTimeout(() => setModalAlert((p) => ({ ...p, show: false })), 2500);
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
                setFormData((prev) => ({ ...prev, direccion: url }));
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
    </>
  );
}