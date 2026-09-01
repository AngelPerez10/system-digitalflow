import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing } from '@/theme/tokens';
import type { OrdenStatus } from '@/types/orden';
import { statusTone } from '../ordenFormat';

/**
 * Píldora de conteo junto al título de cada sección («3 órdenes») — borde y
 * relleno pálido del propio `statusTone()`, no relleno sólido: junto a las
 * tarjetas claras de la hoja, el círculo sólido se sentía pesado comparado con
 * el resto de la pantalla.
 */
export function EstadoConteo({ status, count }: { status: OrdenStatus; count: number }) {
  const { colors } = useTheme();
  const tono = statusTone(status, colors);
  return (
    <View style={[styles.pill, { backgroundColor: tono.bg, borderColor: tono.text + '40' }]}>
      <Text style={[styles.texto, { color: tono.text }]}>
        {count} {count === 1 ? 'orden' : 'órdenes'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  texto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
});
