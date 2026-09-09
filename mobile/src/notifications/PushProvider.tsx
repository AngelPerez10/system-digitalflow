import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'expo-router';
import { pushRemotoDisponible } from './pushDisponible';
import { registrarDispositivoPush } from './registrarPush';

type Notificaciones = typeof import('expo-notifications');
type Notificacion = import('expo-notifications').Notification;

let handlerListo = false;

/** Require diferido: el import estático tira en Expo Go Android (SDK 53+). */
function cargarNotificaciones(): Notificaciones | null {
  if (!pushRemotoDisponible()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa; el import top-level revienta Expo Go
  const Notifications = require('expo-notifications') as Notificaciones;
  if (!handlerListo) {
    // Mostrar el aviso también con la app en primer plano (Expo lo suprime).
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerListo = true;
  }
  return Notifications;
}

type DatosNotif = { tipo?: string; ordenId?: number } & Record<string, unknown>;

function datosDe(n: Notificacion): DatosNotif {
  return (n.request.content.data ?? {}) as DatosNotif;
}

interface PushValue {
  /** Órdenes liberadas anunciadas por push que aún no se han visto en la lista. */
  disponiblesSinVer: number;
  /** La pantalla de disponibles la llama al enfocarse: pone el contador a cero. */
  marcarDisponiblesVistas: () => void;
  /** La pantalla de disponibles marca su foco para no sumar al badge mientras se ve. */
  setPantallaDisponiblesActiva: (activa: boolean) => void;
}

const PushContext = createContext<PushValue | null>(null);

/**
 * Vive dentro de `(app)/_layout` — solo técnicos con sesión y acceso a órdenes.
 * Registra el dispositivo al montar, escucha las notificaciones y lleva el
 * contador del badge de "Órdenes disponibles". En Expo Go Android es un
 * pass-through: el módulo nativo no existe y no debe cargarse.
 */
export function PushProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [disponiblesSinVer, setDisponiblesSinVer] = useState(0);
  const pantallaActivaRef = useRef(false);
  const ultimoRespId = useRef<string | null>(null);
  const Notifications = useMemo(() => cargarNotificaciones(), []);

  const marcarDisponiblesVistas = useCallback(() => setDisponiblesSinVer(0), []);
  const setPantallaDisponiblesActiva = useCallback((activa: boolean) => {
    pantallaActivaRef.current = activa;
  }, []);

  const abrirDisponibles = useCallback(() => {
    setDisponiblesSinVer(0);
    router.push('/ordenes/pool');
  }, [router]);

  const manejarTap = useCallback(
    (n: Notificacion) => {
      if (datosDe(n).tipo === 'orden_liberada') abrirDisponibles();
    },
    [abrirDisponibles],
  );

  // Alta del dispositivo. Al montar el provider ya hay sesión de técnico.
  useEffect(() => {
    void registrarDispositivoPush();
  }, []);

  useEffect(() => {
    if (!Notifications) return undefined;

    const recibido = Notifications.addNotificationReceivedListener((n) => {
      if (datosDe(n).tipo === 'orden_liberada' && !pantallaActivaRef.current) {
        setDisponiblesSinVer((c) => c + 1);
      }
    });

    const respondido = Notifications.addNotificationResponseReceivedListener((r) => {
      ultimoRespId.current = r.notification.request.identifier;
      manejarTap(r.notification);
    });

    // Arranque en frío: la app se abrió tocando una notificación.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r && r.notification.request.identifier !== ultimoRespId.current) {
        manejarTap(r.notification);
      }
    });

    return () => {
      recibido.remove();
      respondido.remove();
    };
  }, [Notifications, manejarTap]);

  const value = useMemo<PushValue>(
    () => ({ disponiblesSinVer, marcarDisponiblesVistas, setPantallaDisponiblesActiva }),
    [disponiblesSinVer, marcarDisponiblesVistas, setPantallaDisponiblesActiva],
  );

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

/** Devuelve un no-op seguro si se usa fuera del provider (p. ej. tests aislados). */
export function usePush(): PushValue {
  return (
    useContext(PushContext) ?? {
      disponiblesSinVer: 0,
      marcarDisponiblesVistas: () => {},
      setPantallaDisponiblesActiva: () => {},
    }
  );
}
