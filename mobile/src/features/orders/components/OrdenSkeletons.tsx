import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBar, SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET } from '@/theme/tokens';

/**
 * Silueta del detalle de orden mientras llega el `GET`. Antes había un
 * indicador giratorio centrado: un punto que gira no dice nada de lo que
 * viene, y al resolverse la pantalla saltaba de golpe a un layout denso.
 *
 * Copia la anatomía real —banda marina con acciones de campo, secciones
 * con ícono de color y título afuera, y barra inferior— para que el relevo
 * sea un relleno y no un cambio de composición.
 */
export function DetalleOrdenSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fantasmaMarino = { backgroundColor: 'rgba(255,255,255,0.12)' };
  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.bandaFila}>
          <View style={[styles.bandaVolver, fantasmaMarino]} />
          <View style={[styles.bandaTitulos, styles.flex]}>
            <View style={[styles.bandaLinea, fantasmaMarino, { width: 90, height: 10 }]} />
            <View style={[styles.bandaLinea, fantasmaMarino, { width: 120, height: 20 }]} />
          </View>
          <View style={[styles.bandaLinea, fantasmaMarino, { width: 84, height: 26, borderRadius: radius.pill }]} />
        </View>
        <View style={[styles.bandaLinea, fantasmaMarino, { width: '62%', height: 14, marginTop: spacing.md }]} />
        <View style={[styles.bandaFila, { marginTop: spacing.md }]}>
          <View style={[styles.bandaAccion, fantasmaMarino]} />
          <View style={[styles.bandaAccion, fantasmaMarino]} />
        </View>
      </View>

      <SkeletonRegion label="Cargando la orden" style={styles.flex}>
        <View style={styles.formPad}>
          <PasoFantasma ancho="26%">
            <SkeletonPanel height={64} />
          </PasoFantasma>
          <PasoFantasma ancho="36%">
            <SkeletonBar width="70%" height={14} />
            <SkeletonBar width="54%" height={14} />
            <SkeletonBar width="62%" height={14} />
          </PasoFantasma>
        </View>
      </SkeletonRegion>

      <View
        style={[
          styles.barra,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
      </View>
    </View>
  );
}

/** Paso numerado fantasma: círculo + título afuera, tarjeta abajo (como `FormSection`). */
function PasoFantasma({ ancho, children }: { ancho: `${number}%`; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.paso}>
      <View style={styles.pasoEncabezado}>
        <SkeletonBar width={30} height={30} radiusOverride={radius.md} />
        <SkeletonBar width={ancho} height={14} />
      </View>
      <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>
    </View>
  );
}

/**
 * Silueta del reporte de cierre: banda marina con barra de progreso, pasos
 * numerados y barra de guardado fija — la misma composición que la pantalla
 * real, para que al llegar los datos solo se rellene y no salte.
 */
export function EditarOrdenSkeleton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fantasmaMarino = { backgroundColor: 'rgba(255,255,255,0.12)' };
  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.bandaFila}>
          <View style={[styles.bandaVolver, fantasmaMarino]} />
          <View style={styles.bandaTitulos}>
            <View style={[styles.bandaLinea, fantasmaMarino, { width: 72, height: 10 }]} />
            <View style={[styles.bandaLinea, fantasmaMarino, { width: 120, height: 20 }]} />
          </View>
        </View>
        <View style={[styles.bandaLinea, fantasmaMarino, { width: '100%', height: 6, marginTop: spacing.md }]} />
      </View>

      <SkeletonRegion label="Cargando el formulario" style={styles.flex}>
        <View style={styles.formPad}>
          <PasoFantasma ancho="26%">
            <View style={styles.estatusFila}>
              <SkeletonBar width="31%" height={96} radiusOverride={radius.md} />
              <SkeletonBar width="31%" height={96} radiusOverride={radius.md} />
              <SkeletonBar width="31%" height={96} radiusOverride={radius.md} />
            </View>
          </PasoFantasma>
          <PasoFantasma ancho="38%">
            <SkeletonBar width="40%" height={12} />
            <SkeletonBar width="100%" height={52} radiusOverride={radius.md} />
          </PasoFantasma>
          <PasoFantasma ancho="44%">
            <SkeletonPanel height={112} />
          </PasoFantasma>
        </View>
      </SkeletonRegion>

      <View
        style={[
          styles.barra,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <SkeletonBar width={140} height={12} />
        <SkeletonBar width="100%" height={TOUCH_TARGET} radiusOverride={radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xxl },
  estatusFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barra: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  banda: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  bandaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bandaVolver: { width: TOUCH_TARGET - 6, height: TOUCH_TARGET - 6, borderRadius: radius.pill },
  bandaTitulos: { gap: spacing.xs },
  bandaLinea: { borderRadius: radius.sm },
  bandaAccion: { flex: 1, height: TOUCH_TARGET - 4, borderRadius: radius.md },
  paso: { gap: spacing.md },
  pasoEncabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
});
