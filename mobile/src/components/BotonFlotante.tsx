import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  /** Texto del botón («Nueva cotización», «Nuevo reporte»); también es su etiqueta accesible. */
  label: string;
  /** Distancia al borde inferior (ya con el área segura sumada). */
  bottom: number;
  onPress: () => void;
}

/**
 * Botón flotante de «crear» de los listados: entra desde abajo con un resorte
 * corto y se hunde al tocarlo. Solo transform/opacity (hilo nativo).
 */
export function BotonFlotante({ label, bottom, onPress }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.spring(entrada, { toValue: 1, friction: 8, tension: 90, delay: 250, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [entrada, reduced]);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.spring(escala, { toValue: destino, friction: 9, tension: 300, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        styles.caja,
        {
          bottom,
          opacity: entrada,
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: escala }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => presionar(0.95)}
        onPressOut={() => presionar(1)}
        style={({ pressed }) => [
          styles.boton,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
          elevationFor(colors, 'panel'),
        ]}
      >
        <Text style={[styles.mas, { color: colors.onPrimary }]}>+</Text>
        <Text style={[styles.texto, { color: colors.onPrimary }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caja: { position: 'absolute', right: spacing.lg },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
  },
  mas: { fontFamily: font.semibold, fontSize: 22, lineHeight: 24, marginTop: -2 },
  texto: { fontFamily: font.semibold, fontSize: 15 },
});
