import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toUserMessage } from '@/api/errors';
import { updateProyecto, uploadProyectoImage } from '@/api/proyectosApi';
import { useSession } from '@/auth/SessionProvider';
import { isAdmin } from '@/auth/permissions';
import { BarraCarga } from '@/components/BarraCarga';
import { Colapsable } from '@/components/Colapsable';
import { ErrorState, InlineError } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { DateTimeField } from '@/features/orders/components/DateTimeField';
import { FotosEditor } from '@/features/orders/components/FotosEditor';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import { SignaturePad } from '@/features/orders/components/SignaturePad';
import { CotizacionesResumen } from '@/features/proyectos/components/CotizacionesResumen';
import { EditarProyectoHero } from '@/features/proyectos/components/EditarProyectoHero';
import { EquiposProyectoEditor } from '@/features/proyectos/components/EquiposProyectoEditor';
import { FechasInicioEditor } from '@/features/proyectos/components/FechasInicioEditor';
import { NotasPorDiaEditor } from '@/features/proyectos/components/NotasPorDiaEditor';
import { PorcentajeAvance } from '@/features/proyectos/components/PorcentajeAvance';
import { EditarProyectoSkeleton } from '@/features/proyectos/components/ProyectoSkeletons';
import { ProyectoStatusSegment } from '@/features/proyectos/components/ProyectoStatusSegment';
import {
  MOTIVO_PAUSA_MAX,
  construirPatch,
  crearNotaDia,
  formStateFromProyecto,
  hayErrores,
  tieneCambios,
  validarForm,
  type EditarProyectoErrors,
  type EditarProyectoFormState,
} from '@/features/proyectos/editarProyectoForm';
import { folioDisplay, statusSolid } from '@/features/proyectos/proyectoFormat';
import { useProyecto } from '@/features/proyectos/useProyecto';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';

function AvisoAnimado({ message }: { message: string }) {
  const reduced = useReducedMotion();
  const progreso = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    const animacion = Animated.timing(progreso, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animacion.start();
    return () => animacion.stop();
  }, [progreso, reduced]);

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        opacity: progreso,
        transform: [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
      }}
    >
      <InlineError message={message} />
    </Animated.View>
  );
}

export default function EditarProyectoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const { proyecto, cargando, error, recargar, aplicarProyecto } = useProyecto(
    Number.isFinite(proyectoId) ? proyectoId : null,
  );
  const { user } = useSession();
  const reduced = useReducedMotion();
  const { colors, scheme } = useTheme();

  const [form, setForm] = useState<EditarProyectoFormState | null>(null);
  const [formProyectoId, setFormProyectoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<EditarProyectoErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const entrance = useEntrance(10);
  const scrollRef = useRef<ScrollView>(null);

  if (proyecto && formProyectoId !== proyecto.id) {
    setFormProyectoId(proyecto.id);
    setForm(formStateFromProyecto(proyecto));
  }

  const patch = useMemo(() => (proyecto && form ? construirPatch(proyecto, form) : {}), [proyecto, form]);
  const dirty = tieneCambios(patch);
  const guardando = fase !== 'idle';
  const tono = form ? statusSolid(form.status, colors).bg : colors.navy;

  useEffect(() => {
    if (errorGuardado) scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
  }, [errorGuardado, reduced]);

  if (cargando || (!proyecto && !error)) return <EditarProyectoSkeleton />;
  if (error || !proyecto) return <ErrorState message={error ?? 'Proyecto no encontrado.'} onRetry={recargar} />;
  if (!form) return <EditarProyectoSkeleton />;

  const folio = folioDisplay(proyecto);

  const actualizar = <K extends keyof EditarProyectoFormState>(campo: K, valor: EditarProyectoFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGuardado(null);
  };

  const guardar = async () => {
    const validacion = validarForm(form, proyecto);
    setErrores(validacion);
    if (hayErrores(validacion)) {
      setErrorGuardado('Revise los campos marcados e intente de nuevo.');
      return;
    }
    if (!tieneCambios(patch)) {
      setErrorGuardado('No hay cambios por guardar.');
      return;
    }

    setErrorGuardado(null);
    setFase('sending');
    try {
      const actualizado = await updateProyecto(proyecto.id, patch);
      aplicarProyecto(actualizado);
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      router.back();
    } catch (err) {
      setErrorGuardado(toUserMessage(err));
      setFase('idle');
    }
  };

  const hoja = {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
    elevation: 12,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['bottom']}>
      <Stack.Screen options={{ title: `Editar ${folio}`, headerShown: false }} />
      <StatusBar style="light" />

      <Animated.View style={entrance(0)}>
        <EditarProyectoHero proyecto={proyecto} dirty={dirty} onVolver={() => router.back()} />
      </Animated.View>

      <View style={[styles.hoja, hoja]}>
        <BarraCarga visible={fase === 'sending'} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            accessibilityLabel={`Formulario para editar el proyecto ${folio}`}
          >
            {errorGuardado ? <AvisoAnimado key={errorGuardado} message={errorGuardado} /> : null}

            <Animated.View style={entrance(1)}>
              <SeccionCard titulo="Estatus" tono={tono}>
                <ProyectoStatusSegment
                  value={form.status}
                  permiteCancelar={isAdmin(user)}
                  onChange={(status) => actualizar('status', status)}
                />
                <Colapsable abierto={form.status === 'pausado'}>
                  <View style={styles.campoColapsado}>
                    <TextField
                      label="Motivo de la pausa"
                      value={form.motivo_pausa}
                      onChangeText={(valor) => actualizar('motivo_pausa', valor)}
                      placeholder="Explique por qué se pausó el proyecto"
                      multiline
                      maxLength={MOTIVO_PAUSA_MAX}
                      error={errores.motivo_pausa}
                      helper={`Obligatorio. ${form.motivo_pausa.length}/${MOTIVO_PAUSA_MAX}`}
                    />
                  </View>
                </Colapsable>
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(2)}>
              <SeccionCard titulo="Programación" tono={tono}>
                <DateTimeField
                  label="Fecha de autorización"
                  mode="date"
                  value={form.fecha_autorizacion}
                  onChange={(valor) => actualizar('fecha_autorizacion', valor)}
                  error={errores.fecha_autorizacion}
                  disabled={!isAdmin(user)}
                  helper={!isAdmin(user) ? 'Solo oficina puede definir la fecha de autorización.' : undefined}
                  accessibilityLabel="Fecha de autorización"
                />
                <View style={styles.filaCeldas}>
                  <DateTimeField
                    label="Hora de llegada"
                    mode="time"
                    value={form.hora_llegada}
                    onChange={(valor) => actualizar('hora_llegada', valor)}
                    error={errores.hora_llegada}
                  />
                  <DateTimeField
                    label="Hora de salida"
                    mode="time"
                    value={form.hora_salida}
                    onChange={(valor) => actualizar('hora_salida', valor)}
                    error={errores.hora_salida}
                  />
                </View>

                <View style={[styles.divisorGrupo, { borderTopColor: colors.line }]}>
                  <Text style={[styles.grupoLabel, { color: colors.inkMuted }]}>Periodo de trabajo</Text>
                  <Text style={[styles.grupoHint, { color: colors.inkSubtle }]}>
                    Se genera una nota de bitácora por cada día del rango.
                  </Text>
                </View>
                <FechasInicioEditor
                  fechas={form.fechas_inicio}
                  onChange={(fechas) => {
                    actualizar('fechas_inicio', fechas);
                    if (fechas.length > form.notas_por_dia.length) {
                      const faltantes = fechas.length - form.notas_por_dia.length;
                      const nuevasNotas = Array.from({ length: faltantes }, () => crearNotaDia());
                      actualizar('notas_por_dia', [...form.notas_por_dia, ...nuevasNotas]);
                    }
                  }}
                  error={errores.fechas_inicio}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(3)}>
              <SeccionCard titulo="Equipo de trabajo" tono={tono}>
                <TextField
                  label="Vehículo asignado"
                  value={form.vehiculo_asignado}
                  onChangeText={(valor) => actualizar('vehiculo_asignado', valor)}
                  placeholder="Placas o unidad"
                />
                <TextField
                  label="Herramientas generales"
                  value={form.herramientas_generales}
                  onChangeText={(valor) => actualizar('herramientas_generales', valor)}
                  placeholder="Lista breve de herramientas o equipo"
                  multiline
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(4)}>
              <SeccionCard titulo="Cotizaciones" tono={tono} conteo={proyecto.cotizaciones.length}>
                <CotizacionesResumen bloques={proyecto.cotizaciones} />
                <Text style={[styles.subtitulo, { color: colors.inkSubtle }]}>
                  Vincular o quitar cotizaciones es tarea de oficina.
                </Text>
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(5)}>
              <SeccionCard titulo="Equipos del proyecto" tono={tono} conteo={form.equipos.length}>
                <EquiposProyectoEditor
                  equipos={form.equipos}
                  disabled={guardando}
                  onChangeGrupo={(lineaIds, patchEquipo) =>
                    actualizar(
                      'equipos',
                      form.equipos.map((eq) =>
                        lineaIds.includes(eq.lineaId) ? { ...eq, ...patchEquipo } : eq,
                      ),
                    )
                  }
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(6)}>
              <SeccionCard titulo="Bitácora por jornada" tono={tono} conteo={form.notas_por_dia.length}>
                <NotasPorDiaEditor
                  notas={form.notas_por_dia}
                  errores={errores.notas_por_dia}
                  disabled={guardando}
                  requiereMinimo={form.status === 'cerrado'}
                  onChange={(notas) => actualizar('notas_por_dia', notas)}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(7)}>
              <SeccionCard titulo="Avance" tono={tono}>
                <PorcentajeAvance
                  value={form.porcentaje_avance}
                  disabled={guardando}
                  onChange={(valor) => actualizar('porcentaje_avance', valor)}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(8)}>
              <SeccionCard titulo="Incidencias y requerimientos" tono={tono}>
                <TextField
                  label="Incidencias"
                  value={form.incidencias}
                  onChangeText={(valor) => actualizar('incidencias', valor)}
                  placeholder="Describe incidencias del proyecto…"
                  multiline
                />
                <TextField
                  label="Requerimientos adicionales"
                  value={form.requerimientos_adicionales}
                  onChangeText={(valor) => actualizar('requerimientos_adicionales', valor)}
                  placeholder="Trabajo fuera del alcance original, si aplica"
                  multiline
                  error={errores.requerimientos_adicionales}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.requiere_presupuesto_adicional, disabled: guardando }}
                  accessibilityLabel="Requiere presupuesto adicional"
                  disabled={guardando}
                  onPress={() => actualizar('requiere_presupuesto_adicional', !form.requiere_presupuesto_adicional)}
                  style={[
                    styles.checkFila,
                    { borderColor: colors.line, backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.checkCaja,
                      {
                        borderColor: form.requiere_presupuesto_adicional ? colors.primary : colors.lineStrong,
                        backgroundColor: form.requiere_presupuesto_adicional ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {form.requiere_presupuesto_adicional ? <Text style={styles.checkMarca}>✓</Text> : null}
                  </View>
                  <Text style={[styles.checkTexto, { color: colors.ink }]}>Requiere presupuesto adicional</Text>
                </Pressable>
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(9)}>
              <SeccionCard titulo="Evidencias" tono={tono} conteo={form.evidencias_urls.length}>
                <FotosEditor
                  urls={form.evidencias_urls}
                  maxFotos={10}
                  disabled={guardando}
                  subirFoto={(dataUrl) => uploadProyectoImage(dataUrl, 'proyectos/evidencias')}
                  onChange={(urls) => actualizar('evidencias_urls', urls)}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(9)}>
              <SeccionCard titulo="Firma del cliente" tono={tono}>
                <SignaturePad
                  value={form.firma_cliente_url}
                  onChange={(url) => actualizar('firma_cliente_url', url)}
                  disabled={guardando}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(9)}>
              <SeccionCard titulo="Firma del técnico" tono={tono}>
                <SignaturePad
                  value={form.firma_tecnico_url}
                  onChange={(url) => actualizar('firma_tecnico_url', url)}
                  disabled={guardando}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={[entrance(9), styles.acciones]}>
              <SubmitButton
                label="Guardar cambios"
                phase={fase}
                disabled={!dirty}
                onPress={() => void guardar()}
                accessibilityHint={dirty ? 'Guarda los cambios en el proyecto' : 'No hay cambios por guardar'}
                tint={colors.navy}
                tintPressed={colors.navyDeep}
                tintDisabled={colors.navyDisabled}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar y volver al detalle"
                disabled={guardando}
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.cancelar,
                  pressed ? styles.cancelarPressed : null,
                  guardando ? styles.cancelarInactivo : null,
                ]}
              >
                <Text style={[styles.cancelarTexto, { color: colors.inkMuted }]}>Cancelar</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hoja: { flex: 1, marginTop: -20, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  subtitulo: { ...type.caption, fontSize: 12 },
  campoColapsado: { paddingTop: spacing.sm },
  filaCeldas: { flexDirection: 'row', gap: spacing.sm },
  divisorGrupo: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs, gap: 2 },
  grupoLabel: { ...type.label, fontSize: 13 },
  grupoHint: { ...type.caption, fontSize: 11 },
  checkFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  checkCaja: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarca: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  checkTexto: { ...type.bodyMedium, flexShrink: 1 },
  acciones: { marginTop: spacing.sm, gap: spacing.sm },
  cancelar: { minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  cancelarPressed: { opacity: 0.55 },
  cancelarInactivo: { opacity: 0.4 },
  cancelarTexto: { ...type.bodyMedium },
});
