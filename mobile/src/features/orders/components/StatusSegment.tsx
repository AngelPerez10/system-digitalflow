import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { ORDEN_STATUSES, type OrdenStatus } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { statusLabel, statusSolid } from '../ordenFormat';

interface Props {
  value: OrdenStatus;
  onChange: (status: OrdenStatus) => void;
}

/**
 * Segmento compacto de tres opciones — una fila, no tres bloques apilados.
 * La activa usa el color sólido del estatus; las demás quedan en tinta muted.
 */
export function StatusSegment({ value, onChange }: Props) {
  return (
    <View
      style={styles.pista}
      accessibilityRole="radiogroup"
      accessibilityLabel="Estatus de la orden"
    >
      {ORDEN_STATUSES.map((status) => (
        <Opcion
          key={status}
          status={status}
          activo={status === value}
          onPress={() => onChange(status)}
        />
      ))}
    </View>
  );
}

function Opcion({
  status,
  activo,
  onPress,
}: {
  status: OrdenStatus;
  activo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const sólido = statusSolid(status, colors);
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const animarA = (destino: number, conRebote: boolean) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: conRebote ? 160 : 80,
      easing: conRebote ? Easing.out(Easing.back(1.3)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.celda, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={statusLabel(status)}
        accessibilityHint="Cambia el estatus de la orden"
        onPress={onPress}
        onPressIn={() => animarA(0.97, false)}
        onPressOut={() => animarA(1, true)}
        style={[
          styles.opcion,
          activo
            ? { backgroundColor: sólido.bg, borderColor: sólido.bg }
            : { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.texto, { color: activo ? sólido.text : colors.inkMuted }]}>
          {statusLabel(status)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  celda: { flex: 1 },
  opcion: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  texto: { ...type.label, fontSize: 13, textAlign: 'center' },
});
