import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, useRouter, useSegments, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canViewModule } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { AppNavbar, IconOrdenes, IconProyectos, type NavItem } from '@/components/AppNavbar';
import { LoadingState } from '@/components/StateViews';
import { PushProvider } from '@/notifications/PushProvider';
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
  const router = useRouter();
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
  const mostrarNavbar = seccionListado === 'ordenes' || seccionListado === 'proyectos';

  const nombre = user ? nombreUsuarioDisplay(user) : undefined;
  const puedeOrdenes = canViewModule(permissions, user, 'ordenes');
  const puedeProyectos = canViewModule(permissions, user, 'proyectos');

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedOut') return <Redirect href="/bienvenida" />;

  if (!puedeOrdenes && !puedeProyectos) {
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

  const items: NavItem[] = [];
  if (puedeOrdenes) {
    items.push({
      key: 'ordenes',
      label: 'Mis órdenes',
      hint: 'Abre el listado del mes',
      icon: (color: string) => <IconOrdenes color={color} />,
      active: seccionListado === 'ordenes',
      onPress: () => router.replace('/ordenes'),
    });
  }
  if (puedeProyectos) {
    items.push({
      key: 'proyectos',
      label: 'Mis proyectos',
      hint: 'Abre el listado de proyectos asignados',
      icon: (color: string) => <IconProyectos color={color} />,
      active: seccionListado === 'proyectos',
      onPress: () => router.replace('/proyectos' as Href),
    });
  }

  return (
    <PushProvider>
      <View style={[styles.shell, { backgroundColor: colors.canvas }]}>
        {mostrarNavbar ? (
          <AppNavbar nombreUsuario={nombre} items={items} onCerrarSesion={() => void signOut()} />
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

const styles = StyleSheet.create({
  shell: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titulo: { ...type.title },
  texto: { ...type.body },
});
