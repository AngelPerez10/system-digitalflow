import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';

interface Props {
  firmaCliente: string | null;
  firmaEncargado: string | null;
}

function Firma({ label, url }: { label: string; url: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.firma}>
      <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
      <View style={[styles.lienzo, { borderColor: colors.line }]}>
        <Image source={{ uri: url }} style={styles.imagen} resizeMode="contain" />
      </View>
    </View>
  );
}

/**
 * Firma capturada en trazo negro sobre fondo blanco/transparente — un lienzo
 * blanco fijo (no `colors.surface`, que ya es casi blanco pero puede cambiar)
 * es lo único que garantiza que el trazo se lea igual en cualquier tema.
 *
 * Apiladas, no lado a lado: con las dos en fila cada lienzo se quedaba con
 * menos de la mitad del ancho de la tarjeta — un trazo de firma necesita
 * espacio horizontal para leerse, no una miniatura.
 */
export function FirmasTarjeta({ firmaCliente, firmaEncargado }: Props) {
  if (!firmaCliente && !firmaEncargado) return null;
  return (
    <View style={styles.columna}>
      {firmaCliente ? <Firma label="Firma del cliente" url={firmaCliente} /> : null}
      {firmaEncargado ? <Firma label="Firma del encargado" url={firmaEncargado} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  columna: { gap: spacing.lg },
  firma: { gap: spacing.sm },
  label: { ...type.label },
  lienzo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: radius.sm,
    aspectRatio: 5 / 3,
  },
  imagen: { flex: 1 },
});
