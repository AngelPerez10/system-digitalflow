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
 * Banda marina del listado: saludo compacto y nada más. Los KPI de estatus se
 * retiraron —eran ruido antes de ver la primera orden—; el avatar, el cambio de
 * tema y el cerrar sesión viven en el menú de hamburguesa. El corte marino +
 * hoja blanca es el mismo de acceso y del portal del cliente.
 */
export function OrdenesHero({ nombre, mes }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.banda, { backgroundColor: colors.navy }]}>
      <Text style={[styles.saludo, { color: colors.onNavy }]} numberOfLines={1}>
        Hola, {nombre}
      </Text>
      <Text style={[styles.sub, { color: colors.onNavyMuted }]} numberOfLines={1}>
        Técnico de campo · {etiquetaMes(mes)}
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
