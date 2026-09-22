import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { hoyISO } from '@/utils/fecha';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Partes de un `YYYY-MM-DD` para la ficha del día (sin zona horaria). */
export function partesFecha(iso: string): { dia: string; numero: number; mes: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { dia: DIAS[fecha.getDay()]!, numero: fecha.getDate(), mes: MESES[fecha.getMonth()]! };
}

/**
 * Jornadas del proyecto como fichas de calendario deslizables: día de la
 * semana, número y mes. La de hoy va en dorado; las pasadas se atenúan.
 */
export function JornadasCalendario({ fechas }: { fechas: string[] }) {
  const { colors } = useTheme();
  const hoy = hoyISO();
  const ordenadas = [...new Set(fechas.filter(Boolean).map((f) => f.slice(0, 10)))].sort();

  if (ordenadas.length === 0) {
    return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Aún no hay jornadas programadas.</Text>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
      accessibilityLabel={`${ordenadas.length} jornadas`}
    >
      {ordenadas.map((iso, i) => {
        const p = partesFecha(iso);
        if (!p) return null;
        const esHoy = iso === hoy;
        const pasada = iso < hoy;
        return (
          <View
            key={iso}
            style={[
              styles.ficha,
              esHoy
                ? { backgroundColor: colors.gold, borderColor: colors.gold }
                : { backgroundColor: colors.surface, borderColor: colors.line, opacity: pasada ? 0.7 : 1 },
            ]}
            accessible
            accessibilityLabel={`Jornada ${i + 1}: ${p.dia} ${p.numero} de ${p.mes}${esHoy ? ', hoy' : ''}`}
          >
            <Text style={[styles.dia, { color: esHoy ? colors.onGold : colors.inkSubtle }]}>
              {esHoy ? 'Hoy' : p.dia}
            </Text>
            <Text style={[styles.numero, { color: esHoy ? colors.onGold : colors.ink }]}>{p.numero}</Text>
            <Text style={[styles.mes, { color: esHoy ? colors.onGold : colors.inkMuted }]}>{p.mes}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vacio: { ...type.caption },
  fila: { gap: spacing.sm, paddingVertical: 2 },
  ficha: {
    width: 58,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingVertical: spacing.sm,
    gap: 1,
  },
  dia: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  numero: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  mes: { ...type.caption, fontSize: 11, lineHeight: 13 },
});
