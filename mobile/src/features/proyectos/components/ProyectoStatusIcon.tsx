import React from 'react';
import type { ProyectoStatus } from '@/types/proyecto';
import { IconAlerta, IconPause, IconVisto, IconWrench } from '@/features/orders/components/icons';

/** Un glifo por estatus — misma idea que `STATUS_ICON` en `OrdenDetalleHero`. */
export function ProyectoStatusIcon({ status, color, size = 14 }: { status: ProyectoStatus; color: string; size?: number }) {
  switch (status) {
    case 'pausado':
      return <IconPause color={color} size={size} />;
    case 'cerrado':
      return <IconVisto color={color} size={size} />;
    case 'cancelado':
      return <IconAlerta color={color} size={size} />;
    case 'en_proceso':
    default:
      return <IconWrench color={color} size={size} />;
  }
}
