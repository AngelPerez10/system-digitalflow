import React, { useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { liberarOrden } from '@/api/ordenesApi';
import { toUserMessage } from '@/api/errors';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule, isAdmin, ownsOrden } from '@/auth/permissions';
import { Avatar } from '@/components/Avatar';
import {
  DatosAvance,
  DatosPersonas,
  DatosRejilla,
  DetalleBarraSuperior,
  DetallePortada,
  estiloTraslape,
  HojaDatos,
  type AccionPortada,
  type PildoraPortada,
} from '@/components/DetalleChrome';
import { FirmasTarjeta } from '@/components/FirmasTarjeta';
import { FotosGaleria } from '@/components/FotosGaleria';
import { HojaAcciones, type AccionHoja } from '@/components/HojaAcciones';
import {
  IconBox,
  IconCalendar,
  IconCamera,
  IconClock,
  IconComment,
  IconDocumento,
  IconEditar,
  IconPerson,
  IconPhone,
  IconPin,
  IconWrench,
} from '@/components/icons';
import { InfoRow, InfoSection, type Tono } from '@/components/InfoSection';
import { ErrorState } from '@/components/StateViews';
import { EquiposLista } from '@/features/orders/components/EquiposLista';
import { FallaBox } from '@/features/orders/components/FallaBox';
import { IconEtiqueta, IconPause, IconVisto } from '@/features/orders/components/icons';
import { OrdenPdfAcciones } from '@/features/orders/components/OrdenPdfAcciones';
import { DetalleOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { formStateFromOrden, SECCIONES_EDITAR, seccionesCompletas } from '@/features/orders/editarOrdenForm';
import {
  clienteDisplay,
  duracionServicio,
  folioDisplay,
  normalizarPrioridad,
  prioridadLabel,
  prioridadTone,
  statusLabel,
  statusTone,
  tipoOrdenLabel,
} from '@/features/orders/ordenFormat';
import { useOrden } from '@/features/orders/useOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, font, radius, spacing, type } from '@/theme/tokens';
import type { Orden, OrdenStatus } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useEntrance } from '@/utils/useEntrance';

const STATUS_ICON: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={12} />,
  pausado: (color) => <IconPause color={color} size={12} />,
  saldo_pendiente: (color) => <IconEtiqueta color={color} size={12} />,
  resuelto: (color) => <IconVisto color={color} size={12} />,
};

function Vacio({ texto }: { texto: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>{texto}</Text>;
}

/**
 * Detalle de la orden, mismo esquema que Proyectos y Reportes: portada marina
 * (cliente, estatus, folio y accesos rápidos para llamar y llegar) que se
 * aleja al desplazar, barra fija con «Editar» y «⋯», y la hoja «Datos de la
 * orden» montada sobre la portada (horario, técnico y avance del reporte de
 * cierre). Debajo, las secciones del reporte.
 */
export default function DetalleOrdenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ordenId = Number(id);
  const { orden, cargando, error, recargar, aplicarOrden } = useOrden(Number.isFinite(ordenId) ? ordenId : null);

  // Al volver de editar se recarga en segundo plano: el contenido se queda y se actualiza en su lugar.
  if (!orden && (cargando || !error)) return <DetalleOrdenSkeleton />;
  if (!orden) return <ErrorState message={error ?? 'Orden no encontrada.'} onRetry={recargar} />;
  // Se monta al llegar los datos: la entrada escalonada se ve (no se gasta tras el esqueleto).
  return <DetalleOrden orden={orden} aplicarOrden={aplicarOrden} />;
}

function DetalleOrden({ orden, aplicarOrden }: { orden: Orden; aplicarOrden: (orden: Orden) => void }) {
  const router = useRouter();
  const { user, permissions } = useSession();
  const entrance = useEntrance(5);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [liberando, setLiberando] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const folio = folioDisplay(orden);
  const cliente = clienteDisplay(orden);
  const puedeEditar = canEditModule(permissions, user, 'ordenes');
  const puedeLiberar = !orden.en_pool && orden.status !== 'resuelto' && (ownsOrden(user, orden) || isAdmin(user));
  const irEditar = () => router.push(`/ordenes/${orden.id}/editar`);

  const telefono = orden.telefono_cliente?.trim() || null;
  const direccion = orden.direccion?.trim() ?? '';
  const esMapa = esEnlaceUbicacion(direccion);
  const llamar = () => telefono && void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.');
  const abrirMapa = () => {
    if (!direccion) return;
    const url = esMapa ? direccion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  const confirmarLiberar = () => {
    setMasAbierto(false);
    Alert.alert('Liberar orden', '¿Liberar esta orden para que otro técnico la tome? Dejará de estar asignada a ti.', [
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
    ]);
  };

  const duracion = duracionServicio(orden);
  const instalados = orden.equipos_inventario.filter((e) => e.estadoInstalacion === 'instalado').length;
  const totalEquipos = orden.equipos_inventario.length;
  const hayFirmas = Boolean(orden.firma_cliente_url || orden.firma_encargado_url);
  const hayEvidencia = orden.fotos_urls.length > 0 || hayFirmas;
  const pausada = orden.status === 'pausado';
  const completas = seccionesCompletas(formStateFromOrden(orden));
  const nCompletas = SECCIONES_EDITAR.filter((s) => completas[s]).length;
  const prioridad = normalizarPrioridad(orden.prioridad_pool);

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

  // Sobre marino (oscuro en ambos temas) los tonos salen de la paleta oscura.
  const pildoras: PildoraPortada[] = [
    {
      key: 'status',
      label: statusLabel(orden.status),
      tono: statusTone(orden.status, darkColors),
      icon: STATUS_ICON[orden.status],
      accessibilityLabel: `Estatus: ${statusLabel(orden.status)}`,
    },
    { key: 'folio', label: folio, mono: true },
    ...(prioridad !== 'baja'
      ? [{ key: 'prioridad', label: `Prioridad ${prioridadLabel(orden.prioridad_pool).toLowerCase()}`, tono: prioridadTone(orden.prioridad_pool, darkColors) }]
      : []),
    ...(orden.en_pool ? [{ key: 'pool', label: 'Disponible', tono: { bg: colors.gold, text: colors.onGold } }] : []),
  ];

  const accesos: AccionPortada[] = [
    ...(telefono
      ? [{ key: 'llamar', label: 'Llamar', icon: (c: string) => <IconPhone color={c} size={15} />, onPress: llamar, accessibilityHint: `Llama al ${telefono}` }]
      : []),
    ...(direccion
      ? [{ key: 'mapa', label: 'Cómo llegar', icon: (c: string) => <IconPin color={c} size={15} />, onPress: abrirMapa, accessibilityHint: 'Abre la ubicación en tu app de mapas' }]
      : []),
  ];

  const acciones: AccionHoja[] = [
    ...(puedeEditar
      ? [{ key: 'editar', label: 'Editar orden', descripcion: 'Estatus, trabajo, horario y evidencia', icon: (c: string) => <IconEditar color={c} size={17} />, onPress: () => { setMasAbierto(false); irEditar(); } }]
      : []),
    ...(telefono
      ? [{ key: 'llamar', label: 'Llamar al cliente', descripcion: telefono, icon: (c: string) => <IconPhone color={c} size={17} />, onPress: () => { setMasAbierto(false); llamar(); } }]
      : []),
    ...(direccion
      ? [{ key: 'mapa', label: 'Cómo llegar', descripcion: 'Abre tu app de mapas', icon: (c: string) => <IconPin color={c} size={17} />, onPress: () => { setMasAbierto(false); abrirMapa(); } }]
      : []),
    ...(puedeLiberar
      ? [{ key: 'liberar', label: 'Liberar orden', descripcion: 'Otro técnico podrá tomarla', tono: 'peligro' as const, icon: (c: string) => <IconWrench color={c} size={17} />, cargando: liberando, onPress: confirmarLiberar }]
      : []),
  ];

  const inicio = formatFecha(orden.fecha_inicio);
  const fin = formatFecha(orden.fecha_finalizacion);

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      {/* Título de pantalla para recientes de Android y el árbol de accesibilidad. */}
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(orden.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <DetalleBarraSuperior
        scrollY={scrollY}
        titulo={cliente}
        subtitulo={folio}
        onVolver={() => router.back()}
        volverLabel="Volver a mis órdenes"
        editar={puedeEditar ? { label: 'Editar', onPress: irEditar, accessibilityLabel: 'Editar orden' } : undefined}
        onMas={acciones.length > 0 ? () => setMasAbierto(true) : undefined}
        masHint="Llamar, cómo llegar y liberar"
      />

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.contenido, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`Detalle de la orden ${folio}`}
      >
        <View style={styles.portadaCaja}>
          <DetallePortada
            scrollY={scrollY}
            eyebrow={`Orden de trabajo · ${tipoOrdenLabel(orden.tipo_orden)}`}
            titulo={cliente}
            pildoras={pildoras}
            acciones={accesos}
          />
        </View>

        <View style={styles.hojaCaja}>
          <HojaDatos titulo="Datos de la orden">
            <DatosRejilla
              celdas={[
                {
                  key: 'inicio',
                  icon: <IconCalendar color={colors.primary} size={12} />,
                  label: 'Inicio',
                  valor: inicio === '—' ? 'Sin programar' : inicio,
                  secundario: inicio === '—' ? null : formatHora(orden.hora_inicio),
                  apagado: inicio === '—',
                },
                {
                  key: 'fin',
                  icon: <IconClock color={colors.primary} size={12} />,
                  label: 'Fin',
                  valor: fin === '—' ? 'Pendiente' : fin,
                  secundario: fin === '—' ? null : [formatHora(orden.hora_termino), duracion].filter(Boolean).join(' · '),
                  apagado: fin === '—',
                },
              ]}
            />
            <DatosPersonas
              etiqueta="Técnico asignado"
              icon={<IconPerson color={colors.primary} size={12} />}
              vacio={orden.en_pool ? 'Disponible para cualquier técnico' : 'Sin asignar'}
              personas={
                orden.tecnico_asignado_full_name
                  ? [
                      {
                        nombre: orden.tecnico_asignado_full_name,
                        avatar: (
                          <Avatar
                            uri={orden.tecnico_asignado_avatar_url}
                            iniciales={inicialesUsuarioDisplay(orden.tecnico_asignado_full_name, 'T')}
                            size={30}
                            fondo={colors.navy}
                            color={colors.onNavy}
                          />
                        ),
                      },
                    ]
                  : []
              }
            />
            <DatosAvance
              label="Reporte de cierre"
              valor={`${nCompletas} de ${SECCIONES_EDITAR.length} secciones`}
              fraccion={nCompletas / SECCIONES_EDITAR.length}
              color={nCompletas === SECCIONES_EDITAR.length ? colors.statusResueltoText : colors.primary}
              completo={nCompletas === SECCIONES_EDITAR.length}
            />
          </HojaDatos>
        </View>

        <Animated.View style={entrance(0)}>
          <InfoSection icon={(c) => <IconWrench color={c} size={15} />} titulo="Servicio" tono={tono.servicio} completa={completas.estatus}>
            {pausada && orden.motivo_pausa ? (
              <FallaBox titulo="Motivo de la pausa" texto={orden.motivo_pausa} tono={colors.statusPausadoText} />
            ) : null}
            {orden.problematica ? <FallaBox titulo="Falla reportada" texto={orden.problematica} /> : <Vacio texto="Sin problemática capturada." />}
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
          <InfoSection icon={(c) => <IconPerson color={c} size={15} />} titulo="Cliente y sitio" tono={tono.cliente} completa={completas.cliente} lista>
            <InfoRow
              icon={<IconPerson color={tono.programacion.fg} size={15} />}
              tono={tono.programacion}
              label="Nombre del cliente"
              value={orden.nombre_cliente?.trim() || '—'}
            />
            {telefono ? (
              <InfoRow
                icon={<IconPhone color={tono.equipos.fg} size={15} />}
                tono={tono.equipos}
                label="Teléfono"
                value={telefono}
                accion
                accessibilityHint="Inicia una llamada"
                onPress={llamar}
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
          </InfoSection>
        </Animated.View>

        <Animated.View style={entrance(2)}>
          <InfoSection icon={(c) => <IconComment color={c} size={15} />} titulo="Trabajo realizado" tono={tono.trabajo} completa={completas.trabajo}>
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

        <Animated.View style={entrance(3)}>
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

        <Animated.View style={entrance(4)}>
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
                {orden.fotos_urls.length > 0 && hayFirmas ? <View style={[styles.divisor, { backgroundColor: colors.line }]} /> : null}
                <FirmasTarjeta firmaCliente={orden.firma_cliente_url} firmaEncargado={orden.firma_encargado_url} />
              </>
            ) : (
              <Vacio texto="Sin fotos ni firmas todavía." />
            )}
          </InfoSection>
        </Animated.View>

        <InfoSection icon={(c) => <IconDocumento color={c} size={15} />} titulo="Reporte PDF" tono={tono.pdf}>
          <OrdenPdfAcciones orden={orden} />
        </InfoSection>

        {!puedeEditar ? (
          <Text style={[styles.aviso, { color: colors.inkSubtle }]}>Tu cuenta no tiene permiso para editar órdenes.</Text>
        ) : null}
      </Animated.ScrollView>

      <HojaAcciones
        visible={masAbierto}
        titulo={folio}
        subtitulo={cliente}
        acciones={acciones}
        onCerrar={() => setMasAbierto(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: spacing.lg, gap: spacing.xxl },
  /** La portada va a sangre: anula el margen lateral del contenido. */
  portadaCaja: { marginHorizontal: -spacing.lg },
  /** La hoja de datos sube sobre la portada (anula también el `gap` del contenido). */
  hojaCaja: estiloTraslape(spacing.xxl),
  vacio: { ...type.caption, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipPunto: { width: 5, height: 5, borderRadius: 3 },
  chipTexto: { ...type.label, fontSize: 12, fontFamily: font.semibold },
  cita: { flexDirection: 'row', gap: spacing.md },
  citaBarra: { width: 3, borderRadius: 2 },
  comentario: { ...type.body, lineHeight: 23, flex: 1 },
  divisor: { height: StyleSheet.hairlineWidth },
  aviso: { ...type.caption, textAlign: 'center' },
});
