import React from 'react';
import { Redirect, type Href } from 'expo-router';
import { useSession } from '@/auth/SessionProvider';
import { portalAcceso } from '@/auth/portalAcceso';
import { canViewModule } from '@/auth/permissions';
import { LoadingState } from '@/components/StateViews';
import { rutaInicial } from '@/navigation/menuApp';

/** Puerta de entrada: restaura sesión y manda al portal que corresponda. */
export default function Index() {
  const { status, user, permissions } = useSession();
  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;

  const elegido = portalAcceso.get();

  if (status === 'signedIn') {
    const dest: Href =
      elegido === 'cliente' ? '/cliente' : rutaInicial((modulo) => canViewModule(permissions, user, modulo));
    return <Redirect href={dest} />;
  }

  // Sin sesión: si ya eligió perfil antes, directo a su acceso; si no, a elegir.
  if (elegido === 'tecnico') return <Redirect href="/login" />;
  if (elegido === 'cliente') return <Redirect href="/login-cliente" />;
  return <Redirect href="/bienvenida" />;
}
