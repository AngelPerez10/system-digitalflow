import React from 'react';
import type { ProyectoStatus } from '@/types/proyecto';
import { IconAlerta, IconEtiqueta, IconPause, IconVisto, IconWrench } from '@/components/icons';

/** Un glifo por estatus — misma idea que `STATUS_ICON` en `OrdenDetalleHeader`. */
export function ProyectoStatusIcon({ status, color, size = 14 }: { status: ProyectoStatus; color: string; size?: number }) {
  switch (status) {
    case 'pausado':
      return <IconPause color={color} size={size} />;
    case 'saldo_pendiente':
      return <IconEtiqueta color={color} size={size} />;
    case 'cerrado':
      return <IconVisto color={color} size={size} />;
    case 'cancelado':
      return <IconAlerta color={color} size={size} />;
    case 'en_proceso':
    default:
      return <IconWrench color={color} size={size} />;
  }
}
