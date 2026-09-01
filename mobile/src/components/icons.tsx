import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';

/**
 * Íconos genéricos de interfaz (no específicos del dominio de órdenes). Mismo
 * trazo de 2 px con remates redondeados que el resto del sistema.
 */

interface IconProps {
  color: string;
  size?: number;
}

/** Nace en `MesSelector`; se comparte porque el hero de detalle de orden
 *  también necesita una flecha (volver), en blanco sobre navy. */
export function IconChevron({ color, size = 18, direction }: IconProps & { direction: 'left' | 'right' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={direction === 'left' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Nace en el visor de fotos de detalle de orden. */
export function IconClose({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={5.5} y1={5.5} x2={18.5} y2={18.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={18.5} y1={5.5} x2={5.5} y2={18.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
