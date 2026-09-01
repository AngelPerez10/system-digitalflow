import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { TipoOrden } from '@/types/orden';

/**
 * Set de íconos de la tarjeta de orden. Mismo trazo de 1.7 px con remates
 * redondeados que usa el resto del sistema (login, botones, campos) — un
 * solo lenguaje de línea, no una librería de iconografía suelta.
 */

interface IconProps {
  color: string;
  size?: number;
}

export function IconBuilding({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={3} width={12} height={18} rx={1} stroke={color} strokeWidth={1.7} />
      <Path d="M20 21V9l-4-2" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={7.5} y1={7} x2={7.5} y2={7.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1={12.5} y1={7} x2={12.5} y2={7.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1={7.5} y1={11} x2={7.5} y2={11.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1={12.5} y1={11} x2={12.5} y2={11.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1={7.5} y1={15} x2={7.5} y2={15.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1={12.5} y1={15} x2={12.5} y2={15.01} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPin({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.5S19 15 19 10a7 7 0 1 0-14 0c0 5 7 11.5 7 11.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.4} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function IconPhone({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 3.5h3l1.5 4-2 1.6a12 12 0 0 0 5.9 5.9l1.6-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconNote({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5h9l4.5 4.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M15 3.5V8h4.5" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Line x1={8} y1={12.5} x2={16} y2={12.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={8} y1={16} x2={13} y2={16} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPause({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={9} y1={5} x2={9} y2={19} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={15} y1={5} x2={15} y2={19} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCalendar({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={1.5} stroke={color} strokeWidth={1.7} />
      <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} stroke={color} strokeWidth={1.7} />
      <Line x1={8} y1={3} x2={8} y2={6.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={6.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconWrench({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a4 4 0 0 0-5.4 4.9L3.5 17l3 3 5.8-5.8a4 4 0 0 0 4.9-5.4l-2.8 2.8-2.5-.5-.5-2.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPerson({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={1.7} />
      <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconComment({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.5 4V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Line x1={7.5} y1={9.5} x2={16.5} y2={9.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={7.5} y1={13} x2={13} y2={13} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconClipboard({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={4.5} width={14} height={16.5} rx={1.5} stroke={color} strokeWidth={1.7} />
      <Path d="M9 4.5V3.7a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 3.7v.8" stroke={color} strokeWidth={1.7} />
      <Line x1={8.5} y1={11} x2={15.5} y2={11} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={8.5} y1={14.7} x2={15.5} y2={14.7} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={8.5} y1={18.4} x2={12.5} y2={18.4} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLevantamiento({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20.5 20.5 4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M14.5 4h6v6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconInstalacion({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={9} rx={1.2} stroke={color} strokeWidth={1.7} />
      <Path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCamera({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13.5} r={3.4} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function IconSignature({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 16.5c2-4.5 3.6-8 5-8 1.2 0 1.2 3.4 2.4 3.4 1.4 0 3.6-4.9 5-4.9 1 0 .6 3.3 1.6 3.3 1 0 1.7-1.1 3-1.1"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={3.5} y1={20} x2={20.5} y2={20} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBox({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4v-9Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M3.5 7.5 12 11.5l8.5-4" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Line x1={12} y1={11.5} x2={12} y2={20.5} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function IconClock({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
      <Path d="M12 7.5V12l3.2 2" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconVisto({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
      <Path d="M8.3 12.3 10.7 14.7 15.7 9.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconAlerta({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Line x1={12} y1={9.5} x2={12} y2={13.7} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={12} y1={16.6} x2={12} y2={16.61} stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

/** Estrella de calificación. `relleno` la pinta sólida (seleccionada). */
export function IconEstrella({
  color,
  size = 28,
  relleno = false,
}: IconProps & { relleno?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.72l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86L12 3.2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill={relleno ? color : 'none'}
      />
    </Svg>
  );
}

export function IconFlecha({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** El ícono de avatar de cada tarjeta cambia con el tipo de orden. */
export function TipoOrdenIcon({ tipo, color, size }: IconProps & { tipo: TipoOrden }) {
  if (tipo === 'levantamiento') return <IconLevantamiento color={color} size={size} />;
  if (tipo === 'instalaciones') return <IconInstalacion color={color} size={size} />;
  return <IconWrench color={color} size={size} />;
}
