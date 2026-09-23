import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { isAdmin, ownsOrden } from '@/auth/permissions';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { toUserMessage } from '@/api/errors';
import { updateOrden } from '@/api/ordenesApi';
import { Avatar } from '@/components/Avatar';
import { BarraCarga } from '@/components/BarraCarga';
import { Colapsable } from '@/components/Colapsable';
import { HorarioOrdenEditor } from '@/components/DateTimeField';
import { FormDivisor, FormSection, FormSubtitulo } from '@/components/FormSection';
import { FotosEditor } from '@/components/FotosEditor';
import { IconAlerta, IconCamera, IconSignature } from '@/components/icons';
import { LocationMapModal } from '@/components/LocationMapModal';
import { mapaDisponible } from '@/utils/modulosNativos';
import { MinimoMeter } from '@/components/MinimoMeter';
import { SignaturePad } from '@/components/SignaturePad';
import { ErrorState } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { UbicacionField } from '@/components/UbicacionField';
import { EditarHeader } from '@/components/EditarHeader';
import { EquiposOrdenEditor } from '@/features/orders/components/EquiposOrdenEditor';
import { EditarOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { StatusSelector } from '@/features/orders/components/StatusSelector';
import { clienteDisplay, folioDisplay } from '@/features/orders/ordenFormat';
import {
  COMENTARIO_TECNICO_MAX,
  COMENTARIO_TECNICO_MIN,
  construirPatch,
  contarCambios,
  formStateFromOrden,
  hayErrores,
  MOTIVO_PAUSA_MAX,
  primeraSeccionConError,
  SECCIONES_EDITAR,
  seccionesCompletas,
  TITULO_SECCION,
  validarForm,
  type EditarOrdenErrors,
  type EditarOrdenFormState,
  type SeccionEditar,
} from '@/features/orders/editarOrdenForm';
import { useOrden } from '@/features/orders/useOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, spacing, type } from '@/theme/tokens';
import type { EstadoInstalacionEquipo } from '@/types/orden';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Reporte de cierre de la orden. Seis pasos numerados que se marcan solos
 * al completarse; el encabezado resume el avance y lleva a lo pendiente, y
 * la barra inferior fija mantiene «Guardar» siempre a mano.
 */
export default function EditarOrdenScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ordenId = Number(id);
  const { orden, cargando, error, recargar, aplicarOrden } = useOrden(
    Number.isFinite(ordenId) ? ordenId : null,
  );
  const { user } = useSession();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [form, setForm] = useState<EditarOrdenFormState | null>(null);
  const [formOrdenId, setFormOrdenId] = useState<number | null>(null);
  const [errores, setErrores] = useState<EditarOrdenErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const entrance = useEntrance(SECCIONES_EDITAR.length);
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<SeccionEditar, number>>>({});
  const saliendo = useRef(false);

  if (orden && formOrdenId !== orden.id) {
    setFormOrdenId(orden.id);
    setForm(formStateFromOrden(orden));
  }

  const patch = useMemo(() => (orden && form ? construirPatch(orden, form) : {}), [orden, form]);
  const nCambios = orden && form ? contarCambios(orden, patch) : 0;
  const dirty = nCambios > 0;
  const guardando = fase !== 'idle';

  const pedirSalida = useCallback(() => {
    if (!dirty || guardando || saliendo.current) {
      router.back();
      return;
    }
    Alert.alert(
      '¿Descartar cambios?',
      `Tienes ${nCambios} ${nCambios === 1 ? 'cambio' : 'cambios'} sin guardar. Si sales ahora se perderán.`,
      [
        { text: 'Seguir editando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            saliendo.current = true;
            router.back();
          },
        },
      ],
    );
  }, [dirty, guardando, nCambios, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty || saliendo.current) return false;
      pedirSalida();
      return true;
    });
    return () => sub.remove();
  }, [dirty, pedirSalida]);

  if (cargando || (!orden && !error)) return <EditarOrdenSkeleton />;
  if (error || !orden) return <ErrorState message={error ?? 'Orden no encontrada.'} onRetry={recargar} />;
  if (!form) return <EditarOrdenSkeleton />;

  const completas = seccionesCompletas(form);
  const nCompletas = SECCIONES_EDITAR.filter((s) => completas[s]).length;
  const siguiente = SECCIONES_EDITAR.find((s) => !completas[s]) ?? null;
  const puedeMarcarInstalacion = isAdmin(user) || ownsOrden(user, orden);
  const maxFotos = 5 + (orden.fotos_extra_max || 0);
  const comentarioLen = form.comentario_tecnico.trim().length;
  const equipos = {
    total: form.equipos_inventario.length,
    entregados: form.equipos_inventario.filter((e) => e.equipoEntregado).length,
    instalados: form.equipos_inventario.filter((e) => e.estadoInstalacion === 'instalado').length,
  };

  const irASeccion = (seccion: SeccionEditar) => {
    const y = posiciones.current[seccion] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - spacing.md, 0), animated: !reduced });
  };

  const actualizar = <K extends keyof EditarOrdenFormState>(campo: K, valor: EditarOrdenFormState[K]) => {
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
      setErrorGuardado('Revisa los campos marcados en rojo.');
      const seccion = primeraSeccionConError(validacion);
      if (seccion) irASeccion(seccion);
      return;
    }
    if (!dirty) {
      setErrorGuardado('No hay cambios por guardar.');
      return;
    }

    setErrorGuardado(null);
    setFase('sending');
    try {
      const actualizada = await updateOrden(orden.id, patch);
      aplicarOrden(actualizada);
      setFase('success');
      saliendo.current = true;
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      router.back();
    } catch (err) {
      setErrorGuardado(toUserMessage(err));
      setFase('idle');
    }
  };

  const seccion = (clave: SeccionEditar, indice: number, contenido: React.ReactNode) => (
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

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: `Editar ${folioDisplay(orden)}`, headerShown: false }} />
      <StatusBar style="light" />

      <EditarHeader
        eyebrow="Editar orden"
        folio={folioDisplay(orden)}
        cliente={clienteDisplay(orden)}
        volverLabel="Volver al detalle de la orden"
        dirty={dirty}
        completadas={nCompletas}
        total={SECCIONES_EDITAR.length}
        siguiente={siguiente ? TITULO_SECCION[siguiente] : null}
        onVolver={pedirSalida}
        onIrSiguiente={() => siguiente && irASeccion(siguiente)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          <BarraCarga visible={fase === 'sending'} />
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            accessibilityLabel={`Formulario para editar la orden ${folioDisplay(orden)}`}
          >
            {seccion(
              'estatus',
              0,
              <FormSection
                numero={1}
                titulo={TITULO_SECCION.estatus}
                descripcion="¿En qué punto está el servicio?"
                completa={completas.estatus}
              >
                <View>
                  <StatusSelector
                    value={form.status}
                    onChange={(status) => actualizar('status', status)}
                    disabled={guardando}
                  />
                  <Colapsable abierto={form.status === 'pausado'}>
                    <View style={[styles.colapsado, styles.sinMargenFinal]}>
                      <TextField
                        label="Motivo de la pausa"
                        value={form.motivo_pausa}
                        onChangeText={(valor) => actualizar('motivo_pausa', valor)}
                        placeholder="¿Por qué se detuvo el servicio?"
                        multiline
                        maxLength={MOTIVO_PAUSA_MAX}
                        error={errores.motivo_pausa}
                        helper={`Obligatorio al pausar · ${form.motivo_pausa.length}/${MOTIVO_PAUSA_MAX}`}
                        editable={!guardando}
                      />
                    </View>
                  </Colapsable>
                </View>
              </FormSection>,
            )}

            {seccion(
              'cliente',
              1,
              <FormSection
                numero={2}
                titulo={TITULO_SECCION.cliente}
                descripcion="Quién recibe el servicio y dónde."
                completa={completas.cliente}
              >
                <View style={styles.sinMargenFinal}>
                  <TextField
                    label="Nombre del cliente"
                    value={form.nombre_cliente}
                    onChangeText={(valor) => actualizar('nombre_cliente', valor)}
                    placeholder="Nombre completo del cliente"
                    leadingIcon={
                      <Avatar
                        iniciales={inicialesUsuarioDisplay(
                          form.nombre_cliente || orden.cliente_nombre || orden.cliente || '',
                          '?',
                        )}
                        size={28}
                        fondo={colors.primaryRing}
                        color={colors.primary}
                      />
                    }
                    autoComplete="name"
                    editable={!guardando}
                    error={errores.nombre_cliente}
                    helper="Puede ser distinto al titular de la cuenta."
                  />
                </View>
                <FormDivisor />
                <UbicacionField
                  value={form.direccion}
                  onChangeText={(valor) => actualizar('direccion', valor)}
                  onSeleccionarMapa={mapaDisponible() ? () => setMapaAbierto(true) : undefined}
                  disabled={guardando}
                />
              </FormSection>,
            )}

            {seccion(
              'trabajo',
              2,
              <FormSection
                numero={3}
                titulo={TITULO_SECCION.trabajo}
                descripcion="Describe qué se hizo en sitio."
                completa={completas.trabajo}
              >
                <View>
                  <TextField
                    label="Comentario técnico"
                    value={form.comentario_tecnico}
                    onChangeText={(valor) => actualizar('comentario_tecnico', valor)}
                    placeholder="Diagnóstico, trabajo realizado, pendientes…"
                    multiline
                    maxLength={COMENTARIO_TECNICO_MAX}
                    error={errores.comentario_tecnico}
                    editable={!guardando}
                    accessibilityHint={`Obligatorio. Mínimo ${COMENTARIO_TECNICO_MIN} caracteres.`}
                  />
                  <MinimoMeter actual={comentarioLen} minimo={COMENTARIO_TECNICO_MIN} />
                </View>
              </FormSection>,
            )}

            {seccion(
              'horario',
              3,
              <FormSection
                numero={4}
                titulo={TITULO_SECCION.horario}
                descripcion="Inicio y fin del servicio en campo."
                completa={completas.horario}
              >
                <HorarioOrdenEditor
                  fechaInicio={form.fecha_inicio}
                  horaInicio={form.hora_inicio}
                  fechaFinalizacion={form.fecha_finalizacion}
                  horaTermino={form.hora_termino}
                  errorFechaInicio={errores.fecha_inicio}
                  errorHoraInicio={errores.hora_inicio}
                  errorFechaFinalizacion={errores.fecha_finalizacion}
                  errorHoraTermino={errores.hora_termino}
                  onFechaInicio={(valor) => actualizar('fecha_inicio', valor)}
                  onHoraInicio={(valor) => actualizar('hora_inicio', valor)}
                  onFechaFinalizacion={(valor) => actualizar('fecha_finalizacion', valor)}
                  onHoraTermino={(valor) => actualizar('hora_termino', valor)}
                />
              </FormSection>,
            )}

            {seccion(
              'equipos',
              4,
              <FormSection
                numero={5}
                titulo={TITULO_SECCION.equipos}
                descripcion={
                  equipos.total > 0
                    ? `${equipos.entregados} de ${equipos.total} entregados`
                    : 'Esta orden no tiene equipos.'
                }
                meta={equipos.total > 0 ? `${equipos.instalados}/${equipos.total} instalados` : undefined}
                completa={completas.equipos}
              >
                <EquiposOrdenEditor
                  equipos={form.equipos_inventario}
                  canMarkInstalacion={puedeMarcarInstalacion}
                  disabled={guardando}
                  onChangeInstalacion={actualizarInstalacion}
                />
              </FormSection>,
            )}

            {seccion(
              'evidencia',
              5,
              <FormSection
                numero={6}
                titulo={TITULO_SECCION.evidencia}
                descripcion="Fotos del trabajo y firma de conformidad."
                completa={completas.evidencia}
              >
                <FormSubtitulo
                  icon={<IconCamera color={colors.inkMuted} size={14} />}
                  texto="Fotos"
                  meta={`${form.fotos_urls.length} / ${maxFotos}`}
                />
                <FotosEditor
                  urls={form.fotos_urls}
                  maxFotos={maxFotos}
                  onChange={(urls) => actualizar('fotos_urls', urls)}
                  disabled={guardando}
                />
                <FormDivisor />
                <FormSubtitulo
                  icon={<IconSignature color={colors.inkMuted} size={14} />}
                  texto="Firma del cliente"
                  meta={form.firma_cliente_url.trim() ? 'Capturada' : 'Pendiente'}
                />
                <SignaturePad
                  value={form.firma_cliente_url}
                  onChange={(url) => actualizar('firma_cliente_url', url)}
                  disabled={guardando}
                />
              </FormSection>,
            )}
          </ScrollView>
        </View>

        <View
          style={[
            styles.barra,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.line,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
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
                {dirty ? `${nCambios} ${nCambios === 1 ? 'cambio' : 'cambios'} sin guardar` : 'Sin cambios pendientes'}
              </Text>
            </View>
          )}
          <SubmitButton
            label="Guardar cambios"
            phase={fase}
            disabled={!dirty}
            onPress={() => void guardar()}
            accessibilityHint={dirty ? 'Guarda los cambios en la orden' : 'No hay cambios por guardar'}
          />
        </View>
      </KeyboardAvoidingView>

      {mapaDisponible() ? (
      <LocationMapModal
        visible={mapaAbierto}
        direccion={form.direccion}
        onClose={() => setMapaAbierto(false)}
        onConfirm={(mapsUrl) => {
          actualizar('direccion', mapsUrl);
          setMapaAbierto(false);
        }}
      />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  colapsado: { paddingTop: spacing.lg },
  /** `TextField` trae su propio margen inferior; al final de una tarjeta sobra. */
  sinMargenFinal: { marginBottom: -spacing.lg },
  barra: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  barraTexto: { ...type.caption, fontSize: 12, flex: 1 },
});
