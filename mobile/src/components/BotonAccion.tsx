import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

type Variante = 'primario' | 'secundario' | 'peligro';

interface Props {
  label: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  variante?: Variante;
  disabled?: boolean;
  cargando?: boolean;
  accessibilityHint?: string;
}

/**
 * Botón de acción con ícono para barras al pie. Ocupa su parte de la fila
 * (`flex: 1`): dos o tres acciones juntas miden exactamente lo mismo, así
 * ninguna se pierde junto a otra más grande. Se hunde un 3 % al tocarlo.
 */
export function BotonAccion({ label, icon, onPress, variante = 'primario', disabled = false, cargando = false, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const inactivo = disabled || cargando;

  const estilo = {
    primario: { fondo: colors.primary, presionado: colors.primaryPressed, borde: colors.primary, tinta: colors.onPrimary },
    secundario: { fondo: colors.surface, presionado: colors.surfaceSunken, borde: colors.lineStrong, tinta: colors.ink },
    peligro: { fondo: colors.surface, presionado: colors.dangerBg, borde: colors.dangerLine, tinta: colors.danger },
  }[variante];

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 180,
      easing: destino < 1 ? Easing.out(Easing.quad) : Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.caja, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactivo, busy: cargando }}
        disabled={inactivo}
        onPress={onPress}
        onPressIn={() => animarA(0.97)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.boton,
          { backgroundColor: pressed ? estilo.presionado : estilo.fondo, borderColor: estilo.borde, opacity: inactivo && !cargando ? 0.5 : 1 },
        ]}
      >
        {cargando ? <ActivityIndicator size="small" color={estilo.tinta} /> : icon(estilo.tinta)}
        <Text style={[styles.texto, { color: estilo.tinta }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caja: { flex: 1, minWidth: 0 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  texto: { ...type.button, fontFamily: font.semibold, flexShrink: 1 },
});
