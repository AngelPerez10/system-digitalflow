import React from 'react';
import { ReportePdf } from '@/components/ReportePdf';
import type { Orden } from '@/types/orden';
import { folioDisplay } from '../ordenFormat';

interface Props {
  orden: Pick<Orden, 'id' | 'folio' | 'idx' | 'status' | 'telefono_cliente'>;
}

/**
 * Reporte PDF de la orden. Enviarlo al cliente solo aplica a órdenes
 * resueltas, igual que en el ERP (el backend también lo exige para el correo).
 */
export function OrdenPdfAcciones({ orden }: Props) {
  const folio = folioDisplay(orden);
  const resuelta = orden.status === 'resuelto';
  return (
    <ReportePdf
      base={`/ordenes/${orden.id}`}
      nombreArchivo={`Orden_${folio}.pdf`}
      meta={`Reporte de servicio · ${resuelta ? 'Listo para enviar' : 'Orden en curso'}`}
      documento={`el reporte de servicio ${folio}`}
      telefono={orden.telefono_cliente}
      puedeEnviar={resuelta}
      notaSinEnvio="Podrás enviarlo al cliente cuando la orden esté resuelta."
    />
  );
}
