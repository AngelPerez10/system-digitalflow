import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule } from '@/auth/permissions';
import { Avatar } from '@/components/Avatar';
import {
  DatosAvance,
  DatosPersonas,
  DatosRejilla,
  DetalleBarraSuperior,
  DetallePortada,
  estiloTraslape,
  HojaDatos,
  type PersonaDato,
} from '@/components/DetalleChrome';
import { FotosGaleria } from '@/components/FotosGaleria';
import {
  IconAlerta,
  IconBox,
  IconCalendar,
  IconCamera,
  IconClock,
  IconPerson,
  IconSignature,
  IconVisto,
} from '@/components/icons';
import { DocumentoPdf } from '@/components/DocumentoPdf';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { ErrorState } from '@/components/StateViews';
import { BitacoraTimeline } from '@/features/proyectos/components/BitacoraTimeline';
import { CotizacionesResumen } from '@/features/proyectos/components/CotizacionesResumen';
import { EquiposProyectoLista } from '@/features/proyectos/components/EquiposProyectoLista';
import { FirmasProyectoTarjeta } from '@/features/proyectos/components/FirmasProyectoTarjeta';
import { DetallesProyecto } from '@/features/proyectos/components/DetallesProyecto';
import { JornadasPanel } from '@/features/proyectos/components/JornadasPanel';
import { colorPorAvance } from '@/features/proyectos/components/PorcentajeAvance';
import { ProyectoStatusIcon } from '@/features/proyectos/components/ProyectoStatusIcon';
import { DetalleProyectoSkeleton } from '@/features/proyectos/components/ProyectoSkeletons';
import {
  clienteDisplay,
  diasDeTrabajo,
  folioDisplay,
  personasDelEquipo,
  primeraFechaInicio,
  ROL_EQUIPO_LABEL,
  statusLabel,
  statusTone,
} from '@/features/proyectos/proyectoFormat';
import { useProyecto } from '@/features/proyectos/useProyecto';
import { usePdfDocumento } from '@/hooks/usePdfDocumento';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
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
 * Detalle del proyecto, mismo esquema que Órdenes y Reportes: portada marina
 * (cliente, estatus, folio, avance) que se aleja al desplazar, barra fija con
 * «Editar», y la hoja «Datos del proyecto» montada sobre la portada (jornadas,
 * horario, equipo y avance). Debajo, las cuatro pestañas (se quedan pegadas
 * arriba al desplazar).
 */
export default function DetalleProyectoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const { proyecto, cargando, error, recargar } = useProyecto(Number.isFinite(proyectoId) ? proyectoId : null);

  // Al volver de editar se recarga en segundo plano: el contenido se queda y se actualiza en su lugar.
  if (!proyecto && (cargando || !error)) return <DetalleProyectoSkeleton />;
  if (!proyecto) return <ErrorState message={error ?? 'Proyecto no encontrado.'} onRetry={recargar} />;
  return <DetalleProyecto proyecto={proyecto} />;
}

function DetalleProyecto({ proyecto }: { proyecto: Proyecto }) {
  const router = useRouter();
  const { user, permissions } = useSession();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  /** Posición de las pestañas en el contenido: al cambiar de pestaña se vuelve aquí, no al tope. */
  const yPestanas = useRef(0);

  const puedeEditar = canEditModule(permissions, user, 'proyectos');
  const folio = folioDisplay(proyecto);
  const cliente = clienteDisplay(proyecto);
  const dias = diasDeTrabajo(proyecto);
  const pct = Math.max(0, Math.min(100, Math.round(proyecto.porcentaje_avance)));
  const piezas = proyecto.equipos.reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const entregadas = proyecto.equipos.filter((e) => e.equipoEntregado).reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const instaladas = proyecto.equipos
    .filter((e) => e.estadoInstalacion === 'instalado')
    .reduce((acc, e) => acc + piezasDe(e.cantidad), 0);
  const notas = proyecto.notas_por_dia.filter((n) => n.nota.trim() || n.imagenesUrls.length > 0).length;
  const firmas = [proyecto.firma_cliente_url, proyecto.firma_tecnico_url].filter(Boolean).length;
  const evidencias = proyecto.evidencias_urls.length + firmas;
  const hayIncidencias = Boolean(
    proyecto.incidencias || proyecto.requerimientos_adicionales || proyecto.requiere_presupuesto_adicional,
  );
  const primera = primeraFechaInicio(proyecto);
  const llegada = proyecto.hora_llegada ? formatHora(proyecto.hora_llegada) : null;
  const salida = proyecto.hora_salida ? formatHora(proyecto.hora_salida) : null;
  const irEditar = () => router.push(`/proyectos/${proyecto.id}/editar` as Href);

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    // Si ya se bajó más allá de las pestañas, vuelve a ellas (no al tope de la portada).
    scrollRef.current?.scrollTo({ y: yPestanas.current, animated: false });
  };

  const basePdf = `/proyectos/${proyecto.id}`;
  const nombreArchivo = `Proyecto_${folio}.pdf`;
  const pdf = usePdfDocumento(basePdf, nombreArchivo, `el reporte del proyecto ${folio}`);

  // Responsable primero, luego técnicos y auxiliares; foto real o iniciales.
  const personas: PersonaDato[] = personasDelEquipo(proyecto).map((p) => ({
    nombre: p.nombre,
    rol: p.rol === 'tecnico' ? undefined : ROL_EQUIPO_LABEL[p.rol],
    avatar: (
      <Avatar
        uri={p.avatar}
        iniciales={inicialesUsuarioDisplay(p.nombre, 'T')}
        size={30}
        fondo={p.rol === 'auxiliar' ? colors.primary : colors.navy}
        color={colors.onNavy}
      />
    ),
  }));

  const tipo = proyecto.tipo_trabajo_nombre || proyecto.tipos_trabajo[0]?.nombre;

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(proyecto.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <DetalleBarraSuperior
        scrollY={scrollY}
        titulo={cliente}
        subtitulo={folio}
        onVolver={() => router.back()}
        volverLabel="Volver a mis proyectos"
        editar={puedeEditar ? { label: 'Editar', onPress: irEditar, accessibilityLabel: 'Editar proyecto' } : undefined}
      />

      <Animated.ScrollView
        ref={scrollRef}
        // Hijos: 0 portada, 1 hoja de datos, 2 pestañas (pegadas arriba), 3 contenido.
        stickyHeaderIndices={[2]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        accessibilityLabel={`Detalle del proyecto ${folio}`}
      >
        <DetallePortada
          scrollY={scrollY}
          eyebrow={tipo ? `Proyecto · ${tipo}` : 'Proyecto'}
          titulo={cliente}
          pildoras={[
            {
              key: 'status',
              label: statusLabel(proyecto.status),
              tono: statusTone(proyecto.status, darkColors),
              icon: (c) => <ProyectoStatusIcon status={proyecto.status} color={c} size={12} />,
              accessibilityLabel: `Estatus: ${statusLabel(proyecto.status)}`,
            },
            { key: 'folio', label: folio, mono: true },
            { key: 'avance', label: `${pct}% de avance`, accessibilityLabel: `Avance ${pct} por ciento` },
          ]}
        />

        <View style={styles.hojaCaja}>
          <HojaDatos titulo="Datos del proyecto">
            <DatosRejilla
              celdas={[
                {
                  key: 'jornadas',
                  icon: <IconCalendar color={colors.primary} size={12} />,
                  label: 'Jornadas',
                  valor: primera ? formatFecha(primera) : 'Sin fecha',
                  secundario: dias.total ? `${dias.total} ${dias.total === 1 ? 'día' : 'días'} de trabajo` : null,
                  apagado: !primera,
                },
                {
                  key: 'horario',
                  icon: <IconClock color={colors.primary} size={12} />,
                  label: 'Horario',
                  valor: llegada || salida ? `${llegada ?? '—'} – ${salida ?? '—'}` : 'Sin registrar',
                  secundario: llegada || salida ? 'Llegada – salida' : null,
                  apagado: !llegada && !salida,
                },
              ]}
            />
            <DatosPersonas
              etiqueta="Equipo de trabajo"
              icon={<IconPerson color={colors.primary} size={12} />}
              vacio="Sin técnicos asignados"
              personas={personas}
            />
            <DatosAvance
              label="Avance del proyecto"
              valor={`${pct}%`}
              fraccion={pct / 100}
              color={colorPorAvance(pct, colors).text}
              completo={pct >= 100}
            />
          </HojaDatos>
        </View>

        <View
          style={[styles.tabsCaja, { backgroundColor: colors.canvas }]}
          onLayout={(e) => {
            yPestanas.current = e.nativeEvent.layout.y;
          }}
        >
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

              <Grupo titulo="Jornadas" meta={dias.total ? `${dias.total} ${dias.total === 1 ? 'día' : 'días'}` : undefined}>
                <JornadasPanel proyecto={proyecto} />
              </Grupo>

              <Grupo titulo="Detalles" compacto>
                <DetallesProyecto proyecto={proyecto} />
              </Grupo>

              <Grupo titulo="Cotizaciones" meta={proyecto.cotizaciones.length ? `${proyecto.cotizaciones.length}` : undefined} compacto>
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

              {/* El documento ya es una tarjeta: solo lleva su título afuera. */}
              <View style={styles.grupo}>
                <View style={styles.grupoCabeza}>
                  <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
                    Reporte PDF
                  </Text>
                </View>
                <DocumentoPdf
                  pdf={pdf}
                  base={basePdf}
                  nombreArchivo={nombreArchivo}
                  incluye={`${statusLabel(proyecto.status)} · ${pct}% de avance · ${piezas} ${piezas === 1 ? 'equipo' : 'equipos'}`}
                  conCorreo
                />
              </View>

              {!puedeEditar ? (
                <Text style={[styles.sinPermiso, { color: colors.inkSubtle }]}>Tu cuenta no tiene permiso para editar proyectos.</Text>
              ) : null}
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
                  <Grupo titulo="Fotos" meta={proyecto.evidencias_urls.length ? `${proyecto.evidencias_urls.length}` : undefined}>
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
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  /** La hoja de datos sube sobre la portada. */
  hojaCaja: { paddingHorizontal: spacing.lg, ...estiloTraslape(0) },
  tabsCaja: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  grupo: { gap: spacing.sm },
  grupoCabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  grupoTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  grupoMeta: { ...type.mono, fontSize: 12 },
  grupoTarjeta: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  grupoCompacto: { paddingVertical: 0, paddingHorizontal: spacing.lg, gap: 0 },
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
  sinFirmas: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sinPermiso: { ...type.caption, textAlign: 'center', paddingVertical: spacing.sm },
});
