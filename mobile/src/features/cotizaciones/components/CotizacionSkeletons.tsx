import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonRegion } from '@/components/Skeleton';
import { EditarOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET } from '@/theme/tokens';

/** Silueta del detalle: cabecera marina, tarjeta de montos y secciones. */
export function DetalleCotizacionSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fantasma = { backgroundColor: 'rgba(255,255,255,0.12)' };
  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <View style={[styles.bandaAlta, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.banda}>
          <View style={[styles.volver, fantasma]} />
          <View style={styles.titulos}>
            <View style={[styles.linea, fantasma, { width: '70%', height: 18 }]} />
            <View style={[styles.linea, fantasma, { width: '55%', height: 11 }]} />
          </View>
        </View>
      </View>
      <SkeletonRegion label="Cargando cotización" style={styles.contenido}>
        <SkeletonBar width="100%" height={190} radiusOverride={radius.card} />
        <SkeletonBar width="40%" height={14} />
        <SkeletonBar width="100%" height={150} radiusOverride={radius.lg} />
        <SkeletonBar width="40%" height={14} />
        <SkeletonBar width="100%" height={110} radiusOverride={radius.lg} />
      </SkeletonRegion>
    </View>
  );
}

/** El formulario comparte la silueta del de órdenes (cabecera + pasos numerados). */
export const EditarCotizacionSkeleton = EditarOrdenSkeleton;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bandaAlta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  banda: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volver: { width: TOUCH_TARGET - 6, height: TOUCH_TARGET - 6, borderRadius: radius.pill },
  titulos: { flex: 1, gap: spacing.sm },
  linea: { borderRadius: 6 },
  contenido: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
});
