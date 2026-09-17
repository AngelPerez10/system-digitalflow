import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing } from '@/theme/tokens';
import type { ProyectoStatus } from '@/types/proyecto';
import { statusTone } from '../proyectoFormat';

/** Píldora de conteo junto al título de cada sección — mismo patrón que `EstadoConteo` de Órdenes. */
export function ProyectoEstadoConteo({ status, count }: { status: ProyectoStatus; count: number }) {
  const { colors } = useTheme();
  const tono = statusTone(status, colors);
  return (
    <View style={[styles.pill, { backgroundColor: tono.bg, borderColor: tono.text + '40' }]}>
      <Text style={[styles.texto, { color: tono.text }]}>
        {count} {count === 1 ? 'proyecto' : 'proyectos'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  texto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
});
