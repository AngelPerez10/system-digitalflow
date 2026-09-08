import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, toUserMessage } from '@/api/errors';
import { tomarOrden } from '@/api/ordenesApi';
import { AppButton } from '@/components/AppButton';
import { BarraCarga } from '@/components/BarraCarga';
import { IconChevron } from '@/components/icons';
import { EmptyState, InlineError } from '@/components/StateViews';
import { OrdenesSkeletonList } from '@/features/orders/components/OrdenCardSkeleton';
import { PoolOrdenCard } from '@/features/orders/components/PoolOrdenCard';
import { useOrdenesPool } from '@/features/orders/useOrdenesPool';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';

/**
 * Bolsa de órdenes disponibles ("Uber"): órdenes que otro técnico —o un admin—
 * liberó. La ven todos los técnicos; el primero que toca "Tomar" se la queda.
 */
export default function PoolOrdenesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const { ordenes, cargando, refrescando, error, recargar, quitar } = useOrdenesPool();
  const [tomandoId, setTomandoId] = useState<number | null>(null);

  const cargaInicial = cargando && ordenes.length === 0 && !error;

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
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
    elevation: 12,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['bottom']}>
      <StatusBar style="light" />

      <View style={[styles.hero, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis órdenes"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.volver, pressed ? { opacity: 0.6 } : null]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={16} />
          <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Mis órdenes</Text>
        </Pressable>
        <Text style={[styles.titulo, { color: colors.onNavy }]} accessibilityRole="header">
          Órdenes disponibles
        </Text>
        <Text style={[styles.sub, { color: colors.onNavyMuted }]}>
          Liberadas por otros técnicos · la toma el primero
        </Text>
      </View>

      <View style={[styles.hoja, hoja]}>
        {cargaInicial ? (
          <View style={styles.lista}>
            <OrdenesSkeletonList />
          </View>
        ) : (
          <FlatList
            data={ordenes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.lista, ordenes.length === 0 ? styles.listaVacia : null]}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={error ? <InlineError message={error} /> : null}
            renderItem={({ item }) => (
              <PoolOrdenCard orden={item} tomando={tomandoId === item.id} onTomar={onTomar} />
            )}
            ListEmptyComponent={
              error ? (
                <View style={styles.errorBloque}>
                  <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
                </View>
              ) : (
                <EmptyState
                  title="No hay órdenes en la bolsa"
                  description="Cuando un técnico libere una orden, aparecerá aquí. Desliza para actualizar."
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
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  volverTexto: { ...type.label },
  titulo: { fontFamily: font.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.7, marginTop: spacing.xs },
  sub: { ...type.caption, fontSize: 12, marginTop: 2 },
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
