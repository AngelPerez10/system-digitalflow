import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';

interface Props {
  titulo: string;
  /** Punto de color a la izquierda de la etiqueta — el tono sólido del estatus. */
  tono?: string;
  /** Contador a la derecha de la etiqueta («Fotos · 3»). */
  conteo?: number;
  children: React.ReactNode;
}

/**
 * Tarjeta hundida y bordeada con la etiqueta uppercase **dentro** —el patrón de
 * sección compartido entre el portal del cliente y las vistas del técnico. Vive
 * aquí para que ninguno de los dos lados pueda divergir del otro.
 */
export function SeccionCard({ titulo, tono, conteo, children }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tarjeta, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}
    >
      <View style={styles.encabezado}>
        <View style={styles.tituloFila}>
          {tono ? <View style={[styles.punto, { backgroundColor: tono }]} /> : null}
          <Text style={[styles.titulo, { color: colors.inkSubtle }]} accessibilityRole="header">
            {titulo}
          </Text>
        </View>
        {conteo !== undefined ? (
          <Text style={[styles.conteo, { color: colors.inkSubtle }]}>{conteo}</Text>
        ) : null}
      </View>
      <View style={styles.cuerpo}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  titulo: {
    ...type.caption,
    fontSize: 11,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  conteo: { ...type.mono, fontSize: 12 },
  cuerpo: { gap: spacing.md },
});
