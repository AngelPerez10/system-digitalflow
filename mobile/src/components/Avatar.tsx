import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';

interface Props {
  /** URL de la foto. Si falta o no carga, se muestran las iniciales. */
  uri?: string | null;
  /** Texto para las iniciales (1–2 letras ya calculadas). */
  iniciales: string;
  size?: number;
  /** Fondo del círculo de iniciales. Por defecto, un tinte del acento. */
  fondo?: string;
  /** Color de las iniciales. */
  color?: string;
  /** Borde — útil sobre superficies oscuras (cabecera marina). */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar circular: foto si hay, iniciales si no (o si la imagen falla). Dimensión
 * fija siempre para no provocar salto de layout al cargar la imagen remota.
 */
export function Avatar({ uri, iniciales, size = 44, fondo, color, borderColor, style }: Props) {
  const { colors } = useTheme();
  const [fallo, setFallo] = useState(false);
  const mostrarFoto = Boolean(uri) && !fallo;

  const caja: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: borderColor ? 1 : 0,
    borderColor,
  };

  return (
    <View
      style={[styles.base, caja, { backgroundColor: fondo ?? colors.primaryRing }, style]}
      accessibilityRole="image"
    >
      {mostrarFoto ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={() => setFallo(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[
            styles.iniciales,
            { color: color ?? colors.primary, fontSize: Math.round(size * 0.38) },
          ]}
          allowFontScaling={false}
        >
          {iniciales}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iniciales: { fontFamily: font.semibold, letterSpacing: 0.5 },
});
