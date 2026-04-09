import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import PageMeta from "@/components/common/PageMeta";
import { apiUrl } from "@/config/api";

let calendarOrdenesInFlight: Promise<void> | null = null;

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    orderId?: number;
  };
}

type Orden = {
  id: number;
  idx?: number | null;
  cliente?: string | null;
  nombre_cliente?: string | null;
  tecnico_asignado?: number | null;
  fecha_inicio?: string | null;
  fecha_finalizacion?: string | null;
  fecha_creacion?: string | null;
  status?: "pendiente" | "resuelto" | string;
};

const getToken = (): string => {
  return (
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  ).trim();
};

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const orderToEvent = (o: Orden): CalendarEvent | null => {
  const start = (o.fecha_inicio || o.fecha_creacion || "").toString().slice(0, 10);
  if (!start) return null;

  const rawEnd = (o.fecha_finalizacion || o.fecha_inicio || start).toString().slice(0, 10);
  const endExclusive = addDays(rawEnd, 1);

  const titleBase = o.idx != null ? `Orden ${o.idx}` : `Orden ${o.id}`;
  const cliente = (o.cliente || o.nombre_cliente || "").toString().trim();
  const title = cliente ? `${titleBase} - ${cliente}` : titleBase;
  const cal = o.status === "resuelto" ? "Success" : "Warning";

  return {
    id: `orden-${o.id}`,
    title,
    start,
    end: endExclusive,
    allDay: true,
    extendedProps: { calendar: cal, orderId: o.id },
  };
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}>
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    const loadOrdenes = async () => {
      try {
        const token = getToken();
        if (!token) {
          setEvents([]);
          return;
        }

        if (calendarOrdenesInFlight) {
          await calendarOrdenesInFlight;
          return;
        }

        calendarOrdenesInFlight = (async () => {
          const res = await fetch(apiUrl("/api/ordenes/"), {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
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
            const rawMe = localStorage.getItem("user") || sessionStorage.getItem("user");
            const me = rawMe ? JSON.parse(rawMe) : null;
            const isAdmin = !!(me?.is_superuser || me?.is_staff);
            const meId = typeof me?.id === "number" ? me.id : me?.id ? Number(me.id) : null;
            if (!isAdmin && meId != null) {
              const filtered = rows.filter((o) => Number(o.tecnico_asignado) === Number(meId));
              setEvents(filtered.map(orderToEvent).filter(Boolean) as CalendarEvent[]);
              return;
            }
          } catch {
            // ignore user parse errors and show all rows
          }

          setEvents(rows.map(orderToEvent).filter(Boolean) as CalendarEvent[]);
        })();

        await calendarOrdenesInFlight;
      } catch {
        setEvents([]);
      } finally {
        calendarOrdenesInFlight = null;
      }
    };

    loadOrdenes();
  }, []);

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

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
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
            dayMaxEvents={3}
            noEventsText="No hay eventos para mostrar"
            events={events}
            eventContent={renderEventContent}
          />
        </div>
      </div>
    </>
  );
};

export default Calendar;
