import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBar as Barra, SkeletonRegion } from '@/components/Skeleton';
import { colors, elevation, radius, spacing } from '@/theme/tokens';

/** Silueta de `OrdenCard` (segunda generación) mientras llega el primer lote
 *  de órdenes — misma barra de acento, misma fila de insignias y el mismo
 *  recuadro de falla, para que la carga no se sienta más flaca que el
 *  contenido que la sustituye. */
export function OrdenCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.acento} />
      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <Barra width={72} height={18} radiusOverride={radius.sm} />
          <Barra width={90} height={18} radiusOverride={radius.sm} />
        </View>
        <Barra width="70%" height={16} />
        <Barra width="100%" height={44} radiusOverride={radius.md} />
        <View style={styles.cuerpo}>
          <Barra width="85%" height={11} />
          <Barra width="55%" height={11} />
        </View>
        <View style={styles.footer}>
          <Barra width={90} height={11} />
          <Barra width={100} height={30} radiusOverride={radius.md} />
        </View>
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
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...elevation.card,
  },
  acento: { width: 4, backgroundColor: colors.line },
  contenido: { flex: 1, padding: spacing.lg, gap: spacing.md },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between' },
  cuerpo: { gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
});
