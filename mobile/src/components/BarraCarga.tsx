import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/utils/useReducedMotion';

const ALTO = 3;
const ANCHO_SEGMENTO_FRACCION = 0.35;

/**
 * Línea de progreso indeterminada: un segmento azul que barre de un lado a
 * otro en bucle.
 */
export function BarraCarga({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const barrido = useRef(new Animated.Value(0)).current;
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    if (!visible || reduced || ancho === 0) return;
    barrido.setValue(0);
    const animacion = Animated.loop(
      Animated.timing(barrido, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => animacion.stop();
  }, [visible, reduced, ancho, barrido]);

  const medir = (event: LayoutChangeEvent) => setAncho(event.nativeEvent.layout.width);

  if (!visible) return <View style={styles.espacio} />;

  const anchoSegmento = ancho * ANCHO_SEGMENTO_FRACCION;
  const translateX = barrido.interpolate({
    inputRange: [0, 1],
    outputRange: [-anchoSegmento, ancho],
  });

  return (
    <View
      style={[styles.pista, { backgroundColor: colors.line }]}
      onLayout={medir}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
    >
      {reduced ? (
        <View
          style={[
            styles.segmento,
            { backgroundColor: colors.primary, width: `${ANCHO_SEGMENTO_FRACCION * 100}%`, left: '32%' },
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.segmento,
            { backgroundColor: colors.primary, width: anchoSegmento, transform: [{ translateX }] },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  espacio: { height: ALTO },
  pista: {
    height: ALTO,
    borderRadius: ALTO / 2,
    overflow: 'hidden',
  },
  segmento: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: ALTO / 2,
  },
});
