import React from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { AccesoForm } from '@/features/auth/AccesoForm';
import { LoadingState } from '@/components/StateViews';
import { useTheme } from '@/theme/ThemeProvider';

const CLIENTE_HOME = '/cliente' as Href;

/** Acceso para clientes — mismo formulario, distinto contexto y destino. */
export default function LoginClienteScreen() {
  const router = useRouter();
  const { status } = useSession();
  const { colors } = useTheme();

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedIn') return <Redirect href={CLIENTE_HOME} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <AccesoForm
        portal="cliente"
        subtitulo="Acceso para clientes"
        submitHint="Entra a tu portal de seguimiento"
        ayudaMensaje="Contacta a tu ejecutivo de cuenta para restablecer tu acceso."
        onRegistro={() => router.push('/registro-cliente')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
