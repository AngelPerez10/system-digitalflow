import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconAlerta, IconClose, IconVisto } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';

interface Props {
  /** `null` = aún no se ha elegido — se muestra como pendiente, no como «No». */
  value: boolean | null;
}

type Estado = {
  label: string;
  detalle: string;
  Icono: typeof IconVisto;
  iconColor: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  rail: string;
};

/**
 * Lectura de monitoreo en el detalle: franja con riel de color + chip de
 * estado. Misma densidad que `CampoDato`, sin caja anidada ni píldora que
 * compita con los chips de tipo de trabajo.
 */
export function MonitoreoIndicador({ value }: Props) {
  const { colors } = useTheme();

  const estado: Estado =
    value === true
      ? {
          label: '¿Cuenta con monitoreo?',
          detalle: 'Con monitoreo',
          Icono: IconVisto,
          iconColor: colors.statusResueltoText,
          chipBg: colors.statusResueltoBg,
          chipText: colors.statusResueltoText,
          chipBorder: colors.statusResueltoBg,
          rail: colors.statusResueltoText,
        }
      : value === false
        ? {
            label: '¿Cuenta con monitoreo?',
            detalle: 'Sin monitoreo',
            Icono: IconClose,
            iconColor: colors.inkMuted,
            chipBg: colors.surfaceSunken,
            chipText: colors.inkMuted,
            chipBorder: colors.line,
            rail: colors.lineStrong,
          }
        : {
            label: '¿Cuenta con monitoreo?',
            detalle: 'Por confirmar',
            Icono: IconAlerta,
            iconColor: colors.gold,
            chipBg: colors.goldSoftBg,
            chipText: colors.goldSoftText,
            chipBorder: colors.goldSoftBg,
            rail: colors.gold,
          };

  const { Icono } = estado;

  return (
    <View
      style={[styles.fila, { borderColor: colors.line }]}
      accessibilityRole="text"
      accessibilityLabel={`${estado.label}: ${estado.detalle}`}
    >
      <View style={[styles.rail, { backgroundColor: estado.rail }]} accessibilityElementsHidden />
      <View style={styles.cuerpo}>
        <View style={styles.arriba}>
          <View style={[styles.placa, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Icono color={estado.iconColor} size={12} />
          </View>
          <Text style={[styles.label, { color: colors.inkSubtle }]}>{estado.label}</Text>
        </View>
        <View
          style={[
            styles.chip,
            {
              backgroundColor: estado.chipBg,
              borderColor: estado.chipBorder,
            },
          ]}
        >
          <Text style={[styles.chipTexto, { color: estado.chipText }]}>{estado.detalle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  rail: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 44,
  },
  cuerpo: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.sm,
  },
  arriba: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placa: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...type.label, flexShrink: 1 },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipTexto: {
    fontFamily: font.semibold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
});
