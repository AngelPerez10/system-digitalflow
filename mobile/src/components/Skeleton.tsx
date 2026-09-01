import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  width: number | `${number}%`;
  height?: number;
  /** Por defecto la barra es una píldora; los bloques grandes piden un radio real. */
  radiusOverride?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Barra de esqueleto que respira entre dos tonos de línea. Nació dentro de
 * `OrdenCardSkeleton`; vive aquí porque el detalle y el formulario de edición
 * necesitan la misma pieza, y un segundo pulso con otra duración se notaría al
 * navegar entre las tres pantallas.
 *
 * `line` (#E7E7EA) y no `surfaceSunken`: sobre la tarjeta blanca el gris hundido
 * es prácticamente invisible.
 */
export function SkeletonBar({ width, height = 12, radiusOverride, style }: Props) {
  const reduced = useReducedMotion();
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso, reduced]);

  return (
    <Animated.View
      style={[
        styles.barra,
        { width, height, borderRadius: radiusOverride ?? height / 2 },
        reduced
          ? { opacity: 0.7 }
          : { opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        style,
      ]}
    />
  );
}

/** Envoltura de cualquier esqueleto: lo saca del árbol de accesibilidad (no hay
 *  nada que leer todavía) y lo anuncia como una sola región ocupada. */
export function SkeletonRegion({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={style}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

/** Bloque hundido con el radio de una tarjeta — para siluetas de paneles. */
export function SkeletonPanel({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  return <SkeletonBar width="100%" height={height} radiusOverride={radius.lg} style={style} />;
}

const styles = StyleSheet.create({
  barra: { backgroundColor: colors.line },
});
