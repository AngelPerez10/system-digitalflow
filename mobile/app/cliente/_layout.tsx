import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useSession } from '@/auth/SessionProvider';
import { LoadingState } from '@/components/StateViews';
import { animationDurationMs, pushAnimation } from '@/navigation/navMotion';
import { useReducedMotion } from '@/utils/useReducedMotion';

const RUTA_CAMBIO = '/cliente/cambiar-contrasena';

/** Zona autenticada del portal cliente: órdenes en solo lectura. */
export default function ClienteLayout() {
  const { status, user } = useSession();
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedOut') return <Redirect href="/bienvenida" />;

  // Una cuenta del ERP que caiga aquí (deep link, portal recordado) va a lo suyo.
  if (user && user.account_type !== 'cliente') return <Redirect href="/ordenes" />;

  // La contraseña que llega por correo es temporal: hasta cambiarla no se ve el
  // portal. El propio formulario queda fuera del redirect para no ciclar.
  if (user?.must_change_password && pathname !== RUTA_CAMBIO) {
    return <Redirect href={RUTA_CAMBIO} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: pushAnimation(reduced),
        animationDuration: animationDurationMs('push', reduced),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="cambiar-contrasena"
        options={{ animation: 'fade', animationDuration: reduced ? 0 : 260 }}
      />
    </Stack>
  );
}
