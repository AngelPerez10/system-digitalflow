import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { ORDEN_STATUSES, ORDEN_STATUSES_TECNICO, type OrdenStatus } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { statusLabel, statusSolid, statusTone } from '../ordenFormat';
import { IconClock, IconEtiqueta, IconPause, IconVisto } from './icons';

interface Props {
  value: OrdenStatus;
  onChange: (status: OrdenStatus) => void;
  disabled?: boolean;
  /** Sin técnico asignado no se permite «Resuelto» ni «Saldo pendiente». */
  sinTecnico?: boolean;
  /**
   * Quien puede poner «Saldo pendiente» (solo administración, ver
   * `canMarcarSaldoPendiente`). Sin esto el técnico no ve la opción, y si la
   * orden ya está ahí la ve bloqueada.
   */
  permiteSaldo?: boolean;
}

const DESCRIPCION: Record<OrdenStatus, string> = {
  pendiente: 'Por atender',
  pausado: 'Detenida',
  saldo_pendiente: 'Falta cobrar',
  resuelto: 'Terminada',
};

const ICONO: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={16} />,
  pausado: (color) => <IconPause color={color} size={15} />,
  saldo_pendiente: (color) => <IconEtiqueta color={color} size={15} />,
  resuelto: (color) => <IconVisto color={color} size={16} />,
};

/**
 * Tarjetas de estatus: ícono + nombre + qué significa. La activa toma el
 * tono del estatus (fondo suave, borde y placa sólidos), así el color nunca
 * es la única señal — también cambian el ícono relleno y el peso del texto.
 *
 * El técnico ve tres (en fila); administración ve además «Saldo pendiente»
 * y las cuatro se acomodan en una cuadrícula de 2 × 2.
 */
export function StatusSelector({ value, onChange, disabled = false, sinTecnico = false, permiteSaldo = false }: Props) {
  const { colors } = useTheme();
  // Sin permiso, una orden que ya está en «Saldo pendiente» se ve pero no se mueve.
  const bloqueadoPorAdmin = !permiteSaldo && value === 'saldo_pendiente';
  const opciones: readonly OrdenStatus[] =
    permiteSaldo || bloqueadoPorAdmin ? ORDEN_STATUSES : ORDEN_STATUSES_TECNICO;
  const cuadricula = opciones.length === 4;
  const requiereTecnico = (status: OrdenStatus) =>
    (status === 'resuelto' || status === 'saldo_pendiente') && status !== value;
  const saldo = statusTone('saldo_pendiente', colors);

  return (
    <View style={styles.bloque}>
      <View
        style={[styles.fila, cuadricula && styles.cuadricula]}
        accessibilityRole="radiogroup"
        accessibilityLabel="Estatus de la orden"
      >
        {opciones.map((status) => (
          <Opcion
            key={status}
            status={status}
            activo={status === value}
            cuadricula={cuadricula}
            disabled={disabled || bloqueadoPorAdmin || (sinTecnico && requiereTecnico(status))}
            onPress={() => onChange(status)}
          />
        ))}
      </View>
      {sinTecnico ? (
        <Text style={[styles.aviso, { color: colors.inkSubtle }]}>
          {permiteSaldo
            ? 'Asigna un técnico a la orden para marcarla como resuelta o con saldo pendiente.'
            : 'Asigna un técnico a la orden para poder marcarla como resuelta.'}
        </Text>
      ) : null}
      {permiteSaldo && value === 'saldo_pendiente' ? (
        <View style={[styles.nota, { backgroundColor: saldo.bg }]} accessibilityLiveRegion="polite">
          <View style={[styles.notaBarra, { backgroundColor: saldo.text }]} />
          <Text style={[styles.notaTexto, { color: saldo.text }]}>
            Trabajo terminado con cobro pendiente. Al liquidarla pasa a Resuelta.
          </Text>
        </View>
      ) : null}
      {bloqueadoPorAdmin ? (
        <Text style={[styles.aviso, { color: colors.inkSubtle }]}>
          Solo un administrador puede cambiar el estatus de una orden con saldo pendiente.
        </Text>
      ) : null}
    </View>
  );
}

function Opcion({
  status,
  activo,
  cuadricula,
  disabled,
  onPress,
}: {
  status: OrdenStatus;
  activo: boolean;
  cuadricula: boolean;
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
    <Animated.View
      style={[cuadricula ? styles.celdaCuadricula : styles.celda, { opacity: disabled && !activo ? 0.55 : 1, transform: [{ scale: escala }] }]}
    >
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
  bloque: { gap: spacing.sm },
  fila: { flexDirection: 'row', gap: spacing.sm },
  cuadricula: { flexWrap: 'wrap' },
  aviso: { ...type.caption },
  celda: { flex: 1, minWidth: 0 },
  // Dos por fila: 45 % + flexGrow deja el hueco del `gap` sin calcularlo.
  celdaCuadricula: { flexBasis: '45%', flexGrow: 1, minWidth: 0 },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  notaBarra: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  notaTexto: { ...type.label, fontSize: 13, flex: 1 },
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
