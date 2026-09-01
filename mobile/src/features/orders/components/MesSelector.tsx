import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/IconButton';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { desplazarMes, etiquetaMes } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  mes: string;
  onChange: (mes: string) => void;
  /** La paginación vive al final de la lista: la barra de progreso de arriba
   *  queda fuera de vista cuando el técnico está aquí abajo. Sin este
   *  indicador, tocar una flecha no daba ninguna señal de que algo estaba
   *  pasando. */
  cargando?: boolean;
}

export function MesSelector({ mes, onChange, cargando = false }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const destello = useRef(new Animated.Value(1)).current;

  // Al cambiar de mes, la etiqueta destella en vez de saltar de golpe: confirma
  // que el toque surtió efecto sin necesitar un cross-fade de texto retardado.
  useEffect(() => {
    if (reduced) return;
    destello.setValue(0.35);
    Animated.timing(destello, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [mes, destello, reduced]);

  return (
    <View style={styles.row}>
      <IconButton
        icon={<IconChevron direction="left" color={colors.inkMuted} />}
        accessibilityLabel="Mes anterior"
        onPress={() => onChange(desplazarMes(mes, -1))}
        disabled={cargando}
      />

      <View style={styles.centro}>
        <View style={[styles.pildora, { backgroundColor: colors.goldSoftBg }]}>
          <Animated.Text
            style={[styles.mes, { color: colors.goldSoftText, opacity: destello }]}
            accessibilityLiveRegion="polite"
          >
            {etiquetaMes(mes)}
          </Animated.Text>
        </View>
        {cargando ? (
          <ActivityIndicator
            size="small"
            color={colors.navy}
            style={styles.spinner}
            accessibilityLabel="Cargando órdenes del mes"
          />
        ) : null}
      </View>

      <IconButton
        icon={<IconChevron direction="right" color={colors.inkMuted} />}
        accessibilityLabel="Mes siguiente"
        onPress={() => onChange(desplazarMes(mes, 1))}
        disabled={cargando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  centro: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  pildora: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  mes: { ...type.bodyMedium, fontSize: 13 },
  spinner: { marginTop: 1 },
});
