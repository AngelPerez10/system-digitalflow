import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { createProyecto } from '@/api/proyectosApi';
import { useSession } from '@/auth/SessionProvider';
import { canCreateModule } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { ProyectoNuevoFormulario } from '@/features/proyectos/components/ProyectoNuevoFormulario';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';

/** Nuevo proyecto: solo con permiso de `create` en proyectos. */
export default function NuevoProyectoScreen() {
  const router = useRouter();
  const { user, permissions } = useSession();
  const { colors } = useTheme();

  if (!canCreateModule(permissions, user, 'proyectos')) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.canvas }]}>
        <Stack.Screen options={{ title: 'Nuevo proyecto', headerShown: false }} />
        <Text style={[styles.titulo, { color: colors.ink }]}>Sin permiso</Text>
        <Text style={[styles.texto, { color: colors.inkMuted }]}>
          Tu cuenta no puede crear proyectos. Solicítalo a un administrador.
        </Text>
        <AppButton label="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo proyecto', headerShown: false }} />
      <ProyectoNuevoFormulario
        user={user}
        onCrear={async (payload) => (await createProyecto(payload)).id}
        // Al detalle del recién creado, sin dejar el formulario en la pila.
        onCreado={(id) => router.replace(`/proyectos/${id}` as Href)}
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
