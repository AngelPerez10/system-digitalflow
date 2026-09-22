import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { IconButton } from '@/components/IconButton';
import { IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type, type ThemeColors } from '@/theme/tokens';
import { desplazarMes, etiquetaMes } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Piezas compartidas de los listados del técnico (Órdenes, Proyectos y las
 * vistas que vengan): banda de saludo, hoja redondeada, encabezado de mes,
 * chips de filtro y encabezado de sección. Un listado nuevo se arma con estas
 * piezas y se ve igual que los demás sin copiar estilos.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function saludoDelDia(hora = new Date().getHours()): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function fechaLarga(hoy = new Date()): string {
  return `${DIAS[hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;
}

/**
 * Banda marina bajo el navbar (mismo marino, sin costura): fecha y saludo.
 * La hoja del listado se monta 20 px encima con esquinas redondas.
 */
export function SaludoBanda({ nombre }: { nombre: string }) {
  const { colors } = useTheme();
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;
  return (
    <View style={[styles.banda, { backgroundColor: colors.navy }]}>
      <Text style={[styles.fecha, { color: colors.gold }]}>{fechaLarga()}</Text>
      <Text style={[styles.saludo, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
        {saludoDelDia()}, {primerNombre}
      </Text>
    </View>
  );
}

/** Estilo de la hoja que se monta sobre la banda (sombra hacia arriba). */
export function hojaEstilo(colors: ThemeColors, scheme: 'light' | 'dark') {
  return [
    styles.hoja,
    {
      backgroundColor: colors.canvas,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -10 },
      shadowRadius: 24,
      shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
      elevation: 12,
    },
  ];
}

/** Mes a la vista con flechas — encabezado de la hoja, como un calendario. */
export function MesEncabezado({
  mes,
  resumen,
  cargando,
  onChange,
}: {
  mes: string;
  /** Línea bajo el mes («12 órdenes asignadas»). */
  resumen: string;
  cargando: boolean;
  onChange: (mes: string) => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const destello = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    destello.setValue(0.3);
    Animated.timing(destello, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [mes, destello, reduced]);

  return (
    <View style={styles.mesFila}>
      <Animated.View style={[styles.mesTextos, { opacity: destello }]}>
        <Text
          style={[styles.mesTitulo, { color: colors.ink }]}
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {etiquetaMes(mes)}
        </Text>
        <Text style={[styles.mesSub, { color: colors.inkSubtle }]}>{cargando ? 'Actualizando…' : resumen}</Text>
      </Animated.View>
      <IconButton
        icon={<IconChevron direction="left" color={colors.inkMuted} />}
        accessibilityLabel="Mes anterior"
        onPress={() => onChange(desplazarMes(mes, -1))}
        disabled={cargando}
      />
      <IconButton
        icon={<IconChevron direction="right" color={colors.inkMuted} />}
        accessibilityLabel="Mes siguiente"
        onPress={() => onChange(desplazarMes(mes, 1))}
        disabled={cargando}
      />
    </View>
  );
}

export interface OpcionFiltro<K extends string> {
  key: K;
  label: string;
  cantidad: number;
  /** Tono suave del estatus; sin tono = chip neutro que se activa en marino. */
  tono?: { bg: string; text: string };
  icon?: (color: string) => React.ReactNode;
}

/**
 * Fila deslizable de chips de filtro con conteo. El activo toma su tono (o
 * marino si no tiene); el conteo nunca desaparece.
 */
export function FiltroChips<K extends string>({
  opciones,
  valor,
  onChange,
  accessibilityLabel = 'Filtrar por estatus',
}: {
  opciones: OpcionFiltro<K>[];
  valor: K;
  onChange: (valor: K) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {opciones.map(({ key, label, cantidad, tono, icon }) => {
        const activo = valor === key;
        const fondo = activo ? (tono ? tono.bg : colors.navy) : colors.surface;
        const tinta = activo ? (tono ? tono.text : colors.onNavy) : colors.inkMuted;
        const borde = activo ? (tono ? tono.text : colors.navy) : colors.line;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${label}: ${cantidad}`}
            onPress={() => onChange(key)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: fondo, borderColor: borde, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            {icon ? icon(activo ? tinta : (tono?.text ?? colors.inkMuted)) : null}
            <Text style={[styles.chipTexto, { color: tinta }]}>{label}</Text>
            <Text style={[styles.chipConteo, { color: tinta, opacity: activo ? 1 : 0.8 }]}>{cantidad}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Encabezado de sección de la lista: ícono en su tono, título, línea y conteo. */
export function SeccionEncabezado({
  titulo,
  cantidad,
  tono,
  icon,
}: {
  titulo: string;
  cantidad: number;
  tono: { bg: string; text: string };
  icon: (color: string) => React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.seccionRow} accessible accessibilityRole="header" accessibilityLabel={`${titulo}, ${cantidad}`}>
      <View style={[styles.seccionIcono, { backgroundColor: tono.bg }]}>{icon(tono.text)}</View>
      <Text style={[styles.seccion, { color: colors.ink }]}>{titulo}</Text>
      <View style={[styles.seccionLinea, { backgroundColor: colors.line }]} />
      <Text style={[styles.seccionConteo, { color: tono.text }]}>{cantidad}</Text>
    </View>
  );
}

export function Lupa({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={1.8} />
      <Line x1={15.3} y1={15.3} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Un punto sin ondas: el reverso silencioso de `BrandMark` (estado vacío). */
export function SinElementos() {
  const { colors } = useTheme();
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Circle cx={28} cy={28} r={19} stroke={colors.line} strokeWidth={1.8} strokeDasharray="1 7" strokeLinecap="round" />
      <Circle cx={28} cy={28} r={3.5} fill={colors.inkSubtle} />
    </Svg>
  );
}

export const listadoStyles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  lista: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  controles: { gap: spacing.md, marginBottom: spacing.xs },
});

const styles = StyleSheet.create({
  banda: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    // La hoja se monta 20 px sobre la banda.
    paddingBottom: spacing.xl + 20,
    gap: 2,
  },
  fecha: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  saludo: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.7 },
  hoja: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  mesFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs },
  mesTextos: { flex: 1, minWidth: 0 },
  mesTitulo: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4 },
  mesSub: { ...type.caption, fontSize: 12 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  chipTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  chipConteo: { ...type.mono, fontSize: 12, fontFamily: font.semibold },
  seccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  seccionIcono: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  seccion: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, letterSpacing: -0.2 },
  seccionLinea: { flex: 1, height: StyleSheet.hairlineWidth },
  seccionConteo: { ...type.mono, fontSize: 13, fontFamily: font.semibold },
});
