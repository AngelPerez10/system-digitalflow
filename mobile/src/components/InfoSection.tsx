import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconCheck, IconChevron } from './icons';

/** Par de color suave: fondo tintado + tinta del mismo tono (ambos temas). */
export interface Tono {
  bg: string;
  fg: string;
}

interface SectionProps {
  /** Recibe el color de tinta del tono para pintar el ícono. */
  icon: (color: string) => React.ReactNode;
  titulo: string;
  tono: Tono;
  /** Dato corto a la derecha del título («3 fotos»). */
  meta?: string;
  /**
   * Estado de la sección en el reporte de cierre (mismo criterio que los
   * pasos de Editar): palomita verde sobre el ícono o píldora «Pendiente».
   * `undefined` = la sección no cuenta para el reporte.
   */
  completa?: boolean;
  /** Tarjeta sin padding vertical para listas de `InfoRow` a ras de borde. */
  lista?: boolean;
  children: React.ReactNode;
}

/**
 * Sección de solo lectura — hermana de `FormSection` (encabezado afuera,
 * tarjeta abajo). Cada sección tiene su tono: el color ayuda a encontrar
 * «Equipos» o «Evidencia» de un vistazo al volver a la orden.
 */
export function InfoSection({ icon, titulo, tono, meta, completa, lista = false, children }: SectionProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const hijos = React.Children.toArray(children).filter(Boolean);
  const check = useRef(new Animated.Value(reduced && completa ? 1 : 0)).current;

  useEffect(() => {
    const destino = completa ? 1 : 0;
    if (reduced) {
      check.setValue(destino);
      return;
    }
    const animacion = Animated.spring(check, {
      toValue: destino,
      friction: 6,
      tension: 140,
      delay: 250,
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [completa, check, reduced]);

  return (
    <View style={styles.wrap}>
      <View style={styles.encabezado}>
        <View
          style={styles.iconoCaja}
          accessible={completa !== undefined}
          accessibilityLabel={completa === undefined ? undefined : completa ? 'Sección completa' : 'Sección pendiente'}
          importantForAccessibility={completa === undefined ? 'no' : 'yes'}
        >
          <View style={[styles.icono, { backgroundColor: tono.bg }]}>{icon(tono.fg)}</View>
          {completa !== undefined ? (
            <Animated.View
              style={[
                styles.check,
                {
                  backgroundColor: colors.success,
                  borderColor: colors.canvas,
                  opacity: check,
                  transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                },
              ]}
            >
              <IconCheck color={colors.onPrimary} size={8} />
            </Animated.View>
          ) : null}
        </View>
        <Text style={[styles.titulo, { color: colors.ink }]} accessibilityRole="header">
          {titulo}
        </Text>
        {meta ? <Text style={[styles.meta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
        {completa === false ? (
          <View style={[styles.pendiente, { backgroundColor: colors.goldSoftBg }]}>
            <View style={[styles.pendientePunto, { backgroundColor: colors.gold }]} />
            <Text style={[styles.pendienteTexto, { color: colors.goldSoftText }]}>Pendiente</Text>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.tarjeta,
          lista ? styles.tarjetaLista : null,
          { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') },
        ]}
      >
        {lista
          ? hijos.map((hijo, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <View style={[styles.divisor, { backgroundColor: colors.line }]} /> : null}
                {hijo}
              </React.Fragment>
            ))
          : children}
      </View>
    </View>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Fondo de la placa del ícono; por defecto hundido neutro. */
  tono?: Tono;
  /** Si viene, la fila entera es tocable y muestra un chevron. */
  onPress?: () => void;
  accessibilityHint?: string;
  /** Color del valor cuando es una acción (enlace). */
  accion?: boolean;
}

/** Fila de dato: placa con ícono, etiqueta chica y valor. Tocable si es una acción. */
export function InfoRow({ icon, label, value, tono, onPress, accessibilityHint, accion = false }: RowProps) {
  const { colors } = useTheme();
  const contenido = (
    <>
      <View
        style={[styles.placa, { backgroundColor: tono?.bg ?? colors.surfaceSunken }]}
        importantForAccessibility="no"
      >
        {icon}
      </View>
      <View style={styles.textos}>
        <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
        <Text
          style={[styles.valor, { color: accion ? colors.primary : colors.ink }, accion ? styles.valorAccion : null]}
        >
          {value}
        </Text>
      </View>
      {onPress ? <IconChevron direction="right" color={colors.inkSubtle} size={14} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.fila} accessible accessibilityLabel={`${label}: ${value}`}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      {contenido}
    </Pressable>
  );
}

const ICONO = 32;
const CHECK = 16;

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  iconoCaja: { width: ICONO, height: ICONO },
  icono: {
    width: ICONO,
    height: ICONO,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  meta: { ...type.mono, fontSize: 12 },
  pendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  pendientePunto: { width: 6, height: 6, borderRadius: 3 },
  pendienteTexto: { ...type.caption, fontSize: 11, fontFamily: font.semibold },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  tarjetaLista: { paddingHorizontal: 0, paddingVertical: 0, gap: 0 },
  divisor: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 34 + spacing.md },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 62,
  },
  placa: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  label: { ...type.caption, fontSize: 12 },
  valor: { ...type.body, flexShrink: 1 },
  valorAccion: { fontFamily: font.medium },
});
