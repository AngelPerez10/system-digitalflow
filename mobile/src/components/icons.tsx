import React from 'react';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Íconos genéricos de interfaz — sin acoplamiento a ningún dominio (orden,
 * proyecto, etc). Mismo trazo de 1.7–2 px con remates redondeados en todo el
 * sistema, para que la línea se lea como un solo lenguaje visual.
 *
 * Íconos que sí dependen de un tipo de dominio (p. ej. `TipoOrdenIcon`, que
 * recibe un `TipoOrden`) viven en el `components/icons.tsx` de su propia
 * feature, no aquí — ver `src/features/orders/components/icons.tsx`.
 */

interface IconProps {
  color: string;
  size?: number;
}
/** Flecha genérica (encabezado de mes, volver en las cabeceras marinas, chevrons de fila). */
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

/** Nace en el visor de fotos de detalle. */
export function IconClose({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={5.5} y1={5.5} x2={18.5} y2={18.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={18.5} y1={5.5} x2={5.5} y2={18.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
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

/** Nace en `LocationMapModal` (botón «Usar esta ubicación»). */
export function IconCheck({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5 9.5 17.5 19.5 6.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Editar (lápiz). */
export function IconEditar({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m13.5 6.5 4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Ampliar / ver en grande (miniaturas de firma y fotos). */
export function IconExpand({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4H20v5.5M9.5 20H4v-5.5M20 4l-6.5 6.5M4 20l6.5-6.5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Botón «usar mi ubicación» (GPS) en `LocationMapModal` — mismo símbolo que Google Maps. */
export function IconLocateMe({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} />
      <Line x1={12} y1={2} x2={12} y2={5.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={12} y1={18.5} x2={12} y2={22} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={2} y1={12} x2={5.5} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={18.5} y1={12} x2={22} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Restablecer / reintentar. Nace en `LocationMapModal» (volver a la ubicación original). */
export function IconRefresh({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 11.5A8 8 0 1 0 17.8 17"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M20 5.5v6h-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Documento con flecha hacia abajo. Nace en las acciones del PDF de la orden. */
export function IconDescarga({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 19.5h14" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

/** Sobre. Nace en «Enviar por correo». */
export function IconCorreo({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5.5} width={17} height={13} rx={2.5} stroke={color} strokeWidth={1.8} />
      <Path d="m4.5 7 7.5 6 7.5-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Documento. Nace en el encabezado de «Reporte PDF». */
export function IconDocumento({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8L14 3.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Verde de marca de WhatsApp: el logo se reconoce por su color, no se tiñe con el tema. */
export const WHATSAPP_VERDE = '#25D366';

/** Logo de WhatsApp (glifo de Simple Icons, CC0). */
export function IconWhatsApp({ color = WHATSAPP_VERDE, size = 18 }: Partial<IconProps>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
      />
    </Svg>
  );
}

/**
 * Archivo PDF: hoja con esquina doblada y la banda roja con «PDF». Colores
 * fijos del tema (`danger*`) llegan por props para respetar claro/oscuro.
 */
export function IconArchivoPdf({
  hoja,
  borde,
  banda,
  texto,
  size = 44,
}: {
  hoja: string;
  borde: string;
  banda: string;
  texto: string;
  size?: number;
}) {
  return (
    <Svg width={(size * 36) / 44} height={size} viewBox="0 0 36 44" fill="none">
      <Path d="M4 1.5h19L34.5 13v27a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 40V4A2.5 2.5 0 0 1 4 1.5Z" fill={hoja} stroke={borde} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M23 1.5V10.5A2.5 2.5 0 0 0 25.5 13h9" stroke={borde} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={0} y={22} width={27} height={13} rx={2.5} fill={banda} />
      <SvgText x={13.5} y={31.6} fill={texto} fontSize={9} fontWeight="700" textAnchor="middle" letterSpacing={0.4}>
        PDF
      </SvgText>
      <Line x1={8} y1={8} x2={17} y2={8} stroke={borde} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={13} x2={19} y2={13} stroke={borde} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Bote de basura. Nace en «Quitar partida». */
export function IconBasura({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 7l.8 11.3c.1 1 .9 1.7 1.9 1.7h5.6c1 0 1.8-.7 1.9-1.7L17.5 7M10.3 11v5M13.7 11v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Más. Nace en el control de cantidad. */
export function IconMas({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Menos. Nace en el control de cantidad. */
export function IconMenos({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Etiqueta. Nace en las categorías de partidas y la clasificación. */
export function IconEtiqueta({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 12.3V5a1.5 1.5 0 0 1 1.5-1.5h7.3a1.5 1.5 0 0 1 1.06.44l7.2 7.2a1.5 1.5 0 0 1 0 2.12l-7.3 7.3a1.5 1.5 0 0 1-2.12 0l-7.2-7.2a1.5 1.5 0 0 1-.44-1.06Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={8.3} cy={8.3} r={1.4} fill={color} />
    </Svg>
  );
}
