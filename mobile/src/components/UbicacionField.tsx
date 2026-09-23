import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { IconClose, IconPin, IconRefresh } from '@/components/icons';
import { TextField } from '@/components/TextField';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';

interface Props {
  /** Dirección libre, o un enlace de Google Maps (`?q=lat,lng`) guardado desde el selector. */
  value: string;
  onChangeText: (value: string) => void;
  /** Sin él (binario sin mapa) se ocultan los accesos al mapa. */
  onSeleccionarMapa?: () => void;
  disabled?: boolean;
}

/**
 * Campo de ubicación de la orden: si ya se eligió un punto en el mapa se
 * muestra como fila de confirmación (acceso directo a Google Maps, cambiar o
 * quitar); si no, es un campo de texto libre con la opción de abrir el mapa.
 *
 * Sin tarjeta propia a propósito: vive dentro de `SeccionCard`, que ya pone
 * fondo y borde — envolver el contenido en otra caja se veía como «caja
 * dentro de caja». Son filas planas, mismo lenguaje que `CampoDato`.
 */
export function UbicacionField({ value, onChangeText, onSeleccionarMapa, disabled = false }: Props) {
  const { colors } = useTheme();
  const esUbicacionMapa = esEnlaceUbicacion(value);

  const confirmarQuitar = () => {
    Alert.alert(
      'Quitar ubicación',
      '¿Seguro que quieres quitar la ubicación guardada? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => onChangeText('') },
      ],
    );
  };

  if (esUbicacionMapa) {
    return (
      <View style={styles.fila}>
        <View style={[styles.placa, { backgroundColor: colors.primary }]}>
          <IconPin color={colors.onPrimary} size={16} />
        </View>
        <View style={styles.textos}>
          <Text style={[styles.etiqueta, { color: colors.inkSubtle }]}>Ubicación guardada</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ver ubicación en Google Maps"
            disabled={disabled}
            onPress={() =>
              void abrirEnlace(value, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.')
            }
            hitSlop={4}
          >
            <Text style={[styles.enlace, { color: colors.navyText }]}>Ver en Google Maps</Text>
          </Pressable>
        </View>
        {onSeleccionarMapa ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cambiar ubicación en el mapa"
          disabled={disabled}
          onPress={onSeleccionarMapa}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: pressed ? colors.surface : 'transparent' },
          ]}
        >
          <IconRefresh color={colors.inkMuted} size={16} />
        </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar ubicación"
          disabled={disabled}
          onPress={confirmarQuitar}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: pressed ? colors.surface : 'transparent' },
          ]}
        >
          <IconClose color={colors.inkSubtle} size={14} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TextField
        label="Dirección"
        value={value}
        onChangeText={onChangeText}
        placeholder="Calle, colonia, referencias…"
        multiline
        editable={!disabled}
      />
      {onSeleccionarMapa ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar ubicación en el mapa"
        disabled={disabled}
        onPress={onSeleccionarMapa}
        hitSlop={4}
        style={styles.enlaceFila}
      >
        <IconPin color={colors.primary} size={14} />
        <Text style={[styles.enlaceMapa, { color: colors.primary }]}>Seleccionar en el mapa</Text>
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  placa: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: 2 },
  etiqueta: { ...type.caption, fontSize: 11 },
  enlace: { ...type.label, fontFamily: type.bodyMedium.fontFamily },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enlaceFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 32,
    marginTop: -spacing.xs,
  },
  enlaceMapa: { ...type.label, fontSize: 13 },
});
