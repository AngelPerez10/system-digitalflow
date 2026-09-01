import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { portalAcceso } from '@/auth/portalAcceso';
import { useSession } from '@/auth/SessionProvider';
import { AppButton } from '@/components/AppButton';
import { SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { EmptyState, InlineError } from '@/components/StateViews';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconClipboard } from '@/features/orders/components/icons';
import { OrdenClienteCard } from '@/features/orders/components/OrdenClienteCard';
import { useOrdenesCliente } from '@/features/orders/useOrdenesCliente';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';

/**
 * Portal cliente — sus órdenes en **solo lectura**. Ni un control de edición:
 * el backend tampoco lo permitiría (`PortalClientePermission` es SAFE_METHODS).
 */
export default function ClienteHomeScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { ordenes, cargando, refrescando, error, recargar } = useOrdenesCliente();

  const nombre = user ? nombreUsuarioDisplay(user) : 'Cliente';

  const abrir = useCallback(
    (orden: OrdenListItem) =>
      router.push({ pathname: '/cliente/[id]', params: { id: String(orden.id) } }),
    [router],
  );

  const salir = useCallback(async () => {
    await signOut();
    await portalAcceso.clear();
  }, [signOut]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />

      <View style={[styles.hero, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.heroFila}>
          <View style={styles.heroTextos}>
            <Text style={[styles.saludo, { color: colors.onNavy }]} accessibilityRole="header">
              Hola, {nombre}
            </Text>
            <Text style={[styles.lema, { color: colors.onNavyMuted }]}>
              El avance de tus servicios
            </Text>
          </View>
          <View style={styles.heroAcciones}>
            <ThemeToggle onDark />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={() => void salir()}
              hitSlop={10}
              style={({ pressed }) => [styles.salir, pressed ? { opacity: 0.55 } : null]}
            >
              <Text style={[styles.salirTexto, { color: colors.onNavyMuted }]}>Salir</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            ...elevationFor(colors, 'card'),
            shadowOffset: { width: 0, height: -10 },
            shadowRadius: 24,
            shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
          },
        ]}
      >
        {cargando ? (
          <SkeletonRegion label="Cargando tus servicios" style={styles.esqueletos}>
            <SkeletonPanel height={150} />
            <SkeletonPanel height={150} />
            <SkeletonPanel height={150} />
          </SkeletonRegion>
        ) : error ? (
          <View style={styles.errorBloque}>
            <InlineError message={error} />
            <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
          </View>
        ) : (
          <FlatList
            data={ordenes}
            keyExtractor={(orden) => String(orden.id)}
            renderItem={({ item }) => <OrdenClienteCard orden={item} onPress={abrir} />}
            contentContainerStyle={[styles.lista, ordenes.length === 0 ? styles.listaVacia : null]}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={recargar}
                tintColor={colors.navy}
                colors={[colors.navy]}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={<IconClipboard color={colors.inkSubtle} size={30} />}
                title="Aún no tienes servicios"
                description="Cuando Sertel registre una orden a tu nombre, la verás aquí con su avance."
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
  heroFila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroTextos: { flex: 1, paddingTop: spacing.xs },
  heroAcciones: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  saludo: { fontFamily: font.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.9 },
  lema: { ...type.body, marginTop: 2 },
  salir: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  salirTexto: { ...type.label },
  panel: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: spacing.lg,
    overflow: 'hidden',
  },
  lista: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  listaVacia: { flexGrow: 1 },
  esqueletos: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
  errorBloque: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
});
