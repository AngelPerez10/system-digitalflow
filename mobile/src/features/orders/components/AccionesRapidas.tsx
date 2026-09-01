import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { esEnlaceUbicacion } from '../ordenFormat';
import { IconPhone, IconPin } from './icons';

interface Props {
  telefono: string | null;
  direccion: string | null;
}

function Accion({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accion,
        { backgroundColor: colors.surface, borderColor: colors.line },
        pressed ? { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong } : null,
      ]}
    >
      <View style={[styles.placa, { backgroundColor: colors.surfaceSunken }]}>{icon}</View>
      <Text style={[styles.texto, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Llamar y abrir el mapa: las dos cosas que el técnico hace de pie frente al
 * domicilio, con el celular en una mano. En la lista ya son tocables dentro de
 * la tarjeta; aquí suben al primer golpe de vista en vez de quedar enterradas
 * como una línea más de la sección Contacto.
 *
 * Cuando `direccion` no es un enlace de Maps se arma la búsqueda con el texto
 * capturado: una dirección escrita a mano también es navegable.
 */
export function AccionesRapidas({ telefono, direccion }: Props) {
  const { colors } = useTheme();
  const hayDireccion = Boolean(direccion?.trim());
  if (!telefono && !hayDireccion) return null;

  const abrirMapa = () => {
    const valor = direccion!.trim();
    const url = esEnlaceUbicacion(valor)
      ? valor
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valor)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  return (
    <View style={styles.fila}>
      {telefono ? (
        <Accion
          icon={<IconPhone color={colors.navy} size={14} />}
          label="Llamar"
          accessibilityLabel={`Llamar al ${telefono}`}
          onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
        />
      ) : null}
      {hayDireccion ? (
        <Accion
          icon={<IconPin color={colors.navy} size={14} />}
          label="Cómo llegar"
          accessibilityLabel="Abrir la ubicación en el mapa"
          onPress={abrirMapa}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.sm },
  accion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  placa: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { ...type.label },
});
