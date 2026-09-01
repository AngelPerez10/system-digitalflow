import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { IconAlerta } from './icons';

interface Props {
  titulo: string;
  texto: string;
  /** La tarjeta de la lista recorta a tres renglones; el detalle no recorta. */
  numberOfLines?: number;
  tono?: string;
}

/**
 * Recuadro hundido con encabezado de alerta — nació dentro de `OrdenCard`
 * para «Falla reportada». Vive aquí porque el detalle necesita exactamente el
 * mismo bloque: si se copiara, las dos pantallas empezarían a divergir en el
 * único elemento que el técnico busca primero al abrir una orden.
 */
export function FallaBox({ titulo, texto, numberOfLines, tono }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.caja, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.header}>
        <IconAlerta color={tono ?? colors.statusPendienteText} size={13} />
        <Text style={[styles.titulo, { color: colors.ink }]}>{titulo}</Text>
      </View>
      <Text style={[styles.texto, { color: colors.inkMuted }]} numberOfLines={numberOfLines}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titulo: { ...type.label, fontSize: 12 },
  texto: { ...type.caption, lineHeight: 18 },
});
