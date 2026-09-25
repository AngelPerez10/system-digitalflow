import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCheck } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { PROYECTO_STATUSES, type ProyectoStatus } from '@/types/proyecto';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { statusLabel, statusTone } from '../proyectoFormat';
import { ProyectoStatusIcon } from './ProyectoStatusIcon';

interface Props {
  value: ProyectoStatus;
  onChange: (status: ProyectoStatus) => void;
  /** Solo un admin puede cancelar el proyecto (espejo del candado del backend). */
  permiteCancelar?: boolean;
}

const STATUS_DETALLE: Record<ProyectoStatus, string> = {
  en_proceso: 'El trabajo en campo sigue activo.',
  pausado: 'Detenido por ahora. Indica el motivo abajo.',
  saldo_pendiente: 'Trabajo concluido con cobro pendiente. Solo administración cambia este estatus.',
  cerrado: 'Trabajo concluido. Revisa bitácora, fotos y firmas antes de guardar.',
  cancelado: 'Proyecto cancelado por administración.',
};

/**
 * Selector de estatus en mosaicos: cada estatus con su color e icono, el
 * elegido se rellena con su tono y una palomita. Debajo, una línea explica
 * qué implica el estatus elegido.
 *
 * «Cancelado» solo existe para administradores: al técnico no se le muestra
 * (el backend también lo bloquea).
 */
export function ProyectoStatusSegment({ value, onChange, permiteCancelar = false }: Props) {
  const { colors } = useTheme();
  // El técnico ni siquiera ve «Cancelado»: es una decisión de administración.
  // «Saldo pendiente» tampoco se ofrece; solo aparece si el proyecto ya está ahí.
  const opciones = PROYECTO_STATUSES.filter(
    (status) =>
      (status !== 'cancelado' || permiteCancelar) && (status !== 'saldo_pendiente' || value === 'saldo_pendiente'),
  );
  const columnas = opciones.length === 3 ? 3 : 2;
  const tono = statusTone(value, colors);

  return (
    <View style={styles.bloque}>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Estatus del proyecto">
        {opciones.map((status) => (
          <Mosaico
            key={status}
            status={status}
            activo={status === value}
            columnas={columnas}
            onPress={() => onChange(status)}
          />
        ))}
      </View>

      <Detalle key={value} texto={STATUS_DETALLE[value]} color={tono.text} fondo={tono.bg} />
    </View>
  );
}

function Mosaico({
  status,
  activo,
  columnas,
  onPress,
}: {
  status: ProyectoStatus;
  activo: boolean;
  columnas: 2 | 3;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const tono = statusTone(status, colors);
  const seleccion = useRef(new Animated.Value(activo ? 1 : 0)).current;
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      seleccion.setValue(activo ? 1 : 0);
      return;
    }
    const anim = activo
      ? Animated.spring(seleccion, { toValue: 1, friction: 9, tension: 160, useNativeDriver: true })
      : Animated.timing(seleccion, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        });
    anim.start();
    return () => anim.stop();
  }, [activo, seleccion, reduced]);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.spring(escala, { toValue: destino, friction: 10, tension: 300, useNativeDriver: true }).start();
  };

  const tinta = activo ? tono.text : colors.ink;

  return (
    <Animated.View style={[columnas === 3 ? styles.celda3 : styles.celda2, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: activo }}
        accessibilityLabel={statusLabel(status)}
        accessibilityHint={STATUS_DETALLE[status]}
        onPress={onPress}
        onPressIn={() => presionar(0.96)}
        onPressOut={() => presionar(1)}
        style={[
          styles.mosaico,
          { borderColor: activo ? tono.text : colors.line, backgroundColor: colors.surface },
        ]}
      >
        {/* Relleno del tono: entra con opacidad, sin animar el layout. */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.relleno, { backgroundColor: tono.bg, opacity: seleccion }]}
        />

        <View style={[styles.icono, { backgroundColor: activo ? colors.surface : tono.bg }]}>
          <ProyectoStatusIcon status={status} color={tono.text} size={17} />
        </View>
        <Text style={[styles.etiqueta, { color: tinta }]} numberOfLines={1} adjustsFontSizeToFit>
          {statusLabel(status)}
        </Text>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.check,
            {
              backgroundColor: tono.text,
              opacity: seleccion,
              transform: [{ scale: seleccion.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            },
          ]}
        >
          <IconCheck color={colors.surface} size={10} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Línea que explica el estatus elegido; entra con un deslizamiento corto al cambiar. */
function Detalle({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [entrada, reduced]);

  return (
    <Animated.View
      style={[
        styles.detalle,
        {
          backgroundColor: fondo,
          opacity: entrada,
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.detalleBarra, { backgroundColor: color }]} />
      <Text style={[styles.detalleTexto, { color }]}>{texto}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  celda2: { flexBasis: '45%', flexGrow: 1 },
  celda3: { flex: 1 },
  mosaico: {
    minHeight: 84,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  relleno: { borderRadius: radius.lg - 2 },
  icono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, letterSpacing: -0.1 },
  check: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  detalleBarra: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  detalleTexto: { ...type.label, fontSize: 13, flex: 1 },
});
