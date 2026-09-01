import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { MOTION } from '@/theme/tokens';
import { useReducedMotion } from './useReducedMotion';

/**
 * Entrada escalonada compartida: cada bloque sube unos px y aparece.
 * Sutil a propósito (Operate): no es un «show» de marketing.
 *
 * No usar por fila en listas largas.
 */
export function useEntrance(steps: number) {
  const reduced = useReducedMotion();
  const progress = useRef(Array.from({ length: steps }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduced) {
      progress.forEach((value) => value.setValue(1));
      return;
    }
    const animacion = Animated.stagger(
      MOTION.stagger,
      progress.map((value) =>
        Animated.spring(value, {
          toValue: 1,
          friction: 10,
          tension: 72,
          useNativeDriver: true,
        }),
      ),
    );
    animacion.start();
    return () => animacion.stop();
  }, [progress, reduced]);

  return (index: number) => ({
    opacity: progress[index] ?? 1,
    transform: [
      {
        translateY:
          progress[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: [MOTION.entranceY, 0],
          }) ?? 0,
      },
    ],
  });
}
