import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { IconWrench } from '@/components/icons';
import type { TipoOrden } from '@/types/orden';

/** Reexporta el set genérico — el resto de este módulo aún importa `./icons`
 *  por costumbre histórica; los íconos sin dominio viven en
 *  `@/components/icons` y los nuevos consumidores deben importar de ahí. */
export * from '@/components/icons';

interface IconProps {
  color: string;
  size?: number;
}

function IconLevantamiento({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20.5 20.5 4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M14.5 4h6v6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconInstalacion({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={9} rx={1.2} stroke={color} strokeWidth={1.7} />
      <Path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** El ícono de avatar de cada tarjeta cambia con el tipo de orden. */
export function TipoOrdenIcon({ tipo, color, size }: IconProps & { tipo: TipoOrden }) {
  if (tipo === 'levantamiento') return <IconLevantamiento color={color} size={size} />;
  if (tipo === 'instalaciones') return <IconInstalacion color={color} size={size} />;
  return <IconWrench color={color} size={size} />;
}
