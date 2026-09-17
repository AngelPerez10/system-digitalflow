import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type, type ThemeColors } from '@/theme/tokens';

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PRESETS = [0, 25, 50, 75, 100];
const PASO = 5;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Rojo hasta un tercio, ámbar hasta dos tercios, verde de ahí a completo — el
 *  color acompaña el número en vez de que el técnico tenga que leerlo solo. */
export function colorPorAvance(value: number, colors: ThemeColors): { bg: string; text: string } {
  if (value < 34) return { bg: colors.danger, text: colors.danger };
  if (value < 70) return { bg: colors.statusPendienteText, text: colors.statusPendienteText };
  return { bg: colors.statusResueltoText, text: colors.statusResueltoText };
}

function IconMeta({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.5V13M12 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.5 21.5h7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 10.3 13 8l1.6 1.1L13.6 11 12 10.3Z" fill={color} />
    </Svg>
  );
}

/**
 * Sin dependencia de slider nativo (evitaría otro build de EAS): barra
 * tocable a color + chips de valores comunes + botones de ajuste fino de 5
 * en 5. El color de la barra y del número cambian con el avance.
 */
export function PorcentajeAvance({ value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const tono = colorPorAvance(value, colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.encabezado}>
        <View style={styles.valorFila}>
          <View style={[styles.metaInsignia, { backgroundColor: colors.surfaceSunken }]}>
            <IconMeta color={tono.text} />
          </View>
          <View>
            <Text style={[styles.valor, { color: tono.text }]}>{value}%</Text>
            <Text style={[styles.valorLabel, { color: colors.inkSubtle }]}>de avance</Text>
          </View>
        </View>
        <View style={styles.pasos}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restar 5 por ciento"
            disabled={disabled || value <= 0}
            onPress={() => onChange(clamp(value - PASO))}
            style={[
              styles.pasoBoton,
              { borderColor: colors.line, backgroundColor: colors.surface },
              disabled || value <= 0 ? styles.inactivo : null,
            ]}
          >
            <Text style={[styles.pasoTexto, { color: colors.ink }]}>−5</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sumar 5 por ciento"
            disabled={disabled || value >= 100}
            onPress={() => onChange(clamp(value + PASO))}
            style={[
              styles.pasoBoton,
              { borderColor: colors.line, backgroundColor: colors.surface },
              disabled || value >= 100 ? styles.inactivo : null,
            ]}
          >
            <Text style={[styles.pasoTexto, { color: colors.ink }]}>+5</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.pista, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <View style={[styles.barra, { backgroundColor: tono.bg, width: `${value}%` }]} />
      </View>

      <View style={styles.chipsBloque}>
        <Text style={[styles.chipsLabel, { color: colors.inkSubtle }]}>Ajuste rápido</Text>
        <View style={styles.chips}>
          {PRESETS.map((preset) => {
            const activo = value === preset;
            return (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={`Fijar avance en ${preset} por ciento`}
                disabled={disabled}
                onPress={() => onChange(preset)}
                style={[
                  styles.chip,
                  {
                    borderColor: activo ? colors.primary : colors.line,
                    backgroundColor: activo ? colors.primaryRing : colors.surface,
                  },
                  disabled ? styles.inactivo : null,
                ]}
              >
                <Text style={[styles.chipTexto, { color: activo ? colors.primary : colors.inkMuted }]}>
                  {preset}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valorFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaInsignia: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { fontVariant: ['tabular-nums'], fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 32 },
  valorLabel: { ...type.caption, fontSize: 11, marginTop: -2 },
  pasos: { flexDirection: 'row', gap: spacing.xs },
  pasoBoton: {
    minWidth: TOUCH_TARGET - 8,
    minHeight: TOUCH_TARGET - 8,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTexto: { ...type.label },
  pista: { height: 12, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 6 },
  chipsBloque: { gap: spacing.xs },
  chipsLabel: { ...type.caption, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    minHeight: TOUCH_TARGET - 12,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: { ...type.label, fontSize: 12 },
  inactivo: { opacity: 0.4 },
});
