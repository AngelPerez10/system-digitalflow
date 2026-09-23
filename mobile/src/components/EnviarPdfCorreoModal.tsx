import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toUserMessage } from '@/api/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { font, MOTION, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconCorreo } from './icons';
import { SubmitButton, type SubmitPhase } from './SubmitButton';
import { TextField } from './TextField';

const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Props {
  visible: boolean;
  /** Línea bajo el título («El reporte ODT-12 llega como PDF adjunto…»). */
  descripcion: string;
  obtenerSugerido: (signal: AbortSignal) => Promise<string>;
  /** Envía y devuelve el mensaje del servidor («PDF enviado a …»). */
  enviar: (correo: string) => Promise<string>;
  onCerrar: () => void;
  onEnviado: (mensaje: string) => void;
}

/**
 * Hoja inferior para mandar un PDF por correo. El servidor genera el PDF y lo
 * envía adjunto desde la cuenta de correo del usuario; el campo llega
 * precargado con el correo del cliente cuando lo hay.
 */
export function EnviarPdfCorreoModal({ visible, descripcion, obtenerSugerido, enviar, onCerrar, onEnviado }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setFase('idle');
    const control = new AbortController();
    setBuscando(true);
    obtenerSugerido(control.signal)
      .then((sugerido) => setCorreo((actual) => actual || sugerido))
      .catch(() => undefined)
      .finally(() => setBuscando(false));
    return () => control.abort();
    // `obtenerSugerido` cambia de identidad en cada render del padre; basta con reaccionar al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const enviando = fase !== 'idle';

  const alEnviar = async () => {
    const limpio = correo.trim();
    if (!CORREO_RE.test(limpio)) {
      setError('Escribe un correo válido, por ejemplo cliente@empresa.com');
      return;
    }
    setError(null);
    setFase('sending');
    try {
      const mensaje = await enviar(limpio);
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success + 250));
      onEnviado(mensaje);
    } catch (e) {
      setError(toUserMessage(e));
      setFase('idle');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'slide'}
      statusBarTranslucent
      onRequestClose={() => !enviando && onCerrar()}
    >
      <View style={styles.flex}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.fondo]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => !enviando && onCerrar()}
        />
        <KeyboardAvoidingView
          style={styles.contenedor}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <View
            style={[styles.hoja, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            accessibilityViewIsModal
          >
            <View style={[styles.asa, { backgroundColor: colors.lineStrong }]} />

            <View style={styles.encabezado}>
              <View style={[styles.icono, { backgroundColor: colors.statusPausadoBg }]}>
                <IconCorreo color={colors.statusPausadoText} size={20} />
              </View>
              <View style={styles.textos}>
                <Text style={[styles.titulo, { color: colors.ink }]} accessibilityRole="header">
                  Enviar por correo
                </Text>
                <Text style={[styles.subtitulo, { color: colors.inkSubtle }]}>{descripcion}</Text>
              </View>
            </View>

            <TextField
              label="Correo del cliente"
              value={correo}
              onChangeText={(v) => {
                setCorreo(v);
                setError(null);
              }}
              placeholder={buscando ? 'Buscando el correo del cliente…' : 'cliente@empresa.com'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!enviando}
              error={error}
              helper={enviando ? 'Generando el PDF y enviándolo… puede tardar unos segundos.' : undefined}
              returnKeyType="send"
              onSubmitEditing={() => void alEnviar()}
            />

            <View style={styles.acciones}>
              <Pressable
                accessibilityRole="button"
                onPress={onCerrar}
                disabled={enviando}
                style={({ pressed }) => [
                  styles.cancelar,
                  { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
                  enviando ? styles.atenuado : null,
                ]}
              >
                <Text style={[styles.cancelarTexto, { color: colors.ink }]}>Cancelar</Text>
              </Pressable>
              <View style={styles.enviar}>
                <SubmitButton
                  label="Enviar PDF"
                  phase={fase}
                  disabled={!correo.trim()}
                  onPress={() => void alEnviar()}
                  accessibilityHint="Genera el PDF y lo envía al correo escrito"
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { backgroundColor: 'rgba(9, 9, 11, 0.45)' },
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icono: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3 },
  subtitulo: { ...type.caption, lineHeight: 18 },
  acciones: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cancelar: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atenuado: { opacity: 0.5 },
  cancelarTexto: { ...type.button },
  enviar: { flex: 2 },
});
