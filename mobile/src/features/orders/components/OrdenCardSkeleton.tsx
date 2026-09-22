import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBar as Barra, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing } from '@/theme/tokens';

/** Silueta de `OrdenCard` mientras llega el primer lote: placa de color,
 *  folio + cliente, nota, atajos y pie — la misma composición, para que la
 *  carga no se sienta más flaca que el contenido que la sustituye. */
export function OrdenCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        elevationFor(colors, 'card'),
      ]}
    >
      <View style={styles.cabeza}>
        <Barra width={42} height={42} radiusOverride={radius.md + 2} />
        <View style={styles.titulos}>
          <Barra width="45%" height={11} />
          <Barra width="75%" height={16} />
        </View>
      </View>
      <Barra width="90%" height={12} />
      <View style={styles.atajos}>
        <Barra width={130} height={34} radiusOverride={radius.pill} />
        <Barra width={84} height={34} radiusOverride={radius.pill} />
      </View>
      <View style={[styles.pie, { borderTopColor: colors.line }]}>
        <Barra width={96} height={11} />
        <Barra width={90} height={28} radiusOverride={radius.pill} />
      </View>
    </View>
  );
}

export function OrdenesSkeletonList({ filas = 4 }: { filas?: number }) {
  return (
    <SkeletonRegion label="Cargando órdenes">
      {Array.from({ length: filas }, (_, i) => (
        <OrdenCardSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titulos: { flex: 1, gap: spacing.sm },
  atajos: { flexDirection: 'row', gap: spacing.sm },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});
