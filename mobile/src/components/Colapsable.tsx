import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  abierto: boolean;
  children: React.ReactNode;
}

/**
 * Abre y cierra un bloque animando su altura. Existe por el campo «Motivo de
 * la pausa» del formulario: aparecía y desaparecía de golpe al mover el
 * segmento de estatus, y el salto empujaba el resto del formulario sin avisar
 * de dónde había salido ese campo.
 *
 * El contenido se mide en posición absoluta a propósito: un hijo absoluto no
 * queda limitado por la altura del padre, así que informa su alto natural
 * incluso cuando el contenedor está cerrado a 0 px. Midiéndolo en flujo normal
 * la medición sería siempre la altura recortada y el bloque nunca abriría.
 *
 * `useNativeDriver: false` es obligado: `height` es una propiedad de layout y
 * el driver nativo solo interpola `opacity` y `transform`.
 */
export function Colapsable({ abierto, children }: Props) {
  const reduced = useReducedMotion();
  const [alto, setAlto] = useState(0);
  const progreso = useRef(new Animated.Value(abierto ? 1 : 0)).current;

  useEffect(() => {
    const destino = abierto ? 1 : 0;
    if (reduced) {
      progreso.setValue(destino);
      return;
    }
    const animacion = Animated.timing(progreso, {
      toValue: destino,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [abierto, progreso, reduced]);

  const medir = (event: LayoutChangeEvent) => {
    const medido = Math.round(event.nativeEvent.layout.height);
    if (medido > 0 && medido !== alto) setAlto(medido);
  };

  return (
    <Animated.View
      style={[
        styles.marco,
        {
          height: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, alto] }),
          opacity: progreso,
        },
      ]}
      // Cerrado no debe ser navegable por lector de pantalla ni por teclado.
      pointerEvents={abierto ? 'auto' : 'none'}
      accessibilityElementsHidden={!abierto}
      importantForAccessibility={abierto ? 'auto' : 'no-hide-descendants'}
    >
      <View style={styles.contenido} onLayout={medir}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  marco: { overflow: 'hidden' },
  contenido: { position: 'absolute', left: 0, right: 0, top: 0 },
});
