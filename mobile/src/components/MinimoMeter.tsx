import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconCheck } from './icons';

interface Props {
  actual: number;
  minimo: number;
}

/**
 * Barra de avance hacia un mínimo de caracteres. Reemplaza el «37 / 100» en
 * texto plano: se lee de reojo mientras se escribe y cambia a verde con
 * palomita al cumplirse (texto + color + ícono, no solo color).
 */
export function MinimoMeter({ actual, minimo }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const cumple = actual >= minimo;
  const progreso = useRef(new Animated.Value(Math.min(actual / minimo, 1))).current;

  useEffect(() => {
    const destino = Math.min(actual / minimo, 1);
    if (reduced) {
      progreso.setValue(destino);
      return;
    }
    Animated.timing(progreso, {
      toValue: destino,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [actual, minimo, progreso, reduced]);

  const faltan = minimo - actual;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.pista, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <Animated.View
          style={[
            styles.relleno,
            {
              backgroundColor: cumple ? colors.success : colors.primary,
              width: progreso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <View style={styles.fila}>
        {cumple ? <IconCheck color={colors.success} size={13} /> : null}
        <Text style={[styles.texto, { color: cumple ? colors.success : colors.inkSubtle }]}>
          {cumple
            ? `Mínimo cumplido · ${actual} caracteres`
            : `Faltan ${faltan} caracteres para el mínimo de ${minimo}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2, marginTop: -spacing.sm },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  relleno: { height: '100%', borderRadius: 3 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  texto: { ...type.caption, fontSize: 12 },
});
