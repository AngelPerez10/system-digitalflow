import React, { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { actualizarCotizacion } from '@/api/cotizacionesApi';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule, isAdmin } from '@/auth/permissions';
import { ErrorState } from '@/components/StateViews';
import { folioDisplay } from '@/features/cotizaciones/cotizacionFormat';
import { formDesdeCotizacion } from '@/features/cotizaciones/cotizacionForm';
import { CotizacionFormulario } from '@/features/cotizaciones/components/CotizacionFormulario';
import { EditarCotizacionSkeleton } from '@/features/cotizaciones/components/CotizacionSkeletons';
import { useCotizacion } from '@/features/cotizaciones/useCotizaciones';

/** Editar cotización: solo con permiso de `edit`. Parte del detalle completo (con conceptos). */
export default function EditarCotizacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cotizacionId = Number(id);
  const { cotizacion, cargando, error, recargar, aplicarCotizacion } = useCotizacion(
    Number.isFinite(cotizacionId) ? cotizacionId : null,
  );
  const { user, permissions } = useSession();
  const inicial = useMemo(() => (cotizacion ? formDesdeCotizacion(cotizacion) : null), [cotizacion]);

  if (!canEditModule(permissions, user, 'cotizaciones')) {
    return <ErrorState message="Tu cuenta no puede editar cotizaciones." onRetry={() => router.back()} />;
  }
  if (cargando && !cotizacion) return <EditarCotizacionSkeleton />;
  if (error || !cotizacion || !inicial) {
    return <ErrorState message={error ?? 'Cotización no encontrada.'} onRetry={recargar} />;
  }

  const folio = folioDisplay(cotizacion);
  return (
    <>
      <Stack.Screen options={{ title: `Editar ${folio}`, headerShown: false }} />
      <CotizacionFormulario
        // Se monta una sola vez con el detalle cargado; un recargo por foco no pisa lo capturado.
        key={cotizacion.id}
        modo="editar"
        folio={folio}
        inicial={inicial}
        esAdmin={isAdmin(user)}
        categorias={cotizacion.categorias_productos}
        onGuardar={async (payload) => {
          const guardada = await actualizarCotizacion(cotizacion.id, payload);
          aplicarCotizacion(guardada);
          router.back();
        }}
        onSalir={() => router.back()}
      />
    </>
  );
}
