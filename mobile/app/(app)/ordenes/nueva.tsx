import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { crearOrden } from '@/api/ordenesApi';
import { useSession } from '@/auth/SessionProvider';
import { canCreateModule, isAdmin } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { OrdenNuevaFormulario } from '@/features/orders/components/OrdenNuevaFormulario';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';

/** Nueva orden de trabajo: solo con permiso de `create` en órdenes. */
export default function NuevaOrdenScreen() {
  const router = useRouter();
  const { user, permissions } = useSession();
  const { colors } = useTheme();

  if (!canCreateModule(permissions, user, 'ordenes')) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.canvas }]}>
        <Stack.Screen options={{ title: 'Nueva orden', headerShown: false }} />
        <Text style={[styles.titulo, { color: colors.ink }]}>Sin permiso</Text>
        <Text style={[styles.texto, { color: colors.inkMuted }]}>
          Tu cuenta no puede crear órdenes. Solicítalo a un administrador.
        </Text>
        <AppButton label="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva orden', headerShown: false }} />
      <OrdenNuevaFormulario
        user={user}
        esAdmin={isAdmin(user)}
        onCrear={async (payload) => (await crearOrden(payload)).id}
        // Al detalle de la recién creada, sin dejar el formulario en la pila.
        onCreada={(id) => router.replace(`/ordenes/${id}` as Href)}
        onSalir={() => router.back()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titulo: { ...type.title },
  texto: { ...type.body },
});
