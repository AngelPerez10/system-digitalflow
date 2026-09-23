import React, { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { liberarOrden } from '@/api/ordenesApi';
import { toUserMessage } from '@/api/errors';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule, isAdmin, ownsOrden } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { FirmasTarjeta } from '@/components/FirmasTarjeta';
import { FotosGaleria } from '@/components/FotosGaleria';
import {
  IconBox,
  IconCalendar,
  IconCamera,
  IconComment,
  IconDocumento,
  IconEditar,
  IconFlecha,
  IconPerson,
  IconPhone,
  IconPin,
  IconWrench,
} from '@/components/icons';
import { InfoRow, InfoSection, type Tono } from '@/components/InfoSection';
import { ErrorState } from '@/components/StateViews';
import { EquiposLista } from '@/features/orders/components/EquiposLista';
import { FallaBox } from '@/features/orders/components/FallaBox';
import { OrdenDetalleHeader } from '@/features/orders/components/OrdenDetalleHeader';
import { OrdenPdfAcciones } from '@/features/orders/components/OrdenPdfAcciones';
import { DetalleOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { formStateFromOrden, seccionesCompletas } from '@/features/orders/editarOrdenForm';
import { duracionServicio, folioDisplay, statusLabel } from '@/features/orders/ordenFormat';
import { useOrden } from '@/features/orders/useOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useEntrance } from '@/utils/useEntrance';

/** Inicio / fin: placa tintada con el tono de su extremo de la línea de tiempo. */
function PlacaTiempo({ label, fecha, hora, tono }: { label: string; fecha: string; hora: string; tono: Tono }) {
  const { colors } = useTheme();
  const sinDato = fecha === '—';
  return (
    <View
      style={[styles.placa, { backgroundColor: sinDato ? colors.surfaceSunken : tono.bg }]}
      accessible
      accessibilityLabel={sinDato ? `${label}: sin programar` : `${label}: ${fecha}, ${hora}`}
    >
      <View style={styles.placaLabelFila}>
        <View style={[styles.placaPunto, { backgroundColor: sinDato ? colors.lineStrong : tono.fg }]} />
        <Text style={[styles.placaLabel, { color: sinDato ? colors.inkSubtle : tono.fg }]}>{label}</Text>
      </View>
      <Text style={[styles.placaFecha, { color: sinDato ? colors.inkSubtle : colors.ink }]}>
        {sinDato ? 'Sin programar' : fecha}
      </Text>
      {!sinDato ? <Text style={[styles.placaHora, { color: colors.inkMuted }]}>{hora}</Text> : null}
    </View>
  );
}

function Vacio({ texto }: { texto: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>{texto}</Text>;
}

/**
 * Resumen de la orden. Hermano del formulario de edición: banda marina con
 * las acciones de campo, el estado del reporte de cierre y secciones con el
 * mismo encabezado afuera + tarjeta. «Editar» vive fijo abajo, siempre a mano.
 */
export default function DetalleOrdenScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ordenId = Number(id);
  const { orden, cargando, error, recargar, aplicarOrden } = useOrden(
    Number.isFinite(ordenId) ? ordenId : null,
  );
  const { user, permissions } = useSession();
  const entrance = useEntrance(7);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [liberando, setLiberando] = useState(false);

  if (cargando) return <DetalleOrdenSkeleton />;
  if (error || !orden) return <ErrorState message={error ?? 'Orden no encontrada.'} onRetry={recargar} />;

  const folio = folioDisplay(orden);
  const puedeEditar = canEditModule(permissions, user, 'ordenes');
  const puedeLiberar =
    !orden.en_pool && orden.status !== 'resuelto' && (ownsOrden(user, orden) || isAdmin(user));
  const irEditar = () => router.push(`/ordenes/${orden.id}/editar`);

  const confirmarLiberar = () => {
    Alert.alert(
      'Liberar orden',
      '¿Liberar esta orden para que otro técnico la tome? Dejará de estar asignada a ti.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: async () => {
            setLiberando(true);
            try {
              aplicarOrden(await liberarOrden(orden.id));
              router.back();
            } catch (e) {
              Alert.alert('No se pudo liberar', toUserMessage(e));
            } finally {
              setLiberando(false);
            }
          },
        },
      ],
    );
  };

  const direccion = orden.direccion?.trim() ?? '';
  const esMapa = esEnlaceUbicacion(direccion);
  const abrirMapa = () => {
    const url = esMapa ? direccion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  const duracion = duracionServicio(orden);
  const instalados = orden.equipos_inventario.filter((e) => e.estadoInstalacion === 'instalado').length;
  const totalEquipos = orden.equipos_inventario.length;
  const hayFirmas = Boolean(orden.firma_cliente_url || orden.firma_encargado_url);
  const hayEvidencia = orden.fotos_urls.length > 0 || hayFirmas;
  const pausada = orden.status === 'pausado';

  const completas = seccionesCompletas(formStateFromOrden(orden));

  // Un tono por sección (pares suaves del tema, legibles en claro y oscuro).
  const tono = {
    servicio: { bg: colors.statusPendienteBg, fg: colors.statusPendienteText },
    cliente: { bg: colors.primaryRing, fg: colors.primary },
    programacion: { bg: colors.statusPausadoBg, fg: colors.statusPausadoText },
    trabajo: { bg: colors.goldSoftBg, fg: colors.goldSoftText },
    equipos: { bg: colors.statusResueltoBg, fg: colors.statusResueltoText },
    evidencia: { bg: colors.roseBg, fg: colors.roseText },
    pdf: { bg: colors.primaryRing, fg: colors.primary },
  } satisfies Record<string, Tono>;

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      {/* Título de pantalla para recientes de Android y el árbol de accesibilidad. */}
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(orden.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <OrdenDetalleHeader orden={orden} onVolver={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`Detalle de la orden ${folio}`}
      >
        <Animated.View style={entrance(0)}>
          <InfoSection
            icon={(c) => <IconWrench color={c} size={15} />}
            titulo="Servicio"
            tono={tono.servicio}
            completa={completas.estatus}
          >
            {pausada && orden.motivo_pausa ? (
              <FallaBox titulo="Motivo de la pausa" texto={orden.motivo_pausa} tono={colors.statusPausadoText} />
            ) : null}
            {orden.problematica ? (
              <FallaBox titulo="Falla reportada" texto={orden.problematica} />
            ) : (
              <Vacio texto="Sin problemática capturada." />
            )}
            {orden.servicios_realizados.length > 0 ? (
              <View style={styles.chips}>
                {orden.servicios_realizados.map((servicio, i) => (
                  <View key={`${servicio}-${i}`} style={[styles.chip, { backgroundColor: tono.cliente.bg }]}>
                    <View style={[styles.chipPunto, { backgroundColor: tono.cliente.fg }]} />
                    <Text style={[styles.chipTexto, { color: tono.cliente.fg }]}>{servicio}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(1)}>
          <InfoSection
            icon={(c) => <IconPerson color={c} size={15} />}
            titulo="Cliente y sitio"
            tono={tono.cliente}
            completa={completas.cliente}
            lista
          >
            <InfoRow
              icon={<IconPerson color={tono.programacion.fg} size={15} />}
              tono={tono.programacion}
              label="Nombre del cliente"
              value={orden.nombre_cliente?.trim() || '—'}
            />
            {orden.telefono_cliente ? (
              <InfoRow
                icon={<IconPhone color={tono.equipos.fg} size={15} />}
                tono={tono.equipos}
                label="Teléfono"
                value={orden.telefono_cliente}
                accion
                accessibilityHint="Inicia una llamada"
                onPress={() => void abrirEnlace(`tel:${orden.telefono_cliente}`, 'No se pudo iniciar la llamada.')}
              />
            ) : null}
            <InfoRow
              icon={<IconPin color={direccion ? tono.cliente.fg : colors.inkSubtle} size={15} />}
              tono={direccion ? tono.cliente : undefined}
              label="Dirección"
              value={!direccion ? 'Sin dirección capturada' : esMapa ? 'Ver ubicación en el mapa' : direccion}
              accion={Boolean(direccion)}
              accessibilityHint="Abre la ubicación en tu app de mapas"
              onPress={direccion ? abrirMapa : undefined}
            />
            <InfoRow
              icon={
                <Avatar
                  uri={orden.tecnico_asignado_avatar_url}
                  iniciales={inicialesUsuarioDisplay(orden.tecnico_asignado_full_name ?? '', 'T')}
                  size={34}
                  fondo={colors.navy}
                  color={colors.onNavy}
                />
              }
              label="Técnico asignado"
              value={orden.tecnico_asignado_full_name ?? 'Sin asignar'}
            />
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(2)}>
          <InfoSection
            icon={(c) => <IconCalendar color={c} size={15} />}
            titulo="Programación"
            tono={tono.programacion}
            completa={completas.horario}
            meta={duracion ? `Duración ${duracion}` : undefined}
          >
            <View style={styles.placasFila}>
              <PlacaTiempo
                label="Inicio"
                fecha={formatFecha(orden.fecha_inicio)}
                hora={formatHora(orden.hora_inicio)}
                tono={tono.cliente}
              />
              <View style={[styles.conector, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <IconFlecha color={colors.inkSubtle} size={12} />
              </View>
              <PlacaTiempo
                label="Fin"
                fecha={formatFecha(orden.fecha_finalizacion)}
                hora={formatHora(orden.hora_termino)}
                tono={tono.equipos}
              />
            </View>
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(3)}>
          <InfoSection
            icon={(c) => <IconComment color={c} size={15} />}
            titulo="Trabajo realizado"
            tono={tono.trabajo}
            completa={completas.trabajo}
          >
            {orden.comentario_tecnico?.trim() ? (
              <View style={styles.cita}>
                <View style={[styles.citaBarra, { backgroundColor: colors.gold }]} />
                <Text style={[styles.comentario, { color: colors.ink }]}>{orden.comentario_tecnico.trim()}</Text>
              </View>
            ) : (
              <Vacio texto="El técnico aún no ha escrito qué se hizo en sitio." />
            )}
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(4)}>
          <InfoSection
            icon={(c) => <IconBox color={c} size={15} />}
            titulo="Equipos"
            tono={tono.equipos}
            completa={completas.equipos}
            meta={totalEquipos > 0 ? `${instalados}/${totalEquipos} instalados` : undefined}
          >
            <EquiposLista equipos={orden.equipos_inventario} />
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(5)}>
          <InfoSection
            icon={(c) => <IconCamera color={c} size={15} />}
            titulo="Evidencia"
            tono={tono.evidencia}
            completa={completas.evidencia}
            meta={orden.fotos_urls.length > 0 ? `${orden.fotos_urls.length} fotos` : undefined}
          >
            {hayEvidencia ? (
              <>
                <FotosGaleria urls={orden.fotos_urls} />
                {orden.fotos_urls.length > 0 && hayFirmas ? (
                  <View style={[styles.divisor, { backgroundColor: colors.line }]} />
                ) : null}
                <FirmasTarjeta firmaCliente={orden.firma_cliente_url} firmaEncargado={orden.firma_encargado_url} />
              </>
            ) : (
              <Vacio texto="Sin fotos ni firmas todavía." />
            )}
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(6)}>
          <InfoSection
            icon={(c) => <IconDocumento color={c} size={15} />}
            titulo="Reporte PDF"
            tono={tono.pdf}
          >
            <OrdenPdfAcciones orden={orden} />
          </InfoSection>
        </Animated.View>
      </ScrollView>

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
        {orden.en_pool ? (
          <View style={[styles.poolPill, { backgroundColor: colors.goldSoftBg }]} accessibilityRole="text">
            <View style={[styles.poolPunto, { backgroundColor: colors.gold }]} />
            <Text style={[styles.poolTexto, { color: colors.goldSoftText }]}>Disponible para cualquier técnico</Text>
          </View>
        ) : null}
        {!puedeEditar ? (
          <Text style={[styles.aviso, { color: colors.inkSubtle }]}>
            Tu cuenta no tiene permiso para editar órdenes.
          </Text>
        ) : null}
        {puedeEditar || puedeLiberar ? (
          <View style={styles.barraFila}>
            {puedeLiberar ? (
              <AppButton
                label="Liberar"
                variant="secondary"
                loading={liberando}
                onPress={confirmarLiberar}
                accessibilityHint="Libera la orden para que otro técnico la tome"
                style={styles.botonSecundario}
              />
            ) : null}
            {puedeEditar ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar orden"
                accessibilityHint="Abre el formulario de campo"
                onPress={irEditar}
                style={({ pressed }) => [
                  styles.botonEditar,
                  { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
                ]}
              >
                <IconEditar color={colors.onPrimary} size={16} />
                <Text style={[styles.botonEditarTexto, { color: colors.onPrimary }]}>Editar orden</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
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
  vacio: { ...type.caption, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipPunto: { width: 5, height: 5, borderRadius: 3 },
  chipTexto: { ...type.label, fontSize: 12, fontFamily: font.semibold },
  placasFila: { flexDirection: 'row', alignItems: 'center' },
  conector: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    marginHorizontal: -9,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placa: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  placaLabelFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  placaPunto: { width: 7, height: 7, borderRadius: 4 },
  placaLabel: {
    ...type.caption,
    fontSize: 10,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  placaFecha: {
    fontFamily: font.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  placaHora: { ...type.mono, fontSize: 12 },
  cita: { flexDirection: 'row', gap: spacing.md },
  citaBarra: { width: 3, borderRadius: 2 },
  comentario: { ...type.body, lineHeight: 23, flex: 1 },
  divisor: { height: StyleSheet.hairlineWidth },
  barra: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  barraFila: { flexDirection: 'row', gap: spacing.sm },
  botonSecundario: { flex: 1 },
  botonEditar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
  },
  botonEditarTexto: { ...type.button },
  poolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  poolPunto: { width: 7, height: 7, borderRadius: 4 },
  poolTexto: { ...type.label },
  aviso: { ...type.caption, textAlign: 'center', paddingVertical: spacing.sm },
});
