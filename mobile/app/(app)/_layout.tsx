import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canViewModule } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { AppNavbar } from '@/components/AppNavbar';
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
  const pathname = usePathname();
  const reduced = useReducedMotion();

  // La barra global (hamburguesa + marca) solo en el listado. El detalle y la
  // edición traen su propia cabecera marina con chevron de vuelta; la barra
  // encima sería una segunda cabecera redundante.
  const mostrarNavbar = pathname === '/ordenes' || pathname === '/(app)/ordenes';

  const nombre = user ? nombreUsuarioDisplay(user) : undefined;

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedOut') return <Redirect href="/bienvenida" />;

  if (!canViewModule(permissions, user, 'ordenes')) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
        <AppNavbar nombreUsuario={nombre} onCerrarSesion={() => void signOut()} />
        <View style={styles.center}>
          <Text style={[styles.titulo, { color: colors.ink }]}>Sin acceso a órdenes</Text>
          <Text style={[styles.texto, { color: colors.inkMuted }]}>
            Tu cuenta no tiene el permiso «Órdenes de trabajo». Solicítalo a un administrador.
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
          <AppNavbar
            nombreUsuario={nombre}
            onIrInicio={() => router.replace('/ordenes')}
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
