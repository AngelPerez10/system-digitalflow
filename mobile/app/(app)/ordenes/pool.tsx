import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, toUserMessage } from '@/api/errors';
import { tomarOrden } from '@/api/ordenesApi';
import { AppButton } from '@/components/AppButton';
import { BarraCarga } from '@/components/BarraCarga';
import { IconChevron } from '@/components/icons';
import { IconBox } from '@/features/orders/components/icons';
import { EmptyState, InlineError } from '@/components/StateViews';
import { OrdenesSkeletonList } from '@/features/orders/components/OrdenCardSkeleton';
import { PoolOrdenCard } from '@/features/orders/components/PoolOrdenCard';
import { contarPorPrioridad } from '@/features/orders/agrupar';
import { normalizarPrioridad } from '@/features/orders/ordenFormat';
import { PrioridadResumen, type FiltroPrioridad } from '@/features/orders/components/PrioridadResumen';
import { useOrdenesPool } from '@/features/orders/useOrdenesPool';
import { usePush } from '@/notifications/PushProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';

/**
 * Órdenes disponibles ("Uber"): órdenes que otro técnico —o un admin— liberó.
 * Las ven todos los técnicos; el primero que toca "Tomar" se la queda.
 */
export default function PoolOrdenesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const { ordenes, cargando, refrescando, error, recargar, quitar } = useOrdenesPool();
  const { marcarDisponiblesVistas, setPantallaDisponiblesActiva } = usePush();
  const [tomandoId, setTomandoId] = useState<number | null>(null);

  // Al abrir (o volver a) esta pantalla el badge se pone a cero, y mientras
  // esté enfocada las notificaciones no vuelven a sumarle.
  useFocusEffect(
    useCallback(() => {
      marcarDisponiblesVistas();
      setPantallaDisponiblesActiva(true);
      return () => setPantallaDisponiblesActiva(false);
    }, [marcarDisponiblesVistas, setPantallaDisponiblesActiva]),
  );

  const cargaInicial = cargando && ordenes.length === 0 && !error;
  const [filtro, setFiltro] = useState<FiltroPrioridad>('todas');
  const conteo = useMemo(() => contarPorPrioridad(ordenes), [ordenes]);
  const visibles = useMemo(
    () => (filtro === 'todas' ? ordenes : ordenes.filter((o) => normalizarPrioridad(o.prioridad_pool) === filtro)),
    [ordenes, filtro],
  );

  const onTomar = useCallback(
    (orden: OrdenListItem) => {
      Alert.alert('Tomar orden', `¿Asignarte la orden ${orden.folio ?? `#${orden.id}`}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Tomar',
          onPress: async () => {
            setTomandoId(orden.id);
            try {
              await tomarOrden(orden.id);
              quitar(orden.id);
              router.push(`/ordenes/${orden.id}`);
            } catch (e) {
              if (e instanceof ApiError && e.status === 409) {
                Alert.alert('Ya no disponible', 'Otro técnico ya tomó esta orden.');
                recargar();
              } else {
                Alert.alert('No se pudo tomar', toUserMessage(e));
              }
            } finally {
              setTomandoId(null);
            }
          },
        },
      ]);
    },
    [quitar, recargar, router],
  );

  const hoja = {
    backgroundColor: colors.canvas,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
    elevation: 12,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />

      <View style={[styles.hero, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
        <View style={styles.heroFila}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a mis órdenes"
            onPress={() => router.back()}
            hitSlop={4}
            style={({ pressed }) => [
              styles.volver,
              { backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' },
            ]}
          >
            <IconChevron direction="left" color={colors.onNavy} size={18} />
          </Pressable>
          <View style={styles.heroTitulos}>
            <Text style={[styles.eyebrow, { color: colors.gold }]}>Bolsa de trabajo</Text>
            <Text style={[styles.titulo, { color: colors.onNavy }]} accessibilityRole="header" numberOfLines={1}>
              Órdenes disponibles
            </Text>
          </View>
        </View>

        <PrioridadResumen
          total={ordenes.length}
          conteo={conteo}
          filtro={filtro}
          onFiltro={setFiltro}
          cargando={cargaInicial}
        />
        <Text style={[styles.sub, { color: colors.onNavyMuted }]}>
          Liberadas por otros técnicos. La primera persona que la toma se la queda.
        </Text>
      </View>

      <View style={[styles.hoja, hoja]}>
        {cargaInicial ? (
          <View style={styles.lista}>
            <OrdenesSkeletonList />
          </View>
        ) : (
          <FlatList
            data={visibles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.lista, visibles.length === 0 ? styles.listaVacia : null]}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={error ? <InlineError message={error} /> : null}
            renderItem={({ item }) => (
              <PoolOrdenCard
                orden={item}
                tomando={tomandoId === item.id}
                bloqueada={tomandoId !== null && tomandoId !== item.id}
                onTomar={onTomar}
              />
            )}
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
                  title={filtro === 'todas' ? 'No hay órdenes disponibles' : `Sin órdenes de prioridad ${filtro}`}
                  description={
                    filtro === 'todas'
                      ? 'Cuando un técnico libere una orden, aparecerá aquí. Desliza para actualizar.'
                      : 'Toca la prioridad activa arriba para ver todas.'
                  }
                />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={recargar}
                colors={[colors.navy]}
                tintColor={colors.navy}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + 20, gap: spacing.md },
  heroFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volver: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitulos: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  titulo: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.7 },
  sub: { ...type.caption, fontSize: 12, lineHeight: 17 },
  vacioIcono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  hoja: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  lista: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  listaVacia: { flexGrow: 1 },
  errorBloque: { padding: spacing.xl, gap: spacing.lg },
});
