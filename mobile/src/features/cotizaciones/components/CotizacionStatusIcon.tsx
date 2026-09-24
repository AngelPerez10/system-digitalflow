import React from 'react';
import { IconCheck, IconClock, IconClose } from '@/components/icons';
import type { CotizacionStatus } from '@/types/cotizacion';

/** Un glifo por estatus de cotización (secciones del listado, selector de estatus). */
export function CotizacionStatusIcon({
  status,
  color,
  size = 13,
}: {
  status: CotizacionStatus;
  color: string;
  size?: number;
}) {
  if (status === 'AUTORIZADA') return <IconCheck color={color} size={size} />;
  if (status === 'CANCELADA') return <IconClose color={color} size={size} />;
  return <IconClock color={color} size={size} />;
}
