import { useMemo, useRef, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import PageMeta from "@/components/common/PageMeta";
import { apiUrl } from "@/config/api";
import DatePicker from "@/components/form/date-picker";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    orderId?: number;
  };
}

type Orden = {
  id: number;
  idx?: number | null;
  cliente_id?: number | null;
  cliente?: string | null;
  nombre_cliente?: string | null;
  direccion?: string | null;
  telefono_cliente?: string | null;
  problematica?: string | null;
  servicios_realizados?: string[];
  tecnico_asignado?: number | null;
  tecnico_asignado_username?: string | null;
  fecha_inicio?: string | null;
  fecha_finalizacion?: string | null;
  fecha_creacion?: string | null;
  status?: 'pendiente' | 'resuelto' | string;
};

type Usuario = {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
};

const getToken = (): string => {
  return (
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  ).trim();
};

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const orderToEvent = (o: Orden): CalendarEvent | null => {
  const start = (o.fecha_inicio || o.fecha_creacion || '').toString().slice(0, 10);
  if (!start) return null;

  const rawEnd = (o.fecha_finalizacion || o.fecha_inicio || start).toString().slice(0, 10);
  const endExclusive = addDays(rawEnd, 1);

  const titleBase = o.idx != null ? `Orden ${o.idx}` : `Orden ${o.id}`;
  const cliente = (o.cliente || o.nombre_cliente || '').toString().trim();
  const title = cliente ? `${titleBase} - ${cliente}` : titleBase;

  const cal = o.status === 'resuelto' ? 'Success' : 'Warning';

  return {
    id: `orden-${o.id}`,
    title,
    start,
    end: endExclusive,
    allDay: true,
    extendedProps: { calendar: cal, orderId: o.id },
  };
};

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [saving, setSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tecnicoSearch, setTecnicoSearch] = useState("");
  const [tecnicoOpen, setTecnicoOpen] = useState(false);
  const [servicioSearch, setServicioSearch] = useState("");
  const [servicioOpen, setServicioOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());
  const canOrdenesEdit = !!permissions?.ordenes?.edit;

  const tecnicoLabel = (u: Usuario) => {
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return full || u.email;
  };

  const tecnicosOrdenados = useMemo(() => {
    return [...tecnicos].sort((a, b) => tecnicoLabel(a).localeCompare(tecnicoLabel(b)));
  }, [tecnicos]);

  const filteredTecnicos = useMemo(() => {
    const q = tecnicoSearch.trim().toLowerCase();
    const list = tecnicosOrdenados;
    if (!q) return list;
    return list.filter((u) => tecnicoLabel(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [tecnicosOrdenados, tecnicoSearch]);

  const filteredServicios = useMemo(() => {
    const q = servicioSearch.trim().toLowerCase();
    const list = serviciosDisponibles;
    if (!q) return list;
    return list.filter((s) => (s || '').toLowerCase().includes(q));
  }, [serviciosDisponibles, servicioSearch]);

  useEffect(() => {
    const loadServiciosDisponibles = () => {
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

      try {
        const raw = localStorage.getItem('servicios_disponibles');
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServiciosDisponibles(parsed);
          return;
        }
      } catch { }

      setServiciosDisponibles(defaultServicios);
    };

    const loadOrdenes = async () => {
      try {
        const token = getToken();
        if (!token) {
          setEvents([]);
          setOrdenes([]);
          return;
        }

        const res = await fetch(apiUrl('/api/ordenes/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setEvents([]);
          return;
        }

        const rows: Orden[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.results)
            ? (data as any).results
            : [];

        try {
          const rawMe = localStorage.getItem('user') || sessionStorage.getItem('user');
          const me = rawMe ? JSON.parse(rawMe) : null;
          const isAdmin = !!(me?.is_superuser || me?.is_staff);
          const meId = typeof me?.id === 'number' ? me.id : me?.id ? Number(me.id) : null;
          if (!isAdmin && meId != null) {
            const filtered = rows.filter((o) => Number(o.tecnico_asignado) === Number(meId));
            rows.length = 0;
            rows.push(...filtered);
          }
        } catch {
          // ignore
        }

        setOrdenes(rows);
        const mapped = rows.map(orderToEvent).filter(Boolean) as CalendarEvent[];
        setEvents(mapped);
      } catch {
        setEvents([]);
        setOrdenes([]);
      }
    };

    const loadTecnicos = async () => {
      try {
        const token = getToken();
        if (!token) {
          setTecnicos([]);
          return;
        }

        const res = await fetch(apiUrl('/api/users/accounts/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setTecnicos([]);
          return;
        }

        const rows: Usuario[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.results)
            ? (data as any).results
            : [];

        setTecnicos(rows.filter((u) => !(u.is_superuser || u.is_staff)));
      } catch {
        setTecnicos([]);
      }
    };

    loadServiciosDisponibles();
    loadOrdenes();
    loadTecnicos();
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

  const refreshOrdenes = async () => {
    const token = getToken();
    if (!token) {
      setEvents([]);
      setOrdenes([]);
      return;
    }

    const res = await fetch(apiUrl('/api/ordenes/'), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;

    const rows: Orden[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.results)
        ? (data as any).results
        : [];

    // Filter for technicians
    try {
      const role = localStorage.getItem('role');
      const userRaw = localStorage.getItem('user');
      if (role !== 'admin' && userRaw) {
        const user = JSON.parse(userRaw);
        if (user.id) {
          const userId = Number(user.id);
          const filtered = rows.filter(o => Number(o.tecnico_asignado) === userId);
          rows.length = 0;
          rows.push(...filtered);
        }
      }
    } catch (e) {
      console.error("Error filtering orders", e);
    }

    setOrdenes(rows);
    setEvents(rows.map(orderToEvent).filter(Boolean) as CalendarEvent[]);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const ce = event as unknown as CalendarEvent;

    const orderId = (ce.extendedProps as any)?.orderId;
    if (orderId) {
      if (!canOrdenesEdit) {
        setPermError('No tienes permiso para editar órdenes.');
        return;
      }
      setPermError(null);
      const o = ordenes.find((x) => x.id === orderId) || null;
      setSelectedOrden(o);
      openModal();
    }
  };

  const resetModalFields = () => {
    setSelectedOrden(null);
    setShowMapModal(false);
    setSelectedLocation(null);
    setTecnicoSearch('');
    setTecnicoOpen(false);
    setServicioSearch('');
    setServicioOpen(false);
  };

  const updateOrdenField = <K extends keyof Orden>(key: K, value: Orden[K]) => {
    setSelectedOrden((prev) => (prev ? ({ ...prev, [key]: value } as Orden) : prev));
  };

  const selectTecnico = (u: Usuario | null) => {
    if (!selectedOrden) return;
    if (u) {
      updateOrdenField('tecnico_asignado', u.id);
      setTecnicoSearch(tecnicoLabel(u));
    } else {
      updateOrdenField('tecnico_asignado', null);
      setTecnicoSearch('');
    }
    setTecnicoOpen(false);
  };

  const selectServicio = (s: string | null) => {
    if (!selectedOrden) return;
    if (s) {
      updateOrdenField('servicios_realizados', [s]);
      setServicioSearch(s);
    } else {
      updateOrdenField('servicios_realizados', []);
      setServicioSearch('');
    }
    setServicioOpen(false);
  };

  const saveOrden = async () => {
    if (!selectedOrden) return;
    if (!canOrdenesEdit) {
      setPermError('No tienes permiso para editar órdenes.');
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      if (!token) return;

      setPermError(null);

      const payload: any = {
        tecnico_asignado: selectedOrden.tecnico_asignado || null,
        fecha_inicio: selectedOrden.fecha_inicio || null,
        fecha_finalizacion: selectedOrden.fecha_finalizacion || null,
        status: (selectedOrden.status || 'pendiente') as any,
        direccion: selectedOrden.direccion || '',
        telefono_cliente: selectedOrden.telefono_cliente || '',
        problematica: selectedOrden.problematica || '',
        servicios_realizados: Array.isArray(selectedOrden.servicios_realizados)
          ? selectedOrden.servicios_realizados
          : [],
      };

      const res = await fetch(apiUrl(`/api/ordenes/${selectedOrden.id}/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return;

      const cid = selectedOrden.cliente_id;
      if (cid && (payload.direccion || payload.telefono_cliente)) {
        await fetch(apiUrl(`/api/clientes/${cid}/`), {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            direccion: payload.direccion || '',
            telefono: payload.telefono_cliente || '',
            nombre: (selectedOrden.cliente || selectedOrden.nombre_cliente || '').toString(),
          }),
        }).catch(() => null);
      }

      await refreshOrdenes();
      closeModal();
      resetModalFields();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Calendario | Sistema Grupo Intrax GPS"
        description="Página de calendario para el sistema de administración Grupo Intrax GPS"
      />
      <style>{`
        .custom-calendar .fc .fc-today-button {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        .custom-calendar .fc .fc-today-button:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }
        .custom-calendar .fc .fc-today-button:disabled {
          background-color: #93c5fd;
          border-color: #93c5fd;
          opacity: 1;
        }
      `}</style>
      <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locale={esLocale}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              list: "Lista",
            }}
            allDayText="Todo el día"
            moreLinkText={(n) => `+${n} más`}
            dayMaxEvents={1}
            noEventsText="No hay eventos para mostrar"
            events={events}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          closeOnBackdropClick={false}
          className="w-[94vw] max-w-4xl max-h-[92vh] p-0 overflow-hidden"
        >
          <div className="p-0 overflow-hidden rounded-2xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M5 7h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><path d="M7 11h10" /><path d="M7 15h6" /></svg>
                </span>
                <div className="min-w-0">
                  <h5 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">Editar orden</h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Actualiza la información de la orden y guarda los cambios.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto custom-scrollbar max-w-full">
              {permError && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {permError}
                </div>
              )}
              {selectedOrden ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-1a4 4 0 0 0-3-3.87" /><path d="M4 21v-1a4 4 0 0 1 3-3.87" /><circle cx="12" cy="7" r="4" /><path d="M12 11v2" /><path d="M8 21h8" /></svg>
                          Técnico
                        </label>
                        <div className="relative min-w-0">
                          <div className="relative min-w-0">
                            <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                            <input
                              value={tecnicoSearch || (selectedOrden.tecnico_asignado ? (() => {
                                const u = tecnicosOrdenados.find(u => u.id === selectedOrden.tecnico_asignado);
                                return u ? tecnicoLabel(u) : '';
                              })() : '')}
                              onChange={(e) => { setTecnicoSearch(e.target.value); setTecnicoOpen(true); }}
                              onFocus={() => setTecnicoOpen(true)}
                              placeholder='Buscar técnico...'
                              className='block w-full max-w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                            />
                            <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                              {selectedOrden.tecnico_asignado && (
                                <button type='button' onClick={() => selectTecnico(null)} className='h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition'>Limpiar</button>
                              )}
                              <button type='button' onClick={() => setTecnicoOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition'>
                                <svg className={`w-3.5 h-3.5 transition-transform ${tecnicoOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                              </button>
                            </div>
                          </div>
                          {tecnicoOpen && (
                            <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
                              <button type='button' onClick={() => selectTecnico(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-brand-500/15 ${!selectedOrden.tecnico_asignado ? 'bg-brand-50/60 dark:bg-brand-500/20 font-medium text-brand-700 dark:text-brand-300' : ''}`}>Selecciona técnico</button>
                              {filteredTecnicos.map(u => {
                                const nombre = tecnicoLabel(u);
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

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0">
                        <DatePicker
                          id="calendar-fecha-inicio"
                          label="Fecha de inicio"
                          placeholder="Seleccionar fecha"
                          defaultDate={(selectedOrden.fecha_inicio || '').toString().slice(0, 10) || undefined}
                          appendToBody={true}
                          onChange={(_dates: any, currentDateString: string) => {
                            updateOrdenField('fecha_inicio', currentDateString || null);
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <DatePicker
                          id="calendar-fecha-finalizacion"
                          label="Fecha de finalización"
                          placeholder="Seleccionar fecha"
                          defaultDate={(selectedOrden.fecha_finalizacion || '').toString().slice(0, 10) || undefined}
                          appendToBody={true}
                          onChange={(_dates: any, currentDateString: string) => {
                            updateOrdenField('fecha_finalizacion', currentDateString || null);
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V7l-8-4-8 4v5c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
                          Status
                        </label>
                        <select
                          value={(selectedOrden.status || 'pendiente') as any}
                          onChange={(e) => updateOrdenField('status', e.target.value as any)}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="resuelto">Resuelto</option>
                        </select>
                      </div>
                      <div className="min-w-0">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" /></svg>
                          Teléfono
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            value={(selectedOrden.telefono_cliente || '').toString()}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={10}
                            onChange={(e) => updateOrdenField('telefono_cliente', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          />
                          <a
                            href={selectedOrden.telefono_cliente ? `tel:${String(selectedOrden.telefono_cliente)}` : undefined}
                            onClick={(e) => {
                              if (!selectedOrden.telefono_cliente) e.preventDefault();
                            }}
                            className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${!selectedOrden.telefono_cliente ? 'opacity-50 pointer-events-none' : ''}`}
                            title="Llamar"
                            aria-label="Llamar"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.7.57 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.09a2 2 0 0 1 2.11-.45c.8.26 1.64.45 2.5.57A2 2 0 0 1 22 16.92Z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0 md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            Dirección
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const direccion = (selectedOrden?.direccion || '').toString().trim();
                              const coordMatch = direccion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                              if (coordMatch) {
                                const lat = parseFloat(coordMatch[1]);
                                const lng = parseFloat(coordMatch[2]);
                                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                                  setSelectedLocation({ lat, lng });
                                }
                              } else {
                                setSelectedLocation(null);
                              }
                              setShowMapModal(true);
                            }}
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
                            value={(selectedOrden.direccion || '').toString()}
                            onChange={(e) => updateOrdenField('direccion', e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 pr-12 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none resize-none"
                            placeholder="Dirección, coordenadas o URL de Google Maps"
                          />
                          {(selectedOrden.direccion || '').toString().trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                const direccion = (selectedOrden.direccion || '').toString().trim();

                                if (direccion.includes('google.com/maps') || direccion.includes('maps.app.goo.gl')) {
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
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7l4-4h10a4 4 0 0 1 4 4z" /></svg>
                        Problemática
                      </label>
                      <textarea
                        value={(selectedOrden.problematica || '').toString()}
                        onChange={(e) => updateOrdenField('problematica', e.target.value)}
                        className="min-h-[90px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        <svg className="w-4 h-4 text-sky-600 dark:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
                        Servicios
                      </label>
                      <div className="relative min-w-0">
                        <div className="relative min-w-0">
                          <svg className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6'><circle cx='11' cy='11' r='7' /><path d='m20 20-2-2' /></svg>
                          <input
                            value={servicioSearch || (selectedOrden.servicios_realizados || [])[0] || ''}
                            onChange={(e) => { setServicioSearch(e.target.value); setServicioOpen(true); }}
                            onFocus={() => setServicioOpen(true)}
                            placeholder='Buscar servicio...'
                            className='block w-full max-w-full rounded-lg border border-gray-300 bg-white pl-8 pr-20 py-2.5 text-[13px] text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                          />
                          <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                            {Array.isArray(selectedOrden.servicios_realizados) && selectedOrden.servicios_realizados.length > 0 && (
                              <button type='button' onClick={() => selectServicio(null)} className='h-8 px-2 rounded-md text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition'>Limpiar</button>
                            )}
                            <button type='button' onClick={() => setServicioOpen(o => !o)} className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition'>
                              <svg className={`w-3.5 h-3.5 transition-transform ${servicioOpen ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='none'><path d='M5.25 7.5 10 12.25 14.75 7.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' /></svg>
                            </button>
                          </div>
                        </div>
                        {servicioOpen && (
                          <div className='absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur max-h-64 overflow-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800 shadow-theme-md'>
                            <button type='button' onClick={() => selectServicio(null)} className={`w-full text-left px-3 py-2 text-[11px] hover:bg-brand-50 dark:hover:bg-brand-500/15 ${(!Array.isArray(selectedOrden.servicios_realizados) || selectedOrden.servicios_realizados.length === 0) ? 'bg-brand-50/60 dark:bg-brand-500/20 font-medium text-brand-700 dark:text-brand-300' : ''}`}>Selecciona servicio</button>
                            {filteredServicios.map(s => (
                              <button key={s} type='button' onClick={() => selectServicio(s)} className='w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition'>
                                <div className='flex items-center gap-2'>
                                  <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[11px] font-semibold'>
                                    {(s || '?').slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className='flex flex-col'>
                                    <span className='text-[12px] font-medium text-gray-800 dark:text-gray-100'>{s}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {filteredServicios.length === 0 && (
                              <div className='px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400'>Sin resultados</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  onClick={closeModal}
                  type="button"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg text-[12px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cerrar
                </button>
                <button
                  onClick={selectedOrden ? saveOrden : undefined}
                  type="button"
                  disabled={!selectedOrden || saving}
                  className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </Modal>

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
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar Ubicación</h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Ingresa coordenadas o usa tu ubicación para generar un link de Google Maps</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full h-[45vh] sm:h-[50vh]">
                  <iframe
                    title="Mapa"
                    className="w-full h-full"
                    src={(() => {
                      const loc = selectedLocation || { lat: 19.0653, lng: -104.2831 };
                      return `https://www.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`;
                    })()}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Coordenadas</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Latitud (ej: 19.0653)"
                      value={selectedLocation ? String(selectedLocation.lat) : ''}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        if (Number.isNaN(lat)) {
                          setSelectedLocation(null);
                          return;
                        }
                        setSelectedLocation({ lat, lng: selectedLocation?.lng ?? -104.2831 });
                      }}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Longitud (ej: -104.2831)"
                      value={selectedLocation ? String(selectedLocation.lng) : ''}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        if (Number.isNaN(lng)) {
                          setSelectedLocation(null);
                          return;
                        }
                        setSelectedLocation({ lat: selectedLocation?.lat ?? 19.0653, lng });
                      }}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none"
                    />
                  </div>
                  {selectedLocation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">URL: https://www.google.com/maps?q={selectedLocation.lat},{selectedLocation.lng}</p>
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
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setSelectedLocation({ lat: latitude, lng: longitude });
                      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                      updateOrdenField('direccion', url as any);
                      setShowMapModal(false);
                      setSelectedLocation(null);
                    },
                    () => null,
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-300/40 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Usar mi ubicación
              </button>
              <button
                type="button"
                onClick={() => {
                  const loc = selectedLocation || { lat: 19.0653, lng: -104.2831 };
                  const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                  updateOrdenField('direccion', url as any);
                  setShowMapModal(false);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30"
              >
                Usar esta ubicación
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;