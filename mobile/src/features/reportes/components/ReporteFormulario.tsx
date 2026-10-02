import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toUserMessage } from '@/api/errors';
import { actualizarReporte, crearReporte } from '@/api/reportesApi';
import { BarraCarga } from '@/components/BarraCarga';
import { DateTimeField } from '@/components/DateTimeField';
import { EditarHeader } from '@/components/EditarHeader';
import { FormDivisor, FormSection } from '@/components/FormSection';
import { IconAlerta, IconBox, IconChevron, IconClipboard, IconMas } from '@/components/icons';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { Reporte, ReporteZona } from '@/types/reporte';
import { esFechaValida } from '@/utils/fecha';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  construirPayload,
  hayErrores,
  huella,
  nuevaZona,
  progresoZonas,
  validarReporte,
  type OrigenElegido,
  type ReporteFormErrors,
  type ReporteFormState,
} from '../editarReporteForm';
import { folioReporte, tecnicosDe } from '../reporteFormat';
import { OrigenPickerModal } from './OrigenPickerModal';
import { ZonaEditor } from './ZonaEditor';

type Seccion = 'origen' | 'servicio' | 'evidencia';
const SECCIONES: readonly Seccion[] = ['origen', 'servicio', 'evidencia'];
const TITULO: Record<Seccion, string> = { origen: 'Proyecto', servicio: 'Servicio', evidencia: 'Evidencia' };

interface Props {
  /** `null` = reporte nuevo. */
  reporte: Reporte | null;
  inicial: ReporteFormState;
  /** Tras guardar: el nuevo va a su detalle; el editado regresa al detalle. */
  onGuardado: (reporte: Reporte) => void;
}

/**
 * Formulario del reporte (crear y editar), mismo lenguaje que el de órdenes y
 * proyectos: tres pasos numerados que se palomean solos — de qué servicio es,
 * cuándo y quién, y la evidencia zona por zona. Guardar vive fijo abajo.
 */
export function ReporteFormulario({ reporte, inicial, onGuardado }: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [form, setForm] = useState<ReporteFormState>(inicial);
  const [errores, setErrores] = useState<ReporteFormErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [pickerAbierto, setPickerAbierto] = useState(false);
  // Zonas agregadas en esta sesión: entran con animación; las cargadas aparecen quietas.
  const [nuevas, setNuevas] = useState<ReadonlySet<string>>(() => new Set());
  const entrance = useEntrance(SECCIONES.length);
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<Seccion, number>>>({});
  const saliendo = useRef(false);

  const huellaInicial = useMemo(() => huella(inicial), [inicial]);
  const dirty = huella(form) !== huellaInicial;
  const guardando = fase !== 'idle';
  const esNuevo = reporte === null;

  const pedirSalida = useCallback(() => {
    if (!dirty || guardando || saliendo.current) {
      router.back();
      return;
    }
    Alert.alert('¿Descartar cambios?', 'Lo que capturaste en este reporte se perderá. Las fotos ya subidas no se guardan en el reporte.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          saliendo.current = true;
          router.back();
        },
      },
    ]);
  }, [dirty, guardando, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty || saliendo.current) return false;
      pedirSalida();
      return true;
    });
    return () => sub.remove();
  }, [dirty, pedirSalida]);

  const progreso = progresoZonas(form);
  const completas: Record<Seccion, boolean> = {
    origen: Boolean(form.origen),
    servicio: esFechaValida(form.fecha_servicio) && tecnicosDe(form.tecnico_nombre).length > 0,
    evidencia: progreso.total > 0 && progreso.completas === progreso.total,
  };
  const nCompletas = SECCIONES.filter((s) => completas[s]).length;
  const siguiente = SECCIONES.find((s) => !completas[s]) ?? null;

  const irASeccion = (seccion: Seccion) => {
    const y = posiciones.current[seccion] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - spacing.md, 0), animated: !reduced });
  };

  const limpiarError = () => setErrorGuardado(null);

  const elegirOrigen = (origen: OrigenElegido) => {
    setForm((prev) => ({ ...prev, origen }));
    setErrores((prev) => ({ ...prev, origen: undefined }));
    setPickerAbierto(false);
    limpiarError();
  };

  const cambiarZona = useCallback((zona: ReporteZona) => {
    setForm((prev) => ({ ...prev, zonas: prev.zonas.map((z) => (z.id === zona.id ? zona : z)) }));
    setErrores((prev) => {
      if (!prev.zonas?.[zona.id]) return prev;
      const { [zona.id]: _quitado, ...resto } = prev.zonas;
      return { ...prev, zonas: Object.keys(resto).length ? resto : undefined };
    });
    setErrorGuardado(null);
  }, []);

  const quitarZona = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, zonas: prev.zonas.filter((z) => z.id !== id) }));
  }, []);

  const agregarZona = () => {
    const zona = nuevaZona();
    setNuevas((prev) => new Set(prev).add(zona.id));
    setForm((prev) => ({ ...prev, zonas: [...prev.zonas, zona] }));
    // Lleva la vista a la zona recién agregada.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: !reduced }));
  };

  const guardar = async () => {
    const validacion = validarReporte(form);
    setErrores(validacion);
    if (hayErrores(validacion)) {
      setErrorGuardado('Revisa los campos marcados en rojo.');
      const primera = validacion.origen ? 'origen' : validacion.fecha_servicio || validacion.tecnico_nombre ? 'servicio' : 'evidencia';
      irASeccion(primera);
      return;
    }
    if (!esNuevo && !dirty) {
      setErrorGuardado('No hay cambios por guardar.');
      return;
    }
    setErrorGuardado(null);
    setFase('sending');
    try {
      const payload = construirPayload(form);
      const guardado = esNuevo ? await crearReporte(payload) : await actualizarReporte(reporte.id, payload);
      setFase('success');
      saliendo.current = true;
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      onGuardado(guardado);
    } catch (err) {
      setErrorGuardado(toUserMessage(err));
      setFase('idle');
    }
  };

  const seccion = (clave: Seccion, indice: number, contenido: React.ReactNode) => (
    <Animated.View
      key={clave}
      style={entrance(indice)}
      onLayout={(e) => {
        posiciones.current[clave] = e.nativeEvent.layout.y;
      }}
    >
      {contenido}
    </Animated.View>
  );

  const OrigenIcon = form.origen?.tipo === 'proyecto' ? IconBox : IconClipboard;

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <StatusBar style="light" />

      <EditarHeader
        eyebrow={esNuevo ? 'Nuevo reporte' : 'Editar reporte'}
        folio={esNuevo ? 'Reporte de mantenimiento' : folioReporte(reporte)}
        cliente={form.origen?.cliente || 'Elige el proyecto'}
        volverLabel={esNuevo ? 'Volver a reportes' : 'Volver al detalle del reporte'}
        dirty={dirty}
        completadas={nCompletas}
        total={SECCIONES.length}
        siguiente={siguiente ? TITULO[siguiente] : null}
        onVolver={pedirSalida}
        onIrSiguiente={() => siguiente && irASeccion(siguiente)}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <BarraCarga visible={fase === 'sending'} />
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            accessibilityLabel={esNuevo ? 'Formulario de reporte nuevo' : `Formulario para editar ${folioReporte(reporte)}`}
          >
            {seccion(
              'origen',
              0,
              <FormSection numero={1} titulo="Proyecto" descripcion="El proyecto al que pertenece este servicio." completa={completas.origen}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={form.origen ? `Proyecto: ${form.origen.folio}, ${form.origen.cliente}` : 'Elegir proyecto'}
                  accessibilityHint="Abre la lista de proyectos"
                  disabled={guardando}
                  onPress={() => setPickerAbierto(true)}
                  style={({ pressed }) => [
                    styles.origen,
                    {
                      borderColor: errores.origen ? colors.danger : form.origen ? colors.line : colors.lineStrong,
                      borderStyle: form.origen ? 'solid' : 'dashed',
                      backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.origenPlaca, { backgroundColor: form.origen ? colors.navy : colors.surfaceSunken }]}>
                    <OrigenIcon color={form.origen ? colors.onNavy : colors.inkSubtle} size={17} />
                  </View>
                  <View style={styles.origenTextos}>
                    {form.origen ? (
                      <>
                        <Text style={[styles.origenMeta, { color: colors.inkMuted }]}>
                          {form.origen.tipo === 'proyecto' ? 'Proyecto' : 'Orden de trabajo'} · {form.origen.folio}
                        </Text>
                        <Text style={[styles.origenCliente, { color: colors.ink }]} numberOfLines={1}>
                          {form.origen.cliente}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.origenCliente, { color: colors.inkMuted }]}>Elegir proyecto</Text>
                    )}
                  </View>
                  <Text style={[styles.origenCambiar, { color: colors.primary }]}>{form.origen ? 'Cambiar' : ''}</Text>
                  <IconChevron direction="right" color={colors.inkSubtle} size={14} />
                </Pressable>
                {errores.origen ? <Text style={[styles.error, { color: colors.danger }]}>{errores.origen}</Text> : null}
              </FormSection>,
            )}

            {seccion(
              'servicio',
              1,
              <FormSection numero={2} titulo="Servicio" descripcion="Cuándo se hizo y quién lo hizo." completa={completas.servicio}>
                <DateTimeField
                  label="Fecha del servicio"
                  mode="date"
                  value={form.fecha_servicio}
                  onChange={(fecha_servicio) => {
                    setForm((prev) => ({ ...prev, fecha_servicio }));
                    setErrores((prev) => ({ ...prev, fecha_servicio: undefined }));
                    limpiarError();
                  }}
                  error={errores.fecha_servicio}
                  disabled={guardando}
                />
                <View style={styles.campoFinal}>
                  <TextField
                    label="Técnicos"
                    value={form.tecnico_nombre}
                    onChangeText={(tecnico_nombre) => {
                      setForm((prev) => ({ ...prev, tecnico_nombre }));
                      setErrores((prev) => ({ ...prev, tecnico_nombre: undefined }));
                      limpiarError();
                    }}
                    placeholder="Ana Pérez, Luis Gómez"
                    helper="Si fueron varios, sepáralos con coma."
                    error={errores.tecnico_nombre}
                    editable={!guardando}
                    autoCapitalize="words"
                    maxLength={255}
                  />
                </View>
              </FormSection>,
            )}

            {seccion(
              'evidencia',
              2,
              <FormSection
                numero={3}
                titulo="Evidencia"
                descripcion="Por cada zona, fotos de cómo estaba y de cómo quedó."
                meta={progreso.total > 0 ? `${progreso.completas} / ${progreso.total}` : undefined}
                completa={completas.evidencia}
              >
                <View style={styles.zonas}>
                  {form.zonas.map((zona, i) => (
                    <React.Fragment key={zona.id}>
                    {i > 0 ? <FormDivisor /> : null}
                    <ZonaEditor
                      zona={zona}
                      numero={i + 1}
                      error={errores.zonas?.[zona.id]}
                      disabled={guardando}
                      nueva={nuevas.has(zona.id)}
                      unica={form.zonas.length === 1}
                      onChange={cambiarZona}
                      onQuitar={quitarZona}
                    />
                    </React.Fragment>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Agregar zona"
                    disabled={guardando}
                    onPress={agregarZona}
                    style={({ pressed }) => [
                      styles.agregar,
                      { borderColor: colors.primary, backgroundColor: pressed ? colors.primaryDisabled : 'transparent' },
                    ]}
                  >
                    <IconMas color={colors.primary} size={15} />
                    <Text style={[styles.agregarTexto, { color: colors.primary }]}>Agregar zona</Text>
                  </Pressable>
                </View>
              </FormSection>,
            )}
          </ScrollView>
        </View>

        <View
          style={[
            styles.barra,
            { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {errorGuardado ? (
            <View style={styles.barraEstado} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <IconAlerta color={colors.danger} size={14} />
              <Text style={[styles.barraTexto, { color: colors.danger }]} numberOfLines={2}>
                {errorGuardado}
              </Text>
            </View>
          ) : (
            <View style={styles.barraEstado}>
              <View style={[styles.punto, { backgroundColor: dirty ? colors.gold : colors.success }]} />
              <Text style={[styles.barraTexto, { color: colors.inkMuted }]}>
                {dirty ? 'Cambios sin guardar' : esNuevo ? 'Reporte sin capturar' : 'Sin cambios pendientes'}
              </Text>
            </View>
          )}
          <SubmitButton
            label={esNuevo ? 'Crear reporte' : 'Guardar cambios'}
            phase={fase}
            disabled={!esNuevo && !dirty}
            onPress={() => void guardar()}
            accessibilityHint={esNuevo ? 'Crea el reporte con lo capturado' : 'Guarda los cambios del reporte'}
          />
        </View>
      </KeyboardAvoidingView>

      <OrigenPickerModal
        visible={pickerAbierto}
        actual={form.origen}
        reporteId={reporte?.id ?? null}
        onCerrar={() => setPickerAbierto(false)}
        onElegir={elegirOrigen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  origen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 16,
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  origenPlaca: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  origenTextos: { flex: 1, minWidth: 0, gap: 1 },
  origenMeta: { ...type.mono, fontSize: 12 },
  origenCliente: { fontFamily: font.semibold, fontSize: 15, flexShrink: 1 },
  origenCambiar: { ...type.label, fontFamily: font.semibold },
  error: { ...type.caption, fontSize: 12, fontFamily: font.medium },
  /** `TextField` trae su propio margen inferior; al final de una tarjeta sobra. */
  campoFinal: { marginBottom: -spacing.lg },
  zonas: { gap: spacing.md },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md + 2,
  },
  agregarTexto: { ...type.button, fontFamily: font.semibold },
  barra: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  barraTexto: { ...type.caption, fontSize: 12, flex: 1 },
});
