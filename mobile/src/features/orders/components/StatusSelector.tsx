import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { ORDEN_STATUSES, type OrdenStatus } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { statusLabel, statusSolid, statusTone } from '../ordenFormat';
import { IconClock, IconPause, IconVisto } from './icons';

interface Props {
  value: OrdenStatus;
  onChange: (status: OrdenStatus) => void;
  disabled?: boolean;
}

const DESCRIPCION: Record<OrdenStatus, string> = {
  pendiente: 'Por atender',
  pausado: 'Detenida',
  resuelto: 'Terminada',
};

const ICONO: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={16} />,
  pausado: (color) => <IconPause color={color} size={15} />,
  resuelto: (color) => <IconVisto color={color} size={16} />,
};

/**
 * Tres tarjetas en fila: ícono + nombre + qué significa. La activa toma el
 * tono del estatus (fondo suave, borde y placa sólidos), así el color nunca
 * es la única señal — también cambian el ícono relleno y el peso del texto.
 */
export function StatusSelector({ value, onChange, disabled = false }: Props) {
  return (
    <View style={styles.fila} accessibilityRole="radiogroup" accessibilityLabel="Estatus de la orden">
      {ORDEN_STATUSES.map((status) => (
        <Opcion
          key={status}
          status={status}
          activo={status === value}
          disabled={disabled}
          onPress={() => onChange(status)}
        />
      ))}
    </View>
  );
}

function Opcion({
  status,
  activo,
  disabled,
  onPress,
}: {
  status: OrdenStatus;
  activo: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const tono = statusTone(status, colors);
  const solido = statusSolid(status, colors);
  const escala = useRef(new Animated.Value(1)).current;
  const seleccion = useRef(new Animated.Value(activo ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      seleccion.setValue(activo ? 1 : 0);
      return;
    }
    Animated.timing(seleccion, {
      toValue: activo ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [activo, seleccion, reduced]);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 80 : 160,
      easing: destino < 1 ? Easing.out(Easing.quad) : Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  };

  const fondo = seleccion.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, tono.bg] });
  const borde = seleccion.interpolate({ inputRange: [0, 1], outputRange: [colors.line, solido.bg] });

  return (
    <Animated.View style={[styles.celda, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: activo, disabled }}
        accessibilityLabel={`${statusLabel(status)}, ${DESCRIPCION[status]}`}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => presionar(0.96)}
        onPressOut={() => presionar(1)}
        style={styles.pressable}
      >
        <Animated.View style={[styles.tarjeta, { backgroundColor: fondo, borderColor: borde }]}>
          <View
            style={[styles.placa, { backgroundColor: activo ? solido.bg : colors.surfaceSunken }]}
            importantForAccessibility="no"
          >
            {ICONO[status](activo ? solido.text : colors.inkSubtle)}
          </View>
          <Text style={[styles.label, { color: activo ? tono.text : colors.ink }]} numberOfLines={1}>
            {statusLabel(status)}
          </Text>
          <Text style={[styles.desc, { color: activo ? tono.text : colors.inkSubtle }]} numberOfLines={1}>
            {DESCRIPCION[status]}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.sm },
  celda: { flex: 1, minWidth: 0 },
  pressable: { flex: 1 },
  tarjeta: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 6,
    minHeight: 96,
  },
  placa: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17 },
  desc: { ...type.caption, fontSize: 11, lineHeight: 14 },
});
