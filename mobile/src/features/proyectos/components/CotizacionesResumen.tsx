import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { ProyectoCotizacionBloque } from '@/types/proyecto';

/**
 * Cotizaciones vinculadas al proyecto — solo lectura en mobile: el técnico
 * asignado no puede vincular ni quitar cotizaciones (`assert_tecnico_locked_fields`
 * en el backend). Vincularlas es tarea de oficina en la web.
 */
export function CotizacionesResumen({ bloques }: { bloques: ProyectoCotizacionBloque[] }) {
  const { colors } = useTheme();

  if (bloques.length === 0) {
    return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Sin cotizaciones vinculadas.</Text>;
  }

  return (
    <View style={styles.lista}>
      {bloques.map((bloque) => (
        <View key={bloque.vinculoId} style={[styles.fila, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}>
          <View style={[styles.numero, { backgroundColor: colors.primaryRing }]}>
            <Text style={[styles.numeroTexto, { color: colors.primary }]}>{bloque.orden}</Text>
          </View>
          <View style={styles.textos}>
            <Text style={[styles.folio, { color: colors.ink }]} numberOfLines={1}>
              {bloque.cotizacion.folio || `Cotización ${bloque.orden}`}
            </Text>
            <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
              {bloque.cotizacion.cliente || 'Sin cliente'}
              {bloque.cotizacion.fecha ? ` · ${bloque.cotizacion.fecha}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  numero: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: { ...type.label, fontSize: 12, fontVariant: ['tabular-nums'] },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  folio: { ...type.bodyMedium, fontSize: 14 },
  detalle: { ...type.caption },
  vacio: { ...type.body },
});
