import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canViewModule } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { AppNavbar } from '@/components/AppNavbar';
import { LoadingState } from '@/components/StateViews';
import { construirMenu, MENU_APP } from '@/navigation/menuApp';
import { PushProvider, usePush } from '@/notifications/PushProvider';
import {
  animationDurationMs,
  pushAnimation,
  sheetAnimation,
} from '@/navigation/navMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

/** Guard de la app autenticada: sesión + menú lateral + `ordenes.view`. */
export default function AppLayout() {
  const { status, user, permissions, signOut } = useSession();
  const { colors } = useTheme();
  const segments = useSegments();
  const reduced = useReducedMotion();

  // La barra global (hamburguesa + marca) solo en los listados (Órdenes,
  // Proyectos). El detalle y la edición traen su propia cabecera marina con
  // chevron de vuelta; la barra encima sería una segunda cabecera redundante.
  //
  // Se compara contra los segmentos de ruta (plantilla de carpetas), no el
  // pathname resuelto: al entrar por deep link directo a una orden (p. ej.
  // desde un QR o una notificación push) el pathname resuelto puede no
  // coincidir de forma fiable con '/ordenes' en el primer render, dejando la
  // barra global pegada encima de la cabecera propia del detalle.
  // `String(...)`: los segmentos tipados de expo-router se regeneran al vuelo
  // en desarrollo y pueden quedar rezagados un instante tras crear una ruta
  // nueva — comparar como string evita que el tipo generado bloquee el build.
  const seccionListado = segments.length === 2 ? String(segments[1]) : null;
  // Cualquier sección raíz del catálogo del menú lleva la barra global.
  const mostrarNavbar = MENU_APP.some((e) => e.seccion !== undefined && e.seccion === seccionListado);

  const nombre = user ? nombreUsuarioDisplay(user) : undefined;
  const puedeAlgo = MENU_APP.some((e) => canViewModule(permissions, user, e.modulo));

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedOut') return <Redirect href="/bienvenida" />;

  // Espejo del guard de `ClienteLayout` (que manda a `/ordenes` a quien no es
  // cliente): una cuenta del portal cliente que caiga aquí (deep link, portal
  // recordado) va a lo suyo — nunca debe llegar a ver Proyectos ni el listado
  // de Órdenes de oficina, sin depender solo de que `permissions` venga vacío.
  if (user && user.account_type === 'cliente') {
    return <Redirect href="/cliente" />;
  }

  if (!puedeAlgo) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
        <AppNavbar nombreUsuario={nombre} onCerrarSesion={() => void signOut()} />
        <View style={styles.center}>
          <Text style={[styles.titulo, { color: colors.ink }]}>Sin acceso</Text>
          <Text style={[styles.texto, { color: colors.inkMuted }]}>
            Tu cuenta no tiene permiso para «Órdenes de trabajo» ni «Proyectos». Solicítalo a un
            administrador.
          </Text>
          <AppButton label="Cerrar sesión" variant="secondary" onPress={() => void signOut()} />
        </View>
      </SafeAreaView>
    );
  }

  const push = pushAnimation(reduced);
  const sheet = sheetAnimation(reduced);

  return (
    <PushProvider>
      <View style={[styles.shell, { backgroundColor: colors.canvas }]}>
        {mostrarNavbar ? (
          <NavbarApp
            nombre={nombre}
            seccionActual={seccionListado}
            puedeVer={(modulo) => canViewModule(permissions, user, modulo)}
            onCerrarSesion={() => void signOut()}
          />
        ) : null}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.ink,
            headerShadowVisible: false,
            headerTitleStyle: type.bodyMedium,
            contentStyle: { backgroundColor: colors.canvas },
            headerBackTitle: 'Atrás',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            animation: push,
            animationDuration: animationDurationMs('push', reduced),
          }}
        >
          <Stack.Screen name="ordenes/index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen
            name="ordenes/pool"
            options={{
              headerShown: false,
              animation: push,
              animationDuration: animationDurationMs('push', reduced),
            }}
          />
          <Stack.Screen
            name="ordenes/[id]/index"
            options={{
              headerShown: false,
              animation: push,
              animationDuration: animationDurationMs('push', reduced),
            }}
          />
          <Stack.Screen
            name="ordenes/[id]/editar"
            options={{
              headerShown: false,
              animation: sheet,
              animationDuration: animationDurationMs('sheet', reduced),
            }}
          />
          <Stack.Screen name="proyectos/index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen
            name="proyectos/[id]/index"
            options={{
              headerShown: false,
              animation: push,
              animationDuration: animationDurationMs('push', reduced),
            }}
          />
          <Stack.Screen
            name="proyectos/[id]/editar"
            options={{
              headerShown: false,
              animation: sheet,
              animationDuration: animationDurationMs('sheet', reduced),
            }}
          />
        </Stack>
      </View>
    </PushProvider>
  );
}

/**
 * Navbar con el menú construido desde `MENU_APP`. Vive dentro de
 * `PushProvider` para inyectar el contador de disponibles sin ver.
 */
function NavbarApp({
  nombre,
  seccionActual,
  puedeVer,
  onCerrarSesion,
}: {
  nombre?: string;
  seccionActual: string | null;
  puedeVer: (modulo: string) => boolean;
  onCerrarSesion: () => void;
}) {
  const router = useRouter();
  const { disponiblesSinVer } = usePush();
  const items = construirMenu({
    puedeVer,
    seccionActual,
    contadores: { disponibles: disponiblesSinVer },
    navegar: (ruta: Href, modo) => (modo === 'push' ? router.push(ruta) : router.replace(ruta)),
  });
  return <AppNavbar nombreUsuario={nombre} items={items} onCerrarSesion={onCerrarSesion} />;
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titulo: { ...type.title },
  texto: { ...type.body },
});
