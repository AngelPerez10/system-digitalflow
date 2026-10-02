import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

/** Silueta del listado: misma forma que `ReporteCard` (placa, títulos, tira de miniaturas, pie). */
export function ReportesSkeletonList() {
  const { colors } = useTheme();
  return (
    <SkeletonRegion label="Cargando reportes">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.fila}>
            <SkeletonBar width={42} height={42} radiusOverride={radius.md + 2} />
            <View style={styles.textos}>
              <SkeletonBar width="45%" height={11} />
              <SkeletonBar width="80%" height={16} />
            </View>
          </View>
          <View style={styles.minis}>
            {[0, 1, 2, 3].map((m) => (
              <SkeletonBar key={m} width={54} height={54} radiusOverride={radius.md} />
            ))}
          </View>
          <SkeletonBar width="100%" height={5} />
          <View style={styles.pie}>
            <SkeletonBar width="35%" height={11} />
            <SkeletonBar width={96} height={28} />
          </View>
        </View>
      ))}
    </SkeletonRegion>
  );
}

/** Silueta del detalle y del formulario: banda marina + bloques. */
export function DetalleReporteSkeleton() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <View style={[styles.banda, { backgroundColor: colors.navy }]} />
      <SkeletonRegion label="Cargando reporte">
        <View style={styles.bloques}>
          <SkeletonBar width="60%" height={36} />
          <SkeletonPanel height={300} />
          <SkeletonPanel height={170} />
        </View>
      </SkeletonRegion>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, marginTop: spacing.md },
  minis: { flexDirection: 'row', gap: spacing.sm },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textos: { flex: 1, gap: spacing.sm },
  banda: { height: 170 },
  bloques: { padding: spacing.lg, gap: spacing.lg },
});
