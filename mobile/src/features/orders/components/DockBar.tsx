import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
}

/**
 * Barra fija al pie para la acción primaria de la pantalla (editar, guardar).
 * Deja de vivir al final del scroll: el técnico llega a ella sin recorrer toda
 * la orden. El `ScrollView` de la pantalla debe reservar `paddingBottom`
 * suficiente para que el último contenido no quede tapado.
 */
export function DockBar({ children }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        styles.barra,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: insets.bottom + spacing.md,
          shadowColor: colors.shadow,
          shadowOpacity: scheme === 'dark' ? 0.4 : 0.1,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 16,
  },
});
