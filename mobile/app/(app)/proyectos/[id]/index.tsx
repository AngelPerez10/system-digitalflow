import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule } from '@/auth/permissions';
import { FotosGaleria } from '@/components/FotosGaleria';
import { IconAlerta, IconBox, IconCamera, IconEditar, IconSignature, IconVisto } from '@/components/icons';
import { ReportePdf } from '@/components/ReportePdf';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { ErrorState } from '@/components/StateViews';
import { BitacoraTimeline } from '@/features/proyectos/components/BitacoraTimeline';
import { CotizacionesResumen } from '@/features/proyectos/components/CotizacionesResumen';
import { EquiposProyectoLista } from '@/features/proyectos/components/EquiposProyectoLista';
import { EquipoTrabajo } from '@/features/proyectos/components/EquipoTrabajo';
import { FirmasProyectoTarjeta } from '@/features/proyectos/components/FirmasProyectoTarjeta';
import { JornadasCalendario } from '@/features/proyectos/components/JornadasCalendario';
import { ProyectoDetalleHeader } from '@/features/proyectos/components/ProyectoDetalleHeader';
import { DetalleProyectoSkeleton } from '@/features/proyectos/components/ProyectoSkeletons';
import { diasDeTrabajo, folioDisplay, proyectoTieneTipoAlarmas, statusLabel } from '@/features/proyectos/proyectoFormat';
import { useProyecto } from '@/features/proyectos/useProyecto';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';

type Pestana = 'resumen' | 'equipos' | 'bitacora' | 'evidencia';

/** Grupo estilo «lista agrupada»: etiqueta chica afuera, tarjeta blanca adentro. */
function Grupo({
  titulo,
  meta,
  children,
  compacto = false,
}: {
  titulo: string;
  meta?: string;
  children: React.ReactNode;
  /** Sin padding vertical (para filas a ras de borde). */
  compacto?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <View style={styles.grupoCabeza}>
        <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
          {titulo}
        </Text>
        {meta ? <Text style={[styles.grupoMeta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
      </View>
      <View
        style={[
          styles.grupoTarjeta,
          compacto ? styles.grupoCompacto : null,
          { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Fila etiqueta → valor dentro de un grupo compacto. */
function Fila({ label, valor, primera = false }: { label: string; valor: string; primera?: boolean }) {
  const { colors } = useTheme();
  const vacio = valor === '—';
  return (
    <View
      style={[styles.fila, !primera ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null]}
      accessible
      accessibilityLabel={`${label}: ${vacio ? 'sin dato' : valor}`}
    >
      <Text style={[styles.filaLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.filaValor, { color: vacio ? colors.inkSubtle : colors.ink }]}>{vacio ? 'Sin dato' : valor}</Text>
    </View>
  );
}

/** Barra de piezas (entregadas / instaladas). */
function BarraPiezas({
  icon,
  label,
  hecho,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  hecho: number;
  total: number;
  color: string;
}) {
  const { colors } = useTheme();
  const completa = total > 0 && hecho >= total;
  const pct = total > 0 ? Math.min(100, Math.round((hecho / total) * 100)) : 0;
  return (
    <View
      style={styles.barra}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: hecho, text: `${hecho} de ${total}` }}
    >
      <View style={styles.barraCabeza}>
        <View style={styles.barraLabelFila}>
          {icon}
          <Text style={[styles.barraLabel, { color: colors.inkMuted }]}>{label}</Text>
        </View>
        <Text style={[styles.barraValor, { color: completa ? colors.statusResueltoText : colors.ink }]}>
          {hecho}
          <Text style={{ color: colors.inkSubtle }}> / {total}</Text>
        </Text>
      </View>
      <View style={[styles.barraPista, { backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.barraRelleno, { width: `${pct}%`, backgroundColor: completa ? colors.statusResueltoText : color }]} />
      </View>
    </View>
  );
}

/** Aparece suave al montar (cada cambio de pestaña remonta el contenido). */
function Aparecer({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, reduced]);
  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }], gap: spacing.xl }}
    >
      {children}
    </Animated.View>
  );
}

function Vacio({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.vacio}>
      <View style={[styles.vacioIcono, { backgroundColor: colors.surfaceSunken }]}>{icon}</View>
      <Text style={[styles.vacioTitulo, { color: colors.ink }]}>{titulo}</Text>
      <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>{texto}</Text>
    </View>
  );
}

const piezasDe = (cantidad: number) => Math.max(1, cantidad || 1);

/**
 * Detalle del proyecto: cabecera editorial y cuatro pestañas (Resumen,
 * Equipos, Bitácora, Evidencia) en lugar de una columna larga de secciones.
 * Las pestañas se quedan pegadas arriba al desplazar; «Editar» vive fijo abajo.
 */
export default function DetalleProyectoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const { proyecto, cargando, error, recargar } = useProyecto(Number.isFinite(proyectoId) ? proyectoId : null);
  const { user, permissions } = useSession();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const scrollRef = useRef<ScrollView>(null);

  if (cargando) return <DetalleProyectoSkeleton />;
  if (error || !proyecto) return <ErrorState message={error ?? 'Proyecto no encontrado.'} onRetry={recargar} />;

  const puedeEditar = canEditModule(permissions, user, 'proyectos');
  const folio = folioDisplay(proyecto);
  const dias = diasDeTrabajo(proyecto);
  const piezas = proyecto.equipos.reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const entregadas = proyecto.equipos.filter((e) => e.equipoEntregado).reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const instaladas = proyecto.equipos
    .filter((e) => e.estadoInstalacion === 'instalado')
    .reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const notas = proyecto.notas_por_dia.filter((n) => n.nota.trim() || n.imagenesUrls.length > 0).length;
  const firmas = [proyecto.firma_cliente_url, proyecto.firma_tecnico_url].filter(Boolean).length;
  const evidencias = proyecto.evidencias_urls.length + firmas;
  const personas = proyecto.tecnicos.length + proyecto.auxiliares.length;
  const hayIncidencias = Boolean(
    proyecto.incidencias || proyecto.requerimientos_adicionales || proyecto.requiere_presupuesto_adicional,
  );

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const esAlarmas = proyectoTieneTipoAlarmas(proyecto.tipos_trabajo);
  const detalles = [
    { label: 'Tipo de trabajo', valor: proyecto.tipos_trabajo.map((t) => t.nombre).join(', ') || '—' },
    ...(esAlarmas
      ? [
          {
            label: 'Monitoreo',
            valor: proyecto.monitoreo === true ? 'Sí cuenta' : proyecto.monitoreo === false ? 'No cuenta' : 'Pendiente',
          },
        ]
      : []),
    { label: 'Autorizado', valor: proyecto.fecha_autorizacion ? formatFecha(proyecto.fecha_autorizacion) : '—' },
    { label: 'Autorizó', valor: proyecto.quien_autorizo?.trim() || '—' },
    ...(proyecto.vehiculo_asignado ? [{ label: 'Vehículo', valor: proyecto.vehiculo_asignado }] : []),
    ...(proyecto.herramientas_generales ? [{ label: 'Herramientas', valor: proyecto.herramientas_generales }] : []),
  ];

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(proyecto.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <ProyectoDetalleHeader proyecto={proyecto} onVolver={() => router.back()} />

      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityLabel={`Detalle del proyecto ${folio}`}
      >
        <View style={[styles.tabsCaja, { backgroundColor: colors.canvas }]}>
          <SegmentedTabs<Pestana>
            accessibilityLabel="Secciones del proyecto"
            value={pestana}
            onChange={cambiarPestana}
            tabs={[
              { key: 'resumen', label: 'Resumen' },
              { key: 'equipos', label: 'Equipos', badge: piezas },
              { key: 'bitacora', label: 'Bitácora', badge: notas },
              { key: 'evidencia', label: 'Evidencia', badge: evidencias },
            ]}
          />
        </View>

        <View style={styles.contenido}>
          {pestana === 'resumen' ? (
            <Aparecer key="resumen">
              {proyecto.status === 'pausado' && proyecto.motivo_pausa ? (
                <View style={[styles.aviso, { backgroundColor: colors.statusPausadoBg }]}>
                  <IconAlerta color={colors.statusPausadoText} size={15} />
                  <View style={styles.avisoTextos}>
                    <Text style={[styles.avisoTitulo, { color: colors.statusPausadoText }]}>Proyecto pausado</Text>
                    <Text style={[styles.avisoTexto, { color: colors.ink }]}>{proyecto.motivo_pausa}</Text>
                  </View>
                </View>
              ) : null}

              <Grupo titulo="Equipo de trabajo" meta={personas ? `${personas}` : undefined}>
                <EquipoTrabajo proyecto={proyecto} />
              </Grupo>

              <Grupo
                titulo="Jornadas"
                meta={dias.total ? `${dias.total} ${dias.total === 1 ? 'día' : 'días'}` : undefined}
              >
                <JornadasCalendario fechas={proyecto.fechas_inicio} />
                {dias.enBitacora !== dias.programados && dias.enBitacora > 0 ? (
                  <Text style={[styles.nota, { color: colors.inkSubtle }]}>
                    {dias.programados} {dias.programados === 1 ? 'día programado' : 'días programados'} ·{' '}
                    {dias.enBitacora} {dias.enBitacora === 1 ? 'registrado' : 'registrados'} en bitácora
                  </Text>
                ) : null}
                <View style={[styles.horario, { borderTopColor: colors.line }]}>
                  <View style={styles.hora}>
                    <Text style={[styles.horaLabel, { color: colors.inkSubtle }]}>Llegada</Text>
                    <Text style={[styles.horaValor, { color: proyecto.hora_llegada ? colors.ink : colors.inkSubtle }]}>
                      {proyecto.hora_llegada ? formatHora(proyecto.hora_llegada) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.horaDivisor, { backgroundColor: colors.line }]} />
                  <View style={styles.hora}>
                    <Text style={[styles.horaLabel, { color: colors.inkSubtle }]}>Salida</Text>
                    <Text style={[styles.horaValor, { color: proyecto.hora_salida ? colors.ink : colors.inkSubtle }]}>
                      {proyecto.hora_salida ? formatHora(proyecto.hora_salida) : '—'}
                    </Text>
                  </View>
                </View>
              </Grupo>

              <Grupo titulo="Detalles" compacto>
                {detalles.map((d, i) => (
                  <Fila key={d.label} label={d.label} valor={d.valor} primera={i === 0} />
                ))}
              </Grupo>

              <Grupo titulo="Cotizaciones" meta={proyecto.cotizaciones.length ? `${proyecto.cotizaciones.length}` : undefined}>
                <CotizacionesResumen bloques={proyecto.cotizaciones} />
              </Grupo>

              {hayIncidencias ? (
                <Grupo titulo="Incidencias y requerimientos">
                  {proyecto.incidencias ? (
                    <View style={styles.bloque}>
                      <Text style={[styles.bloqueLabel, { color: colors.inkSubtle }]}>Incidencias</Text>
                      <Text style={[styles.bloqueTexto, { color: colors.ink }]}>{proyecto.incidencias}</Text>
                    </View>
                  ) : null}
                  {proyecto.requerimientos_adicionales ? (
                    <View style={styles.bloque}>
                      <Text style={[styles.bloqueLabel, { color: colors.inkSubtle }]}>Requerimientos adicionales</Text>
                      <Text style={[styles.bloqueTexto, { color: colors.ink }]}>{proyecto.requerimientos_adicionales}</Text>
                    </View>
                  ) : null}
                  {proyecto.requiere_presupuesto_adicional && !proyecto.cotizacion_adicional ? (
                    <View style={[styles.presupuesto, { backgroundColor: colors.dangerBg }]}>
                      <IconAlerta color={colors.danger} size={13} />
                      <Text style={[styles.presupuestoTexto, { color: colors.danger }]}>
                        Requiere presupuesto adicional — pendiente de vincular por oficina.
                      </Text>
                    </View>
                  ) : null}
                </Grupo>
              ) : null}

              <Grupo titulo="Reporte PDF">
                <ReportePdf
                  base={`/proyectos/${proyecto.id}`}
                  nombreArchivo={`Proyecto_${folio}.pdf`}
                  meta={`Reporte del proyecto · ${statusLabel(proyecto.status)}`}
                  documento={`el reporte del proyecto ${folio}`}
                />
              </Grupo>
            </Aparecer>
          ) : null}

          {pestana === 'equipos' ? (
            <Aparecer key="equipos">
              {piezas > 0 ? (
                <Grupo titulo="Progreso" meta={`${piezas} ${piezas === 1 ? 'pieza' : 'piezas'}`}>
                  <BarraPiezas
                    icon={<IconBox color={colors.inkSubtle} size={13} />}
                    label="Entregados"
                    hecho={entregadas}
                    total={piezas}
                    color={colors.primary}
                  />
                  <BarraPiezas
                    icon={<IconVisto color={colors.inkSubtle} size={13} />}
                    label="Instalados"
                    hecho={instaladas}
                    total={piezas}
                    color={colors.success}
                  />
                </Grupo>
              ) : null}
              <Grupo titulo="Lista de equipos">
                <EquiposProyectoLista equipos={proyecto.equipos} />
              </Grupo>
            </Aparecer>
          ) : null}

          {pestana === 'bitacora' ? (
            <Aparecer key="bitacora">
              <BitacoraTimeline notas={proyecto.notas_por_dia} fechas={proyecto.fechas_inicio} />
            </Aparecer>
          ) : null}

          {pestana === 'evidencia' ? (
            <Aparecer key="evidencia">
              {evidencias === 0 ? (
                <Vacio
                  icon={<IconCamera color={colors.inkSubtle} size={20} />}
                  titulo="Sin evidencia todavía"
                  texto="Las fotos de evidencia y las firmas aparecen aquí al editar el proyecto."
                />
              ) : (
                <>
                  <Grupo
                    titulo="Fotos"
                    meta={proyecto.evidencias_urls.length ? `${proyecto.evidencias_urls.length}` : undefined}
                  >
                    {proyecto.evidencias_urls.length > 0 ? (
                      <FotosGaleria urls={proyecto.evidencias_urls} />
                    ) : (
                      <Text style={[styles.sinDato, { color: colors.inkSubtle }]}>Sin fotos de evidencia.</Text>
                    )}
                  </Grupo>
                  <Grupo titulo="Firmas" meta={firmas ? `${firmas} de 2` : undefined}>
                    {firmas > 0 ? (
                      <FirmasProyectoTarjeta firmaCliente={proyecto.firma_cliente_url} firmaTecnico={proyecto.firma_tecnico_url} />
                    ) : (
                      <View style={styles.sinFirmas}>
                        <IconSignature color={colors.inkSubtle} size={15} />
                        <Text style={[styles.sinDato, { color: colors.inkSubtle }]}>Aún no hay firmas.</Text>
                      </View>
                    )}
                  </Grupo>
                </>
              )}
            </Aparecer>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.barraInferior,
          { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {puedeEditar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar proyecto"
            accessibilityHint="Abre el formulario de campo"
            onPress={() => router.push(`/proyectos/${proyecto.id}/editar` as Href)}
            style={({ pressed }) => [styles.botonEditar, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
          >
            <IconEditar color={colors.onPrimary} size={16} />
            <Text style={[styles.botonEditarTexto, { color: colors.onPrimary }]}>Editar proyecto</Text>
          </Pressable>
        ) : (
          <Text style={[styles.sinPermiso, { color: colors.inkSubtle }]}>Tu cuenta no tiene permiso para editar proyectos.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  tabsCaja: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  grupo: { gap: spacing.sm },
  grupoCabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  grupoTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  grupoMeta: { ...type.mono, fontSize: 12 },
  grupoTarjeta: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  grupoCompacto: { paddingVertical: 0, paddingHorizontal: spacing.lg, gap: 0 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.md },
  filaLabel: { ...type.body, fontSize: 14 },
  filaValor: { ...type.bodyMedium, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  horario: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  hora: { flex: 1, alignItems: 'center', gap: 2 },
  horaLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase' },
  horaValor: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  horaDivisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  avisoTextos: { flex: 1, gap: 2 },
  avisoTitulo: { ...type.label, fontFamily: font.semibold },
  avisoTexto: { ...type.body, fontSize: 14, lineHeight: 20 },
  bloque: { gap: 2 },
  bloqueLabel: { ...type.caption, fontSize: 12 },
  bloqueTexto: { ...type.body, lineHeight: 22 },
  presupuesto: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  presupuestoTexto: { ...type.caption, flex: 1, fontFamily: font.medium },
  barra: { gap: 6 },
  barraCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barraLabelFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barraLabel: { ...type.label, fontSize: 13 },
  barraValor: { fontFamily: font.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  barraPista: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4 },
  vacio: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.xs },
  vacioIcono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 15 },
  vacioTexto: { ...type.caption, textAlign: 'center', paddingHorizontal: spacing.xl },
  sinDato: { ...type.caption },
  nota: { ...type.caption, fontSize: 12 },
  sinFirmas: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barraInferior: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  botonEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
  },
  botonEditarTexto: { ...type.button },
  sinPermiso: { ...type.caption, textAlign: 'center', paddingVertical: spacing.sm },
});
