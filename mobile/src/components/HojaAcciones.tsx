import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconChevron } from './icons';

export interface AccionHoja {
  key: string;
  label: string;
  /** Segunda línea corta («Se guarda en Descargas»). */
  descripcion?: string;
  icon: (color: string) => React.ReactNode;
  /** `peligro` va al final, separado y en rojo (eliminar). */
  tono?: 'normal' | 'peligro';
  cargando?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  acciones: AccionHoja[];
  onCerrar: () => void;
}

/**
 * Hoja de acciones desde abajo (patrón nativo de «más opciones»): fondo que se
 * oscurece, la hoja sube con resorte y baja más rápido al cerrar. Cada acción
 * es una fila de 56 px con ícono en placa, título y descripción; las
 * destructivas van al final, separadas. Solo transform/opacity (hilo nativo).
 */
export function HojaAcciones({ visible, titulo, subtitulo, acciones, onCerrar }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [montada, setMontada] = useState(visible);
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMontada(true);
      if (reduced) {
        progreso.setValue(1);
        return;
      }
      const anim = Animated.spring(progreso, { toValue: 1, friction: 10, tension: 90, useNativeDriver: true });
      anim.start();
      return () => anim.stop();
    }
    if (reduced) {
      progreso.setValue(0);
      setMontada(false);
      return;
    }
    // Salida más corta que la entrada.
    const anim = Animated.timing(progreso, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true });
    anim.start(({ finished }) => finished && setMontada(false));
    return () => anim.stop();
  }, [visible, reduced, progreso]);

  if (!montada) return null;

  const normales = acciones.filter((a) => a.tono !== 'peligro');
  const peligrosas = acciones.filter((a) => a.tono === 'peligro');

  const fila = (a: AccionHoja) => {
    const peligro = a.tono === 'peligro';
    const tinta = peligro ? colors.danger : colors.ink;
    return (
      <Pressable
        key={a.key}
        accessibilityRole="button"
        accessibilityLabel={a.label}
        accessibilityHint={a.descripcion}
        accessibilityState={{ busy: a.cargando }}
        disabled={a.cargando}
        onPress={a.onPress}
        style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: peligro ? colors.dangerBg : colors.surfaceSunken } : null]}
      >
        <View style={[styles.placa, { backgroundColor: peligro ? colors.dangerBg : colors.surfaceSunken }]}>
          {a.cargando ? <ActivityIndicator size="small" color={tinta} /> : a.icon(peligro ? colors.danger : colors.primary)}
        </View>
        <View style={styles.textos}>
          <Text style={[styles.label, { color: tinta }]}>{a.label}</Text>
          {a.descripcion ? <Text style={[styles.descripcion, { color: colors.inkSubtle }]}>{a.descripcion}</Text> : null}
        </View>
        {!peligro ? <IconChevron direction="right" color={colors.inkSubtle} size={14} /> : null}
      </Pressable>
    );
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      <Animated.View style={[styles.fondo, { opacity: progreso }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityLabel="Cerrar opciones" />
      </Animated.View>
      <Animated.View
        style={[
          styles.hoja,
          {
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
            transform: [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }],
          },
        ]}
        accessibilityViewIsModal
      >
        <View style={[styles.asa, { backgroundColor: colors.lineStrong }]} />
        <View style={styles.cabeza}>
          <Text style={[styles.titulo, { color: colors.ink }]} accessibilityRole="header" numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={[styles.subtitulo, { color: colors.inkSubtle }]} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>
        <View style={styles.grupo}>{normales.map(fila)}</View>
        {peligrosas.length > 0 ? (
          <>
            <View style={[styles.divisor, { backgroundColor: colors.line }]} />
            <View style={styles.grupo}>{peligrosas.map(fila)}</View>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={onCerrar}
          style={({ pressed }) => [styles.cancelar, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface }]}
        >
          <Text style={[styles.cancelarTexto, { color: colors.inkMuted }]}>Cancelar</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 9, 11, 0.45)' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  cabeza: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs, gap: 1 },
  titulo: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3 },
  subtitulo: { ...type.caption, fontSize: 12 },
  grupo: { gap: 2 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  placa: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontFamily: font.semibold, fontSize: 15 },
  descripcion: { ...type.caption, fontSize: 12 },
  divisor: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.sm },
  cancelar: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  cancelarTexto: { ...type.button, fontFamily: font.semibold },
});
