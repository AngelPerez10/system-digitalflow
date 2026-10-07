import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { IconCheck } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import type { EstadoSeccion } from '../crearOrdenForm';

/**
 * Piezas de «Nueva orden». Mismo lenguaje que las vistas del técnico: banda
 * marina con la hoja montada encima, tarjetas blancas y campos con etiqueta
 * pequeña arriba y valor abajo (como las celdas de fecha de «Editar orden»).
 * El movimiento es solo `transform`/`opacity` en el hilo nativo y respeta
 * «reducir movimiento».
 */

type Icono = (color: string) => React.ReactNode;

/* ------------------------------------------------------------------ */
/* Movimiento                                                          */
/* ------------------------------------------------------------------ */

/** Resorte hacia `destino`; con «reducir movimiento» salta al valor final. */
function useResorte(destino: number, friction = 8, tension = 170) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(destino)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(destino);
      return;
    }
    const anim = Animated.spring(v, { toValue: destino, friction, tension, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [destino, v, reduced, friction, tension]);
  return v;
}

/** Fundido con leve subida cada vez que cambia `clave`. */
export function Aparece({
  clave,
  desde = 4,
  children,
}: {
  clave: string | number;
  desde?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const previa = useRef(clave);

  // Antes de pintar: el contenido nuevo nunca se ve un cuadro a opacidad completa.
  useLayoutEffect(() => {
    if (previa.current === clave) return;
    previa.current = clave;
    if (reduced) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, v, reduced]);

  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [desde, 0] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

/** Se hunde un poco al tocar (escala), sin mover el layout de alrededor. */
export function Presionable({
  style,
  escala = 0.98,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  escala?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const s = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const ir = (destino: number) => {
    if (reduced) return;
    Animated.spring(s, { toValue: destino, friction: 9, tension: 320, useNativeDriver: true }).start();
  };
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        ir(escala);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        ir(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[typeof style === 'function' ? style(pressed) : style, { transform: [{ scale: s }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Hoja                                                                */
/* ------------------------------------------------------------------ */

/** Estilo de la hoja que se monta sobre la banda (mismo que los listados). */
export function estiloHoja(colors: { canvas: string; shadow: string }, scheme: 'light' | 'dark'): ViewStyle {
  return {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
    elevation: 12,
  };
}

/* ------------------------------------------------------------------ */
/* Tarjeta de sección                                                  */
/* ------------------------------------------------------------------ */

export function Tarjeta({
  icon,
  titulo,
  descripcion,
  estado,
  opcional = false,
  children,
}: {
  icon: Icono;
  titulo: string;
  descripcion: string;
  estado: EstadoSeccion;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[t.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'panel')]}>
      <View style={t.cabezaBloque}>
        <View style={t.cabeza}>
          <View style={[t.icono, { backgroundColor: colors.primaryRing }]} importantForAccessibility="no-hide-descendants">
            {icon(colors.primary)}
          </View>
          <Text style={[t.titulo, { color: colors.ink }]} accessibilityRole="header" numberOfLines={1}>
            {titulo}
          </Text>
          <Estado estado={estado} opcional={opcional} />
        </View>
        {/* Fuera de la fila del estado: así usa todo el ancho de la tarjeta. */}
        <Text style={[t.descripcion, { color: colors.inkSubtle }]}>{descripcion}</Text>
      </View>
      <View style={t.cuerpo}>{children}</View>
    </View>
  );
}

/** «Requerido» / «En progreso» / palomita verde que entra con resorte. */
function Estado({ estado, opcional }: { estado: EstadoSeccion; opcional: boolean }) {
  const { colors, scheme } = useTheme();
  const check = useResorte(estado === 'completo' ? 1 : 0, 6, 180);

  return (
    <View style={t.estadoCaja} accessible accessibilityLabel={estado === 'completo' ? 'Sección lista' : estado === 'incompleto' ? 'Sección en progreso' : opcional ? 'Opcional' : 'Requerido'}>
      <Animated.View
        style={[
          t.estadoTexto,
          { opacity: check.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
      >
        {estado === 'incompleto' ? (
          <View style={[t.estadoFila, t.pastilla, { backgroundColor: colors.statusPendienteBg }]}>
            <View style={[t.punto, { backgroundColor: colors.gold }]} />
            <Text style={[t.estadoLabel, { color: colors.statusPendienteText }]}>En progreso</Text>
          </View>
        ) : (
          <View style={[t.pastilla, { backgroundColor: rellenoCampo(scheme) }]}>
            <Text style={[t.estadoLabel, { color: colors.inkMuted }]}>{opcional ? 'Opcional' : 'Requerido'}</Text>
          </View>
        )}
      </Animated.View>
      <Animated.View
        style={[
          t.check,
          {
            backgroundColor: colors.success,
            opacity: check,
            transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          },
        ]}
      >
        <IconCheck color={colors.onPrimary} size={13} />
      </Animated.View>
    </View>
  );
}

/**
 * Relleno de los campos: un velo de tinta muy tenue, visible en ambos temas
 * (el `surfaceSunken` claro es casi blanco y no se distingue de la tarjeta).
 */
export function rellenoCampo(scheme: 'light' | 'dark'): string {
  return scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)';
}

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

/** Caja de campo: etiqueta pequeña arriba, contenido abajo. */
export function CajaCampo({
  label,
  requerido,
  error,
  activo,
  contador,
  children,
}: {
  label: string;
  requerido?: boolean;
  error?: string;
  activo?: boolean;
  contador?: string;
  children: React.ReactNode;
}) {
  const { colors, scheme } = useTheme();
  return (
    <View style={f.envoltura}>
      <View
        style={[
          f.caja,
          {
            backgroundColor: error ? colors.dangerBg : activo ? colors.surface : rellenoCampo(scheme),
            borderColor: error ? colors.danger : activo ? colors.primary : 'transparent',
          },
          activo && !error ? { shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } } : null,
        ]}
      >
        <View style={f.labelFila}>
          <Text style={[f.label, { color: error ? colors.danger : activo ? colors.primary : colors.inkMuted }]}>
            {label}
            {requerido ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
          {contador ? <Text style={[f.contador, { color: colors.inkSubtle }]}>{contador}</Text> : null}
        </View>
        {children}
      </View>
      {error ? (
        <Aparece clave={error}>
          <Text style={[f.error, { color: colors.danger }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </Aparece>
      ) : null}
    </View>
  );
}

/** Campo de texto con etiqueta arriba; el borde se tiñe al enfocar. */
export function CampoTexto({
  label,
  requerido = false,
  error,
  contador,
  derecha,
  ...input
}: {
  label: string;
  requerido?: boolean;
  error?: string;
  contador?: string;
  derecha?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  const ref = useRef<TextInput>(null);
  const [enfocado, setEnfocado] = useState(false);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessible={false}>
      <CajaCampo label={label} requerido={requerido} error={error} activo={enfocado} contador={enfocado ? contador : undefined}>
        <View style={f.valorFila}>
          <TextInput
            ref={ref}
            {...input}
            accessibilityLabel={input.accessibilityLabel ?? (requerido ? `${label}, obligatorio` : label)}
            placeholderTextColor={colors.inkSubtle}
            selectionColor={colors.primary}
            onFocus={(e) => {
              setEnfocado(true);
              input.onFocus?.(e);
            }}
            onBlur={(e) => {
              setEnfocado(false);
              input.onBlur?.(e);
            }}
            style={[f.input, input.multiline ? f.inputMulti : null, !input.value ? f.inputVacio : null, { color: colors.ink }]}
          />
          {derecha}
        </View>
      </CajaCampo>
    </Pressable>
  );
}

/** Píldora de opción rápida («Hoy», «Mañana», «Asignármela»). */
export function Atajo({
  label,
  activo = false,
  disabled,
  onPress,
}: {
  label: string;
  activo?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityState={{ selected: activo, disabled }}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      escala={0.95}
      style={[
        f.atajo,
        activo
          ? { backgroundColor: colors.navy, borderColor: colors.navy }
          : { backgroundColor: colors.surface, borderColor: colors.lineStrong },
      ]}
    >
      <Text style={[f.atajoTexto, { color: activo ? colors.onNavy : colors.ink }]}>{label}</Text>
    </Presionable>
  );
}

/* ------------------------------------------------------------------ */

const t = StyleSheet.create({
  tarjeta: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: spacing.lg, gap: spacing.lg },
  cabezaBloque: { gap: spacing.sm },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icono: { width: 36, height: 36, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.35 },
  descripcion: { ...type.caption, fontSize: 12.5, lineHeight: 17 },
  estadoCaja: { minWidth: 92, minHeight: 26, alignItems: 'flex-end', justifyContent: 'center' },
  estadoTexto: { position: 'absolute', right: 0 },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  estadoLabel: { fontFamily: font.semibold, fontSize: 11.5 },
  pastilla: { borderRadius: radius.pill, paddingHorizontal: spacing.sm + 1, paddingVertical: 3 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { gap: spacing.md },
});

const f = StyleSheet.create({
  envoltura: { gap: spacing.xs },
  caja: {
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 1,
    paddingBottom: spacing.sm + 1,
    minHeight: TOUCH_TARGET + 14,
    justifyContent: 'center',
    gap: 3,
  },
  labelFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...type.caption, fontSize: 12.5, fontFamily: font.medium },
  contador: { ...type.mono, fontSize: 10.5 },
  valorFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semibold,
    fontSize: 16,
    letterSpacing: -0.25,
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: 24,
  },
  inputVacio: { fontFamily: font.regular, letterSpacing: 0 },
  inputMulti: { minHeight: 72, textAlignVertical: 'top', fontFamily: font.regular, lineHeight: 21 },
  error: { ...type.caption, fontSize: 12, paddingHorizontal: spacing.xs },
  atajo: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 36, justifyContent: 'center' },
  atajoTexto: { fontFamily: font.semibold, fontSize: 13 },
});
