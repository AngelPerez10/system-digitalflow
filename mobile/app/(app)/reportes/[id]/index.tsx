import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toUserMessage } from '@/api/errors';
import { eliminarReporte } from '@/api/reportesApi';
import { DetalleBarraSuperior, DetallePortada, estiloTraslape } from '@/components/DetalleChrome';
import { DocumentoPdf } from '@/components/DocumentoPdf';
import { HojaAcciones, type AccionHoja } from '@/components/HojaAcciones';
import {
  IconBasura,
  IconCamera,
  IconDescarga,
  IconEditar,
  IconWhatsApp,
} from '@/components/icons';
import { FiltroChips, type OpcionFiltro } from '@/components/ListadoChrome';
import { ErrorState } from '@/components/StateViews';

import { ServicioTarjeta } from '@/features/reportes/components/ServicioTarjeta';
import { DetalleReporteSkeleton } from '@/features/reportes/components/ReporteSkeletons';
import { ZonaFila, type LadoZona } from '@/features/reportes/components/ZonaFila';
import { ZonaVisorModal } from '@/features/reportes/components/ZonaVisorModal';
import { EstadoEvidenciaIcon } from '@/features/reportes/components/EstadoEvidenciaIcon';
import {
  clienteReporte,
  estadoEvidencia,
  estadoTone,
  estadoLabelCorto,
  evidenciaDe,
  filtrarZonas,
  folioReporte,
  type FiltroZonas,
} from '@/features/reportes/reporteFormat';
import { usePermisosReportes } from '@/features/reportes/usePermisosReportes';
import { useReporte } from '@/features/reportes/useReporte';
import { usePdfDocumento } from '@/hooks/usePdfDocumento';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, font, radius, spacing, type } from '@/theme/tokens';
import type { Reporte, ReporteZona } from '@/types/reporte';
import { useEntrance } from '@/utils/useEntrance';

/** Título de bloque: versalitas a la izquierda y un dato corto a la derecha. */
function TituloBloque({ titulo, meta }: { titulo: string; meta?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bloqueCabeza}>
      <Text style={[styles.bloqueTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
        {titulo}
      </Text>
      {meta ? <Text style={[styles.bloqueMeta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
    </View>
  );
}

/**
 * Detalle del reporte, pensado para reportes largos (20+ zonas): una lista
 * virtualizada donde cada zona muestra su par Antes | Después; tocarla abre el
 * visor de zona, que recorre todas con «Anterior / Siguiente». Arriba los
 * datos del servicio y la tarjeta del PDF (no enterrada tras las zonas). Las
 * acciones viven en la cabecera: «Editar» a la vista y «⋯» con el resto, según
 * el rol.
 */
export default function DetalleReporteScreen() {
  const { ver } = usePermisosReportes();
  if (!ver) return <ErrorState message="Tu cuenta no tiene permiso para ver reportes de mantenimiento." />;
  return <CargarDetalle />;
}

function CargarDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = Number(id);
  const { reporte, cargando, error, recargar } = useReporte(Number.isFinite(reporteId) ? reporteId : null);

  // Al volver de editar se recarga en segundo plano: el contenido se queda y se actualiza en su lugar.
  if (!reporte && (cargando || !error)) return <DetalleReporteSkeleton />;
  if (!reporte) return <ErrorState message={error ?? 'Reporte no encontrado.'} onRetry={recargar} />;
  // Se monta al llegar los datos: la entrada escalonada se ve (no se gasta tras el esqueleto).
  return <DetalleReporte reporte={reporte} />;
}

function DetalleReporte({ reporte }: { reporte: Reporte }) {
  const router = useRouter();
  const permisos = usePermisosReportes();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entrance = useEntrance(3);
  const listaRef = useRef<FlatList<ReporteZona>>(null);
  // Desplazamiento de la lista en el hilo nativo: mueve la portada (parallax) y la barra fija.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [eliminando, setEliminando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroZonas>('todas');
  const [visor, setVisor] = useState<{ zonaId: string; lado: LadoZona } | null>(null);
  const [masAbierto, setMasAbierto] = useState(false);

  const folio = folioReporte(reporte);
  const ev = evidenciaDe(reporte);
  const estado = estadoEvidencia(reporte);
  const faltantes = ev.zonas - ev.completas;
  const nombreArchivo = `Reporte_${folio}.pdf`;
  const basePdf = `/reportes-mantenimiento/${reporte.id}`;
  const pdf = usePdfDocumento(basePdf, nombreArchivo, `el reporte de mantenimiento ${folio}`);
  const editarLabel = estado === 'sin' ? 'Tomar fotos' : 'Editar';
  const irEditar = () => router.push(`/reportes/${reporte.id}/editar` as Href);

  // Número de cada zona en el reporte completo: no cambia al filtrar.
  const numeros = useMemo(() => new Map(reporte.secciones.map((z, i) => [z.id, i + 1])), [reporte.secciones]);
  const numeroDe = useCallback((zonaId: string) => numeros.get(zonaId) ?? 0, [numeros]);
  const zonas = useMemo(() => filtrarZonas(reporte.secciones, filtro), [reporte.secciones, filtro]);
  const abrirZona = useCallback((zonaId: string, lado: LadoZona) => setVisor({ zonaId, lado }), []);

  const opciones: OpcionFiltro<FiltroZonas>[] = [
    { key: 'todas', label: 'Todas', cantidad: ev.zonas },
    { key: 'completas', label: 'Completas', cantidad: ev.completas, tono: { bg: colors.statusResueltoBg, text: colors.statusResueltoText } },
    { key: 'faltantes', label: 'Con faltantes', cantidad: faltantes, tono: { bg: colors.statusPendienteBg, text: colors.statusPendienteText } },
  ];

  const confirmarEliminar = () => {
    setMasAbierto(false);
    Alert.alert('¿Eliminar el reporte?', `${folio} y su evidencia dejarán de estar disponibles. No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setEliminando(true);
          try {
            await eliminarReporte(reporte.id);
            router.back();
          } catch (e) {
            setEliminando(false);
            Alert.alert('No se pudo eliminar', toUserMessage(e));
          }
        },
      },
    ]);
  };

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.portadaCaja}>
        <DetallePortada
          scrollY={scrollY}
          eyebrow="Reporte de mantenimiento"
          titulo={clienteReporte(reporte)}
          pildoras={[
            {
              key: 'estado',
              label: estadoLabelCorto(estado),
              tono: estadoTone(estado, darkColors),
              icon: (c) => <EstadoEvidenciaIcon estado={estado} color={c} size={12} />,
              accessibilityLabel: `Evidencia: ${estadoLabelCorto(estado)}`,
            },
            { key: 'folio', label: folio, mono: true },
          ]}
        />
      </View>

      {/* Hoja blanca que sube sobre la portada marina. */}
      <View style={styles.servicioCaja}>
        <ServicioTarjeta reporte={reporte} />
      </View>

      <Animated.View style={[styles.bloque, entrance(1)]}>
        <TituloBloque titulo="Documento" />
        <DocumentoPdf
          pdf={pdf}
          base={basePdf}
          nombreArchivo={nombreArchivo}
          incluye={`${ev.zonas} ${ev.zonas === 1 ? 'zona' : 'zonas'} · ${ev.fotos} ${ev.fotos === 1 ? 'foto' : 'fotos'}`}
        />
      </Animated.View>

      <Animated.View style={[styles.bloque, entrance(2)]}>
        <TituloBloque
          titulo="Evidencia por zona"
          meta={ev.zonas > 0 ? `${ev.fotos} ${ev.fotos === 1 ? 'foto' : 'fotos'}` : undefined}
        />
        {ev.zonas > 1 ? <FiltroChips opciones={opciones} valor={filtro} onChange={setFiltro} accessibilityLabel="Filtrar zonas" /> : null}
      </Animated.View>
    </View>
  );

  const acciones: AccionHoja[] = [
    ...(permisos.editar
      ? [{ key: 'editar', label: estado === 'sin' ? 'Tomar fotos' : 'Editar reporte', descripcion: 'Zonas, fotos y datos del servicio', icon: (c: string) => <IconEditar color={c} size={17} />, onPress: () => { setMasAbierto(false); irEditar(); } }]
      : []),
    {
      key: 'descargar',
      label: 'Descargar PDF',
      descripcion: 'Se guarda en el teléfono',
      icon: (c: string) => <IconDescarga color={c} size={17} />,
      cargando: pdf.ocupado === 'descargar',
      onPress: () => {
        setMasAbierto(false);
        void pdf.descargar();
      },
    },
    {
      key: 'whatsapp',
      label: 'Enviar por WhatsApp',
      descripcion: 'Enlace seguro al PDF, válido 7 días',
      icon: () => <IconWhatsApp size={18} />,
      cargando: pdf.ocupado === 'whatsapp',
      onPress: () => {
        setMasAbierto(false);
        void pdf.whatsapp();
      },
    },
    ...(permisos.eliminar
      ? [{ key: 'eliminar', label: 'Eliminar reporte', descripcion: 'No se puede deshacer', tono: 'peligro' as const, icon: (c: string) => <IconBasura color={c} size={17} />, cargando: eliminando, onPress: confirmarEliminar }]
      : []),
  ];

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: `${folio} · ${estadoLabelCorto(estado)}`, headerShown: false }} />
      <StatusBar style="light" />

      <DetalleBarraSuperior
        scrollY={scrollY}
        titulo={clienteReporte(reporte)}
        subtitulo={folio}
        onVolver={() => router.back()}
        volverLabel="Volver a reportes"
        editar={
          permisos.editar
            ? { label: editarLabel, onPress: irEditar, accessibilityLabel: editarLabel === 'Editar' ? 'Editar reporte' : editarLabel }
            : undefined
        }
        onMas={() => setMasAbierto(true)}
        masHint="PDF, WhatsApp y eliminar"
      />

      <Animated.FlatList
        ref={listaRef}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        data={zonas}
        keyExtractor={(z) => z.id}
        ListHeaderComponent={encabezado}
        renderItem={({ item, index }) => <ZonaFila zona={item} numero={numeroDe(item.id)} indice={index} onAbrir={abrirZona} />}
        ListEmptyComponent={
          <View style={[styles.vacio, { borderColor: colors.lineStrong, backgroundColor: colors.surfaceSunken }]}>
            <View style={[styles.vacioIcono, { backgroundColor: colors.statusPendienteBg }]}>
              <IconCamera color={colors.statusPendienteText} size={22} />
            </View>
            <Text style={[styles.vacioTitulo, { color: colors.ink }]}>
              {ev.zonas === 0 ? 'Aún no hay evidencia' : filtro === 'completas' ? 'Ninguna zona completa' : 'Todas las zonas están completas'}
            </Text>
            <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>
              {ev.zonas > 0
                ? 'Toca «Todas» para ver el resto.'
                : permisos.editar
                  ? 'Toca «Tomar fotos» para agregar las zonas con sus fotos de Antes y Después.'
                  : 'Las fotos de Antes y Después aparecerán aquí cuando se capturen.'}
            </Text>
          </View>
        }
        // Sin barra al pie: el final de la lista libra la barra de navegación del teléfono.
        contentContainerStyle={[styles.contenido, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        accessibilityLabel={`Detalle del reporte ${folio}`}
      />

      <ZonaVisorModal
        visible={visor !== null}
        zonas={zonas}
        numeroDe={numeroDe}
        totalReporte={ev.zonas}
        zonaInicial={visor?.zonaId ?? null}
        ladoInicial={visor?.lado ?? 'antes'}
        onCerrar={() => setVisor(null)}
      />

      <HojaAcciones
        visible={masAbierto}
        titulo={folio}
        subtitulo={reporte.orden_cliente ?? undefined}
        acciones={acciones}
        onCerrar={() => setMasAbierto(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  /** La portada va a sangre: anula el margen lateral de la lista. */
  portadaCaja: { marginHorizontal: -spacing.lg },
  /** La tarjeta de servicio se monta sobre la portada; el encabezado ya da su propio espacio. */
  servicioCaja: estiloTraslape(spacing.xl),
  encabezado: { gap: spacing.xl, marginBottom: spacing.md },
  bloque: { gap: spacing.md },
  bloqueCabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  bloqueTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  bloqueMeta: { ...type.mono, fontSize: 12 },
  vacio: {
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  vacioIcono: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 16, textAlign: 'center' },
  vacioTexto: { ...type.caption, textAlign: 'center' },
});
