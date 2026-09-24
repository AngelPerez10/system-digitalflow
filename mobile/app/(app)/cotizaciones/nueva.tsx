import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { crearCotizacion } from '@/api/cotizacionesApi';
import { useSession } from '@/auth/SessionProvider';
import { canCreateModule, isAdmin } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { CotizacionFormulario } from '@/features/cotizaciones/components/CotizacionFormulario';
import { formVacio } from '@/features/cotizaciones/cotizacionForm';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';

/** Nueva cotización: solo con permiso de `create` en cotizaciones. */
export default function NuevaCotizacionScreen() {
  const router = useRouter();
  const { user, permissions } = useSession();
  const { colors } = useTheme();
  const inicial = useMemo(() => formVacio(), []);

  if (!canCreateModule(permissions, user, 'cotizaciones')) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.canvas }]}>
        <Stack.Screen options={{ title: 'Nueva cotización', headerShown: false }} />
        <Text style={[styles.titulo, { color: colors.ink }]}>Sin permiso</Text>
        <Text style={[styles.texto, { color: colors.inkMuted }]}>
          Tu cuenta no puede crear cotizaciones. Solicítalo a un administrador.
        </Text>
        <AppButton label="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva cotización', headerShown: false }} />
      <CotizacionFormulario
        modo="nueva"
        folio="Folio al guardar"
        inicial={inicial}
        esAdmin={isAdmin(user)}
        onGuardar={async (payload) => {
          const creada = await crearCotizacion(payload);
          // Al detalle de la recién creada, sin dejar el formulario en la pila.
          router.replace(`/cotizaciones/${creada.id}` as Href);
        }}
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
