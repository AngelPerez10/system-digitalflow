import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconVisto } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';
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

const STATUS_HINT: Record<ProyectoStatus, string> = {
  en_proceso: 'Trabajo en campo activo',
  pausado: 'Detenido temporalmente',
  cerrado: 'Proyecto concluido',
  cancelado: 'Proyecto anulado',
};

const ENTRADA_MS = 280;
const SALIDA_MS = 160;
const STAGGER_MS = 36;

/**
 * Selector de estatus — lista vertical con motion sutil (opacity/transform,
 * native driver). Springs con fricción alta: fluido, sin rebote molesto.
 */
export function ProyectoStatusSegment({ value, onChange, permiteCancelar = false }: Props) {
  const { colors } = useTheme();
  const actual = statusTone(value, colors);
  const reduced = useReducedMotion();

  const opciones = PROYECTO_STATUSES.filter(
    (status) => status !== 'cancelado' || permiteCancelar || value === 'cancelado',
  );

  return (
    <View style={styles.bloque}>
      <View style={styles.encabezado}>
        <Text style={[styles.kicker, { color: colors.inkSubtle }]}>Estado del proyecto</Text>
        <ResumenChip
          key={value}
          status={value}
          bg={actual.bg}
          text={actual.text}
          reduced={reduced}
        />
      </View>

      <View
        style={styles.lista}
        accessibilityRole="radiogroup"
        accessibilityLabel="Estatus del proyecto"
      >
        {opciones.map((status, index) => (
          <Opcion
            key={status}
            status={status}
            activo={status === value}
            disabled={status === 'cancelado' && !permiteCancelar}
            index={index}
            onPress={() => onChange(status)}
          />
        ))}
      </View>
    </View>
  );
}

function ResumenChip({
  status,
  bg,
  text,
  reduced,
}: {
  status: ProyectoStatus;
  bg: string;
  text: string;
  reduced: boolean;
}) {
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    const animacion = Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: ENTRADA_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, [enter, reduced]);

  return (
    <Animated.View
      style={[
        styles.resumen,
        {
          backgroundColor: bg,
          borderColor: bg,
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 0],
              }),
            },
            {
              scale: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Estado actual: ${statusLabel(status)}`}
    >
      <View style={[styles.resumenDot, { backgroundColor: text }]} />
      <ProyectoStatusIcon status={status} color={text} size={12} />
      <Text style={[styles.resumenTexto, { color: text }]} numberOfLines={1}>
        {statusLabel(status)}
      </Text>
    </Animated.View>
  );
}

function Opcion({
  status,
  activo,
  disabled = false,
  index,
  onPress,
}: {
  status: ProyectoStatus;
  activo: boolean;
  disabled?: boolean;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tono = statusTone(status, colors);
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const seleccion = useRef(new Animated.Value(activo ? 1 : 0)).current;
  const checkPop = useRef(new Animated.Value(activo ? 1 : 0)).current;
  const icono = useRef(new Animated.Value(activo ? 1 : 0)).current;
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const montado = useRef(false);

  useEffect(() => {
    if (reduced || montado.current) {
      entrada.setValue(1);
      return;
    }
    montado.current = true;
    const animacion = Animated.timing(entrada, {
      toValue: 1,
      duration: ENTRADA_MS,
      delay: index * STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [entrada, index, reduced]);

  useEffect(() => {
    if (reduced) {
      seleccion.setValue(activo ? 1 : 0);
      checkPop.setValue(activo ? 1 : 0);
      icono.setValue(activo ? 1 : 0);
      return;
    }

    const fade = activo
      ? Animated.spring(seleccion, {
          toValue: 1,
          friction: 10,
          tension: 140,
          useNativeDriver: true,
        })
      : Animated.timing(seleccion, {
          toValue: 0,
          duration: SALIDA_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        });

    const check = activo
      ? Animated.sequence([
          Animated.timing(checkPop, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.spring(checkPop, {
            toValue: 1,
            friction: 8,
            tension: 160,
            useNativeDriver: true,
          }),
        ])
      : Animated.timing(checkPop, {
          toValue: 0,
          duration: SALIDA_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        });

    const iconAnim = activo
      ? Animated.spring(icono, {
          toValue: 1,
          friction: 9,
          tension: 150,
          useNativeDriver: true,
        })
      : Animated.timing(icono, {
          toValue: 0,
          duration: SALIDA_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        });

    const grupo = Animated.parallel([fade, check, iconAnim]);
    grupo.start();
    return () => grupo.stop();
  }, [activo, seleccion, checkPop, icono, reduced]);

  const animarPress = (destino: number) => {
    if (reduced) return;
    Animated.spring(escala, {
      toValue: destino,
      friction: 12,
      tension: 280,
      useNativeDriver: true,
    }).start();
  };

  const tinta = activo ? tono.text : colors.ink;
  const tintaMeta = activo ? tono.text : colors.inkSubtle;

  const translateY = Animated.add(
    entrada.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 0],
    }),
    seleccion.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -1],
    }),
  );

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [{ scale: escala }, { translateY }],
      }}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: activo, disabled }}
        accessibilityLabel={statusLabel(status)}
        accessibilityHint={
          disabled ? 'Solo un administrador puede ponerlo' : STATUS_HINT[status]
        }
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animarPress(0.985)}
        onPressOut={() => animarPress(1)}
        android_ripple={
          disabled ? undefined : { color: colors.primaryRing, borderless: false, foreground: true }
        }
        style={[
          styles.opcion,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
          },
          activo
            ? Platform.select({
                ios: {
                  shadowColor: tono.text,
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 },
                },
                android: { elevation: 1 },
                default: {},
              })
            : null,
          disabled ? styles.opcionInactiva : null,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.fondoActivo,
            { backgroundColor: tono.bg, opacity: seleccion },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.bordeActivo,
            {
              borderColor: tono.text,
              opacity: seleccion.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.22],
              }),
            },
          ]}
        />

        <Animated.View
          style={[
            styles.rail,
            {
              backgroundColor: tono.text,
              opacity: seleccion,
              transform: [
                {
                  scaleY: seleccion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ],
            },
          ]}
          accessibilityElementsHidden
        />

        <Animated.View
          style={[
            styles.iconoPlaca,
            {
              backgroundColor: colors.surfaceSunken,
              borderColor: colors.line,
              transform: [
                {
                  scale: icono.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.04],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.iconoPlacaFill,
              { backgroundColor: colors.surface, opacity: seleccion },
            ]}
          />
          <ProyectoStatusIcon status={status} color={tinta} size={15} />
        </Animated.View>

        <View style={styles.textos}>
          <Text style={[styles.titulo, { color: tinta }]}>{statusLabel(status)}</Text>
          <Text style={[styles.hint, { color: tintaMeta }]} numberOfLines={1}>
            {STATUS_HINT[status]}
          </Text>
        </View>

        <View
          style={[
            styles.check,
            { borderColor: colors.lineStrong, backgroundColor: 'transparent' },
          ]}
          accessibilityElementsHidden
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.checkFill,
              {
                backgroundColor: tono.text,
                opacity: seleccion,
                transform: [{ scale: seleccion }],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: checkPop,
              transform: [
                {
                  scale: checkPop.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1],
                  }),
                },
              ],
            }}
          >
            {activo ? <IconVisto color={colors.onPrimary} size={12} /> : null}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: spacing.md },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kicker: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '58%',
    flexShrink: 1,
  },
  resumenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resumenTexto: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  lista: {
    gap: 10,
  },
  opcion: {
    minHeight: Math.max(TOUCH_TARGET + 8, 56),
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingRight: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  fondoActivo: {
    borderRadius: radius.lg,
  },
  bordeActivo: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  opcionInactiva: { opacity: 0.45 },
  rail: {
    width: 3,
    alignSelf: 'stretch',
    marginVertical: 10,
    marginLeft: 10,
    borderRadius: 2,
  },
  iconoPlaca: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconoPlacaFill: {
    borderRadius: radius.md,
  },
  textos: { flex: 1, flexShrink: 1, gap: 2 },
  titulo: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  hint: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkFill: {
    borderRadius: 11,
  },
});
