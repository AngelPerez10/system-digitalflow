import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';

interface Props {
  firmaCliente: string | null;
  firmaEncargado: string | null;
}

function Firma({
  label,
  url,
  onPress,
}: {
  label: string;
  url: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.firma}>
      <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ver ${label.toLowerCase()} en grande`}
        onPress={onPress}
        style={[styles.lienzo, { borderColor: colors.line }]}
      >
        <Image source={{ uri: url }} style={styles.imagen} resizeMode="contain" />
      </Pressable>
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
 * espacio horizontal para leerse, no una miniatura. Cada una abre el mismo
 * visor de pantalla completa que las fotos de evidencia.
 */
export function FirmasTarjeta({ firmaCliente, firmaEncargado }: Props) {
  const { abrir, visor } = useVisorFotos();
  if (!firmaCliente && !firmaEncargado) return null;

  const urls = [firmaCliente, firmaEncargado].filter((u): u is string => Boolean(u));

  return (
    <View style={styles.columna}>
      {firmaCliente ? (
        <Firma label="Firma del cliente" url={firmaCliente} onPress={() => abrir(urls, urls.indexOf(firmaCliente))} />
      ) : null}
      {firmaEncargado ? (
        <Firma
          label="Firma del encargado"
          url={firmaEncargado}
          onPress={() => abrir(urls, urls.indexOf(firmaEncargado))}
        />
      ) : null}
      {visor}
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
