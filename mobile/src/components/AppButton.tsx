import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón con retroalimentación táctil: se hunde un 3 % al presionar y vuelve
 * con un leve rebote. Colores desde el tema activo.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const variants = useMemo(() => {
    return {
      primary: {
        base: { backgroundColor: colors.primary, borderColor: colors.primary },
        pressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
        disabled: { backgroundColor: colors.primaryDisabled, borderColor: colors.primaryDisabled },
        label: { color: colors.onPrimary },
        labelDisabled: { color: colors.onPrimaryDisabled },
      },
      secondary: {
        base: { backgroundColor: colors.surface, borderColor: colors.line },
        pressed: { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong },
        disabled: { opacity: 0.6 },
        label: { color: colors.ink },
        labelDisabled: {},
      },
      ghost: {
        base: { backgroundColor: 'transparent', borderColor: 'transparent' },
        pressed: { backgroundColor: colors.surfaceSunken },
        disabled: { opacity: 0.6 },
        label: { color: colors.primary },
        labelDisabled: {},
      },
    } as const;
  }, [colors]);

  const animarA = (destino: number, conRebote: boolean) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: conRebote ? 180 : 90,
      easing: conRebote ? Easing.out(Easing.back(1.6)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const v = variants[variant];

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={onPress}
        onPressIn={() => animarA(0.97, false)}
        onPressOut={() => animarA(1, true)}
        style={({ pressed }) => [
          {
            height: TOUCH_TARGET,
            borderRadius: radius.md,
            paddingHorizontal: spacing.xl,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderWidth: 1,
          },
          v.base,
          pressed && !inactive ? v.pressed : null,
          inactive ? v.disabled : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} size="small" />
        ) : (
          <Text
            style={[
              type.button,
              v.label,
              inactive && variant === 'primary' ? v.labelDisabled : null,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
