import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { portalAcceso, type PortalAcceso } from '@/auth/portalAcceso';
import { useSession } from '@/auth/SessionProvider';
import { AuthHero } from '@/components/AuthHero';
import { BrandMark } from '@/components/Brand';
import { IconChevron } from '@/components/icons';
import { InlineError } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getApiConfigError } from '@/config/env';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, MOTION, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

const BLOQUES = 3;

function mensajeDeAcceso(error: unknown, portal: PortalAcceso): string {
  const original = toUserMessage(error);
  const normalizado = original.toLowerCase();

  if (normalizado.includes('credenciales inválidas')) {
    return 'Usuario o contraseña incorrectos. Revísalos e intenta de nuevo.';
  }
  if (normalizado.includes('credenciales incompletas')) {
    return 'Faltó escribir tu usuario o tu contraseña.';
  }
  if (normalizado.includes('desactivada')) {
    return portal === 'cliente'
      ? 'Tu cuenta está apagada. Contacta a tu ejecutivo de cuenta.'
      : 'Tu cuenta está apagada. Habla con tu supervisor para que la active.';
  }
  if (normalizado.includes('demasiados intentos')) {
    return 'Muchos intentos seguidos. Espera un minuto y vuelve a probar.';
  }
  return original;
}

export interface AccesoFormProps {
  portal: PortalAcceso;
  /** Línea bajo el título — dice a quién es este acceso, en lenguaje llano. */
  subtitulo: string;
  submitHint: string;
  ayudaMensaje: string;
  /** Si se pasa, muestra «¿No tienes cuenta? Regístrate» (solo portal cliente). */
  onRegistro?: () => void;
}

/**
 * Formulario compartido de acceso — técnico y cliente comparten anatomía, no copy.
 *
 * Cabecera marina + hoja blanca redondeada con el formulario. Se apaga con
 * «Reducir movimiento».
 */
export function AccesoForm({
  portal,
  subtitulo,
  submitHint,
  ayudaMensaje,
  onRegistro,
}: AccesoFormProps) {
  const router = useRouter();
  const { signIn, notice, clearNotice } = useSession();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const entrada = useRef(Array.from({ length: BLOQUES }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduced) {
      entrada.forEach((v) => v.setValue(1));
      return;
    }
    const secuencia = Animated.stagger(
      100,
      entrada.map((v) =>
        Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
      ),
    );
    secuencia.start();
    return () => secuencia.stop();
  }, [reduced, entrada]);

  const configError = getApiConfigError();
  const enviando = fase !== 'idle';
  const puedeEnviar = usuario.trim().length > 0 && password.length > 0 && !enviando && !configError;
  const hayAviso = Boolean(configError || notice || error);

  const bloque = (i: number) => {
    const v = entrada[i] ?? entrada[0]!;
    return {
      opacity: v,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    };
  };

  const onSubmit = async () => {
    if (!puedeEnviar) return;
    clearNotice();
    setError(null);
    setFase('sending');
    try {
      await signIn(usuario, password);
      await portalAcceso.set(portal);
      setPassword('');
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      setFase('idle');
    } catch (err) {
      setError(mensajeDeAcceso(err, portal));
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
          <AuthHero
            topLeft={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar de perfil"
                accessibilityHint="Vuelve a elegir entre acceso de técnico o de cliente"
                onPress={async () => {
                  await portalAcceso.clear();
                  router.replace('/bienvenida');
                }}
                hitSlop={12}
                style={({ pressed }) => [styles.volver, pressed ? styles.volverPressed : null]}
              >
                <IconChevron color={colors.onNavy} size={16} direction="left" />
                <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Cambiar de perfil</Text>
              </Pressable>
            }
            topRight={<ThemeToggle onDark />}
            roundBottom={false}
          >
            <BrandMark size={52} animated background={colors.gold} foreground={colors.navy} />
            <Text style={[styles.titulo, { color: colors.onNavy }]} accessibilityRole="header">
              SertelPro
            </Text>
            <Text style={[styles.subtitulo, { color: colors.onNavyMuted }]}>{subtitulo}</Text>
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
                Inicia sesión
              </Text>
              <Text style={[styles.sheetAyuda, { color: colors.inkSubtle }]}>
                Escribe tu usuario y contraseña del sistema.
              </Text>
            </View>

            <View style={styles.formWrap}>
              {hayAviso ? (
                <Animated.View style={[styles.avisos, bloque(0)]}>
                  {configError ? <InlineError message={configError} /> : null}
                  {notice ? <InlineError message={notice} /> : null}
                  {error ? <InlineError message={error} /> : null}
                </Animated.View>
              ) : null}

              <Animated.View style={[styles.campos, bloque(0)]}>
                <TextField
                  variant="underline"
                  label="Usuario"
                  placeholder="Introduce tu usuario"
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!enviando}
                />
                <TextField
                  variant="underline"
                  ref={passwordRef}
                  label="Contraseña"
                  placeholder="Introduce tu contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  revealable
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => void onSubmit()}
                  editable={!enviando}
                />
              </Animated.View>

              <Animated.View style={[styles.botonBloque, bloque(1)]}>
                <SubmitButton
                  label="Iniciar sesión"
                  phase={fase}
                  disabled={!puedeEnviar && !enviando}
                  onPress={() => void onSubmit()}
                  accessibilityHint={submitHint}
                  tint={colors.navy}
                  tintPressed={colors.navyDeep}
                  tintDisabled={colors.navyDisabled}
                />
                <Animated.View style={bloque(2)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="¿No puedes entrar?"
                    accessibilityHint="Explica cómo recuperar el acceso"
                    onPress={() => setError(ayudaMensaje)}
                    hitSlop={12}
                    style={styles.ayuda}
                  >
                    <Text style={[styles.ayudaTexto, { color: colors.navy }]}>¿No puedes entrar?</Text>
                  </Pressable>

                  {onRegistro ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Crear una cuenta de cliente"
                      onPress={onRegistro}
                      hitSlop={12}
                      style={styles.registro}
                    >
                      <Text style={[styles.registroTexto, { color: colors.inkMuted }]}>
                        ¿No tienes cuenta?{' '}
                        <Text style={{ color: colors.navy, fontFamily: font.semibold }}>Regístrate</Text>
                      </Text>
                    </Pressable>
                  ) : null}
                </Animated.View>
              </Animated.View>
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
  volver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  volverPressed: { opacity: 0.6 },
  volverTexto: { ...type.label },
  titulo: {
    fontFamily: font.bold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1.1,
    marginTop: spacing.sm,
  },
  subtitulo: { ...type.body, textAlign: 'center', marginTop: 2 },
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
  formWrap: { flex: 1, justifyContent: 'flex-start', paddingTop: spacing.xs },
  avisos: { gap: spacing.md, marginBottom: spacing.lg },
  campos: { gap: spacing.xl },
  botonBloque: { marginTop: spacing.xl, gap: spacing.xs },
  ayuda: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
  ayudaTexto: { ...type.label },
  registro: { alignSelf: 'center', paddingVertical: spacing.sm },
  registroTexto: { ...type.caption, fontSize: 13 },
  pie: {
    ...type.caption,
    fontSize: 10,
    fontFamily: font.semibold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
});
