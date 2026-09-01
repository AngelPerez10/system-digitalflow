import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconFlecha, IconVisto } from '@/features/orders/components/icons';

interface Props {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  /** `primary` = cuadro de ícono marino; `neutral` = cuadro tenue para cliente. */
  tono: 'primary' | 'neutral';
  /** El usuario ya entró por aquí antes: se marca como su acceso habitual. */
  destacada?: boolean;
  onPress: () => void;
  accessibilityHint: string;
}

/**
 * Tarjeta de elección de rol (acceso), dirección marino + dorado: blanca, muy
 * redondeada, sombra suave; cuadro de ícono marino y flecha en un círculo
 * dorado. Presiona con escala y la flecha avanza.
 */
export function RolSelectorCard({
  titulo,
  descripcion,
  icono,
  tono,
  destacada = false,
  onPress,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const avance = useRef(new Animated.Value(0)).current;

  const fondoIcono = tono === 'primary' ? colors.navy : colors.surfaceSunken;

  const animar = (activar: boolean) => {
    if (reduced) return;
    Animated.parallel([
      Animated.timing(escala, {
        toValue: activar ? 0.985 : 1,
        duration: activar ? 90 : 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(avance, {
        toValue: activar ? 1 : 0,
        duration: activar ? 90 : 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const flechaX = avance.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: destacada }}
        onPress={onPress}
        onPressIn={() => animar(true)}
        onPressOut={() => animar(false)}
        style={({ pressed }) => [
          styles.tarjeta,
          {
            backgroundColor: colors.surface,
            borderColor: pressed || destacada ? colors.gold : colors.line,
            borderRadius: radius.card,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={styles.fila}>
          <View style={[styles.iconoWrap, { backgroundColor: fondoIcono }]}>{icono}</View>
          <View style={styles.textos}>
            <Text style={[styles.titulo, { color: colors.ink }]}>{titulo}</Text>
            <Text style={[styles.descripcion, { color: colors.inkMuted }]} numberOfLines={2}>
              {descripcion}
            </Text>
          </View>
          <Animated.View style={[styles.flecha, { backgroundColor: colors.gold, transform: [{ translateX: flechaX }] }]}>
            <IconFlecha color={colors.onGold} size={14} />
          </Animated.View>
        </View>

        {destacada ? (
          <View style={styles.marcaFila}>
            <View style={[styles.pill, { backgroundColor: colors.goldSoftBg }]}>
              <IconVisto color={colors.goldSoftText} size={12} />
              <Text style={[styles.pillTexto, { color: colors.goldSoftText }]}>
                Entraste aquí la última vez
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconoWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: 3 },
  titulo: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  descripcion: { ...type.caption, lineHeight: 17 },
  flecha: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaFila: {
    flexDirection: 'row',
    paddingLeft: 52 + spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  pillTexto: { ...type.caption, fontSize: 11, fontFamily: font.medium },
});
