import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconBox } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { ProyectoTipoTrabajo } from '@/types/proyecto';

interface Props {
  tiposTrabajo: ProyectoTipoTrabajo[];
  /**
   * Omítelo cuando el título de la sección que envuelve este campo ya dice
   * "Tipo de trabajo" (p. ej. el detalle) — repetirlo ahí se leía como un
   * error de copy. Pásalo cuando la sección es genérica (p. ej. "Estatus" en
   * edición) y el campo necesita su propia etiqueta para distinguirse.
   */
  label?: string;
}

/**
 * Tipo(s) de trabajo del proyecto — siempre solo lectura: el técnico asignado
 * no los edita (`assert_tecnico_locked_fields` en el backend; ver
 * `ProyectoFieldPatch`). Un proyecto puede tener más de uno, así que se
 * muestran como etiquetas en vez de un solo texto plano.
 *
 * Misma fila que `CampoDato` (ícono en placa + etiqueta + valor) — sin
 * tarjeta propia: envolverlo en otra caja bordeada, dentro de una `SeccionCard`
 * que ya tiene su propio borde, se veía como cajas anidadas sin motivo.
 */
export function TiposTrabajoField({ tiposTrabajo, label }: Props) {
  const { colors } = useTheme();

  const chips =
    tiposTrabajo.length > 0 ? (
      <View style={styles.chips}>
        {tiposTrabajo.map((t) => (
          <View key={t.id} style={[styles.chip, { backgroundColor: colors.primaryRing }]}>
            <Text style={[styles.chipTexto, { color: colors.primary }]} numberOfLines={1}>
              {t.nombre}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Sin tipo de trabajo asignado.</Text>
    );

  if (!label) return chips;

  return (
    <View style={styles.fila}>
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surface }]}>
        <IconBox color={colors.inkMuted} size={12} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.label, { color: colors.inkSubtle }]}>{label}</Text>
        {chips}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconoPlaca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textos: { flex: 1, flexShrink: 1, gap: 5 },
  label: { ...type.label },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipTexto: { ...type.label, fontSize: 13 },
  vacio: { ...type.body, fontSize: 13 },
});
