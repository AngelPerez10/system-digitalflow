import React from 'react';
import { Redirect, type Href } from 'expo-router';
import { useSession } from '@/auth/SessionProvider';
import { portalAcceso } from '@/auth/portalAcceso';
import { LoadingState } from '@/components/StateViews';

/** Puerta de entrada: restaura sesión y manda al portal que corresponda. */
export default function Index() {
  const { status } = useSession();
  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;

  const elegido = portalAcceso.get();

  if (status === 'signedIn') {
    const dest = (elegido === 'cliente' ? '/cliente' : '/ordenes') as Href;
    return <Redirect href={dest} />;
  }

  // Sin sesión: si ya eligió perfil antes, directo a su acceso; si no, a elegir.
  if (elegido === 'tecnico') return <Redirect href="/login" />;
  if (elegido === 'cliente') return <Redirect href="/login-cliente" />;
  return <Redirect href="/bienvenida" />;
}
