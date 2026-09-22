import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconCheck } from './icons';

interface Props {
  numero: number;
  titulo: string;
  descripcion?: string;
  /** El número se convierte en palomita cuando la sección ya está lista. */
  completa: boolean;
  /** Dato corto a la derecha del título («2 / 3 instalados»). */
  meta?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}

/**
 * Paso numerado de un formulario largo: el encabezado vive fuera de la
 * tarjeta (así la tarjeta solo contiene campos, sin «caja dentro de caja») y
 * el número indica de un vistazo qué falta por llenar.
 */
export function FormSection({ numero, titulo, descripcion, completa, meta, onLayout, children }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const check = useRef(new Animated.Value(completa ? 1 : 0)).current;

  useEffect(() => {
    const destino = completa ? 1 : 0;
    if (reduced) {
      check.setValue(destino);
      return;
    }
    const animacion = Animated.spring(check, {
      toValue: destino,
      friction: 7,
      tension: 160,
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [completa, check, reduced]);

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      <View style={styles.encabezado}>
        <View
          style={styles.badgeCaja}
          accessible
          accessibilityLabel={completa ? `Paso ${numero}, completo` : `Paso ${numero}, pendiente`}
        >
          <View style={[styles.badge, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
            <Text style={[styles.numero, { color: colors.inkMuted }]}>{numero}</Text>
          </View>
          <Animated.View
            style={[
              styles.badge,
              styles.badgeCompleto,
              {
                backgroundColor: colors.success,
                borderColor: colors.success,
                opacity: check,
                transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              },
            ]}
          >
            <IconCheck color={colors.onPrimary} size={14} />
          </Animated.View>
        </View>

        <View style={styles.textos}>
          <Text style={[styles.titulo, { color: colors.ink }]} accessibilityRole="header">
            {titulo}
          </Text>
          {descripcion ? (
            <Text style={[styles.descripcion, { color: colors.inkSubtle }]}>{descripcion}</Text>
          ) : null}
        </View>

        {meta ? <Text style={[styles.meta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
      </View>

      <View
        style={[
          styles.tarjeta,
          { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Subtítulo dentro de una tarjeta cuando agrupa dos bloques (p. ej. Fotos + Firma). */
export function FormSubtitulo({
  icon,
  texto,
  meta,
}: {
  icon: React.ReactNode;
  texto: string;
  meta?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.subFila}>
      <View style={[styles.subIcono, { backgroundColor: colors.surfaceSunken }]} importantForAccessibility="no">
        {icon}
      </View>
      <Text style={[styles.subTexto, { color: colors.ink }]} accessibilityRole="header">
        {texto}
      </Text>
      {meta ? <Text style={[styles.meta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
    </View>
  );
}

/** Línea fina para separar bloques dentro de la misma tarjeta. */
export function FormDivisor() {
  const { colors } = useTheme();
  return <View style={[styles.divisor, { backgroundColor: colors.line }]} />;
}

const BADGE = 26;

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  badgeCaja: { width: BADGE, height: BADGE },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompleto: { position: 'absolute', top: 0, left: 0 },
  numero: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  titulo: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  descripcion: { ...type.caption, fontSize: 12, lineHeight: 16 },
  meta: { ...type.mono, fontSize: 12 },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subIcono: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTexto: { ...type.label, flex: 1 },
  divisor: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});
