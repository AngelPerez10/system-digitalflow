import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  /** Centro del halo, en fracción de la altura. Se alinea con la marca. */
  haloY?: number;
}

/**
 * Lienzo: retícula técnica de puntos y un halo del acento. Da estructura sin
 * ruido — los puntos viven al ~6 % de opacidad y el halo al 10 %.
 */
export function BackgroundGrid({ haloY = 0.24 }: Props) {
  const { colors, scheme } = useTheme();
  // Ids únicos por esquema: si no, al cambiar tema el SVG reutiliza defs viejos.
  const reticulaId = `reticula-${scheme}`;
  const haloId = `halo-${scheme}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={reticulaId} width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={1.5} cy={1.5} r={1.5} fill={colors.gridDot} />
          </Pattern>
          <RadialGradient id={haloId} cx="50%" cy={`${haloY * 100}%`} rx="70%" ry="42%">
            <Stop offset="0" stopColor={colors.halo} stopOpacity={0.1} />
            <Stop offset="0.55" stopColor={colors.halo} stopOpacity={0.035} />
            <Stop offset="1" stopColor={colors.halo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${reticulaId})`} />
        <Rect width="100%" height="100%" fill={`url(#${haloId})`} />
      </Svg>
    </View>
  );
}
