import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  /** `false` deja el borde inferior recto — para que una hoja blanca redondeada
   *  se solape encima (login). Por defecto va redondeado (bienvenida). */
  roundBottom?: boolean;
  style?: ViewStyle;
}

/**
 * Panel marino de cabecera del acceso. Fila superior (volver / tema) + bloque de
 * marca centrado. Fondo sólido: un degradado SVG aquí dejaba un rectángulo
 * visible sin recortar.
 */
export function AuthHero({ children, topLeft, topRight, roundBottom = true, style }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.navy,
          borderBottomLeftRadius: roundBottom ? radius.sheet : 0,
          borderBottomRightRadius: roundBottom ? radius.sheet : 0,
          paddingTop: insets.top + spacing.xs,
          paddingBottom: roundBottom ? spacing.xl : spacing.xxl,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.slot}>{topLeft}</View>
        <View style={[styles.slot, styles.slotRight]}>{topRight}</View>
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  slot: { flex: 1, justifyContent: 'center' },
  slotRight: { alignItems: 'flex-end' },
  body: { alignItems: 'center', paddingTop: spacing.md },
});
