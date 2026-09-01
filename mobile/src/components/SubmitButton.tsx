import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

export type SubmitPhase = 'idle' | 'sending' | 'success';

interface Props {
  label: string;
  phase: SubmitPhase;
  disabled?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  /** Color de relleno (por defecto el acento del tema). */
  tint?: string;
  /** Color de relleno al presionar (por defecto `primaryPressed`). */
  tintPressed?: string;
  /** Color de relleno deshabilitado (por defecto `primaryDisabled`). */
  tintDisabled?: string;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LENGTH = 26;

function Check({ progress, color }: { progress: Animated.Value; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M5.5 12.5 10 17l8.5-9"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_LENGTH}
        strokeDashoffset={progress.interpolate({
          inputRange: [0, 1],
          outputRange: [CHECK_LENGTH, 0],
        })}
      />
    </Svg>
  );
}

/**
 * Botón de acceso con tres fases. Al enviar colapsa a un círculo y gira; al
 * confirmar dibuja la palomita antes de ceder el paso.
 */
export function SubmitButton({
  label,
  phase,
  disabled = false,
  onPress,
  accessibilityHint,
  tint,
  tintPressed,
  tintDisabled,
}: Props) {
  const { colors } = useTheme();
  const relleno = tint ?? colors.primary;
  const rellenoPressed = tintPressed ?? colors.primaryPressed;
  const rellenoDisabled = tintDisabled ?? colors.primaryDisabled;
  const reduced = useReducedMotion();
  const [anchoCompleto, setAnchoCompleto] = useState(0);
  const colapso = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const activo = phase !== 'idle';

  useEffect(() => {
    const destino = activo ? 1 : 0;
    if (reduced) {
      colapso.setValue(destino);
    } else {
      Animated.timing(colapso, {
        toValue: destino,
        duration: 320,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false,
      }).start();
    }
  }, [activo, colapso, reduced]);

  useEffect(() => {
    if (phase !== 'success') {
      check.setValue(0);
      return;
    }
    if (reduced) {
      check.setValue(1);
      return;
    }
    Animated.timing(check, {
      toValue: 1,
      duration: MOTION.success * 0.7,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [phase, check, reduced]);

  const anchoAnimado = colapso.interpolate({
    inputRange: [0, 1],
    outputRange: [anchoCompleto || TOUCH_TARGET, TOUCH_TARGET],
  });
  const radioAnimado = colapso.interpolate({
    inputRange: [0, 1],
    outputRange: [radius.md, TOUCH_TARGET / 2],
  });

  const medir = (event: LayoutChangeEvent) => {
    const ancho = Math.round(event.nativeEvent.layout.width);
    if (ancho > 0 && ancho !== anchoCompleto) setAnchoCompleto(ancho);
  };

  return (
    <View style={styles.row} onLayout={medir}>
      <Animated.View
        style={[
          styles.shell,
          anchoCompleto === 0
            ? styles.shellSinMedir
            : { width: anchoAnimado, borderRadius: radioAnimado },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: disabled || activo, busy: phase === 'sending' }}
          disabled={disabled || activo}
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: relleno },
            disabled && !activo ? { backgroundColor: rellenoDisabled } : null,
            pressed && !disabled && !activo ? { backgroundColor: rellenoPressed } : null,
          ]}
        >
          {phase === 'idle' ? (
            <Text
              style={[
                styles.label,
                { color: disabled ? colors.onPrimaryDisabled : colors.onPrimary },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : phase === 'sending' ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Check progress={check} color={colors.onPrimary} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
  shell: { overflow: 'hidden' },
  shellSinMedir: { width: '100%', borderRadius: radius.md },
  button: {
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: { ...type.button },
});
