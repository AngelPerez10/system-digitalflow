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
import { useSession } from '@/auth/SessionProvider';
import { isAdmin, ownsOrden } from '@/auth/permissions';
import { toUserMessage } from '@/api/errors';
import { updateOrden } from '@/api/ordenesApi';
import { BarraCarga } from '@/components/BarraCarga';
import { Colapsable } from '@/components/Colapsable';
import { ErrorState, InlineError } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { FechaHoraBloque } from '@/features/orders/components/DateTimeField';
import { EditarOrdenHero } from '@/features/orders/components/EditarOrdenHero';
import { EquiposOrdenEditor } from '@/features/orders/components/EquiposOrdenEditor';
import { FotosEditor } from '@/features/orders/components/FotosEditor';
import { EditarOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import { SignaturePad } from '@/features/orders/components/SignaturePad';
import { StatusSegment } from '@/features/orders/components/StatusSegment';
import { folioDisplay, statusSolid } from '@/features/orders/ordenFormat';
import {
  COMENTARIO_TECNICO_MAX,
  COMENTARIO_TECNICO_MIN,
  construirPatch,
  formStateFromOrden,
  hayErrores,
  MOTIVO_PAUSA_MAX,
  tieneCambios,
  validarForm,
  type EditarOrdenErrors,
  type EditarOrdenFormState,
} from '@/features/orders/editarOrdenForm';
import { useOrden } from '@/features/orders/useOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { EstadoInstalacionEquipo } from '@/types/orden';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Bitácora de campo hermana del detalle — mismo corte marino + hoja blanca y
 * mismas tarjetas de sección. Es el detalle en modo escritura.
 */

function AvisoAnimado({ message }: { message: string }) {
  const reduced = useReducedMotion();
  const progreso = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    const animacion = Animated.timing(progreso, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [progreso, reduced]);

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        opacity: progreso,
        transform: [
          { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
        ],
      }}
    >
      <InlineError message={message} />
    </Animated.View>
  );
}

export default function EditarOrdenScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ordenId = Number(id);
  const { orden, cargando, error, recargar, aplicarOrden } = useOrden(
    Number.isFinite(ordenId) ? ordenId : null,
  );
  const { user } = useSession();
  const reduced = useReducedMotion();
  const { colors, scheme } = useTheme();

  const [form, setForm] = useState<EditarOrdenFormState | null>(null);
  const [formOrdenId, setFormOrdenId] = useState<number | null>(null);
  const [errores, setErrores] = useState<EditarOrdenErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const entrance = useEntrance(8);
  const scrollRef = useRef<ScrollView>(null);

  if (orden && formOrdenId !== orden.id) {
    setFormOrdenId(orden.id);
    setForm(formStateFromOrden(orden));
  }

  const patch = useMemo(() => (orden && form ? construirPatch(orden, form) : {}), [orden, form]);
  const dirty = tieneCambios(patch);
  const guardando = fase !== 'idle';
  const tono = form ? statusSolid(form.status, colors).bg : colors.navy;

  useEffect(() => {
    if (errorGuardado) scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
  }, [errorGuardado, reduced]);

  if (cargando || (!orden && !error)) return <EditarOrdenSkeleton />;
  if (error || !orden) return <ErrorState message={error ?? 'Orden no encontrada.'} onRetry={recargar} />;
  if (!form) return <EditarOrdenSkeleton />;

  const folio = folioDisplay(orden);
  const puedeMarcarInstalacion = isAdmin(user) || ownsOrden(user, orden);
  const resumenEquipos = {
    total: form.equipos_inventario.length,
    entregados: form.equipos_inventario.filter((e) => e.equipoEntregado).length,
    instalados: form.equipos_inventario.filter((e) => e.estadoInstalacion === 'instalado').length,
  };

  const actualizar = <K extends keyof EditarOrdenFormState>(
    campo: K,
    valor: EditarOrdenFormState[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGuardado(null);
  };

  const actualizarInstalacion = (lineaId: string, estado: EstadoInstalacionEquipo) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            equipos_inventario: prev.equipos_inventario.map((equipo) =>
              equipo.lineaId === lineaId ? { ...equipo, estadoInstalacion: estado } : equipo,
            ),
          }
        : prev,
    );
    setErrorGuardado(null);
  };

  const guardar = async () => {
    const validacion = validarForm(form);
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
      const actualizada = await updateOrden(orden.id, patch);
      aplicarOrden(actualizada);
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
        <EditarOrdenHero orden={orden} dirty={dirty} onVolver={() => router.back()} />
      </Animated.View>

      <View style={[styles.hoja, hoja]}>
        <BarraCarga visible={fase === 'sending'} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            accessibilityLabel={`Formulario para editar la orden ${folio}`}
          >
            {errorGuardado ? <AvisoAnimado key={errorGuardado} message={errorGuardado} /> : null}

            <Animated.View style={entrance(1)}>
              <SeccionCard titulo="Estatus" tono={tono}>
                <StatusSegment value={form.status} onChange={(status) => actualizar('status', status)} />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(2)}>
              <SeccionCard titulo="Comentario" tono={tono}>
                <Colapsable abierto={form.status === 'pausado'}>
                  <View style={styles.campoColapsado}>
                    <TextField
                      label="Motivo de la pausa"
                      value={form.motivo_pausa}
                      onChangeText={(valor) => actualizar('motivo_pausa', valor)}
                      placeholder="Explique por qué se pausó la orden"
                      multiline
                      maxLength={MOTIVO_PAUSA_MAX}
                      error={errores.motivo_pausa}
                      helper={`Obligatorio. ${form.motivo_pausa.length}/${MOTIVO_PAUSA_MAX}`}
                    />
                  </View>
                </Colapsable>
                <TextField
                  label="Comentario técnico"
                  value={form.comentario_tecnico}
                  onChangeText={(valor) => actualizar('comentario_tecnico', valor)}
                  placeholder={`Qué se hizo en sitio (mínimo ${COMENTARIO_TECNICO_MIN} caracteres)`}
                  multiline
                  maxLength={COMENTARIO_TECNICO_MAX}
                  error={errores.comentario_tecnico}
                  helper={
                    form.comentario_tecnico.trim().length < COMENTARIO_TECNICO_MIN
                      ? `Obligatorio · ${form.comentario_tecnico.trim().length} / ${COMENTARIO_TECNICO_MIN} mínimo`
                      : `Obligatorio · ${form.comentario_tecnico.trim().length} caracteres`
                  }
                  accessibilityHint={`Obligatorio. Mínimo ${COMENTARIO_TECNICO_MIN} caracteres.`}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(3)}>
              <SeccionCard titulo="Horario" tono={tono}>
                <FechaHoraBloque
                  titulo="Inicio"
                  fecha={form.fecha_inicio}
                  hora={form.hora_inicio}
                  errorFecha={errores.fecha_inicio}
                  errorHora={errores.hora_inicio}
                  onFecha={(valor) => actualizar('fecha_inicio', valor)}
                  onHora={(valor) => actualizar('hora_inicio', valor)}
                />
                <View style={[styles.separador, { backgroundColor: colors.line }]} />
                <FechaHoraBloque
                  titulo="Finalización"
                  fecha={form.fecha_finalizacion}
                  hora={form.hora_termino}
                  errorFecha={errores.fecha_finalizacion}
                  errorHora={errores.hora_termino}
                  onFecha={(valor) => actualizar('fecha_finalizacion', valor)}
                  onHora={(valor) => actualizar('hora_termino', valor)}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(4)}>
              <SeccionCard titulo="Equipos de la orden" conteo={resumenEquipos.total}>
                <Text style={[styles.subtitulo, { color: colors.inkMuted }]}>
                  {resumenEquipos.entregados} entregados · {resumenEquipos.instalados} instalados
                </Text>
                <EquiposOrdenEditor
                  equipos={form.equipos_inventario}
                  canMarkInstalacion={puedeMarcarInstalacion}
                  disabled={guardando}
                  onChangeInstalacion={actualizarInstalacion}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(5)}>
              <SeccionCard titulo="Fotos" tono={tono} conteo={form.fotos_urls.length}>
                <FotosEditor
                  urls={form.fotos_urls}
                  maxFotos={5 + (orden.fotos_extra_max || 0)}
                  onChange={(urls) => actualizar('fotos_urls', urls)}
                  disabled={guardando}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={entrance(6)}>
              <SeccionCard titulo="Firma del cliente" tono={tono}>
                <SignaturePad
                  value={form.firma_cliente_url}
                  onChange={(url) => actualizar('firma_cliente_url', url)}
                  disabled={guardando}
                />
              </SeccionCard>
            </Animated.View>

            <Animated.View style={[entrance(7), styles.acciones]}>
              <SubmitButton
                label="Guardar cambios"
                phase={fase}
                disabled={!dirty}
                onPress={() => void guardar()}
                accessibilityHint={dirty ? 'Guarda los cambios en la orden' : 'No hay cambios por guardar'}
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
  hoja: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  subtitulo: { ...type.caption, fontSize: 12, marginTop: -spacing.xs },
  campoColapsado: { paddingBottom: spacing.sm },
  separador: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  acciones: { marginTop: spacing.sm, gap: spacing.sm },
  cancelar: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarPressed: { opacity: 0.55 },
  cancelarInactivo: { opacity: 0.4 },
  cancelarTexto: { ...type.bodyMedium },
});
