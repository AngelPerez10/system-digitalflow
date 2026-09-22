import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconFlecha } from './icons';

interface Props {
  /** Disponibles nuevas que el técnico no ha visto (push). */
  nuevas: number;
  onPress: () => void;
}

/** Arcos de señal decorativos (eco de la marca) en la esquina de la tarjeta. */
function Ondas({ color }: { color: string }) {
  return (
    <Svg width={150} height={150} viewBox="0 0 150 150" fill="none" style={styles.ondas} pointerEvents="none">
      <Circle cx={120} cy={75} r={5} fill={color} opacity={0.35} />
      <Path d="M98 53a31 31 0 0 1 0 44" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.22} />
      <Path d="M80 35a56 56 0 0 1 0 80" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.14} />
      <Path d="M62 17a81 81 0 0 1 0 116" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.08} />
    </Svg>
  );
}

/**
 * Acceso a la bolsa de «Órdenes disponibles». Tarjeta marina (el único bloque
 * oscuro de la hoja) para que se lea como una oportunidad y no como una orden
 * más. Con nuevas sin ver, el botón dorado muestra el conteo y late suave.
 */
export function PoolAccesoCard({ nuevas, onPress }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const latido = useRef(new Animated.Value(0)).current;
  const hayNuevas = nuevas > 0;

  useEffect(() => {
    if (!hayNuevas || reduced) {
      latido.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(latido, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hayNuevas, reduced, latido]);

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const subtitulo = hayNuevas
    ? `${nuevas} ${nuevas === 1 ? 'nueva liberada' : 'nuevas liberadas'} por otros técnicos`
    : 'Toma trabajo extra que otros técnicos liberaron';

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hayNuevas ? `Órdenes disponibles, ${nuevas} nuevas` : 'Órdenes disponibles'}
        accessibilityHint={subtitulo}
        onPress={onPress}
        onPressIn={() => animarA(0.98)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.tarjeta,
          { backgroundColor: pressed ? colors.navyDeep : colors.navy, ...elevationFor(colors, 'card') },
        ]}
      >
        <Ondas color={colors.gold} />

        <View style={styles.textos}>
          <View style={styles.eyebrowFila}>
            {hayNuevas ? <View style={[styles.punto, { backgroundColor: colors.gold }]} /> : null}
            <Text style={[styles.eyebrow, { color: colors.gold }]}>
              {hayNuevas ? 'Nuevas para ti' : 'Bolsa de trabajo'}
            </Text>
          </View>
          <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={1}>
            Órdenes disponibles
          </Text>
          <Text style={[styles.sub, { color: colors.onNavyMuted }]} numberOfLines={2}>
            {subtitulo}
          </Text>
        </View>

        <View style={styles.botonCaja}>
          {hayNuevas ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  borderColor: colors.gold,
                  opacity: latido.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                  transform: [{ scale: latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                },
              ]}
            />
          ) : null}
          <View style={[styles.boton, { backgroundColor: colors.gold }]}>
            {hayNuevas ? (
              <Text style={[styles.conteo, { color: colors.onGold }]}>{nuevas > 9 ? '9+' : nuevas}</Text>
            ) : (
              <IconFlecha color={colors.onGold} size={16} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const BOTON = 46;

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    overflow: 'hidden',
  },
  ondas: { position: 'absolute', right: -40, top: -30 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  eyebrowFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  titulo: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  sub: { ...type.caption, fontSize: 12, lineHeight: 16 },
  botonCaja: { width: BOTON, height: BOTON, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: BOTON,
    height: BOTON,
    borderRadius: BOTON / 2,
    borderWidth: 2,
  },
  boton: { width: BOTON, height: BOTON, borderRadius: BOTON / 2, alignItems: 'center', justifyContent: 'center' },
  conteo: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
});
