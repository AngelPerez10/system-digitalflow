import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, TOUCH_TARGET, type ThemeColors } from '@/theme/tokens';

function Seccion({ ancho }: { ancho: `${number}%` }) {
  return (
    <View style={styles.seccionRow}>
      <SkeletonBar width={7} height={7} />
      <SkeletonBar width={ancho} height={11} />
    </View>
  );
}

function tarjetaTheme(colors: ThemeColors) {
  return [{ backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'card')];
}

/**
 * Silueta del detalle de proyecto mientras llega el `GET` — misma anatomía
 * que `DetalleOrdenSkeleton` (hero con acento, secciones con punto y
 * tarjeta) para que el relevo sea un relleno, no un cambio de composición.
 */
export function DetalleProyectoSkeleton() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <SkeletonRegion label="Cargando el proyecto" style={styles.flex}>
        <View style={styles.content}>
          <View style={[styles.hero, ...tarjetaTheme(colors)]}>
            <View style={[styles.heroAcento, { backgroundColor: colors.line }]} />
            <View style={styles.heroCuerpo}>
              <View style={styles.heroFila}>
                <SkeletonBar width={100} height={26} radiusOverride={radius.sm} />
                <SkeletonBar width={82} height={22} radiusOverride={radius.pill} />
              </View>
              <SkeletonBar width="72%" height={16} radiusOverride={radius.sm} />
              <SkeletonBar width="100%" height={6} radiusOverride={3} />
            </View>
          </View>

          <Seccion ancho="30%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <SkeletonBar width="88%" height={14} />
            <SkeletonBar width="64%" height={14} />
            <SkeletonBar width="76%" height={14} />
          </View>

          <Seccion ancho="24%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <SkeletonPanel height={56} />
            <SkeletonBar width="70%" height={14} />
          </View>

          <Seccion ancho="34%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <SkeletonPanel height={72} />
          </View>
        </View>
      </SkeletonRegion>

      <View style={[styles.barra, { borderTopColor: colors.line }]}>
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
      </View>
    </SafeAreaView>
  );
}

/** Silueta del formulario de edición — misma anatomía que el detalle. */
export function EditarProyectoSkeleton() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <SkeletonRegion label="Cargando el formulario" style={styles.flex}>
        <View style={styles.formPad}>
          <View style={[styles.hero, ...tarjetaTheme(colors)]}>
            <View style={[styles.heroAcento, { backgroundColor: colors.line }]} />
            <View style={styles.heroCuerpo}>
              <View style={styles.heroFila}>
                <SkeletonBar width={78} height={18} radiusOverride={radius.sm} />
              </View>
              <SkeletonBar width="72%" height={24} radiusOverride={radius.sm} />
            </View>
          </View>

          <Seccion ancho="22%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <View style={styles.estatusFila}>
              <SkeletonBar width="46%" height={TOUCH_TARGET} radiusOverride={radius.md} />
              <SkeletonBar width="46%" height={TOUCH_TARGET} radiusOverride={radius.md} />
            </View>
          </View>

          <Seccion ancho="28%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <SkeletonPanel height={96} />
          </View>

          <Seccion ancho="20%" />
          <View style={[styles.tarjeta, ...tarjetaTheme(colors)]}>
            <SkeletonPanel height={120} />
          </View>
        </View>
      </SkeletonRegion>

      <View style={[styles.barra, { borderTopColor: colors.line }]}>
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
        <SkeletonBar width={96} height={14} style={styles.cancelarFantasma} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
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
});
