import React, { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { AppButton } from '@/components/AppButton';
import { SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { EmptyState, InlineError } from '@/components/StateViews';
import { agruparPorStatus } from '@/features/orders/agrupar';
import { EstadoConteo } from '@/features/orders/components/EstadoConteo';
import { OrdenClienteCard } from '@/features/orders/components/OrdenClienteCard';
import { statusSolid } from '@/features/orders/ordenFormat';
import { useOrdenesCliente } from '@/features/orders/useOrdenesCliente';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';

/** Punto sin ondas — mismo lenguaje que el vacío del técnico, sin depender de un ícono ajeno. */
function SinServicios({ line, inkSubtle }: { line: string; inkSubtle: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Circle cx={28} cy={28} r={19} stroke={line} strokeWidth={1.8} strokeDasharray="1 7" strokeLinecap="round" />
      <Circle cx={28} cy={28} r={3.5} fill={inkSubtle} />
    </Svg>
  );
}

/**
 * Portal cliente — sus órdenes en **solo lectura**. Ni un control de edición:
 * el backend tampoco lo permitiría (`PortalClientePermission` es SAFE_METHODS).
 *
 * Agrupadas por estatus (mismo `agruparPorStatus`/`EstadoConteo` que usa el
 * técnico en `/ordenes`) para que un cliente con varios servicios vea de un
 * vistazo cuáles siguen en curso — sin buscador ni selector de mes: son
 * pocas órdenes por cliente, esos controles serían ruido aquí.
 */
export default function ClienteHomeScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const { ordenes, cargando, refrescando, error, recargar } = useOrdenesCliente();

  const nombre = user ? nombreUsuarioDisplay(user, 'Cliente') : 'Cliente';
  const cargaInicial = cargando && ordenes.length === 0 && !error;
  const secciones = useMemo(() => agruparPorStatus(ordenes), [ordenes]);

  const abrir = useCallback(
    (orden: OrdenListItem) =>
      router.push({ pathname: '/cliente/[id]', params: { id: String(orden.id) } }),
    [router],
  );

  const subtitulo =
    ordenes.length === 0
      ? 'El avance de tus servicios'
      : `${ordenes.length} servicio${ordenes.length === 1 ? '' : 's'} registrado${ordenes.length === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />

      {/* El cambio de tema y cerrar sesión viven en el menú de la barra (drawer),
          igual que en las vistas del técnico. Aquí solo el saludo. */}
      <View style={[styles.hero, { backgroundColor: colors.navy }]}>
        <Text style={[styles.saludo, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
          Hola, {nombre}
        </Text>
        <Text style={[styles.lema, { color: colors.onNavyMuted }]} numberOfLines={1}>
          {subtitulo}
        </Text>
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
        {cargaInicial ? (
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
          <SectionList
            sections={secciones}
            keyExtractor={(orden) => String(orden.id)}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.lista, secciones.length === 0 ? styles.listaVacia : null]}
            renderSectionHeader={({ section }) => (
              <View style={styles.seccionRow}>
                <View style={styles.seccionTitulo}>
                  <View style={[styles.seccionPunto, { backgroundColor: statusSolid(section.key, colors).bg }]} />
                  <Text style={[styles.seccion, { color: colors.ink }]}>{section.title}</Text>
                </View>
                <EstadoConteo status={section.key} count={section.data.length} />
              </View>
            )}
            renderItem={({ item }) => <OrdenClienteCard orden={item} onPress={abrir} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={<SinServicios line={colors.line} inkSubtle={colors.inkSubtle} />}
                title="Aún no tienes servicios"
                description="Cuando Sertel registre una orden a tu nombre, la verás aquí con su avance."
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={recargar}
                tintColor={colors.navy}
                colors={[colors.navy]}
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
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 2,
  },
  saludo: { fontFamily: font.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  lema: { ...type.caption, fontSize: 12, marginTop: 2 },
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
  seccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  seccionTitulo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seccionPunto: { width: 7, height: 7, borderRadius: 4 },
  seccion: { ...type.label, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  esqueletos: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
  errorBloque: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
});
