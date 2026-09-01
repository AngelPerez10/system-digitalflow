import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  helper?: string;
  /** Añade el botón de mostrar/ocultar. Solo tiene sentido con `secureTextEntry`. */
  revealable?: boolean;
  /** Ícono fijo a la izquierda (p. ej. la lupa del campo de búsqueda). No es interactivo. */
  leadingIcon?: React.ReactNode;
  /**
   * `box` (por defecto) es el campo con caja que usa el resto de la app.
   * `underline` — solo borde inferior, etiqueta pequeña en mayúsculas, sin
   * anillo de foco — nace del acceso (rediseño con Sleek); ningún otro campo
   * lo usa todavía.
   */
  variant?: 'box' | 'underline';
}

const AnimatedView = Animated.createAnimatedComponent(View);

function OjoAbierto({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function OjoCerrado({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Line
        x1={4}
        y1={20}
        x2={20}
        y2={4}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Campo de texto con acción opcional a la derecha. El foco no salta: el borde
 * y el anillo azul se funden en 160 ms, lo justo para que el ojo siga el cambio
 * sin que parezca un parpadeo.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  {
    label,
    error,
    helper,
    style,
    onFocus,
    onBlur,
    revealable = false,
    leadingIcon,
    variant = 'box',
    ...inputProps
  },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const foco = useRef(new Animated.Value(0)).current;
  const underline = variant === 'underline';

  useEffect(() => {
    Animated.timing(foco, {
      toValue: focused ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, foco]);

  const borderColor = error
    ? colors.danger
    : foco.interpolate({ inputRange: [0, 1], outputRange: [colors.line, colors.primary] });
  const ringColor = error
    ? colors.dangerLine
    : foco.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(27, 92, 255, 0)', colors.primaryRing],
      });

  const oculto = revealable ? !visible : inputProps.secureTextEntry;

  const campo = (
    <AnimatedView
      style={[
        underline ? styles.fieldUnderline : styles.field,
        { borderColor, backgroundColor: underline ? 'transparent' : colors.surface },
        inputProps.multiline ? styles.fieldMultiline : null,
      ]}
    >
      {leadingIcon ? <View style={styles.leading}>{leadingIcon}</View> : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        {...inputProps}
        secureTextEntry={oculto}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          underline ? styles.inputUnderline : styles.input,
          { color: colors.ink },
          !underline && !leadingIcon ? styles.inputSinIcono : null,
          inputProps.multiline ? styles.inputMultiline : null,
          style,
        ]}
      />

      {revealable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          accessibilityState={{ selected: visible }}
          onPress={() => setVisible((actual) => !actual)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.accion,
            pressed ? { backgroundColor: colors.surfaceSunken } : null,
          ]}
        >
          {visible ? <OjoCerrado color={colors.inkMuted} /> : <OjoAbierto color={colors.inkMuted} />}
        </Pressable>
      ) : null}
    </AnimatedView>
  );

  return (
    <View style={styles.wrapper}>
      <Text style={[underline ? styles.labelUnderline : styles.label, { color: colors.inkMuted }]}>
        {label}
      </Text>

      {underline ? campo : <AnimatedView style={[styles.ring, { borderColor: ringColor }]}>{campo}</AnimatedView>}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: colors.inkSubtle }]}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { ...type.label, marginBottom: spacing.sm },
  ring: {
    borderWidth: 3,
    borderRadius: radius.md + 3,
    margin: -3,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 52,
  },
  fieldMultiline: { alignItems: 'flex-start', paddingRight: spacing.lg },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    ...type.body,
  },
  inputSinIcono: { paddingLeft: spacing.xs },
  labelUnderline: {
    ...type.caption,
    fontSize: 11,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  fieldUnderline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    minHeight: 56,
  },
  inputUnderline: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingLeft: 0,
    fontSize: 18,
    fontFamily: type.bodyMedium.fontFamily,
  },
  leading: { marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  inputMultiline: { minHeight: 112, textAlignVertical: 'top' },
  accion: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  error: { ...type.caption, marginTop: spacing.sm },
  helper: { ...type.caption, marginTop: spacing.sm },
});
