import React from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { RegistroClienteForm } from '@/features/auth/RegistroClienteForm';
import { LoadingState } from '@/components/StateViews';
import { useTheme } from '@/theme/ThemeProvider';

const CLIENTE_HOME = '/cliente' as Href;

/** Solicitud de cuenta de portal cliente — se revisa y llega por correo. */
export default function RegistroClienteScreen() {
  const { status } = useSession();
  const { colors } = useTheme();

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedIn') return <Redirect href={CLIENTE_HOME} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <RegistroClienteForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
