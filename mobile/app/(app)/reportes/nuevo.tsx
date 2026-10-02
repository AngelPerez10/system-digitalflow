import React, { useState } from 'react';
import { Stack, useRouter, type Href } from 'expo-router';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { ErrorState } from '@/components/StateViews';
import { usePermisosReportes } from '@/features/reportes/usePermisosReportes';
import { ReporteFormulario } from '@/features/reportes/components/ReporteFormulario';
import { formStateNuevo } from '@/features/reportes/editarReporteForm';
import { hoyISO } from '@/utils/fecha';

/** Reporte nuevo: fecha de hoy y el técnico en sesión ya puestos; al crear, abre su detalle. */
export default function NuevoReporteScreen() {
  const { crear } = usePermisosReportes();
  if (!crear) return <ErrorState message="Tu cuenta no tiene permiso para crear reportes de mantenimiento." />;
  return <Nuevo />;
}

function Nuevo() {
  const router = useRouter();
  const { user } = useSession();
  const [inicial] = useState(() => formStateNuevo(user ? nombreUsuarioDisplay(user, '') : '', hoyISO()));

  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo reporte', headerShown: false }} />
      <ReporteFormulario
        reporte={null}
        inicial={inicial}
        onGuardado={(reporte) => router.replace(`/reportes/${reporte.id}` as Href)}
      />
    </>
  );
}
