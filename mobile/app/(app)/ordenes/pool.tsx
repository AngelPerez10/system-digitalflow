import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, toUserMessage } from '@/api/errors';
import { tomarOrden } from '@/api/ordenesApi';
import { AppButton } from '@/components/AppButton';
import { BarraCarga } from '@/components/BarraCarga';
import { IconBox, IconChevron } from '@/components/icons';
import {
  FiltroChips,
  hojaEstilo,
  listadoStyles,
  SeccionEncabezado,
  type OpcionFiltro,
} from '@/components/ListadoChrome';
import { EmptyState, InlineError } from '@/components/StateViews';
import { contarPorPrioridad } from '@/features/orders/agrupar';
import { OrdenesSkeletonList } from '@/features/orders/components/OrdenCardSkeleton';
import { PoolOrdenCard, type FaseToma } from '@/features/orders/components/PoolOrdenCard';
import { normalizarPrioridad, prioridadTone, type Prioridad } from '@/features/orders/ordenFormat';
import { useOrdenesPool } from '@/features/orders/useOrdenesPool';
import { usePush } from '@/notifications/PushProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';

type FiltroPrioridad = Prioridad | 'todas';

const PRIORIDADES: readonly Prioridad[] = ['alta', 'media', 'baja'];
const TITULO_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
};
const ETIQUETA_CHIP: Record<Prioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

/** Sin segundo toque en este tiempo, la confirmación se retira sola. */
const CONFIRMAR_MS = 4000;

interface Toma {
  id: number;
  fase: Exclude<FaseToma, 'reposo'>;
}

/**
 * Bolsa de trabajo: órdenes liberadas y órdenes de este mes en adelante sin
 * técnico asignado. Las ven todos los técnicos; la primera persona que la
 * toma se la queda. Misma anatomía que los demás listados (banda marina y
 * hoja redondeada con chips y secciones), sin cifras en la banda.
 */
export default function PoolOrdenesScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const { ordenes, cargando, refrescando, error, recargar, quitar } = useOrdenesPool();
  const { marcarDisponiblesVistas, setPantallaDisponiblesActiva } = usePush();
  const [filtro, setFiltro] = useState<FiltroPrioridad>('todas');
  const [toma, setToma] = useState<Toma | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al abrir (o volver a) esta pantalla el badge se pone a cero, y mientras
  // esté enfocada las notificaciones no vuelven a sumarle.
  useFocusEffect(
    useCallback(() => {
      marcarDisponiblesVistas();
      setPantallaDisponiblesActiva(true);
      return () => setPantallaDisponiblesActiva(false);
    }, [marcarDisponiblesVistas, setPantallaDisponiblesActiva]),
  );

  const limpiarTemporizador = () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  };
  useEffect(() => limpiarTemporizador, []);

  const cancelar = useCallback(() => {
    limpiarTemporizador();
    setToma((actual) => (actual?.fase === 'confirmando' ? null : actual));
  }, []);

  const tomar = useCallback(
    async (orden: OrdenListItem) => {
      limpiarTemporizador();
      setToma({ id: orden.id, fase: 'tomando' });
      try {
        await tomarOrden(orden.id);
        setToma({ id: orden.id, fase: 'tomada' });
      } catch (e) {
        setToma(null);
        if (e instanceof ApiError && e.status === 409) {
          Alert.alert('Ya no disponible', 'Otro técnico ya tomó esta orden.');
          recargar();
        } else {
          Alert.alert('No se pudo tomar', toUserMessage(e));
        }
      }
    },
    [recargar],
  );

  // Primer toque: pide confirmar (se retira sola). Segundo toque: toma.
  const onTomar = useCallback(
    (orden: OrdenListItem) => {
      if (toma?.id === orden.id && toma.fase === 'confirmando') {
        void tomar(orden);
        return;
      }
      limpiarTemporizador();
      setToma({ id: orden.id, fase: 'confirmando' });
      temporizador.current = setTimeout(() => {
        setToma((actual) => (actual?.id === orden.id && actual.fase === 'confirmando' ? null : actual));
      }, CONFIRMAR_MS);
    },
    [toma, tomar],
  );

  // La tarjeta ya se despidió: la lista se cierra con suavidad y se abre la orden.
  const onSalida = useCallback(
    (orden: OrdenListItem) => {
      if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      quitar(orden.id);
      setToma(null);
      router.push(`/ordenes/${orden.id}`);
    },
    [quitar, reduced, router],
  );

  const cambiarFiltro = useCallback(
    (valor: FiltroPrioridad) => {
      if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFiltro(valor);
    },
    [reduced],
  );

  const conteo = useMemo(() => contarPorPrioridad(ordenes), [ordenes]);
  const secciones = useMemo(
    () =>
      PRIORIDADES.filter((p) => filtro === 'todas' || filtro === p)
        .map((key) => ({
          key,
          title: TITULO_PRIORIDAD[key],
          data: ordenes.filter((o) => normalizarPrioridad(o.prioridad_pool) === key),
        }))
        .filter((s) => s.data.length > 0),
    [ordenes, filtro],
  );

  const opcionesFiltro: OpcionFiltro<FiltroPrioridad>[] = [
    { key: 'todas', label: 'Todas', cantidad: ordenes.length },
    ...PRIORIDADES.map((p) => ({
      key: p,
      label: ETIQUETA_CHIP[p],
      cantidad: conteo[p],
      tono: prioridadTone(p, colors),
      icon: (c: string) => <View style={[styles.punto, { backgroundColor: c }]} />,
    })),
  ];

  const cargaInicial = cargando && ordenes.length === 0 && !error;

  const encabezado = (
    <View style={listadoStyles.controles}>
      <View style={styles.intro}>
        <Text style={[styles.introTitulo, { color: colors.ink }]} accessibilityRole="header">
          Listas para tomar
        </Text>
        <Text style={[styles.introSub, { color: colors.inkSubtle }]}>
          {cargando && !cargaInicial ? 'Actualizando…' : 'La primera persona que la toma se la queda.'}
        </Text>
      </View>
      {!cargaInicial && ordenes.length > 0 ? (
        <FiltroChips
          opciones={opcionesFiltro}
          valor={filtro}
          onChange={cambiarFiltro}
          accessibilityLabel="Filtrar por prioridad"
        />
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[listadoStyles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />
      <BandaBolsa onVolver={() => router.back()}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
      </BandaBolsa>

      <View style={hojaEstilo(colors, scheme)}>
        {cargaInicial ? (
          <ScrollView style={listadoStyles.flex} contentContainerStyle={listadoStyles.lista}>
            {encabezado}
            <View style={styles.siluetas}>
              <OrdenesSkeletonList />
            </View>
          </ScrollView>
        ) : (
          <SectionList
            style={listadoStyles.flex}
            sections={secciones}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={encabezado}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={listadoStyles.lista}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={Separador}
            renderSectionHeader={({ section }) => (
              <SeccionEncabezado
                titulo={section.title}
                cantidad={section.data.length}
                tono={prioridadTone(section.key, colors)}
                icon={(c) => <View style={[styles.punto, { backgroundColor: c }]} />}
              />
            )}
            renderItem={({ item, index, section }) => {
              const fase: FaseToma = toma?.id === item.id ? toma.fase : 'reposo';
              const ocupada = toma !== null && toma.fase !== 'confirmando' && toma.id !== item.id;
              return (
                <PoolOrdenCard
                  orden={item}
                  fase={fase}
                  bloqueada={ocupada}
                  indice={secciones.indexOf(section) * 2 + index}
                  onTomar={onTomar}
                  onCancelar={cancelar}
                  onSalida={onSalida}
                />
              );
            }}
            ListEmptyComponent={
              error ? (
                <View style={styles.errorBloque}>
                  <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
                </View>
              ) : (
                <EmptyState
                  icon={
                    <View style={[styles.vacioIcono, { backgroundColor: colors.goldSoftBg }]}>
                      <IconBox color={colors.goldSoftText} size={24} />
                    </View>
                  }
                  title="Por ahora no hay órdenes disponibles"
                  description="Aquí aparecen las órdenes sin técnico de este mes en adelante y las que otro técnico libere. Desliza hacia abajo para actualizar."
                />
              )
            }
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colors.navy]} tintColor={colors.navy} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Separador() {
  return <View style={{ height: spacing.md }} />;
}

/**
 * Banda marina de la bolsa: la misma que `SaludoBanda` en ritmo y tipografía,
 * con «volver» y el nombre de la vista. Sin cifras: el conteo vive en los
 * chips de la hoja, como en los demás listados. Entra con un desliz corto.
 */
function BandaBolsa({ onVolver, children }: { onVolver: () => void; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      entrada.setValue(1);
      return;
    }
    Animated.timing(entrada, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada, reduced]);

  return (
    <View style={{ backgroundColor: colors.navy, paddingTop: insets.top }}>
      {children}
      <View style={styles.banda}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis órdenes"
          onPress={onVolver}
          hitSlop={6}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' },
          ]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={18} />
        </Pressable>
        <Animated.View
          style={[
            styles.bandaTextos,
            {
              opacity: entrada,
              transform: [
                { translateX: entrada.interpolate({ inputRange: [0, 1], outputRange: [MOTION.entranceY * 2, 0] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.gold }]}>Bolsa de trabajo</Text>
          <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
            Órdenes disponibles
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // La hoja se monta 20 px sobre la banda (igual que `SaludoBanda`).
    paddingBottom: spacing.xl + 20,
  },
  volver: {
    width: TOUCH_TARGET - 4,
    height: TOUCH_TARGET - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandaTextos: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  titulo: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.7 },
  intro: { paddingLeft: spacing.xs, gap: 2 },
  introTitulo: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4 },
  introSub: { ...type.caption, fontSize: 12 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  siluetas: { marginTop: spacing.lg },
  vacioIcono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  errorBloque: { padding: spacing.xl, gap: spacing.lg },
});
