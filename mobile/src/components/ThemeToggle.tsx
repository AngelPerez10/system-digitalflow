import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { IconMoon, IconSun } from '@/components/iconsTheme';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, TOUCH_TARGET } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Interruptor claro ↔ oscuro. Anuncia el modo al que va a pasar (no el actual),
 * con `aria-pressed` del estado oscuro para lectores de pantalla.
 *
 * `onDark`: variante para una superficie oscura (cabecera marina) — sin caja ni
 * borde ni punto, solo el ícono blanco.
 */
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const { scheme, colors, toggleLightDark } = useTheme();
  const oscuro = scheme === 'dark';
  const iconColor = onDark ? '#FFFFFF' : colors.ink;
  const reduced = useReducedMotion();
  const giro = useRef(new Animated.Value(oscuro ? 1 : 0)).current;

  const alPulsar = () => {
    if (!reduced) {
      Animated.timing(giro, {
        toValue: oscuro ? 0 : 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    toggleLightDark();
  };

  const rotacion = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: oscuro }}
      accessibilityLabel={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      accessibilityHint="Alterna el tema de la aplicación"
      onPress={alPulsar}
      hitSlop={onDark ? 10 : undefined}
      style={({ pressed }) =>
        onDark
          ? [styles.bare, pressed ? { opacity: 0.55 } : null]
          : [
              styles.hit,
              {
                backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
                borderColor: colors.line,
              },
            ]
      }
    >
      <Animated.View style={{ transform: [{ rotate: reduced ? '0deg' : rotacion }] }}>
        {oscuro ? (
          <IconSun color={iconColor} size={onDark ? 20 : 18} />
        ) : (
          <IconMoon color={iconColor} size={onDark ? 20 : 18} />
        )}
      </Animated.View>
      {onDark ? null : (
        <View
          style={[styles.punto, { backgroundColor: oscuro ? colors.primary : colors.lineStrong }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  bare: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
