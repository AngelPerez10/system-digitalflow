import React from 'react';
import { IconCamera, IconCheck, IconClock } from '@/components/icons';
import type { EstadoEvidencia } from '../reporteFormat';

/** Sin evidencia → cámara (falta tomarlas); incompleto → reloj; completo → palomita. */
export function EstadoEvidenciaIcon({ estado, color, size = 14 }: { estado: EstadoEvidencia; color: string; size?: number }) {
  if (estado === 'sin') return <IconCamera color={color} size={size} />;
  if (estado === 'parcial') return <IconClock color={color} size={size} />;
  return <IconCheck color={color} size={size} />;
}
