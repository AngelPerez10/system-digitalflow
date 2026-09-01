import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

/** Sol — modo claro activo / acción «pasar a claro». */
export function IconSun({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Luna — modo oscuro activo / acción «pasar a oscuro». */
export function IconMoon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 13.5A7.5 7.5 0 1 1 10.5 4 6 6 0 0 0 20 13.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
