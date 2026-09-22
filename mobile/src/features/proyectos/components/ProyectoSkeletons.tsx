import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, TOUCH_TARGET, type ThemeColors } from '@/theme/tokens';

function tarjetaTheme(colors: ThemeColors) {
  return [{ backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'card')];
}

/**
 * Silueta del detalle de proyecto mientras llega el `GET`: banda marina con
 * su título y línea de contexto, pestañas, grupos, y la barra de editar —
 * la misma composición que la pantalla real.
 */
export function DetalleProyectoSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fantasma = { backgroundColor: 'rgba(255,255,255,0.12)' };
  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.bandaFila}>
          <View style={[styles.bandaVolver, fantasma]} />
          <View style={[styles.flex, styles.bandaTitulos]}>
            <View style={[styles.bandaLinea, fantasma, { width: '70%', height: 18 }]} />
            <View style={[styles.bandaLinea, fantasma, { width: '50%', height: 11 }]} />
          </View>
        </View>
      </View>

      <SkeletonRegion label="Cargando el proyecto" style={styles.flex}>
        <View style={styles.contenido}>
          <SkeletonBar width="100%" height={TOUCH_TARGET - 2} radiusOverride={radius.md + 4} />
          <SeccionFantasma ancho="36%">
            <SkeletonBar width="50%" height={28} radiusOverride={radius.pill} />
          </SeccionFantasma>
          <SeccionFantasma ancho="44%">
            <SkeletonBar width="80%" height={14} />
            <SkeletonBar width="64%" height={14} />
          </SeccionFantasma>
          <SeccionFantasma ancho="32%">
            <SkeletonPanel height={64} />
          </SeccionFantasma>
        </View>
      </SkeletonRegion>

      <View
        style={[
          styles.barraDetalle,
          { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
      </View>
    </View>
  );
}

/** Sección fantasma: ícono + título afuera, tarjeta abajo (como `InfoSection`). */
function SeccionFantasma({ ancho, children }: { ancho: `${number}%`; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionEncabezado}>
        <SkeletonBar width={32} height={32} radiusOverride={radius.md} />
        <SkeletonBar width={ancho} height={14} />
      </View>
      <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>{children}</View>
    </View>
  );
}

/**
 * Silueta del formulario de edición: es la misma composición que el de
 * órdenes (banda con avance, pasos numerados, barra de guardado fija).
 */
export { EditarOrdenSkeleton as EditarProyectoSkeleton } from '@/features/orders/components/OrdenSkeletons';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hero: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  heroAcento: { width: 4 },
  heroCuerpo: { flex: 1, padding: spacing.lg, gap: spacing.md },
  heroFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  seccionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  tarjeta: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  formPad: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  estatusFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barra: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, gap: spacing.md },
  cancelarFantasma: { alignSelf: 'center' },
  banda: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  bandaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bandaVolver: { width: TOUCH_TARGET - 6, height: TOUCH_TARGET - 6, borderRadius: radius.pill },
  bandaTitulos: { gap: spacing.xs, marginLeft: spacing.xs },
  bandaLinea: { borderRadius: radius.sm },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xxl },
  seccion: { gap: spacing.md },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  barraDetalle: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
