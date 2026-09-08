import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { evaluarContrasena, type NivelFuerza } from './passwordPolicy';

interface Props {
  /** La contraseña nueva que se está escribiendo. */
  valor: string;
  /** El campo «repite la nueva» — para el resumen de coincidencia. */
  confirmar?: string;
  /** La contraseña temporal del correo — la nueva no puede ser esa. */
  tempPassword?: string;
}

function Palomita({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5 10 17l9-10"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SEGMENTOS = 4;

/**
 * Medidor de fuerza + lista de requisitos para la contraseña nueva.
 *
 * Diseño sobrio, a tono con el resto del acceso: una barra segmentada, una
 * etiqueta y una lista corta. Los requisitos obligatorios (los que habilitan
 * el botón) van primero; las sugerencias, atenuadas debajo. No hay animación
 * — la barra cambia de color al instante para no distraer mientras se teclea.
 */
export function FuerzaContrasena({ valor, confirmar = '', tempPassword = '' }: Props) {
  const { colors } = useTheme();
  const evaluacion = useMemo(
    () => evaluarContrasena(valor, { confirmar, tempPassword }),
    [valor, confirmar, tempPassword],
  );

  const colorPorNivel = (nivel: NivelFuerza): string => {
    if (nivel <= 1) return colors.danger;
    if (nivel === 2) return colors.gold;
    if (nivel === 3) return colors.primary;
    return colors.success;
  };
  const tono = colorPorNivel(evaluacion.nivel);

  const obligatorios = evaluacion.requisitos.filter((r) => r.requerido);
  const sugerencias = evaluacion.requisitos.filter((r) => !r.requerido);

  return (
    <View style={styles.wrap}>
      <View style={styles.barra} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: SEGMENTOS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segmento,
              { backgroundColor: i < evaluacion.nivel ? tono : colors.line },
            ]}
          />
        ))}
      </View>

      <Text
        style={[styles.etiqueta, { color: tono }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
      >
        Seguridad: {evaluacion.etiqueta}
      </Text>

      <View style={styles.lista}>
        {obligatorios.map((req) => (
          <View key={req.id} style={styles.fila}>
            <View
              style={[
                styles.marca,
                req.cumplido
                  ? { backgroundColor: colors.success, borderColor: colors.success }
                  : { backgroundColor: 'transparent', borderColor: colors.lineStrong },
              ]}
            >
              {req.cumplido ? <Palomita color={colors.onPrimary} /> : null}
            </View>
            <Text style={[styles.texto, { color: req.cumplido ? colors.inkMuted : colors.ink }]}>
              {req.label}
            </Text>
          </View>
        ))}

        {sugerencias.map((req) => (
          <View key={req.id} style={styles.fila}>
            <View
              style={[
                styles.marca,
                styles.marcaSuave,
                req.cumplido
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: 'transparent', borderColor: colors.line },
              ]}
            >
              {req.cumplido ? <Palomita color={colors.onPrimary} /> : null}
            </View>
            <Text style={[styles.texto, styles.textoSuave, { color: colors.inkSubtle }]}>
              {req.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.xs },
  barra: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 4, borderRadius: radius.pill },
  etiqueta: {
    ...type.caption,
    fontSize: 11,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lista: { gap: spacing.xs, marginTop: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marca: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaSuave: { width: 14, height: 14 },
  texto: { ...type.caption, flex: 1, lineHeight: 17 },
  textoSuave: { fontSize: 12 },
});
