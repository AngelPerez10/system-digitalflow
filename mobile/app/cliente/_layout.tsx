import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Redirect, Stack, usePathname, useRouter, useSegments, type Href } from 'expo-router';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { portalAcceso } from '@/auth/portalAcceso';
import { useSession } from '@/auth/SessionProvider';
import { AppNavbar, IconAgenda, IconOrdenes } from '@/components/AppNavbar';
import { LoadingState } from '@/components/StateViews';
import { animationDurationMs, pushAnimation } from '@/navigation/navMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/utils/useReducedMotion';

const RUTA_CAMBIO = '/cliente/cambiar-contrasena';

/** Zona autenticada del portal cliente: órdenes en solo lectura. */
export default function ClienteLayout() {
  const { status, user, signOut } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const reduced = useReducedMotion();

  const salir = useCallback(async () => {
    await signOut();
    await portalAcceso.clear();
  }, [signOut]);

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedOut') return <Redirect href="/bienvenida" />;

  // Una cuenta del ERP que caiga aquí (deep link, portal recordado) va a lo suyo.
  if (user && user.account_type !== 'cliente') return <Redirect href="/ordenes" />;

  // La contraseña que llega por correo es temporal: hasta cambiarla no se ve el
  // portal. El propio formulario queda fuera del redirect para no ciclar.
  if (user?.must_change_password && pathname !== RUTA_CAMBIO) {
    return <Redirect href={RUTA_CAMBIO} />;
  }

  // Barra global en listado de servicios y en Agenda; detalle y cambio de
  // contraseña traen su propia cabecera / flujo.
  const seccion = segments.length >= 2 ? String(segments[1]) : 'index';
  const enListado = segments[0] === 'cliente' && (segments.length === 1 || seccion === 'agenda');
  const nombre = nombreUsuarioDisplay(user, 'Cliente');
  // El backend crea la cuenta con `username = portal_username` (el número que
  // llega por correo), así que `user.username` es el número de usuario. Si el
  // cliente no tiene nombre, ese número ya es el título del panel: no se repite.
  const usuario = user?.username?.trim() || '';
  const numeroUsuario = usuario && usuario !== nombre ? usuario : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {enListado ? (
        <AppNavbar
          nombreUsuario={nombre}
          rolLabel="Cliente"
          numeroUsuario={numeroUsuario}
          items={[
            {
              key: 'servicios',
              label: 'Mis servicios',
              hint: 'Listado de tus órdenes',
              grupo: 'Seguimiento',
              icon: (color) => <IconOrdenes color={color} />,
              active: segments.length === 1,
              onPress: () => router.replace('/cliente' as Href),
            },
            {
              key: 'agenda',
              label: 'Agenda',
              hint: 'Servicios por día',
              grupo: 'Seguimiento',
              icon: (color) => <IconAgenda color={color} />,
              active: seccion === 'agenda',
              onPress: () => router.replace('/cliente/agenda' as Href),
            },
          ]}
          onCerrarSesion={() => void salir()}
        />
      ) : null}

      <Stack
        screenOptions={{
          headerShown: false,
          animation: pushAnimation(reduced),
          animationDuration: animationDurationMs('push', reduced),
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="agenda" options={{ animation: 'none' }} />
        <Stack.Screen name="[id]" />
        <Stack.Screen
          name="cambiar-contrasena"
          options={{ animation: 'fade', animationDuration: reduced ? 0 : 260 }}
        />
      </Stack>
    </View>
  );
}
