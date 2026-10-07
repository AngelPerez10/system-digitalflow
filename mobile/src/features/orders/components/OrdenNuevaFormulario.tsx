import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listServicios } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { listTecnicosOpciones } from '@/api/ordenesApi';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { BarraCarga } from '@/components/BarraCarga';
import {
  IconAlerta,
  IconCalendar,
  IconClipboard,
  IconPerson,
  IconWrench,
} from '@/components/icons';
import { LocationMapModal } from '@/components/LocationMapModal';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { ClientePickerModal } from '@/features/cotizaciones/components/ClientePickerModal';
import { TipoTrabajoModal } from '@/features/cotizaciones/components/TipoTrabajoModal';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, spacing, type } from '@/theme/tokens';
import type { SessionUser } from '@/types/api';
import type { ServicioOpcion } from '@/types/cotizacion';
import type { OrdenCreatePayload, TecnicoOpcion } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { mapaDisponible } from '@/utils/modulosNativos';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  aplicarCliente,
  construirPayload,
  estadoSeccion,
  formVacio,
  hayCaptura,
  hayErrores,
  primeraSeccionConError,
  progresoCrear,
  SECCIONES_CREAR,
  TITULO_SECCION,
  validarForm,
  type CrearOrdenErrors,
  type CrearOrdenFormState,
  type SeccionCrear,
} from '../crearOrdenForm';
import {
  Aparece,
  estiloHoja,
  Tarjeta,
} from './nuevaOrdenUi';
import { CabeceraNuevaOrden } from './CabeceraNuevaOrden';
import { SeccionCliente, SeccionServicio } from './seccionesCaptura';
import { SeccionAgenda, SeccionAsignacion } from './seccionesNuevaOrden';
import { TecnicoPickerModal } from './TecnicoPickerModal';

interface Props {
  user: SessionUser | null;
  esAdmin: boolean;
  /** Crea en el servidor y devuelve el id de la orden nueva. */
  onCrear: (payload: OrdenCreatePayload) => Promise<number>;
  /** Tras la confirmación de éxito. */
  onCreada: (id: number) => void;
  onSalir: () => void;
}

/**
 * Alta de orden con el lenguaje de las vistas del técnico: banda marina con
 * el avance en segmentos, la hoja montada encima y cuatro tarjetas (Cliente,
 * Servicio, Asignación, Agenda) con estado propio. Campos con etiqueta arriba
 * y valor abajo; «Crear orden» siempre a mano en la barra inferior.
 */
export function OrdenNuevaFormulario({ user, esAdmin, onCrear, onCreada, onSalir }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const entrance = useEntrance(SECCIONES_CREAR.length, 16);
  const [form, setForm] = useState<CrearOrdenFormState>(() => formVacio(user?.id ?? null));
  const [errores, setErrores] = useState<CrearOrdenErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [tecnicos, setTecnicos] = useState<TecnicoOpcion[] | null>(null);
  const [errorTecnicos, setErrorTecnicos] = useState<string | null>(null);
  const [modal, setModal] = useState<'cliente' | 'servicios' | 'tecnico' | 'mapa' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<SeccionCrear, number>>>({});
  const saliendo = useRef(false);

  const guardando = fase !== 'idle';
  const dirty = hayCaptura(form);
  const progreso = useMemo(() => progresoCrear(form, esAdmin), [form, esAdmin]);
  const estados = useMemo(
    () => ({
      cliente: estadoSeccion(form, 'cliente', esAdmin),
      servicio: estadoSeccion(form, 'servicio', esAdmin),
      asignacion: estadoSeccion(form, 'asignacion', esAdmin),
      agenda: estadoSeccion(form, 'agenda', esAdmin),
    }),
    [form, esAdmin],
  );

  useEffect(() => {
    const control = new AbortController();
    listServicios(control.signal)
      .then(setServicios)
      .catch(() => {
        if (!control.signal.aborted) setServicios([]);
      });
    listTecnicosOpciones(control.signal)
      .then(setTecnicos)
      .catch((e) => {
        if (control.signal.aborted) return;
        setTecnicos([]);
        setErrorTecnicos(toUserMessage(e));
      });
    return () => control.abort();
  }, []);

  const pedirSalida = useCallback(() => {
    if (!dirty || guardando || saliendo.current) {
      onSalir();
      return;
    }
    Alert.alert('¿Descartar la orden?', 'Si sales ahora se perderá lo que capturaste.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          saliendo.current = true;
          onSalir();
        },
      },
    ]);
  }, [dirty, guardando, onSalir]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modal) return false;
      if (!dirty || saliendo.current) return false;
      pedirSalida();
      return true;
    });
    return () => sub.remove();
  }, [dirty, modal, pedirSalida]);

  const actualizar = useCallback(<K extends keyof CrearOrdenFormState>(campo: K, valor: CrearOrdenFormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
    setErrorGuardado(null);
  }, []);

  const irASeccion = useCallback(
    (seccion: SeccionCrear) => {
      const y = posiciones.current[seccion] ?? 0;
      scrollRef.current?.scrollTo({ y: Math.max(y - spacing.lg, 0), animated: !reduced });
    },
    [reduced],
  );

  const crear = async () => {
    const validacion = validarForm(form, esAdmin);
    setErrores(validacion);
    if (hayErrores(validacion)) {
      const seccion = primeraSeccionConError(validacion);
      setErrorGuardado(`Revisa ${seccion ? `«${TITULO_SECCION[seccion]}»` : 'los campos marcados'}.`);
      if (seccion) irASeccion(seccion);
      AccessibilityInfo.announceForAccessibility(
        `Faltan datos en ${seccion ? TITULO_SECCION[seccion] : 'el formulario'}.`,
      );
      return;
    }
    setErrorGuardado(null);
    setFase('sending');
    try {
      const id = await onCrear(construirPayload(form, servicios ?? [], esAdmin));
      saliendo.current = true;
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      onCreada(id);
    } catch (e) {
      const mensaje = toUserMessage(e);
      setErrorGuardado(mensaje);
      setFase('idle');
      AccessibilityInfo.announceForAccessibility(mensaje);
    }
  };

  const yo = useMemo<TecnicoOpcion | null>(() => {
    if (!user) return null;
    return tecnicos?.find((t) => t.id === user.id) ?? { id: user.id, nombre: nombreUsuarioDisplay(user), avatarUrl: user.avatar_url };
  }, [tecnicos, user]);

  const tarjeta = (clave: SeccionCrear, indice: number, contenido: React.ReactNode) => (
    <Animated.View
      key={clave}
      style={entrance(indice)}
      onLayout={(e: LayoutChangeEvent) => {
        posiciones.current[clave] = e.nativeEvent.layout.y;
      }}
    >
      {contenido}
    </Animated.View>
  );

  const cliente = form.cliente;
  const ubicacionMapa = esEnlaceUbicacion(form.direccion);
  const conMapa = mapaDisponible();

  return (
    <View style={[styles.flex, { backgroundColor: colors.navy }]}>
      <StatusBar style="light" />
      <CabeceraNuevaOrden
        pasos={SECCIONES_CREAR.map((s) => ({ clave: s, titulo: TITULO_SECCION[s], completo: estados[s] === 'completo' }))}
        actual={progreso.siguiente}
        onCerrar={pedirSalida}
        onIr={irASeccion}
      />

      <View style={estiloHoja(colors, scheme)}>
        <BarraCarga visible={fase === 'sending'} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            // En Android, el desplazamiento automático al enfocar un campo se
            // tomaba como «arrastre» y cerraba el teclado: el foco saltaba al
            // primer campo visible (no se podía escribir la ubicación).
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            showsVerticalScrollIndicator={false}
            accessibilityLabel="Formulario para crear una orden de trabajo"
          >
            {tarjeta(
              'cliente',
              0,
              <Tarjeta
                icon={(c) => <IconPerson color={c} size={18} />}
                titulo="Cliente"
                descripcion="Quién recibe el servicio y dónde."
                estado={estados.cliente}
              >
                <SeccionCliente
                  cliente={cliente}
                  telefono={form.telefono_cliente}
                  recibe={form.nombre_cliente}
                  direccion={form.direccion}
                  esMapa={ubicacionMapa}
                  conMapa={conMapa}
                  errorCliente={errores.cliente}
                  errorTelefono={errores.telefono_cliente}
                  disabled={guardando}
                  onBuscar={() => setModal('cliente')}
                  onTelefono={(v) => actualizar('telefono_cliente', v)}
                  onRecibe={(v) => actualizar('nombre_cliente', v)}
                  onDireccion={(v) => actualizar('direccion', v)}
                  onMapa={() => setModal('mapa')}
                  onVerMapa={() => void abrirEnlace(form.direccion, 'No se pudo abrir el mapa.')}
                  onQuitarMapa={() => actualizar('direccion', '')}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'servicio',
              1,
              <Tarjeta
                icon={(c) => <IconWrench color={c} size={17} />}
                titulo="Servicio"
                descripcion="Qué se hará y qué reportó el cliente."
                estado={estados.servicio}
              >
                <SeccionServicio
                  servicios={servicios}
                  seleccion={form.servicios}
                  problematica={form.problematica}
                  error={errores.servicios}
                  disabled={guardando}
                  onQuitar={(id) => actualizar('servicios', form.servicios.filter((x) => x !== id))}
                  onCatalogo={() => setModal('servicios')}
                  onProblematica={(v) => actualizar('problematica', v)}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'asignacion',
              2,
              <Tarjeta
                icon={(c) => <IconClipboard color={c} size={17} />}
                titulo="Asignación"
                descripcion="Quién atiende; recibe un aviso al crearla."
                estado={estados.asignacion}
                opcional={!esAdmin}
              >
                <SeccionAsignacion
                  tecnicos={tecnicos}
                  errorTecnicos={errorTecnicos}
                  seleccion={form.tecnico_asignado}
                  yo={yo}
                  esAdmin={esAdmin}
                  prioridad={form.prioridad_pool}
                  errorPrioridad={errores.prioridad_pool}
                  disabled={guardando}
                  onTecnico={(id) => actualizar('tecnico_asignado', id)}
                  onBuscar={() => setModal('tecnico')}
                  onPrioridad={(p) => actualizar('prioridad_pool', p)}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'agenda',
              3,
              <Tarjeta
                icon={(c) => <IconCalendar color={c} size={17} />}
                titulo="Agenda"
                descripcion="Cuándo debe iniciar el servicio."
                estado={estados.agenda}
              >
                <SeccionAgenda
                  fecha={form.fecha_inicio}
                  hora={form.hora_inicio}
                  errorFecha={errores.fecha_inicio}
                  errorHora={errores.hora_inicio}
                  disabled={guardando}
                  onFecha={(v) => actualizar('fecha_inicio', v)}
                  onHora={(v) => actualizar('hora_inicio', v)}
                />
              </Tarjeta>,
            )}
          </ScrollView>

          <View
            style={[
              styles.barra,
              { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            {errorGuardado ? (
              <Aparece clave={errorGuardado}>
                <View style={styles.barraEstado} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <IconAlerta color={colors.danger} size={14} />
                  <Text style={[styles.barraTexto, { color: colors.danger }]} numberOfLines={2}>
                    {errorGuardado}
                  </Text>
                </View>
              </Aparece>
            ) : null}
            <SubmitButton
              label="Crear orden"
              phase={fase}
              onPress={() => void crear()}
              accessibilityHint="Crea la orden de trabajo y avisa al técnico asignado"
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      <ClientePickerModal
        visible={modal === 'cliente'}
        onCerrar={() => setModal(null)}
        onElegir={(c) => {
          setForm((prev) => aplicarCliente(prev, c));
          setErrores((prev) => ({ ...prev, cliente: undefined, telefono_cliente: undefined }));
          setErrorGuardado(null);
          setModal(null);
        }}
      />
      <TipoTrabajoModal
        visible={modal === 'servicios'}
        servicios={servicios ?? []}
        seleccion={form.servicios}
        onCerrar={() => setModal(null)}
        onListo={(ids) => {
          actualizar('servicios', ids);
          setModal(null);
        }}
      />
      <TecnicoPickerModal
        visible={modal === 'tecnico'}
        tecnicos={tecnicos}
        error={errorTecnicos}
        seleccion={form.tecnico_asignado}
        yoId={user?.id ?? null}
        onCerrar={() => setModal(null)}
        onElegir={(id) => {
          actualizar('tecnico_asignado', id);
          setModal(null);
        }}
      />
      {conMapa ? (
        <LocationMapModal
          visible={modal === 'mapa'}
          direccion={form.direccion}
          onClose={() => setModal(null)}
          onConfirm={(mapsUrl) => {
            actualizar('direccion', mapsUrl);
            setModal(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  barra: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  barraTexto: { ...type.caption, fontSize: 12.5, flex: 1 },
});
