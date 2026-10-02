import React, { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState } from '@/components/StateViews';
import { ReporteFormulario } from '@/features/reportes/components/ReporteFormulario';
import { DetalleReporteSkeleton } from '@/features/reportes/components/ReporteSkeletons';
import { formStateDesdeReporte } from '@/features/reportes/editarReporteForm';
import { folioReporte } from '@/features/reportes/reporteFormat';
import { usePermisosReportes } from '@/features/reportes/usePermisosReportes';
import { useReporte } from '@/features/reportes/useReporte';
import type { Reporte } from '@/types/reporte';

/** Editar un reporte: carga el detalle completo y monta el formulario cuando llega. */
export default function EditarReporteScreen() {
  const { editar } = usePermisosReportes();
  if (!editar) return <ErrorState message="Tu cuenta no tiene permiso para editar reportes de mantenimiento." />;
  return <CargarFormulario />;
}

function CargarFormulario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporteId = Number(id);
  const { reporte, cargando, error, recargar } = useReporte(Number.isFinite(reporteId) ? reporteId : null);

  // Solo la primera carga muestra el esqueleto: una recarga al recuperar el foco no debe
  // desmontar el formulario (se perdería lo capturado).
  if (!reporte && (cargando || !error)) return <DetalleReporteSkeleton />;
  if (!reporte) return <ErrorState message={error ?? 'Reporte no encontrado.'} onRetry={recargar} />;
  // `key`: si el reporte cambia (otro id), el formulario arranca de cero.
  return <Formulario key={reporte.id} reporte={reporte} />;
}

function Formulario({ reporte }: { reporte: Reporte }) {
  const router = useRouter();
  // El estado inicial se toma una sola vez: recargas en segundo plano no pisan lo capturado.
  const inicial = useMemo(() => formStateDesdeReporte(reporte), [reporte.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Stack.Screen options={{ title: `Editar ${folioReporte(reporte)}`, headerShown: false }} />
      {/* El detalle se recarga solo al recuperar el foco (useEntityDetail). */}
      <ReporteFormulario reporte={reporte} inicial={inicial} onGuardado={() => router.back()} />
    </>
  );
}
