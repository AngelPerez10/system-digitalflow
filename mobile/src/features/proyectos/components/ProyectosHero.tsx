import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, type } from '@/theme/tokens';
import { etiquetaMes } from '@/utils/fecha';

interface Props {
  nombre: string;
  mes: string;
}

/**
 * Banda marina del listado de proyectos — mismo corte que `OrdenesHero`: sin
 * KPIs de estatus (eran ruido antes de ver el primer proyecto), solo saludo
 * y el mes que se está viendo.
 */
export function ProyectosHero({ nombre, mes }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy }]}>
      <Text style={[styles.saludo, { color: colors.onNavy }]} numberOfLines={1}>
        Hola, {nombre}
      </Text>
      <Text style={[styles.sub, { color: colors.onNavyMuted }]} numberOfLines={1}>
        Proyectos asignados · {etiquetaMes(mes)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 2,
  },
  saludo: { fontFamily: font.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  sub: { ...type.caption, fontSize: 12 },
});
