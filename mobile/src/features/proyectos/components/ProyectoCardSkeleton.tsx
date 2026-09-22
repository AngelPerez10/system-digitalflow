import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBar as Barra, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing } from '@/theme/tokens';

/** Silueta de `ProyectoCard`: placa, títulos y anillo; equipo; bloque de métricas; pie. */
export function ProyectoCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'card')]}
    >
      <View style={styles.cabeza}>
        <Barra width={42} height={42} radiusOverride={radius.md + 2} />
        <View style={styles.titulos}>
          <Barra width="45%" height={11} />
          <Barra width="80%" height={16} />
          <Barra width="30%" height={11} />
        </View>
        <Barra width={48} height={48} radiusOverride={24} />
      </View>
      <Barra width="55%" height={26} radiusOverride={13} />
      <Barra width="100%" height={60} radiusOverride={radius.md + 2} />
      <View style={[styles.pie, { borderTopColor: colors.line }]}>
        <Barra width={110} height={11} />
        <Barra width={110} height={28} radiusOverride={radius.pill} />
      </View>
    </View>
  );
}

export function ProyectosSkeletonList({ filas = 3 }: { filas?: number }) {
  return (
    <SkeletonRegion label="Cargando proyectos">
      {Array.from({ length: filas }, (_, i) => (
        <ProyectoCardSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, marginBottom: spacing.md, padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titulos: { flex: 1, gap: spacing.sm },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});
