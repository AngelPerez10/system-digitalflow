import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DateTimeField } from '@/features/orders/components/DateTimeField';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';

interface Props {
  fechas: string[];
  onChange: (fechas: string[]) => void;
  error?: string;
}

function rangoDesdeFechas(fechas: string[]): { desde: string; hasta: string } {
  const llenas = fechas.map((f) => f.trim().slice(0, 10)).filter(Boolean).sort();
  if (llenas.length === 0) return { desde: '', hasta: '' };
  return { desde: llenas[0]!, hasta: llenas[llenas.length - 1]! };
}

/** Expande un rango inclusivo día a día (`YYYY-MM-DD`). */
function expandirRango(desdeRaw: string, hastaRaw: string): string[] {
  const desde = desdeRaw.trim().slice(0, 10);
  const hasta = hastaRaw.trim().slice(0, 10);
  if (!desde && !hasta) return [];
  if (desde && !hasta) return [desde];
  if (!desde && hasta) return [hasta];

  let a = desde;
  let b = hasta;
  if (a > b) [a, b] = [b, a];

  const cursor = new Date(`${a}T12:00:00`);
  const ultimo = new Date(`${b}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(ultimo.getTime())) return [a];

  const out: string[] = [];
  let guardia = 0;
  while (cursor <= ultimo && guardia < 3660) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
    guardia += 1;
  }
  return out;
}

/**
 * Rango de trabajo del proyecto — el técnico elige «Desde» / «Hasta» y esto
 * expande día a día a `fechas_inicio` (mismo criterio que `expandFechasInicioRange`
 * en el formulario web).
 */
export function FechasInicioEditor({ fechas, onChange, error }: Props) {
  const { colors } = useTheme();
  const { desde, hasta } = rangoDesdeFechas(fechas);

  return (
    <View style={styles.wrap}>
      <View style={styles.fila}>
        <DateTimeField
          label="Desde"
          mode="date"
          value={desde}
          onChange={(valor) => onChange(expandirRango(valor, hasta))}
        />
        <DateTimeField
          label="Hasta"
          mode="date"
          value={hasta}
          onChange={(valor) => onChange(expandirRango(desde, valor))}
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  fila: { flexDirection: 'row', gap: spacing.sm },
  error: { ...type.caption, marginTop: spacing.xs },
  resumen: { ...type.caption },
});
