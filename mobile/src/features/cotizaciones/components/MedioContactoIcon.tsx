import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ThemeColors } from '@/theme/tokens';
import type { MedioContacto } from '@/types/cotizacion';

/**
 * Colores de marca de las redes: se usan tal cual (como `WHATSAPP_VERDE`)
 * porque el usuario reconoce la red por su color, en claro y en oscuro.
 */
const MARCA = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  maps: '#34A853',
} as const;

export interface GrupoMedios {
  titulo: string;
  medios: MedioContacto[];
}

/** Medios agrupados por canal, en el orden en que se muestran en el selector. */
export const GRUPOS_MEDIO_CONTACTO: GrupoMedios[] = [
  { titulo: 'Directo', medios: ['CLIENTE', 'REFERIDO', 'BNI', 'TIENDA_FISICA'] },
  { titulo: 'En línea', medios: ['WEB', 'TIENDA_ONLINE', 'GOOGLE_MAPS'] },
  { titulo: 'Redes sociales', medios: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE'] },
];

export function grupoDeMedio(medio: MedioContacto): string {
  return GRUPOS_MEDIO_CONTACTO.find((g) => g.medios.includes(medio))?.titulo ?? '';
}

/** Placa (fondo) y trazo de cada medio. Las redes van sobre fondo neutro con su color de marca. */
export function tonoMedio(medio: MedioContacto, colors: ThemeColors): { bg: string; fg: string } {
  switch (medio) {
    case 'CLIENTE':
      return { bg: colors.statusResueltoBg, fg: colors.statusResueltoText };
    case 'REFERIDO':
      return { bg: colors.goldSoftBg, fg: colors.goldSoftText };
    case 'BNI':
      return { bg: colors.statusPausadoBg, fg: colors.statusPausadoText };
    case 'TIENDA_FISICA':
      return { bg: colors.roseBg, fg: colors.roseText };
    case 'WEB':
    case 'TIENDA_ONLINE':
      return { bg: colors.primaryRing, fg: colors.primary };
    case 'GOOGLE_MAPS':
      return { bg: colors.surfaceSunken, fg: MARCA.maps };
    case 'FACEBOOK':
      return { bg: colors.surfaceSunken, fg: MARCA.facebook };
    case 'INSTAGRAM':
      return { bg: colors.surfaceSunken, fg: MARCA.instagram };
    case 'YOUTUBE':
      return { bg: colors.surfaceSunken, fg: MARCA.youtube };
    case 'TIKTOK':
      return { bg: colors.surfaceSunken, fg: colors.ink };
  }
}

const trazo = { strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Icono de cada medio de contacto, con el mismo trazo que `components/icons`. */
export function MedioContactoIcon({ medio, color, size = 18 }: { medio: MedioContacto; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {dibujo(medio, color)}
    </Svg>
  );
}

function dibujo(medio: MedioContacto, c: string) {
  switch (medio) {
    case 'CLIENTE':
      return (
        <>
          <Circle cx={12} cy={8} r={3.6} stroke={c} {...trazo} />
          <Path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" stroke={c} {...trazo} />
        </>
      );
    case 'REFERIDO':
      return (
        <>
          <Circle cx={9} cy={8.5} r={3.2} stroke={c} {...trazo} />
          <Path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" stroke={c} {...trazo} />
          <Path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.9.6 3.1 2.2 3.5 4.7" stroke={c} {...trazo} />
        </>
      );
    case 'BNI':
      return (
        <>
          <Circle cx={12} cy={5.5} r={2.3} stroke={c} {...trazo} />
          <Circle cx={5.5} cy={17.5} r={2.3} stroke={c} {...trazo} />
          <Circle cx={18.5} cy={17.5} r={2.3} stroke={c} {...trazo} />
          <Path d="M10.8 7.5 6.7 15.5M13.2 7.5l4.1 8M7.8 17.5h8.4" stroke={c} {...trazo} />
        </>
      );
    case 'TIENDA_FISICA':
      return (
        <>
          <Path d="M4 9.5 5.5 4h13L20 9.5" stroke={c} {...trazo} />
          <Path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" stroke={c} {...trazo} />
          <Path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" stroke={c} {...trazo} />
        </>
      );
    case 'WEB':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} stroke={c} {...trazo} />
          <Path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" stroke={c} {...trazo} />
        </>
      );
    case 'TIENDA_ONLINE':
      return (
        <>
          <Path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" stroke={c} {...trazo} />
          <Circle cx={9.5} cy={19.5} r={1.3} stroke={c} {...trazo} />
          <Circle cx={17} cy={19.5} r={1.3} stroke={c} {...trazo} />
        </>
      );
    case 'GOOGLE_MAPS':
      return (
        <>
          <Path d="M12 21.5S19 15 19 10a7 7 0 1 0-14 0c0 5 7 11.5 7 11.5Z" stroke={c} {...trazo} />
          <Circle cx={12} cy={10} r={2.4} fill={c} />
        </>
      );
    case 'FACEBOOK':
      return (
        <>
          <Circle cx={12} cy={12} r={9.5} fill={c} />
          <Path
            d="M13.2 21.4v-6.6h2.2l.4-2.6h-2.6v-1.7c0-.8.4-1.5 1.6-1.5h1.1V6.8s-1-.2-2-.2c-2 0-3.3 1.2-3.3 3.4v2.2H8.4v2.6h2.2v6.6"
            fill="#FFFFFF"
          />
        </>
      );
    case 'INSTAGRAM':
      return (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={5} stroke={c} {...trazo} strokeWidth={1.9} />
          <Circle cx={12} cy={12} r={3.9} stroke={c} {...trazo} strokeWidth={1.9} />
          <Circle cx={17} cy={7} r={1.1} fill={c} />
        </>
      );
    case 'TIKTOK':
      return (
        <Path
          d="M14.2 3.5v11.3a3.6 3.6 0 1 1-3.6-3.6M14.2 3.5c.4 2.6 2.2 4.4 5 4.7"
          stroke={c}
          {...trazo}
          strokeWidth={2}
        />
      );
    case 'YOUTUBE':
      return (
        <>
          <Rect x={2} y={5.5} width={20} height={13} rx={4} fill={c} />
          <Path d="M10 9v6l5.2-3L10 9Z" fill="#FFFFFF" />
        </>
      );
  }
}
