import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconNote } from '@/components/icons';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { ProyectoNotaDia } from '@/types/proyecto';
import { partesFecha } from './JornadasCalendario';

const FOTO = 72;

/**
 * Bitácora como línea de tiempo: un punto por jornada unido por una línea,
 * con la fecha de la jornada (si coincide con `fechas_inicio`), la nota y
 * sus fotos. La última jornada con contenido va resaltada.
 */
export function BitacoraTimeline({ notas, fechas }: { notas: ProyectoNotaDia[]; fechas: string[] }) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();
  const ordenadas = [...fechas].filter(Boolean).sort();
  const entradas = notas
    .map((nota, index) => ({ nota, index }))
    .filter(({ nota }) => nota.nota.trim() || nota.imagenesUrls.length > 0);

  if (entradas.length === 0) {
    return (
      <View style={[styles.vacio, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.vacioIcono, { backgroundColor: colors.surfaceSunken }]}>
          <IconNote color={colors.inkSubtle} size={20} />
        </View>
        <Text style={[styles.vacioTitulo, { color: colors.ink }]}>Sin notas todavía</Text>
        <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>
          Las notas y fotos de cada jornada aparecen aquí al editar el proyecto.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {entradas.map(({ nota, index }, i) => {
        const ultima = i === entradas.length - 1;
        const fecha = ordenadas[index] ? partesFecha(ordenadas[index]!) : null;
        return (
          <View key={nota.id} style={styles.entrada}>
            <View style={styles.riel}>
              <View
                style={[
                  styles.punto,
                  ultima
                    ? { backgroundColor: colors.primary, borderColor: colors.primaryRing }
                    : { backgroundColor: colors.surface, borderColor: colors.lineStrong },
                ]}
              />
              {!ultima ? <View style={[styles.linea, { backgroundColor: colors.line }]} /> : null}
            </View>
            <View
              style={[
                styles.tarjeta,
                { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') },
              ]}
            >
              <View style={styles.cabeza}>
                <Text style={[styles.dia, { color: ultima ? colors.primary : colors.ink }]}>Día {index + 1}</Text>
                {fecha ? (
                  <Text style={[styles.fecha, { color: colors.inkSubtle }]}>
                    {fecha.dia} {fecha.numero} {fecha.mes}
                  </Text>
                ) : null}
              </View>
              {nota.nota.trim() ? (
                <Text style={[styles.nota, { color: colors.ink }]}>{nota.nota.trim()}</Text>
              ) : null}
              {nota.imagenesUrls.length > 0 ? (
                <View style={styles.fotos}>
                  {nota.imagenesUrls.map((url, j) => (
                    <Pressable
                      key={`${url}-${j}`}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`Ver foto ${j + 1} del día ${index + 1}`}
                      onPress={() => abrir(nota.imagenesUrls, j)}
                      style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
                    >
                      <Image
                        source={{ uri: url }}
                        style={[styles.foto, { backgroundColor: colors.surfaceSunken }]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      {visor}
    </View>
  );
}

const styles = StyleSheet.create({
  entrada: { flexDirection: 'row', gap: spacing.md },
  riel: { width: 16, alignItems: 'center' },
  punto: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: spacing.lg },
  linea: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  tarjeta: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  dia: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2 },
  fecha: { ...type.mono, fontSize: 12 },
  nota: { ...type.body, lineHeight: 22 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  foto: { width: FOTO, height: FOTO, borderRadius: radius.md },
  vacio: { alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  vacioIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 15 },
  vacioTexto: { ...type.caption, textAlign: 'center' },
});
