import { useMemo, useRef } from 'react';
import { StyleSheet, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Recrea el StyleSheet cuando cambia la paleta — los `StyleSheet.create`
 * estáticos capturan hex en import y nunca siguen al modo oscuro.
 *
 * Pasar la factory inline está bien: solo se re-ejecuta al cambiar `scheme`.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  return useMemo(() => StyleSheet.create(factoryRef.current(colors)), [colors]);
}
