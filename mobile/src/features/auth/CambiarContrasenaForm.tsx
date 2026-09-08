import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { toUserMessage } from '@/api/errors';
import { cambiarContrasenaCliente } from '@/api/portalClienteApi';
import { useSession } from '@/auth/SessionProvider';
import { AuthHero } from '@/components/AuthHero';
import { BrandMark } from '@/components/Brand';
import { InlineError } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, MOTION, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { FuerzaContrasena } from './FuerzaContrasena';
import { evaluarContrasena, MIN_LARGO } from './passwordPolicy';

function mensajeDeCambio(error: unknown): string {
  const original = toUserMessage(error);
  const normalizado = original.toLowerCase();
  if (normalizado.includes('actual') && normalizado.includes('incorrect')) {
    return 'La contraseña actual no es correcta. Revisa el correo que te llegó.';
  }
  if (normalizado.includes('no coinciden')) return 'Las dos contraseñas nuevas no coinciden.';
  return original;
}

/**
 * Cambio de contraseña del portal cliente. Obligatorio en el primer ingreso:
 * la que llega por correo es temporal (`must_change_password`). No hay «volver»
 * — la única salida sin cambiarla es cerrar sesión.
 */
export function CambiarContrasenaForm() {
  const router = useRouter();
  const { recargarSesion, signOut } = useSession();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const nuevaRef = useRef<TextInput>(null);
  const confirmarRef = useRef<TextInput>(null);

  const enviando = fase !== 'idle';
  const politica = evaluarContrasena(nueva, { confirmar, tempPassword: actual });
  const puedeEnviar = actual.length > 0 && politica.listoParaEnviar && !enviando;

  const onSubmit = async () => {
    if (!puedeEnviar) return;
    if (nueva !== confirmar) {
      setError('Las dos contraseñas nuevas no coinciden.');
      return;
    }
    setError(null);
    setFase('sending');
    try {
      await cambiarContrasenaCliente({
        current_password: actual,
        new_password: nueva,
        confirm_password: confirmar,
      });
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      // Relee `/me/`: `must_change_password` pasa a false y la guarda deja pasar.
      await recargarSesion();
      router.replace('/cliente');
    } catch (err) {
      setError(mensajeDeCambio(err));
      setFase('idle');
    }
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AuthHero topRight={<ThemeToggle onDark />} roundBottom={false}>
            <BrandMark size={52} animated background={colors.gold} foreground={colors.navy} />
            <Text style={[styles.marcaNombre, { color: colors.onNavy }]} accessibilityRole="header">
              SertelPro
            </Text>
            <Text style={[styles.marcaSub, { color: colors.onNavyMuted }]}>
              Primer ingreso al portal
            </Text>
          </AuthHero>

          <View
            style={[
              styles.panel,
              {
                backgroundColor: colors.surface,
                ...elevationFor(colors, 'card'),
                shadowOffset: { width: 0, height: -10 },
                shadowRadius: 24,
                shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
              },
            ]}
          >
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitulo, { color: colors.ink }]} accessibilityRole="header">
                Cambia tu contraseña
              </Text>
              <Text style={[styles.sheetAyuda, { color: colors.inkSubtle }]}>
                La que te llegó por correo es temporal. Elige una nueva de al menos {MIN_LARGO}{' '}
                caracteres, con letras y números. Entre más larga, más segura.
              </Text>
            </View>

            {error ? (
              <View style={styles.avisos}>
                <InlineError message={error} />
              </View>
            ) : null}

            <View style={styles.campos}>
              <TextField
                variant="underline"
                label="Contraseña temporal"
                placeholder="La que te llegó por correo"
                value={actual}
                onChangeText={setActual}
                secureTextEntry
                revealable
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => nuevaRef.current?.focus()}
                editable={!enviando}
              />
              <TextField
                variant="underline"
                ref={nuevaRef}
                label="Nueva contraseña"
                placeholder={`Mínimo ${MIN_LARGO} caracteres`}
                value={nueva}
                onChangeText={setNueva}
                secureTextEntry
                revealable
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmarRef.current?.focus()}
                editable={!enviando}
              />
              {nueva.length > 0 ? (
                <FuerzaContrasena valor={nueva} confirmar={confirmar} tempPassword={actual} />
              ) : null}
              <TextField
                variant="underline"
                ref={confirmarRef}
                label="Repite la nueva"
                placeholder="Escríbela otra vez"
                value={confirmar}
                onChangeText={setConfirmar}
                secureTextEntry
                revealable
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
                editable={!enviando}
              />
            </View>

            <View style={styles.botonBloque}>
              <SubmitButton
                label="Guardar y entrar"
                phase={fase}
                disabled={!puedeEnviar && !enviando}
                onPress={() => void onSubmit()}
                accessibilityHint="Guarda tu nueva contraseña y abre tu portal"
                tint={colors.navy}
                tintPressed={colors.navyDeep}
                tintDisabled={colors.navyDisabled}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                onPress={() => void signOut()}
                hitSlop={12}
                style={styles.salir}
                disabled={enviando}
              >
                <Text style={[styles.salirTexto, { color: colors.inkMuted }]}>Cerrar sesión</Text>
              </Pressable>
            </View>

            <Text style={[styles.pie, { color: colors.inkSubtle }]}>
              SertelPro · Operaciones seguras
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  marcaNombre: {
    fontFamily: font.bold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1.1,
    marginTop: spacing.sm,
  },
  marcaSub: { ...type.body, textAlign: 'center', marginTop: 2 },
  panel: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  sheetHead: { marginBottom: spacing.xl },
  sheetTitulo: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  sheetAyuda: { ...type.caption, marginTop: 4, lineHeight: 18 },
  avisos: { marginBottom: spacing.lg },
  campos: { gap: spacing.lg },
  botonBloque: { marginTop: spacing.xl },
  salir: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.md },
  salirTexto: { ...type.label },
  pie: {
    ...type.caption,
    fontSize: 10,
    fontFamily: font.semibold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
