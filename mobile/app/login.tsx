import React from 'react';
import { StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { AccesoForm } from '@/features/auth/AccesoForm';
import { LoadingState } from '@/components/StateViews';
import { useTheme } from '@/theme/ThemeProvider';

/** Acceso para técnicos de campo. */
export default function LoginScreen() {
  const { status } = useSession();
  const { colors } = useTheme();

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedIn') return <Redirect href="/ordenes" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <AccesoForm
        portal="tecnico"
        subtitulo="Acceso para técnicos de campo"
        submitHint="Entra a tus órdenes de trabajo"
        ayudaMensaje="Habla con tu supervisor para que te dé una contraseña nueva."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
