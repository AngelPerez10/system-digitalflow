import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing } from '@/theme/tokens';

interface Props {
  urls: string[];
}

const COLUMNAS = 2;
const HUECO = spacing.sm;

/**
 * Cuadrícula de miniaturas de la orden con visor de pantalla completa al
 * tocar (`useVisorFotos`, compartido con el resto de vistas de fotos —
 * firmas, bitácora, equipos) — antes `fotos_urls` llegaba de la API y no se
 * mostraba en ningún lado.
 *
 * Dos columnas, no tres: con tres la miniatura quedaba casi un ícono —
 * pocas fotos por orden (5–10), así que el tamaño importa más que la
 * densidad.
 */
export function FotosGaleria({ urls }: Props) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();

  if (urls.length === 0) return null;

  return (
    <>
      <View style={styles.grid}>
        {urls.map((url, index) => (
          <Pressable
            key={`${url}-${index}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Ver foto ${index + 1} de ${urls.length}`}
            onPress={() => abrir(urls, index)}
            style={styles.miniaturaTouch}
          >
            <Image
              source={{ uri: url }}
              style={[
                styles.miniatura,
                { backgroundColor: colors.surfaceSunken },
                elevationFor(colors, 'panel'),
              ]}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>

      {visor}
    </>
  );
}

const styles = StyleSheet.create({
  // El hueco lo pone el `padding` de cada celda, no un `gap` en la fila: con las
  // dos cosas juntas, 50 % + 50 % + gap pasa del ancho disponible y `flexWrap`
  // manda cada miniatura a su propio renglón. El margen negativo compensa ese
  // padding para que la cuadrícula quede a ras de la tarjeta.
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -HUECO / 2 },
  miniaturaTouch: {
    width: `${100 / COLUMNAS}%`,
    aspectRatio: 4 / 3,
    padding: HUECO / 2,
  },
  miniatura: {
    flex: 1,
    borderRadius: radius.md,
  },
});
