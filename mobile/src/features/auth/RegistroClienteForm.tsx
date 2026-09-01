import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { registrarCliente } from '@/api/authApi';
import { toUserMessage } from '@/api/errors';
import { AppButton } from '@/components/AppButton';
import { AuthHero } from '@/components/AuthHero';
import { BrandMark } from '@/components/Brand';
import { IconChevron } from '@/components/icons';
import { InlineError } from '@/components/StateViews';
import { SubmitButton } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getApiConfigError } from '@/config/env';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, spacing, type } from '@/theme/tokens';

function Palomita({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5 10 17l9-10"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const soloDigitos = (v: string) => v.replace(/[^\d]/g, '');

/**
 * Solicitud de cuenta de portal cliente. Misma anatomía que el login (cabecera
 * marina de borde recto + hoja blanca redondeada). No autentica: al enviar, el
 * backend crea una solicitud que un administrador revisa.
 */
export function RegistroClienteForm() {
  const router = useRouter();
  const { colors, scheme } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [acepto, setAcepto] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const configError = getApiConfigError();
  const puedeEnviar =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    soloDigitos(telefono).length >= 10 &&
    acepto &&
    !enviando &&
    !configError;

  const volverAlAcceso = () => router.replace('/login-cliente');

  const onSubmit = async () => {
    if (!puedeEnviar) return;
    setError(null);
    setEnviando(true);
    try {
      await registrarCliente({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        acepto_privacidad: true,
      });
      setEnviado(true);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setEnviando(false);
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
                accessibilityLabel="Volver al acceso"
                onPress={volverAlAcceso}
                hitSlop={12}
                style={({ pressed }) => [styles.volver, pressed ? styles.volverPressed : null]}
              >
                <IconChevron color={colors.onNavy} size={16} direction="left" />
                <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Volver</Text>
              </Pressable>
            }
            topRight={<ThemeToggle onDark />}
            roundBottom={false}
          >
            <BrandMark size={52} animated background={colors.gold} foreground={colors.navy} />
            <Text style={[styles.marcaNombre, { color: colors.onNavy }]} accessibilityRole="header">
              SertelPro
            </Text>
            <Text style={[styles.marcaSub, { color: colors.onNavyMuted }]}>Crea tu cuenta de cliente</Text>
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
            {enviado ? (
              <View style={styles.exito}>
                <View style={[styles.exitoIcono, { backgroundColor: colors.goldSoftBg }]}>
                  <Palomita color={colors.goldSoftText} size={26} />
                </View>
                <Text style={[styles.exitoTitulo, { color: colors.ink }]} accessibilityRole="header">
                  Solicitud enviada
                </Text>
                <Text style={[styles.exitoTexto, { color: colors.inkMuted }]}>
                  Te enviaremos tus accesos por correo en cuanto validemos tus datos. Puede tardar un
                  día hábil.
                </Text>
                <AppButton
                  label="Volver al acceso"
                  onPress={volverAlAcceso}
                  accessibilityHint="Regresa a la pantalla de inicio de sesión de cliente"
                  style={styles.exitoBoton}
                />
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <Text style={[styles.sheetTitulo, { color: colors.ink }]} accessibilityRole="header">
                    Crear cuenta
                  </Text>
                  <Text style={[styles.sheetAyuda, { color: colors.inkSubtle }]}>
                    Te enviaremos tus accesos por correo cuando validemos tus datos.
                  </Text>
                </View>

                {configError || error ? (
                  <View style={styles.avisos}>
                    {configError ? <InlineError message={configError} /> : null}
                    {error ? <InlineError message={error} /> : null}
                  </View>
                ) : null}

                <View style={styles.campos}>
                  <TextField
                    variant="underline"
                    label="Nombre"
                    placeholder="Tu nombre"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="name-given"
                    textContentType="givenName"
                    editable={!enviando}
                  />
                  <TextField
                    variant="underline"
                    label="Apellidos"
                    placeholder="Tus apellidos"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="name-family"
                    textContentType="familyName"
                    editable={!enviando}
                  />
                  <TextField
                    variant="underline"
                    label="Correo"
                    placeholder="tucorreo@ejemplo.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!enviando}
                  />
                  <TextField
                    variant="underline"
                    label="Celular"
                    placeholder="10 dígitos"
                    value={telefono}
                    onChangeText={(v) => setTelefono(soloDigitos(v).slice(0, 15))}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    editable={!enviando}
                  />
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acepto }}
                  accessibilityLabel="Acepto el aviso de privacidad"
                  onPress={() => setAcepto((v) => !v)}
                  hitSlop={6}
                  style={styles.check}
                >
                  <View
                    style={[
                      styles.checkCaja,
                      {
                        borderColor: acepto ? colors.navy : colors.lineStrong,
                        backgroundColor: acepto ? colors.navy : 'transparent',
                      },
                    ]}
                  >
                    {acepto ? <Palomita color="#FFFFFF" size={13} /> : null}
                  </View>
                  <Text style={[styles.checkTexto, { color: colors.inkMuted }]}>
                    Acepto el aviso de privacidad y el tratamiento de mis datos.
                  </Text>
                </Pressable>

                <View style={styles.botonBloque}>
                  <SubmitButton
                    label="Crear cuenta"
                    phase={enviando ? 'sending' : 'idle'}
                    disabled={!puedeEnviar && !enviando}
                    onPress={() => void onSubmit()}
                    accessibilityHint="Envía tu solicitud de cuenta de cliente"
                    tint={colors.navy}
                    tintPressed={colors.navyDeep}
                    tintDisabled={colors.navyDisabled}
                  />
                </View>
              </>
            )}

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
  avisos: { gap: spacing.md, marginBottom: spacing.lg },
  campos: { gap: spacing.lg },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xl },
  checkCaja: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkTexto: { ...type.caption, flex: 1, lineHeight: 18 },
  botonBloque: { marginTop: spacing.xl },
  exito: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  exitoIcono: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  exitoTitulo: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.5, textAlign: 'center' },
  exitoTexto: { ...type.body, textAlign: 'center', maxWidth: 320 },
  exitoBoton: { alignSelf: 'stretch', marginTop: spacing.md },
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
