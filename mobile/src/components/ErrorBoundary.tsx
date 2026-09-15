import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  crashed: boolean;
}

/**
 * Red de seguridad de toda la app: sin esto, un error de render en cualquier
 * pantalla deja al técnico con una pantalla en blanco (o el crash nativo) sin
 * forma de recuperarse. "Reintentar" reintenta el render in-place — no hay
 * `expo-updates` para forzar una recarga real del bundle, así que si el error
 * persiste el mensaje pide cerrar y volver a abrir la app.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  override componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reintentar = () => this.setState({ crashed: false });

  override render() {
    if (this.state.crashed) return <Fallback onRetry={this.reintentar} />;
    return this.props.children;
  }
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Text style={[styles.titulo, { color: colors.ink }]}>Algo salió mal</Text>
        <Text style={[styles.texto, { color: colors.inkMuted }]}>
          La app encontró un error inesperado. Si «Reintentar» no lo resuelve, cierra la app por
          completo y vuelve a abrirla.
        </Text>
        <AppButton label="Reintentar" onPress={onRetry} style={styles.boton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  titulo: { ...type.title, textAlign: 'center' },
  texto: { ...type.body, textAlign: 'center' },
  boton: { alignSelf: 'stretch' },
});
