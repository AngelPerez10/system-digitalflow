import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { IconClose } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import {
  TERMINOS_SERVICIO_PARRAFOS,
  TERMINOS_SERVICIO_RESUMEN,
  TERMINOS_SERVICIO_TITULO,
} from './terminosServicio';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Hoja inferior con el texto completo de los términos de servicio en sitio.
 * Se abre desde el enlace azul de la casilla de aceptación del registro.
 *
 * `onRequestClose` cubre el botón atrás de Android; el velo y la «X» cierran
 * en ambas plataformas. El texto vive en un `ScrollView` acotado a ~78 % de
 * alto para que el botón «Entendido» quede siempre visible.
 */
export function TerminosModal({ visible, onClose }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Velo marino de la marca, no negro plano (coincide con el resto de modales).
  const backdrop = scheme === 'dark' ? 'rgba(8, 12, 28, 0.6)' : 'rgba(23, 35, 91, 0.3)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Cerrar términos"
          onPress={onClose}
        >
          <View style={[styles.backdrop, { backgroundColor: backdrop }]} />
        </Pressable>

        <View
          style={[
            styles.hoja,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <View
            style={styles.asa}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <View style={[styles.asaBarra, { backgroundColor: colors.lineStrong }]} />
          </View>

          <View style={[styles.chrome, { borderBottomColor: colors.line }]}>
            <Text
              accessibilityRole="header"
              style={[styles.titulo, { color: colors.ink }]}
            >
              {TERMINOS_SERVICIO_TITULO}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.cerrar,
                { backgroundColor: colors.surfaceSunken },
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <IconClose color={colors.inkMuted} size={18} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContenido}
            showsVerticalScrollIndicator
            bounces={false}
          >
            <Text style={[styles.resumen, { color: colors.ink }]}>
              {TERMINOS_SERVICIO_RESUMEN}
            </Text>
            {TERMINOS_SERVICIO_PARRAFOS.map((parrafo, i) => (
              <Text key={i} style={[styles.parrafo, { color: colors.inkMuted }]}>
                {parrafo}
              </Text>
            ))}
          </ScrollView>

          <AppButton
            label="Entendido"
            onPress={onClose}
            accessibilityHint="Cierra los términos y vuelve al registro"
            style={styles.boton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  hoja: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.xl,
    maxHeight: '82%',
  },
  asa: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  asaBarra: { width: 40, height: 4, borderRadius: radius.pill },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  titulo: { ...type.title, flex: 1 },
  cerrar: {
    width: TOUCH_TARGET - 12,
    height: TOUCH_TARGET - 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexShrink: 1 },
  scrollContenido: { paddingVertical: spacing.lg, gap: spacing.md },
  resumen: { ...type.bodyMedium, lineHeight: 22 },
  parrafo: { ...type.caption, lineHeight: 20 },
  boton: { marginTop: spacing.xs },
});
