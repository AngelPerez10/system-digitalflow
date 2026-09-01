import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { colors, elevation, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';

function Seccion({ ancho }: { ancho: `${number}%` }) {
  return (
    <View style={styles.seccionRow}>
      <SkeletonBar width={7} height={7} />
      <SkeletonBar width={ancho} height={11} />
    </View>
  );
}

/**
 * Silueta del detalle de orden mientras llega el `GET`. Antes había un
 * indicador giratorio centrado: un punto que gira no dice nada de lo que
 * viene, y al resolverse la pantalla saltaba de golpe a un layout denso.
 *
 * Copia la anatomía real —encabezado con barra de acento, par de acciones
 * rápidas, secciones con punto y título afuera, tarjeta— para que el relevo
 * sea un relleno y no un cambio de composición.
 */
export function DetalleOrdenSkeleton() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SkeletonRegion label="Cargando la orden" style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroAcento} />
            <View style={styles.heroCuerpo}>
              <View style={styles.heroFila}>
                <SkeletonBar width={TOUCH_TARGET - 8} height={TOUCH_TARGET - 8} radiusOverride={radius.md} />
                <SkeletonBar width={78} height={18} radiusOverride={radius.sm} />
                <SkeletonBar width={82} height={18} radiusOverride={radius.pill} />
              </View>
              <SkeletonBar width="72%" height={24} radiusOverride={radius.sm} />
              <SkeletonBar width={132} height={24} radiusOverride={radius.pill} />
            </View>
          </View>

          <View style={styles.accionesFila}>
            <SkeletonBar width="48%" height={TOUCH_TARGET} radiusOverride={radius.md} />
            <SkeletonBar width="48%" height={TOUCH_TARGET} radiusOverride={radius.md} />
          </View>

          <Seccion ancho="24%" />
          <View style={styles.tarjeta}>
            <SkeletonBar width="88%" height={14} />
            <SkeletonBar width="64%" height={14} />
            <SkeletonBar width="76%" height={14} />
          </View>

          <Seccion ancho="20%" />
          <View style={styles.tarjeta}>
            <SkeletonPanel height={56} />
            <SkeletonBar width="70%" height={14} />
          </View>
        </View>
      </SkeletonRegion>

      <View style={styles.barra}>
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
      </View>
    </SafeAreaView>
  );
}

/**
 * Silueta del formulario de edición — misma anatomía que el detalle
 * (hero con acento, sección + tarjeta), para que el relevo no cambie de lenguaje.
 */
export function EditarOrdenSkeleton() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SkeletonRegion label="Cargando el formulario" style={styles.flex}>
        <View style={styles.formPad}>
          <View style={styles.hero}>
            <View style={styles.heroAcento} />
            <View style={styles.heroCuerpo}>
              <View style={styles.heroFila}>
                <SkeletonBar width={TOUCH_TARGET - 8} height={TOUCH_TARGET - 8} radiusOverride={radius.md} />
                <SkeletonBar width={78} height={18} radiusOverride={radius.sm} />
              </View>
              <SkeletonBar width="72%" height={24} radiusOverride={radius.sm} />
              <SkeletonBar width={132} height={24} radiusOverride={radius.pill} />
            </View>
          </View>

          <Seccion ancho="22%" />
          <View style={styles.tarjeta}>
            <View style={styles.estatusFila}>
              <SkeletonBar width="30%" height={TOUCH_TARGET} radiusOverride={radius.md} />
              <SkeletonBar width="30%" height={TOUCH_TARGET} radiusOverride={radius.md} />
              <SkeletonBar width="30%" height={TOUCH_TARGET} radiusOverride={radius.md} />
            </View>
          </View>

          <Seccion ancho="28%" />
          <View style={styles.tarjeta}>
            <SkeletonPanel height={96} />
          </View>

          <Seccion ancho="20%" />
          <View style={styles.tarjeta}>
            <SkeletonPanel height={120} />
          </View>
        </View>
      </SkeletonRegion>

      <View style={styles.barra}>
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
        <SkeletonBar width={96} height={14} style={styles.cancelarFantasma} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...elevation.card,
  },
  heroAcento: { width: 4, backgroundColor: colors.line },
  heroCuerpo: { flex: 1, padding: spacing.lg, gap: spacing.md },
  heroFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accionesFila: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  seccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.card,
  },
  formPad: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  estatusFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barra: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing.md,
  },
  cancelarFantasma: { alignSelf: 'center' },
});
