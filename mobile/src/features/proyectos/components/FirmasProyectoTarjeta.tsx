import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';

interface Props {
  firmaCliente: string | null;
  firmaTecnico: string | null;
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

/** Mismo lienzo blanco fijo y visor de pantalla completa que `FirmasTarjeta` de Órdenes. */
export function FirmasProyectoTarjeta({ firmaCliente, firmaTecnico }: Props) {
  const { abrir, visor } = useVisorFotos();
  if (!firmaCliente && !firmaTecnico) return null;

  const urls = [firmaCliente, firmaTecnico].filter((u): u is string => Boolean(u));

  return (
    <View style={styles.columna}>
      {firmaCliente ? (
        <Firma label="Firma del cliente" url={firmaCliente} onPress={() => abrir(urls, urls.indexOf(firmaCliente))} />
      ) : null}
      {firmaTecnico ? (
        <Firma label="Firma del técnico" url={firmaTecnico} onPress={() => abrir(urls, urls.indexOf(firmaTecnico))} />
      ) : null}
      {visor}
    </View>
  );
}

const styles = StyleSheet.create({
  columna: { gap: spacing.lg },
  firma: { gap: spacing.sm },
  label: { ...type.label },
  lienzo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderRadius: radius.sm, aspectRatio: 5 / 3 },
  imagen: { flex: 1 },
});
