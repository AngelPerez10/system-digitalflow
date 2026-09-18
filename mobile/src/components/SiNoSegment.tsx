import React, { useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconClose, IconVisto } from './icons';

interface Props {
  /** `null` = aún no se ha elegido — ninguna opción se ve activa; no hay «No» por defecto. */
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  /** Marca el campo como obligatorio (asterisco) y tiñe el error debajo del control. */
  required?: boolean;
  error?: string;
}

/**
 * Sí/No como segmento en riel hundido (lenguaje Linear/SertelPro): la opción
 * activa gasta el azul de marca; las demás quedan en tinta muted. Sin tarjeta
 * propia ni verde/rojo — el color de acción es uno solo. Con `value: null`
 * ninguna pastilla se ve elegida: el técnico debe decidir.
 */
export function SiNoSegment({ value, onChange, disabled = false, label, required = false, error }: Props) {
  const { colors } = useTheme();
  const sinElegir = value == null;

  return (
    <View accessibilityLabel={label}>
      <Text style={[styles.label, { color: colors.inkMuted }]}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.riel,
          {
            backgroundColor: colors.surfaceSunken,
            borderColor: error ? colors.dangerLine : colors.line,
          },
        ]}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityHint={
          error ? error : sinElegir ? 'Obligatorio. Ninguna opción seleccionada todavía.' : undefined
        }
      >
        <Opcion
          label="Sí"
          activo={value === true}
          disabled={disabled}
          onPress={() => onChange(true)}
        />
        <Opcion
          label="No"
          activo={value === false}
          disabled={disabled}
          onPress={() => onChange(false)}
        />
      </View>

      {sinElegir && !error ? (
        <Text style={[styles.meta, { color: colors.inkSubtle }]} accessibilityElementsHidden>
          Selecciona una opción
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.meta, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Opcion({
  label,
  activo,
  disabled = false,
  onPress,
}: {
  label: string;
  activo: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const animarA = (destino: number, conRebote: boolean) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: conRebote ? 160 : 80,
      easing: conRebote ? Easing.out(Easing.back(1.25)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const icono = label === 'Sí' ? IconVisto : IconClose;
  const Icono = icono;
  const colorIcono = activo ? colors.onPrimary : colors.inkMuted;
  const colorTexto = activo ? colors.onPrimary : colors.inkMuted;

  return (
    <Animated.View style={[styles.celda, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: activo, disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animarA(0.985, false)}
        onPressOut={() => animarA(1, true)}
        android_ripple={
          disabled
            ? undefined
            : { color: colors.primaryRing, borderless: false, foreground: true }
        }
        style={[
          styles.opcion,
          activo
            ? {
                backgroundColor: colors.primary,
                ...Platform.select({
                  ios: {
                    shadowColor: colors.primary,
                    shadowOpacity: 0.28,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                  },
                  android: { elevation: 2 },
                  default: {},
                }),
              }
            : { backgroundColor: 'transparent' },
          disabled ? styles.opcionInactiva : null,
        ]}
      >
        <Icono color={colorIcono} size={14} />
        <Text style={[styles.texto, { color: colorTexto }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.05,
    marginBottom: spacing.sm,
  },
  riel: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  celda: { flex: 1 },
  opcion: {
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  opcionInactiva: { opacity: 0.45 },
  texto: { fontFamily: font.semibold, fontSize: 14, lineHeight: 18, letterSpacing: -0.2 },
  meta: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
});
