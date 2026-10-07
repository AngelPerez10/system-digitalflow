import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { Presionable, rellenoCampo } from './nuevaOrdenUi';

/**
 * Movimiento compartido por las secciones de Nueva orden. Solo
 * `opacity`/`transform` en el hilo nativo; con «reducir movimiento» todo salta
 * a su estado final.
 */

/** Colores con los que el chip dibuja su contenido; `relleno` = capa marina. */
export interface Tinta {
  fuerte: string;
  suave: string;
  acento: string;
  relleno: boolean;
}

/* ------------------------------------------------------------------ */
/* Movimiento                                                          */
/* ------------------------------------------------------------------ */

/** 0 → 1 cuando `activo`; la salida es un poco más rápida que la entrada. */
export function useActivo(activo: boolean, ms = 200) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(activo ? 1 : 0);
      return;
    }
    const anim = Animated.timing(v, {
      toValue: activo ? 1 : 0,
      duration: activo ? ms : Math.round(ms * 0.7),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [activo, v, reduced, ms]);
  return v;
}

/** Resorte con rebote corto (palomitas, insignias). */
export function useRebote(activo: boolean) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(activo ? 1 : 0);
      return;
    }
    const anim = activo
      ? Animated.spring(v, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true })
      : Animated.timing(v, { toValue: 0, duration: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [activo, v, reduced]);
  return v;
}

/** Entrada escalonada de un elemento de carrusel: llega desde la derecha. */
export function useLlegada(indice: number) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(indice, 8) * 35,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar: un cambio de selección no repite la entrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    opacity: v,
    transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
}

/**
 * Contenido que cambia con `clave` deslizándose en la dirección del cambio
 * (`direccion` 1 = entra desde la derecha, -1 = desde la izquierda).
 */
export function Desliza({
  clave,
  direccion,
  children,
}: {
  clave: string;
  direccion: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const desde = useRef(0);
  const previa = useRef(clave);
  if (previa.current !== clave) desde.current = direccion * 18;

  useEffect(() => {
    if (previa.current === clave) return;
    previa.current = clave;
    if (reduced) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, v, reduced]);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [desde.current, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Opción tocable con relleno marino que aparece con fundido y escala. El
 * contenido se dibuja dos veces (tinta y blanco) para que el color del texto
 * cambie junto con el fondo, sin saltos.
 */
export function ChipSeleccion({
  activo,
  disabled,
  punteado = false,
  style,
  contenidoStyle,
  accessibilityLabel,
  onPress,
  children,
}: {
  activo: boolean;
  disabled?: boolean;
  punteado?: boolean;
  style: StyleProp<ViewStyle>;
  contenidoStyle: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  onPress: () => void;
  children: (tinta: Tinta) => React.ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const v = useActivo(activo);
  return (
    <Presionable
      accessibilityRole="radio"
      accessibilityState={{ checked: activo, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      escala={0.94}
      style={[
        style,
        m.chip,
        {
          backgroundColor: rellenoCampo(scheme),
          borderColor: activo ? colors.navy : punteado ? colors.line : 'transparent',
        },
      ]}
    >
      <View style={contenidoStyle}>{children({ fuerte: colors.ink, suave: colors.inkMuted, acento: colors.primary, relleno: false })}</View>
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          contenidoStyle,
          {
            backgroundColor: colors.navy,
            opacity: v,
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
          },
        ]}
      >
        {children({ fuerte: colors.onNavy, suave: colors.onNavyMuted, acento: colors.gold, relleno: true })}
      </Animated.View>
    </Presionable>
  );
}

/** Rótulo de grupo dentro de la tarjeta, con texto opcional a la derecha. */
export function Rotulo({ texto, requerido, error, derecha }: { texto: string; requerido?: boolean; error?: boolean; derecha?: string }) {
  const { colors } = useTheme();
  return (
    <View style={m.rotulo}>
      <Text style={[m.rotuloTexto, { color: error ? colors.danger : colors.inkMuted }]}>
        {texto}
        {requerido ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {derecha ? <Text style={[m.rotuloDerecha, { color: colors.inkSubtle }]}>{derecha}</Text> : null}
    </View>
  );
}

export function Llegada({
  indice,
  style,
  children,
}: {
  indice: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const estilo = useLlegada(indice);
  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}

/** Sacudida corta cada vez que aparece o cambia `error` (validación). */
export function useSacudida(error: string | undefined) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!error || reduced) return;
    const paso = (x: number, ms: number) =>
      Animated.timing(v, { toValue: x, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true });
    const anim = Animated.sequence([paso(-9, 45), paso(9, 70), paso(-6, 60), paso(5, 55), paso(-2, 50), paso(0, 45)]);
    anim.start();
    return () => anim.stop();
  }, [error, v, reduced]);
  return v;
}

/**
 * Ondas que se expanden y desvanecen en bucle (radar / pin). Devuelve un
 * valor 0→1 por onda, desfasadas entre sí.
 */
export function useOndas(activo: boolean, ondas = 2, ms = 1800) {
  const reduced = useReducedMotion();
  const valores = useRef(Array.from({ length: ondas }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!activo || reduced) {
      valores.forEach((v) => v.setValue(0));
      return;
    }
    const anim = Animated.parallel(
      valores.map((v, i) =>
        Animated.sequence([
          Animated.delay((ms / ondas) * i),
          Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true })),
        ]),
      ),
    );
    anim.start();
    return () => {
      anim.stop();
      valores.forEach((v) => v.setValue(0));
    };
  }, [activo, reduced, valores, ondas, ms]);
  return valores;
}

/** Latido de opacidad para esqueletos de carga. */
export function useLatido() {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return v;
}

const m = StyleSheet.create({
  chip: { overflow: 'hidden', borderWidth: 1 },
  rotulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rotuloTexto: { fontFamily: font.semibold, fontSize: 13.5, letterSpacing: -0.1 },
  rotuloDerecha: { ...type.caption, fontSize: 11.5 },
});
