import React, { useRef } from 'react';
import { Animated, Easing, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, TOUCH_TARGET } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  icon: React.ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** `bordered` (por defecto) para chrome de pantalla; `ghost` sin borde ni fondo. */
  variant?: 'bordered' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón cuadrado de solo ícono, con retroalimentación de escala.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'bordered',
  disabled = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const animarA = (destino: number, conRebote: boolean) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: conRebote ? 160 : 80,
      easing: conRebote ? Easing.out(Easing.back(1.4)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, disabled ? { opacity: 0.4 } : null, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animarA(0.92, false)}
        onPressOut={() => animarA(1, true)}
        style={({ pressed }) => [
          {
            width: TOUCH_TARGET,
            height: TOUCH_TARGET,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
          },
          variant === 'bordered'
            ? {
                borderWidth: 1,
                borderColor: pressed ? colors.lineStrong : colors.line,
                backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
              }
            : {
                backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
              },
        ]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}
