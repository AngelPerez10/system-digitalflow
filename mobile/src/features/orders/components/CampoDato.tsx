import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { esEnlaceUbicacion } from '../ordenFormat';
import { IconPhone, IconPin } from './icons';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: string;
  tono?: string;
}

/** Fila de dato con ícono en placa cuadrada y etiqueta — la vista de detalle,
 *  a diferencia de la tarjeta de la lista, sí necesita el nombre del campo:
 *  «Técnico asignado» o «Contacto en sitio» no se explican solos con un
 *  ícono. Misma placa (22×22, `surface`) que las filas de dirección y teléfono
 *  de `OrdenCard` — un solo lenguaje de ícono-en-caja, no dos. */
export function CampoDato({ icon, label, value, tono }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surface }]}>{icon}</View>
      <View style={styles.textos}>
        <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
        <Text style={[styles.valor, { color: tono ?? colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

/** Igual que `CampoDato`, pero para `direccion`: si el dato es en realidad un
 *  enlace de Google Maps, se muestra como acción tocable en vez de la URL
 *  cruda — mismo criterio que `OrdenCard.CampoUbicacion` en la lista. */
export function CampoUbicacion({ label, direccion }: { label: string; direccion: string }) {
  const { colors } = useTheme();
  if (esEnlaceUbicacion(direccion)) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Ver ubicación en el mapa"
        onPress={() =>
          void abrirEnlace(direccion, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.')
        }
        style={styles.fila}
        hitSlop={4}
      >
        <View style={[styles.iconoPlaca, { backgroundColor: colors.surface }]}>
          <IconPin color={colors.navy} size={12} />
        </View>
        <View style={styles.textos}>
          <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
          <Text style={[styles.valor, styles.enlace, { color: colors.navy }]}>
            Ver ubicación en el mapa
          </Text>
        </View>
      </Pressable>
    );
  }
  return (
    <CampoDato icon={<IconPin color={colors.inkMuted} size={12} />} label={label} value={direccion} />
  );
}

/** El teléfono de la tarjeta de la lista ya marca al tocarlo; en el detalle
 *  seguía siendo texto muerto, justo en la pantalla donde el técnico está
 *  parado frente al domicilio y necesita llamar. */
export function CampoTelefono({ label, telefono }: { label: string; telefono: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Llamar al ${telefono}`}
      onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
      style={styles.fila}
      hitSlop={4}
    >
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surface }]}>
        <IconPhone color={colors.navy} size={12} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
        <Text style={[styles.valor, styles.enlace, { color: colors.navy }]}>{telefono}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconoPlaca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  // `flexShrink: 1` en `textos` y `valor`: sin esto un valor largo (una dirección o una
  // lista de servicios sin saltos naturales) puede salirse de la tarjeta y de la
  // pantalla en vez de envolverse — el mismo defecto encontrado en `EquiposLista`.
  textos: { flex: 1, flexShrink: 1, gap: 2 },
  label: { ...type.label },
  valor: { ...type.body, marginTop: -1, flexShrink: 1 },
  enlace: { fontFamily: type.bodyMedium.fontFamily },
});
