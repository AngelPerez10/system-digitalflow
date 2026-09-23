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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toUserMessage } from '@/api/errors';
import { updateProyecto, uploadProyectoImage } from '@/api/proyectosApi';
import { useSession } from '@/auth/SessionProvider';
import { isAdmin } from '@/auth/permissions';
import { BarraCarga } from '@/components/BarraCarga';
import { Colapsable } from '@/components/Colapsable';
import { DateTimeField } from '@/components/DateTimeField';
import { EditarHeader } from '@/components/EditarHeader';
import { FormDivisor, FormSection, FormSubtitulo } from '@/components/FormSection';
import { FotosEditor } from '@/components/FotosEditor';
import {
  IconAlerta,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconClock,
  IconPerson,
  IconWrench,
} from '@/components/icons';
import { InfoSection } from '@/components/InfoSection';
import { SignaturePad } from '@/components/SignaturePad';
import { SiNoSegment } from '@/components/SiNoSegment';
import { ErrorState } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { CotizacionesResumen } from '@/features/proyectos/components/CotizacionesResumen';
import { EquiposProyectoEditor } from '@/features/proyectos/components/EquiposProyectoEditor';
import { FechasInicioEditor } from '@/features/proyectos/components/FechasInicioEditor';
import { NotasPorDiaEditor } from '@/features/proyectos/components/NotasPorDiaEditor';
import { PorcentajeAvance } from '@/features/proyectos/components/PorcentajeAvance';
import { EditarProyectoSkeleton } from '@/features/proyectos/components/ProyectoSkeletons';
import { ProyectoStatusSegment } from '@/features/proyectos/components/ProyectoStatusSegment';
import {
  MOTIVO_CANCELACION_MAX,
  MOTIVO_PAUSA_MAX,
  NOTA_DIA_MIN_CHARS,
  SECCIONES_PROYECTO,
  TITULO_SECCION_PROYECTO,
  construirPatch,
  contarCambios,
  crearNotaDia,
  formStateFromProyecto,
  hayErrores,
  primeraSeccionConErrorProyecto,
  seccionesCompletasProyecto,
  validarForm,
  type EditarProyectoErrors,
  type EditarProyectoFormState,
  type SeccionProyecto,
} from '@/features/proyectos/editarProyectoForm';
import { clienteDisplay, folioDisplay, proyectoTieneTipoAlarmas } from '@/features/proyectos/proyectoFormat';
import { useProyecto } from '@/features/proyectos/useProyecto';
import { useTheme } from '@/theme/ThemeProvider';
import { font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';

/** Bloques animados en orden de entrada: los pasos, recursos, cotizaciones y firmas. */
const BLOQUES = 9;

/**
 * Reporte de campo del proyecto — mismo lenguaje que el de órdenes: un solo
 * formulario con pasos numerados que se palomean solos al completarse, todo a
 * la vista. Las firmas cierran el formulario, siempre hasta abajo.
 */
export default function EditarProyectoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const { proyecto, cargando, error, recargar, aplicarProyecto } = useProyecto(
    Number.isFinite(proyectoId) ? proyectoId : null,
  );
  const { user } = useSession();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [form, setForm] = useState<EditarProyectoFormState | null>(null);
  const [formProyectoId, setFormProyectoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<EditarProyectoErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const entrance = useEntrance(BLOQUES);
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<SeccionProyecto, number>>>({});
  const saliendo = useRef(false);

  if (proyecto && formProyectoId !== proyecto.id) {
    setFormProyectoId(proyecto.id);
    setForm(formStateFromProyecto(proyecto));
  }

  const patch = useMemo(() => (proyecto && form ? construirPatch(proyecto, form) : {}), [proyecto, form]);
  const nCambios = proyecto && form ? contarCambios(proyecto, patch) : 0;
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

  if (cargando || (!proyecto && !error)) return <EditarProyectoSkeleton />;
  if (error || !proyecto) return <ErrorState message={error ?? 'Proyecto no encontrado.'} onRetry={recargar} />;
  if (!form) return <EditarProyectoSkeleton />;

  const folio = folioDisplay(proyecto);
  const esAlarmas = proyectoTieneTipoAlarmas(proyecto.tipos_trabajo);
  const admin = isAdmin(user);
  const completas = seccionesCompletasProyecto(form, proyecto);
  const nCompletas = SECCIONES_PROYECTO.filter((s) => completas[s]).length;
  const siguiente = SECCIONES_PROYECTO.find((s) => !completas[s]) ?? null;
  const extrasConContenido = Boolean(
    form.vehiculo_asignado.trim() ||
      form.herramientas_generales.trim() ||
      form.incidencias.trim() ||
      form.requerimientos_adicionales.trim() ||
      form.requiere_presupuesto_adicional,
  );
  const instalados = form.equipos.filter((e) => e.estadoInstalacion === 'instalado').length;
  const entregados = form.equipos.filter((e) => e.equipoEntregado).length;
  const notasLlenas = form.notas_por_dia.filter((n) => n.nota.trim()).length;
  const firmaCliente = Boolean(form.firma_cliente_url.trim());
  const firmaTecnico = Boolean(form.firma_tecnico_url.trim());

  const irASeccion = (seccion: SeccionProyecto) => {
    const y = posiciones.current[seccion] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - spacing.md, 0), animated: !reduced });
  };

  const actualizar = <K extends keyof EditarProyectoFormState>(campo: K, valor: EditarProyectoFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGuardado(null);
  };

  const guardar = async () => {
    const validacion = validarForm(form, proyecto);
    setErrores(validacion);
    if (hayErrores(validacion)) {
      setErrorGuardado('Revisa los campos marcados en rojo.');
      const seccion = primeraSeccionConErrorProyecto(validacion);
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
      const actualizado = await updateProyecto(proyecto.id, patch);
      aplicarProyecto(actualizado);
      setFase('success');
      saliendo.current = true;
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      router.back();
    } catch (err) {
      setErrorGuardado(toUserMessage(err));
      setFase('idle');
    }
  };

  const seccion = (clave: SeccionProyecto, indice: number, contenido: React.ReactNode) => (
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
      <Stack.Screen options={{ title: `Editar ${folio}`, headerShown: false }} />
      <StatusBar style="light" />

      <EditarHeader
        eyebrow="Editar proyecto"
        folio={folio}
        cliente={clienteDisplay(proyecto)}
        volverLabel="Volver al detalle del proyecto"
        dirty={dirty}
        completadas={nCompletas}
        total={SECCIONES_PROYECTO.length}
        siguiente={siguiente ? TITULO_SECCION_PROYECTO[siguiente] : null}
        onVolver={pedirSalida}
        onIrSiguiente={() => siguiente && irASeccion(siguiente)}
        mostrarProgreso={false}
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
            accessibilityLabel={`Formulario para editar el proyecto ${folio}`}
          >
            {seccion(
              'estatus',
              0,
              <FormSection
                numero={1}
                titulo="Estatus"
                descripcion="¿En qué punto está el proyecto?"
                completa={completas.estatus}
              >
                <View>
                  <ProyectoStatusSegment
                    value={form.status}
                    permiteCancelar={admin}
                    onChange={(status) => actualizar('status', status)}
                  />
                  <Colapsable abierto={form.status === 'pausado'}>
                    <View style={[styles.colapsado, styles.sinMargenFinal]}>
                      <TextField
                        label="Motivo de la pausa"
                        value={form.motivo_pausa}
                        onChangeText={(valor) => actualizar('motivo_pausa', valor)}
                        placeholder="¿Por qué se detuvo el proyecto?"
                        multiline
                        maxLength={MOTIVO_PAUSA_MAX}
                        error={errores.motivo_pausa}
                        helper={`Obligatorio al pausar · ${form.motivo_pausa.length}/${MOTIVO_PAUSA_MAX}`}
                        editable={!guardando}
                      />
                    </View>
                  </Colapsable>
                  {/* Solo admin: el técnico no puede elegir «Cancelado» (`permiteCancelar`). */}
                  <Colapsable abierto={form.status === 'cancelado' && admin}>
                    <View style={[styles.colapsado, styles.sinMargenFinal]}>
                      <TextField
                        label="Motivo de la cancelación"
                        value={form.motivo_cancelacion}
                        onChangeText={(valor) => actualizar('motivo_cancelacion', valor)}
                        placeholder="¿Por qué se canceló el proyecto?"
                        multiline
                        maxLength={MOTIVO_CANCELACION_MAX}
                        error={errores.motivo_cancelacion}
                        helper={`Obligatorio al cancelar · ${form.motivo_cancelacion.length}/${MOTIVO_CANCELACION_MAX}`}
                        editable={!guardando}
                      />
                    </View>
                  </Colapsable>
                </View>
                {esAlarmas ? (
                  <>
                    <FormDivisor />
                    <SiNoSegment
                      label="¿Cuenta con monitoreo?"
                      value={form.monitoreo}
                      onChange={(valor) => actualizar('monitoreo', valor)}
                      disabled={guardando}
                      required
                      error={errores.monitoreo}
                    />
                  </>
                ) : null}
              </FormSection>,
            )}

            {seccion(
              'jornadas',
              1,
              <FormSection
                numero={2}
                titulo="Jornadas"
                descripcion="Días de trabajo y horario en sitio."
                completa={completas.jornadas}
              >
                <FormSubtitulo
                  icon={<IconCalendar color={colors.inkMuted} size={14} />}
                  texto="Días de trabajo"
                  meta={form.fechas_inicio.length ? `${form.fechas_inicio.length}` : undefined}
                />
                <FechasInicioEditor
                  fechas={form.fechas_inicio}
                  onChange={(fechas) => {
                    actualizar('fechas_inicio', fechas);
                    if (fechas.length > form.notas_por_dia.length) {
                      const faltantes = fechas.length - form.notas_por_dia.length;
                      const nuevas = Array.from({ length: faltantes }, () => crearNotaDia());
                      actualizar('notas_por_dia', [...form.notas_por_dia, ...nuevas]);
                    }
                  }}
                  error={errores.fechas_inicio}
                />
                <Text style={[styles.ayuda, { color: colors.inkSubtle }]}>
                  Cada día del periodo agrega un día a la bitácora.
                </Text>
                <FormDivisor />
                <FormSubtitulo icon={<IconClock color={colors.inkMuted} size={14} />} texto="Horario en sitio" />
                <View style={styles.filaCeldas}>
                  <DateTimeField
                    label="Llegada"
                    mode="time"
                    value={form.hora_llegada}
                    onChange={(valor) => actualizar('hora_llegada', valor)}
                    error={errores.hora_llegada}
                  />
                  <DateTimeField
                    label="Salida"
                    mode="time"
                    value={form.hora_salida}
                    onChange={(valor) => actualizar('hora_salida', valor)}
                    error={errores.hora_salida}
                  />
                </View>
                <FormDivisor />
                <DateTimeField
                  label="Fecha de autorización"
                  mode="date"
                  value={form.fecha_autorizacion}
                  onChange={(valor) => actualizar('fecha_autorizacion', valor)}
                  error={errores.fecha_autorizacion}
                  disabled={!admin}
                  helper={!admin ? 'La define oficina.' : undefined}
                  accessibilityLabel="Fecha de autorización"
                />
              </FormSection>,
            )}

            {seccion(
              'equipos',
              2,
              <FormSection
                numero={3}
                titulo="Equipos"
                descripcion={
                  form.equipos.length > 0
                    ? `${entregados} de ${form.equipos.length} entregados`
                    : 'Este proyecto no tiene equipos.'
                }
                meta={form.equipos.length > 0 ? `${instalados}/${form.equipos.length} instalados` : undefined}
                completa={completas.equipos}
              >
                <EquiposProyectoEditor
                  equipos={form.equipos}
                  disabled={guardando}
                  onChangeGrupo={(lineaIds, patchEquipo) =>
                    actualizar(
                      'equipos',
                      form.equipos.map((eq) => (lineaIds.includes(eq.lineaId) ? { ...eq, ...patchEquipo } : eq)),
                    )
                  }
                />
              </FormSection>,
            )}

            {seccion(
              'bitacora',
              3,
              <FormSection
                numero={4}
                titulo="Bitácora"
                descripcion={
                  form.status === 'cerrado'
                    ? `Para cerrar, cada día necesita al menos ${NOTA_DIA_MIN_CHARS} caracteres.`
                    : 'Qué se hizo cada día, con fotos del avance.'
                }
                meta={form.notas_por_dia.length > 0 ? `${notasLlenas}/${form.notas_por_dia.length} días` : undefined}
                completa={completas.bitacora}
              >
                <NotasPorDiaEditor
                  notas={form.notas_por_dia}
                  errores={errores.notas_por_dia}
                  disabled={guardando}
                  requiereMinimo={form.status === 'cerrado'}
                  onChange={(notas) => actualizar('notas_por_dia', notas)}
                />
              </FormSection>,
            )}

            {seccion(
              'avance',
              4,
              <FormSection
                numero={5}
                titulo="Avance"
                descripcion="¿Qué tanto del proyecto está terminado?"
                meta={`${form.porcentaje_avance}%`}
                completa={completas.avance}
              >
                <PorcentajeAvance
                  value={form.porcentaje_avance}
                  disabled={guardando}
                  onChange={(valor) => actualizar('porcentaje_avance', valor)}
                />
              </FormSection>,
            )}

            {seccion(
              'fotos',
              5,
              <FormSection
                numero={6}
                titulo="Fotos del trabajo"
                descripcion="Evidencia del resultado final."
                meta={`${form.evidencias_urls.length} / 10`}
                completa={completas.fotos}
              >
                <FotosEditor
                  urls={form.evidencias_urls}
                  maxFotos={10}
                  disabled={guardando}
                  subirFoto={(dataUrl) => uploadProyectoImage(dataUrl, 'proyectos/evidencias')}
                  onChange={(urls) => actualizar('evidencias_urls', urls)}
                />
              </FormSection>,
            )}

            {seccion(
              'extras',
              6,
              <FormSection
                numero={7}
                titulo="Recursos e incidencias"
                descripcion="Opcional · vehículo, herramientas y lo que salió distinto."
                completa={extrasConContenido}
              >
                <FormSubtitulo icon={<IconWrench color={colors.inkMuted} size={14} />} texto="Recursos" />
                <View style={styles.campos}>
                  <TextField
                    label="Vehículo asignado"
                    value={form.vehiculo_asignado}
                    onChangeText={(valor) => actualizar('vehiculo_asignado', valor)}
                    placeholder="Placas o unidad"
                    editable={!guardando}
                  />
                  <TextField
                    label="Herramientas generales"
                    value={form.herramientas_generales}
                    onChangeText={(valor) => actualizar('herramientas_generales', valor)}
                    placeholder="Lista breve de herramientas o equipo"
                    multiline
                    editable={!guardando}
                  />
                </View>
                <FormDivisor />
                <FormSubtitulo icon={<IconAlerta color={colors.inkMuted} size={14} />} texto="Incidencias" />
                <View style={styles.campos}>
                  <TextField
                    label="¿Qué salió distinto?"
                    value={form.incidencias}
                    onChangeText={(valor) => actualizar('incidencias', valor)}
                    placeholder="Algo que no salió como se planeó"
                    multiline
                    editable={!guardando}
                  />
                  <TextField
                    label="Requerimientos adicionales"
                    value={form.requerimientos_adicionales}
                    onChangeText={(valor) => actualizar('requerimientos_adicionales', valor)}
                    placeholder="Trabajo fuera del alcance original, si aplica"
                    multiline
                    error={errores.requerimientos_adicionales}
                    editable={!guardando}
                  />
                </View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.requiere_presupuesto_adicional, disabled: guardando }}
                  accessibilityLabel="Requiere presupuesto adicional"
                  disabled={guardando}
                  onPress={() => actualizar('requiere_presupuesto_adicional', !form.requiere_presupuesto_adicional)}
                  style={({ pressed }) => [
                    styles.check,
                    {
                      borderColor: form.requiere_presupuesto_adicional ? colors.primary : colors.line,
                      backgroundColor: form.requiere_presupuesto_adicional
                        ? colors.primaryRing
                        : pressed
                          ? colors.surfaceSunken
                          : colors.surface,
                    },
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
                    {form.requiere_presupuesto_adicional ? <IconCheck color={colors.onPrimary} size={12} /> : null}
                  </View>
                  <View style={styles.checkTextos}>
                    <Text style={[styles.checkTitulo, { color: colors.ink }]}>Requiere presupuesto adicional</Text>
                    <Text style={[styles.checkAyuda, { color: colors.inkSubtle }]}>
                      Oficina vincula la cotización antes de cerrar.
                    </Text>
                  </View>
                </Pressable>
              </FormSection>,
            )}

            <Animated.View style={entrance(7)}>
              <InfoSection
                icon={(c) => <IconClipboard color={c} size={15} />}
                titulo="Cotizaciones vinculadas"
                tono={{ bg: colors.goldSoftBg, fg: colors.goldSoftText }}
                meta={proyecto.cotizaciones.length ? `${proyecto.cotizaciones.length}` : undefined}
              >
                <CotizacionesResumen bloques={proyecto.cotizaciones} />
                <Text style={[styles.ayuda, { color: colors.inkSubtle }]}>
                  Solo lectura — vincular o quitar cotizaciones es tarea de oficina.
                </Text>
              </InfoSection>
            </Animated.View>

            {/* Las firmas cierran el reporte: siempre lo último, hasta abajo. */}
            {seccion(
              'firmas',
              8,
              <FormSection
                numero={8}
                titulo="Firmas de conformidad"
                descripcion="Se recaban al final, con el reporte ya capturado."
                meta={`${Number(firmaCliente) + Number(firmaTecnico)} / 2`}
                completa={completas.firmas}
              >
                <Firmante rol="Cliente" detalle="Recibe el trabajo de conformidad" firmada={firmaCliente} />
                <SignaturePad
                  value={form.firma_cliente_url}
                  onChange={(url) => actualizar('firma_cliente_url', url)}
                  disabled={guardando}
                />
                <FormDivisor />
                <Firmante rol="Técnico responsable" detalle="Confirma que el reporte es correcto" firmada={firmaTecnico} />
                <SignaturePad
                  value={form.firma_tecnico_url}
                  onChange={(url) => actualizar('firma_tecnico_url', url)}
                  disabled={guardando}
                />
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
                {dirty ? `${nCambios} ${nCambios === 1 ? 'cambio' : 'cambios'} sin guardar` : 'Sin cambios pendientes'}
              </Text>
            </View>
          )}
          <SubmitButton
            label="Guardar cambios"
            phase={fase}
            disabled={!dirty}
            onPress={() => void guardar()}
            accessibilityHint={dirty ? 'Guarda los cambios en el proyecto' : 'No hay cambios por guardar'}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Quién firma, para qué y si ya firmó. La pastilla cambia de «Pendiente» a
 * «Firmada» con un pequeño rebote al capturarse la firma.
 */
function Firmante({ rol, detalle, firmada }: { rol: string; detalle: string; firmada: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const previa = useRef(firmada);

  useEffect(() => {
    if (previa.current === firmada) return;
    previa.current = firmada;
    if (reduced || !firmada) return;
    escala.setValue(0.85);
    const anim = Animated.spring(escala, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [firmada, reduced, escala]);

  return (
    <View style={styles.firmante} accessible accessibilityLabel={`${rol}, ${firmada ? 'firmada' : 'firma pendiente'}`}>
      <View style={[styles.firmanteAvatar, { backgroundColor: colors.surfaceSunken }]}>
        <IconPerson color={colors.inkMuted} size={15} />
      </View>
      <View style={styles.firmanteTextos}>
        <Text style={[styles.firmanteRol, { color: colors.ink }]}>{rol}</Text>
        <Text style={[styles.firmanteDetalle, { color: colors.inkSubtle }]}>{detalle}</Text>
      </View>
      <Animated.View
        style={[
          styles.firmanteEstado,
          {
            backgroundColor: firmada ? colors.statusResueltoBg : colors.statusPendienteBg,
            transform: [{ scale: escala }],
          },
        ]}
      >
        {firmada ? <IconCheck color={colors.statusResueltoText} size={11} /> : null}
        <Text
          style={[styles.firmanteEstadoTexto, { color: firmada ? colors.statusResueltoText : colors.statusPendienteText }]}
        >
          {firmada ? 'Firmada' : 'Pendiente'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  colapsado: { paddingTop: spacing.lg },
  /** `TextField` trae su propio margen inferior; al final de una tarjeta sobra. */
  sinMargenFinal: { marginBottom: -spacing.lg },
  campos: { marginBottom: -spacing.lg },
  ayuda: { ...type.caption, fontSize: 12 },
  filaCeldas: { flexDirection: 'row', gap: spacing.sm },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkCaja: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkTextos: { flex: 1, gap: 1 },
  checkTitulo: { ...type.bodyMedium, fontFamily: font.semibold, fontSize: 14 },
  checkAyuda: { ...type.caption, fontSize: 12 },
  firmante: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  firmanteAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  firmanteTextos: { flex: 1, minWidth: 0 },
  firmanteRol: { ...type.label, fontFamily: font.semibold, fontSize: 14 },
  firmanteDetalle: { ...type.caption, fontSize: 12, lineHeight: 16 },
  firmanteEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  firmanteEstadoTexto: { fontFamily: font.semibold, fontSize: 11 },
  barra: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  barraTexto: { ...type.caption, fontSize: 12, flex: 1 },
});
