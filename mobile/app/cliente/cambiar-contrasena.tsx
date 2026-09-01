import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CambiarContrasenaForm } from '@/features/auth/CambiarContrasenaForm';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Cambio obligatorio de la contraseña temporal del portal cliente. La guarda de
 * sesión vive en `app/cliente/_layout.tsx`; aquí solo se pinta el formulario.
 */
export default function CambiarContrasenaScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <CambiarContrasenaForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
