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
import { IconAlerta, IconCalendar, IconClipboard, IconPerson, IconWrench } from '@/components/icons';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { ClientePickerModal } from '@/features/cotizaciones/components/ClientePickerModal';
import { TipoTrabajoModal } from '@/features/cotizaciones/components/TipoTrabajoModal';
import { CabeceraNuevaOrden } from '@/features/orders/components/CabeceraNuevaOrden';
import { Aparece, estiloHoja, Tarjeta } from '@/features/orders/components/nuevaOrdenUi';
import { TecnicoPickerModal } from '@/features/orders/components/TecnicoPickerModal';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, spacing, type } from '@/theme/tokens';
import type { SessionUser } from '@/types/api';
import type { ServicioOpcion } from '@/types/cotizacion';
import type { TecnicoOpcion } from '@/types/orden';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  aplicarClienteProyecto,
  construirPayloadProyecto,
  estadoSeccionProyecto,
  formProyectoVacio,
  hayCapturaProyecto,
  hayErroresProyecto,
  primeraSeccionConErrorProyecto,
  progresoProyecto,
  requiereMonitoreo,
  SECCIONES_PROYECTO,
  TITULO_SECCION_PROYECTO,
  validarProyecto,
  type CrearProyectoErrors,
  type CrearProyectoFormState,
  type ProyectoCreatePayload,
  type SeccionProyecto,
} from '../crearProyectoForm';
import { SeccionAlcance, SeccionCalendario, SeccionClienteProyecto, SeccionEquipo } from './seccionesProyecto';

interface Props {
  user: SessionUser | null;
  /** Crea en el servidor y devuelve el id del proyecto nuevo. */
  onCrear: (payload: ProyectoCreatePayload) => Promise<number>;
  onCreado: (id: number) => void;
  onSalir: () => void;
}

/**
 * Alta de proyecto con el mismo lenguaje que «Nueva orden»: banda marina con
 * el avance en cuatro tramos, la hoja montada encima y cuatro tarjetas
 * (Cliente, Alcance, Equipo, Calendario) con estado propio. «Crear proyecto»
 * siempre a mano en la barra inferior; si falta algo, lleva a la sección.
 */
export function ProyectoNuevoFormulario({ user, onCrear, onCreado, onSalir }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const entrance = useEntrance(SECCIONES_PROYECTO.length, 16);
  const [form, setForm] = useState<CrearProyectoFormState>(() => formProyectoVacio(user?.id ?? null));
  const [errores, setErrores] = useState<CrearProyectoErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [tecnicos, setTecnicos] = useState<TecnicoOpcion[] | null>(null);
  const [errorTecnicos, setErrorTecnicos] = useState<string | null>(null);
  const [modal, setModal] = useState<'cliente' | 'tipos' | 'responsable' | 'auxiliar' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<SeccionProyecto, number>>>({});
  const saliendo = useRef(false);

  const catalogo = useMemo(() => servicios ?? [], [servicios]);
  const guardando = fase !== 'idle';
  const dirty = hayCapturaProyecto(form);
  const progreso = useMemo(() => progresoProyecto(form, catalogo), [form, catalogo]);
  const estados = useMemo(
    () => ({
      cliente: estadoSeccionProyecto(form, 'cliente', catalogo),
      alcance: estadoSeccionProyecto(form, 'alcance', catalogo),
      equipo: estadoSeccionProyecto(form, 'equipo', catalogo),
      calendario: estadoSeccionProyecto(form, 'calendario', catalogo),
    }),
    [form, catalogo],
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
    Alert.alert('¿Descartar el proyecto?', 'Si sales ahora se perderá lo que capturaste.', [
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

  const actualizar = useCallback(<K extends keyof CrearProyectoFormState>(campo: K, valor: CrearProyectoFormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
    setErrorGuardado(null);
  }, []);

  const irASeccion = useCallback(
    (seccion: SeccionProyecto) => {
      const y = posiciones.current[seccion] ?? 0;
      scrollRef.current?.scrollTo({ y: Math.max(y - spacing.lg, 0), animated: !reduced });
    },
    [reduced],
  );

  const yo = useMemo<TecnicoOpcion | null>(() => {
    if (!user) return null;
    return tecnicos?.find((t) => t.id === user.id) ?? { id: user.id, nombre: nombreUsuarioDisplay(user), avatarUrl: user.avatar_url };
  }, [tecnicos, user]);
  /** Catálogo de técnicos más el propio usuario (aunque no venga en la lista). */
  const personas = useMemo(() => {
    const lista = tecnicos ?? [];
    return yo && !lista.some((t) => t.id === yo.id) ? [yo, ...lista] : lista;
  }, [tecnicos, yo]);

  const crear = async () => {
    const validacion = validarProyecto(form, catalogo);
    setErrores(validacion);
    if (hayErroresProyecto(validacion)) {
      const seccion = primeraSeccionConErrorProyecto(validacion);
      setErrorGuardado(`Revisa ${seccion ? `«${TITULO_SECCION_PROYECTO[seccion]}»` : 'los campos marcados'}.`);
      if (seccion) irASeccion(seccion);
      AccessibilityInfo.announceForAccessibility(
        `Faltan datos en ${seccion ? TITULO_SECCION_PROYECTO[seccion] : 'el formulario'}.`,
      );
      return;
    }
    setErrorGuardado(null);
    setFase('sending');
    try {
      const id = await onCrear(construirPayloadProyecto(form, catalogo, personas));
      saliendo.current = true;
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      onCreado(id);
    } catch (e) {
      const mensaje = toUserMessage(e);
      setErrorGuardado(mensaje);
      setFase('idle');
      AccessibilityInfo.announceForAccessibility(mensaje);
    }
  };

  const alternarAuxiliar = (id: number) => {
    if (id === form.responsable) return;
    actualizar('auxiliares', form.auxiliares.includes(id) ? form.auxiliares.filter((x) => x !== id) : [...form.auxiliares, id]);
  };

  const elegirResponsable = (id: number | null) => {
    setForm((prev) => ({
      ...prev,
      responsable: id,
      // Quien pasa a responsable deja de ser auxiliar.
      auxiliares: id === null ? prev.auxiliares : prev.auxiliares.filter((x) => x !== id),
    }));
    setErrores((prev) => ({ ...prev, responsable: undefined, auxiliares: undefined }));
    setErrorGuardado(null);
  };

  const tarjeta = (clave: SeccionProyecto, indice: number, contenido: React.ReactNode) => (
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

  return (
    <View style={[styles.flex, { backgroundColor: colors.navy }]}>
      <StatusBar style="light" />
      <CabeceraNuevaOrden
        titulo="Nuevo proyecto"
        contexto="Proyecto"
        cerrarLabel="Cancelar proyecto nuevo"
        pasos={SECCIONES_PROYECTO.map((s) => ({ clave: s, titulo: TITULO_SECCION_PROYECTO[s], completo: estados[s] === 'completo' }))}
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
            // Ver «Nueva orden»: en Android «on-drag» hacía saltar el foco.
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            showsVerticalScrollIndicator={false}
            accessibilityLabel="Formulario para crear un proyecto"
          >
            {tarjeta(
              'cliente',
              0,
              <Tarjeta
                icon={(c) => <IconPerson color={c} size={18} />}
                titulo="Cliente"
                descripcion="Para quién es el proyecto y quién lo autorizó."
                estado={estados.cliente}
              >
                <SeccionClienteProyecto
                  cliente={form.cliente}
                  quienAutorizo={form.quien_autorizo}
                  errorCliente={errores.cliente}
                  disabled={guardando}
                  onBuscar={() => setModal('cliente')}
                  onQuienAutorizo={(v) => actualizar('quien_autorizo', v)}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'alcance',
              1,
              <Tarjeta
                icon={(c) => <IconWrench color={c} size={17} />}
                titulo="Alcance"
                descripcion="Qué tipos de trabajo incluye."
                estado={estados.alcance}
              >
                <SeccionAlcance
                  servicios={servicios}
                  seleccion={form.tipos}
                  errorTipos={errores.tipos}
                  conMonitoreo={requiereMonitoreo(form, catalogo)}
                  monitoreo={form.monitoreo}
                  errorMonitoreo={errores.monitoreo}
                  disabled={guardando}
                  onQuitar={(id) => actualizar('tipos', form.tipos.filter((x) => x !== id))}
                  onCatalogo={() => setModal('tipos')}
                  onMonitoreo={(v) => actualizar('monitoreo', v)}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'equipo',
              2,
              <Tarjeta
                icon={(c) => <IconClipboard color={c} size={17} />}
                titulo="Equipo"
                descripcion="Quién lo lleva, quién apoya y con qué."
                estado={estados.equipo}
                opcional
              >
                <SeccionEquipo
                  tecnicos={tecnicos}
                  errorTecnicos={errorTecnicos}
                  yo={yo}
                  responsable={form.responsable}
                  auxiliares={form.auxiliares}
                  errorAuxiliares={errores.auxiliares}
                  vehiculo={form.vehiculo_asignado}
                  herramientas={form.herramientas_generales}
                  disabled={guardando}
                  onResponsable={elegirResponsable}
                  onAuxiliar={alternarAuxiliar}
                  onBuscar={(para) => setModal(para)}
                  onVehiculo={(v) => actualizar('vehiculo_asignado', v)}
                  onHerramientas={(v) => actualizar('herramientas_generales', v)}
                />
              </Tarjeta>,
            )}

            {tarjeta(
              'calendario',
              3,
              <Tarjeta
                icon={(c) => <IconCalendar color={c} size={17} />}
                titulo="Calendario"
                descripcion="Cuándo se autorizó y qué días se trabaja."
                estado={estados.calendario}
              >
                <SeccionCalendario
                  autorizacion={form.fecha_autorizacion}
                  desde={form.inicio_desde}
                  hasta={form.inicio_hasta}
                  hora={form.hora_llegada}
                  errores={{
                    autorizacion: errores.fecha_autorizacion,
                    desde: errores.inicio_desde,
                    hasta: errores.inicio_hasta,
                    hora: errores.hora_llegada,
                  }}
                  disabled={guardando}
                  onAutorizacion={(v) => actualizar('fecha_autorizacion', v)}
                  onRango={(desde, hasta) => {
                    setForm((prev) => ({ ...prev, inicio_desde: desde, inicio_hasta: hasta }));
                    setErrores((prev) => ({ ...prev, inicio_desde: undefined, inicio_hasta: undefined }));
                    setErrorGuardado(null);
                  }}
                  onHora={(v) => actualizar('hora_llegada', v)}
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
              label="Crear proyecto"
              phase={fase}
              onPress={() => void crear()}
              accessibilityHint="Crea el proyecto en proceso"
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      <ClientePickerModal
        visible={modal === 'cliente'}
        onCerrar={() => setModal(null)}
        onElegir={(c) => {
          setForm((prev) => aplicarClienteProyecto(prev, c));
          setErrores((prev) => ({ ...prev, cliente: undefined }));
          setErrorGuardado(null);
          setModal(null);
        }}
      />
      <TipoTrabajoModal
        visible={modal === 'tipos'}
        servicios={catalogo}
        seleccion={form.tipos}
        onCerrar={() => setModal(null)}
        onListo={(ids) => {
          actualizar('tipos', ids);
          setModal(null);
        }}
      />
      <TecnicoPickerModal
        visible={modal === 'responsable' || modal === 'auxiliar'}
        tecnicos={tecnicos}
        error={errorTecnicos}
        seleccion={modal === 'responsable' ? form.responsable : null}
        yoId={user?.id ?? null}
        onCerrar={() => setModal(null)}
        onElegir={(id) => {
          if (modal === 'responsable') elegirResponsable(id);
          else if (id !== null && !form.auxiliares.includes(id)) alternarAuxiliar(id);
          setModal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  barra: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  barraTexto: { ...type.caption, fontSize: 12.5, flex: 1 },
});
