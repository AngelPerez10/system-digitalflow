import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeOptional } from '@/theme/ThemeProvider';
import { colors as lightFallback, MOTION, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

/** Punto emisor: el ancla fija de la que salen las ondas. */
function Emisor({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5.5" cy="18.5" r="2.5" fill={color} />
    </Svg>
  );
}

/** Onda: un arco que sale del emisor. `radio` la separa del origen. */
function Onda({ size, radio, color }: { size: number; radio: 'corto' | 'largo'; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={radio === 'corto' ? 'M4 12.2A9.8 9.8 0 0 1 13.8 22' : 'M4 5.5A16.5 16.5 0 0 1 20.5 22'}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Marca de SertelPro: tres arcos de señal saliendo de un punto emisor — el
 * oficio de la empresa (transmisión, CCTV, alarmas) dicho en una sola forma.
 */
export function BrandMark({
  size = 40,
  animated = false,
  background,
  foreground,
}: {
  size?: number;
  animated?: boolean;
  /** Sobrescribe el fondo del glifo (por defecto el acento del tema). */
  background?: string;
  /** Sobrescribe el color de los arcos (por defecto `onPrimary`). */
  foreground?: string;
}) {
  const theme = useThemeOptional();
  const colors = theme?.colors ?? lightFallback;
  const fondo = background ?? colors.primary;
  const trazo = foreground ?? colors.onPrimary;
  const inner = size * 0.55;
  const reduced = useReducedMotion();
  const corto = useRef(new Animated.Value(0)).current;
  const largo = useRef(new Animated.Value(0)).current;
  const enMovimiento = animated && !reduced;

  useEffect(() => {
    if (!enMovimiento) {
      corto.setValue(0);
      largo.setValue(0);
      return;
    }

    const onda = (valor: Animated.Value, retraso: number) =>
      Animated.sequence([
        Animated.delay(retraso),
        Animated.loop(
          Animated.sequence([
            Animated.timing(valor, {
              toValue: 1,
              duration: MOTION.pulse,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(valor, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      ]);

    const animacion = Animated.parallel([onda(corto, 0), onda(largo, MOTION.pulse * 0.22)]);
    animacion.start();
    return () => animacion.stop();
  }, [enMovimiento, corto, largo]);

  const estiloOnda = (valor: Animated.Value, base: number) => {
    if (!enMovimiento) return { opacity: base };
    return {
      opacity: valor.interpolate({
        inputRange: [0, 0.25, 0.7, 1],
        outputRange: [0, base, base * 0.75, 0],
      }),
      transform: [
        {
          scale: valor.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }),
        },
      ],
    };
  };

  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: fondo },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="SertelPro"
    >
      <View style={{ width: inner, height: inner }}>
        <View style={StyleSheet.absoluteFill}>
          <Emisor size={inner} color={trazo} />
        </View>
        <Animated.View style={[StyleSheet.absoluteFill, estiloOnda(corto, 1)]}>
          <Onda size={inner} radio="corto" color={trazo} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, estiloOnda(largo, 0.55)]}>
          <Onda size={inner} radio="largo" color={trazo} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Marca completa: glifo + nombre. El nombre nunca se separa de su glifo. */
export function BrandLockup({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const theme = useThemeOptional();
  const colors = theme?.colors ?? lightFallback;
  return (
    <View style={styles.lockup}>
      <BrandMark size={size} animated={animated} />
      <Text style={[styles.wordmark, { color: colors.ink }]} accessibilityRole="header">
        SertelPro
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wordmark: { ...type.title },
});
