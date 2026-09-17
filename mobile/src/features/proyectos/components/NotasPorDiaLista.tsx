import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { ProyectoNotaDia } from '@/types/proyecto';

const FOTO_TAM = 56;

export function NotasPorDiaLista({ notas }: { notas: ProyectoNotaDia[] }) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();
  const conContenido = notas.filter((n) => n.nota.trim() || n.imagenesUrls.length > 0);

  if (conContenido.length === 0) {
    return <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Aún no hay notas de bitácora.</Text>;
  }

  return (
    <View style={styles.lista}>
      {notas.map((nota, index) => {
        if (!nota.nota.trim() && nota.imagenesUrls.length === 0) return null;
        return (
          <View key={nota.id} style={[styles.dia, { borderColor: colors.line }]}>
            <Text style={[styles.diaTitulo, { color: colors.inkSubtle }]}>Día {index + 1}</Text>
            {nota.nota.trim() ? (
              <Text style={[styles.nota, { color: colors.ink }]}>{nota.nota.trim()}</Text>
            ) : null}
            {nota.imagenesUrls.length > 0 ? (
              <View style={styles.fotos}>
                {nota.imagenesUrls.map((url, i) => (
                  <Pressable
                    key={`${url}-${i}`}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Ver foto ${i + 1} del día ${index + 1}`}
                    onPress={() => abrir(nota.imagenesUrls, i)}
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
        );
      })}
      {visor}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  dia: { borderLeftWidth: 2, paddingLeft: spacing.md, gap: spacing.xs },
  diaTitulo: { ...type.caption, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  nota: { ...type.body, lineHeight: 21 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foto: { width: FOTO_TAM, height: FOTO_TAM, borderRadius: radius.sm },
  vacio: { ...type.body },
});
