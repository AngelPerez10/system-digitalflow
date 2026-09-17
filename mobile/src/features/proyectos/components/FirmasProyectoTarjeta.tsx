import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';

interface Props {
  firmaCliente: string | null;
  firmaTecnico: string | null;
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

/** Mismo lienzo blanco fijo que `FirmasTarjeta` de Órdenes. */
export function FirmasProyectoTarjeta({ firmaCliente, firmaTecnico }: Props) {
  if (!firmaCliente && !firmaTecnico) return null;
  return (
    <View style={styles.columna}>
      {firmaCliente ? <Firma label="Firma del cliente" url={firmaCliente} /> : null}
      {firmaTecnico ? <Firma label="Firma del técnico" url={firmaTecnico} /> : null}
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
