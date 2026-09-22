import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { darkColors, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { clienteDisplay, folioDisplay, statusLabel, statusTone } from '../proyectoFormat';
import { colorPorAvance } from './PorcentajeAvance';

interface Props {
  proyecto: Proyecto;
  onVolver: () => void;
}

/**
 * Cabecera compacta del detalle: volver, el cliente como título y una sola
 * línea de contexto (folio · estatus · avance). El avance además corre como
 * una línea fina en el borde inferior de la banda. Lo demás (tipo de trabajo,
 * monitoreo…) vive en la pestaña Resumen.
 */
export function ProyectoDetalleHeader({ proyecto, onVolver }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // Sobre marino (oscuro en ambos temas) el tono del estatus sale de la paleta oscura.
  const tono = statusTone(proyecto.status, darkColors);
  const pct = Math.max(0, Math.min(100, Math.round(proyecto.porcentaje_avance)));
  const avanceTono = colorPorAvance(pct, darkColors);
  const barra = useRef(new Animated.Value(reduced ? pct : 0)).current;

  useEffect(() => {
    if (reduced) {
      barra.setValue(pct);
      return;
    }
    const anim = Animated.timing(barra, {
      toValue: pct,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [pct, reduced, barra]);

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis proyectos"
          onPress={onVolver}
          hitSlop={4}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' },
          ]}
        >
          <IconChevron direction="left" color={colors.onNavy} size={18} />
        </Pressable>

        <View style={styles.textos}>
          <Text style={[styles.cliente, { color: colors.onNavy }]} numberOfLines={2} accessibilityRole="header">
            {clienteDisplay(proyecto)}
          </Text>
          <View
            style={styles.meta}
            accessible
            accessibilityLabel={`${folioDisplay(proyecto)}, ${statusLabel(proyecto.status)}, avance ${pct} por ciento`}
          >
            <Text style={[styles.folio, { color: colors.onNavyMuted }]} numberOfLines={1}>
              {folioDisplay(proyecto)}
            </Text>
            <View style={[styles.separador, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            <View style={[styles.punto, { backgroundColor: tono.text }]} />
            <Text style={[styles.metaTexto, { color: colors.onNavy }]}>{statusLabel(proyecto.status)}</Text>
            <View style={[styles.separador, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            <Text style={[styles.metaTexto, { color: colors.onNavy }]}>{pct}%</Text>
          </View>
        </View>
      </View>

      <View
        style={[styles.pista, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.relleno,
            {
              backgroundColor: avanceTono.text,
              width: barra.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: { paddingBottom: 0 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  volver: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  cliente: { fontFamily: font.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  folio: { ...type.mono, fontSize: 12 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  metaTexto: { ...type.caption, fontSize: 12, fontFamily: font.semibold },
  pista: { height: 3 },
  relleno: { height: 3 },
});
