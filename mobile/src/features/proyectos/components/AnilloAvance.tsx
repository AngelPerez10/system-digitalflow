import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { colorPorAvance } from './PorcentajeAvance';

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

interface Props {
  valor: number;
  /** Diámetro en px. */
  tamano?: number;
  trazo?: number;
  /** Retraso de la animación de llenado (para escalonar en listas). */
  retraso?: number;
}

/**
 * Anillo de avance que se llena al aparecer. El color sigue la misma escala
 * que la barra del detalle (`colorPorAvance`): rojo, ámbar, verde.
 */
export function AnilloAvance({ valor, tamano = 48, trazo = 4.5, retraso = 0 }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Math.round(valor)));
  const tono = colorPorAvance(pct, colors);
  const r = (tamano - trazo) / 2;
  const circ = 2 * Math.PI * r;
  const llenado = useRef(new Animated.Value(reduced ? pct : 0)).current;

  useEffect(() => {
    if (reduced) {
      llenado.setValue(pct);
      return;
    }
    const anim = Animated.timing(llenado, {
      toValue: pct,
      duration: 800,
      delay: 120 + retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [pct, retraso, reduced, llenado]);

  const grande = tamano >= 64;

  return (
    <View
      style={[styles.caja, { width: tamano, height: tamano }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Avance"
      accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct} por ciento` }}
    >
      <Svg width={tamano} height={tamano} style={styles.svg}>
        <Circle cx={tamano / 2} cy={tamano / 2} r={r} stroke={colors.surfaceSunken} strokeWidth={trazo} fill="none" />
        {pct > 0 ? (
          <CirculoAnimado
            cx={tamano / 2}
            cy={tamano / 2}
            r={r}
            stroke={tono.text}
            strokeWidth={trazo}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={llenado.interpolate({ inputRange: [0, 100], outputRange: [circ, 0] })}
          />
        ) : null}
      </Svg>
      <Text
        style={[
          styles.texto,
          grande ? styles.textoGrande : null,
          { color: pct > 0 ? colors.ink : colors.inkSubtle },
        ]}
      >
        {pct}
        <Text style={grande ? styles.pctGrande : styles.pct}>%</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  texto: { fontFamily: font.bold, fontSize: 13, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  textoGrande: { fontSize: 20, letterSpacing: -0.8 },
  pct: { fontSize: 9 },
  pctGrande: { fontSize: 12 },
});
