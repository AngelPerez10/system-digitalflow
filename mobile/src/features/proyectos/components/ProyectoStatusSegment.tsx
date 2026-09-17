import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { PROYECTO_STATUSES, type ProyectoStatus } from '@/types/proyecto';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { statusLabel, statusSolid } from '../proyectoFormat';

interface Props {
  value: ProyectoStatus;
  onChange: (status: ProyectoStatus) => void;
  /** Solo un admin puede cancelar el proyecto (espejo del candado del backend). */
  permiteCancelar?: boolean;
}

/** Igual que `StatusSegment` de Órdenes, pero con 4 opciones — envuelve a 2×2 en pantallas angostas. */
export function ProyectoStatusSegment({ value, onChange, permiteCancelar = false }: Props) {
  // El técnico no ve «Cancelado» como opción a elegir, salvo que el proyecto
  // ya esté cancelado (para que la ruedita no "esconda" el estatus actual).
  const opciones = PROYECTO_STATUSES.filter(
    (status) => status !== 'cancelado' || permiteCancelar || value === 'cancelado',
  );
  // Con 3 opciones (caso normal del técnico) caben en una sola fila; con 4
  // (admin, incluye «Cancelado») se envuelve a 2×2 para no apretar el texto.
  const unaFila = opciones.length <= 3;
  return (
    <View style={styles.pista} accessibilityRole="radiogroup" accessibilityLabel="Estatus del proyecto">
      {opciones.map((status) => (
        <Opcion
          key={status}
          status={status}
          activo={status === value}
          disabled={status === 'cancelado' && !permiteCancelar}
          unaFila={unaFila}
          onPress={() => onChange(status)}
        />
      ))}
    </View>
  );
}

function Opcion({
  status,
  activo,
  disabled = false,
  unaFila,
  onPress,
}: {
  status: ProyectoStatus;
  activo: boolean;
  disabled?: boolean;
  unaFila: boolean;
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
    <Animated.View style={[unaFila ? styles.celdaFila : styles.celdaAncha, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: activo, disabled }}
        accessibilityLabel={statusLabel(status)}
        accessibilityHint={disabled ? 'Solo un administrador puede ponerlo' : 'Cambia el estatus del proyecto'}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animarA(0.97, false)}
        onPressOut={() => animarA(1, true)}
        style={[
          styles.opcion,
          activo
            ? { backgroundColor: sólido.bg, borderColor: sólido.bg }
            : { backgroundColor: colors.surface, borderColor: colors.line },
          disabled ? styles.opcionInactiva : null,
          unaFila ? styles.opcionAngosta : null,
        ]}
      >
        <Text
          style={[
            styles.texto,
            unaFila ? styles.textoAngosto : null,
            { color: activo ? sólido.text : colors.inkMuted },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {statusLabel(status)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  celdaFila: { flex: 1 },
  celdaAncha: { minWidth: '46%', flexGrow: 1 },
  opcion: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  opcionAngosta: { paddingHorizontal: 4 },
  texto: { ...type.label, fontSize: 13, textAlign: 'center' },
  textoAngosto: { fontSize: 12 },
  opcionInactiva: { opacity: 0.45 },
});
