import { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { apiUrl } from "@/config/api";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import LevantamientoForm from "../OrdenLevantamiento/LevantamientoForm";
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
}: OrdenServicioModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);

  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<"cliente" | "orden">("cliente");
  const tipoOrden = forceTipoOrden === "levantamiento" ? "levantamiento" : (orden?.tipo_orden || "levantamiento");
  const [clienteSearch, setClienteSearch] = useState("");
  const [tecnicoSearch, setTecnicoSearch] = useState("");
  const [servicioSearch, setServicioSearch] = useState("");
  const [modalAlert, setModalAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const levantamientoSnapshotRef = useRef<{ payload: any; dibujo_url: string } | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;

    const load = async () => {
      try {
        const [clientesRes, usuariosRes, serviciosRes] = await Promise.all([
          fetch(apiUrl("/api/clientes/?search=&page_size=50"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/users/accounts/"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiUrl("/api/servicios/?page=1&page_size=500&ordering=idx"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

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
    } else {
      setFormData({ ...initialFormData, fecha_inicio: new Date().toISOString().split("T")[0] });
      setClienteSearch("");
      setTecnicoSearch("");
      setServicioSearch("");
    }
  }, [open, orden?.id]);

  // Sync tecnicoSearch when usuarios load and we're editing with tecnico_asignado
  useEffect(() => {
    if (!open || !formData.tecnico_asignado || !usuarios.length) return;
    const u = usuarios.find((x) => x.id === formData.tecnico_asignado);
    if (u) setTecnicoSearch(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email);
  }, [open, formData.tecnico_asignado, usuarios]);

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

  const addServicio = (servicio: string) => {
    if (!servicio.trim()) return;
    setFormData((prev) => ({ ...prev, servicios_realizados: [servicio.trim()] }));
    setServicioSearch("");
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

  const tecnicoActions = useMemo(() => {
    const q = tecnicoSearch.trim().toLowerCase();
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
  }, [usuarios, tecnicoSearch]);

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
    <Modal isOpen={open} onClose={onClose} className="relative max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 max-h-[70vh] overflow-y-auto flex-1">
        {modalAlert.show && (
          <div className="mb-4">
            <Alert variant={modalAlert.variant} title={modalAlert.title} message={modalAlert.message} showLink={false} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("cliente")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${
              activeTab === "cliente"
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Datos del cliente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orden")}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${
              activeTab === "orden"
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Datos de la orden
          </button>
        </div>

        {activeTab === "cliente" && (
          <>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 space-y-4">
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
                    <Label>Nombre del Cliente</Label>
                    <Input
                      value={formData.nombre_cliente}
                      onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                      placeholder="Nombre completo"
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <ActionSearchBar
                      actions={tecnicoActions as any}
                      defaultOpen={false}
                      label="Técnico Asignado"
                      placeholder="Buscar técnico..."
                      value={tecnicoSearch}
                      onQueryChange={(q: string) => setTecnicoSearch(q)}
                      onSelectAction={(action: any) => {
                        const u = usuarios.find((x) => Number(x.id) === Number(action?.id));
                        if (u) selectTecnico(u);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Dirección</Label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2"
                    placeholder="Dirección"
                  />
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
          </>
        )}

        {activeTab === "orden" && (
          <>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-4">
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
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-md text-xs">
                        {s}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, servicios_realizados: formData.servicios_realizados.filter((_, idx) => idx !== i) })}
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
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "pendiente" | "resuelto" })}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    id="modal-fecha-inicio"
                    label="Fecha Inicio"
                    placeholder="Seleccionar"
                    defaultDate={formData.fecha_inicio || undefined}
                    onChange={(_dates, currentDateString) => setFormData({ ...formData, fecha_inicio: currentDateString || "" })}
                  />
                  <div>
                    <Label htmlFor="modal-hora-inicio">Hora Inicio</Label>
                    <Input
                      type="time"
                      id="modal-hora-inicio"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    id="modal-fecha-fin"
                    label="Fecha Finalización"
                    placeholder="Seleccionar"
                    defaultDate={formData.fecha_finalizacion || undefined}
                    onChange={(_dates, currentDateString) => setFormData({ ...formData, fecha_finalizacion: currentDateString || "" })}
                  />
                  <div>
                    <Label htmlFor="modal-hora-termino">Hora Término</Label>
                    <Input
                      type="time"
                      id="modal-hora-termino"
                      value={formData.hora_termino}
                      onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            {tipoOrden === "levantamiento" && (
              <div className="mt-4">
                <LevantamientoForm
                  ordenId={orden?.id ?? null}
                  onSnapshot={(snapshot) => {
                    levantamientoSnapshotRef.current = snapshot;
                  }}
                />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
