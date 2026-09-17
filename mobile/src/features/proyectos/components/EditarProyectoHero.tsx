import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { clienteDisplay, folioDisplay } from '../proyectoFormat';

interface Props {
  proyecto: Proyecto;
  dirty: boolean;
  onVolver: () => void;
}

/** Banda marina del formulario — mismo corte que `EditarOrdenHero`. */
export function EditarProyectoHero({ proyecto, dirty, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const chip = useRef(new Animated.Value(dirty ? 1 : 0)).current;

  useEffect(() => {
    const destino = dirty ? 1 : 0;
    if (reduced) {
      chip.setValue(destino);
      return;
    }
    const animacion = Animated.spring(chip, { toValue: destino, friction: 8, tension: 140, useNativeDriver: true });
    animacion.start();
    return () => animacion.stop();
  }, [dirty, chip, reduced]);

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver al detalle del proyecto"
        onPress={onVolver}
        hitSlop={12}
        style={({ pressed }) => [styles.volver, pressed ? { opacity: 0.6 } : null]}
      >
        <IconChevron direction="left" color={colors.onNavy} size={16} />
        <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Detalle</Text>
      </Pressable>

      <View style={styles.cuerpo}>
        <View style={styles.tituloFila}>
          <Text style={[styles.folio, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
            Editar {folioDisplay(proyecto)}
          </Text>

          <Animated.View
            style={[
              styles.dirtyPill,
              {
                backgroundColor: colors.goldSoftBg,
                opacity: chip,
                transform: [{ scale: chip.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
            pointerEvents="none"
            accessibilityElementsHidden={!dirty}
            importantForAccessibility={dirty ? 'auto' : 'no-hide-descendants'}
          >
            <View style={[styles.dirtyDot, { backgroundColor: colors.gold }]} />
            <Text style={[styles.dirtyTexto, { color: colors.goldSoftText }]} numberOfLines={1}>
              Sin guardar
            </Text>
          </Animated.View>
        </View>

        <Text style={[styles.meta, { color: colors.onNavyMuted }]} numberOfLines={2}>
          {clienteDisplay(proyecto)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  volver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  volverTexto: { ...type.label },
  cuerpo: { marginTop: spacing.sm, gap: spacing.xs },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  folio: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.bold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.9,
  },
  meta: { ...type.caption, fontSize: 13 },
  dirtyPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    minHeight: 26,
    marginTop: 3,
  },
  dirtyDot: { width: 6, height: 6, borderRadius: 3 },
  dirtyTexto: { ...type.label, fontSize: 12 },
});
