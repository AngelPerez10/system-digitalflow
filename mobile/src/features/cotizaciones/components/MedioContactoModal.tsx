import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconClose } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { MedioContacto } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { medioLabel } from '../cotizacionFormat';
import { GRUPOS_MEDIO_CONTACTO, MedioContactoIcon, tonoMedio } from './MedioContactoIcon';

interface Props {
  visible: boolean;
  valor: MedioContacto | '';
  onCerrar: () => void;
  /** `''` quita la selección. */
  onElegir: (medio: MedioContacto | '') => void;
}

/**
 * Hoja inferior para elegir cómo llegó el cliente: los once medios agrupados
 * por canal en mosaicos con icono. Un toque elige y cierra.
 */
export function MedioContactoModal({ visible, valor, onCerrar, onElegir }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} statusBarTranslucent onRequestClose={onCerrar}>
      <View style={styles.flex}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.fondo]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onCerrar}
        />
        <View style={styles.contenedor} pointerEvents="box-none">
          <View
            style={[styles.hoja, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            accessibilityViewIsModal
          >
            <View style={[styles.asa, { backgroundColor: colors.lineStrong }]} />
            <View style={styles.cabeza}>
              <View style={styles.flex}>
                <Text style={[styles.eyebrow, { color: colors.inkSubtle }]}>Medio de contacto</Text>
                <Text style={[styles.titulo, { color: colors.ink }]} accessibilityRole="header">
                  ¿Cómo llegó el cliente?
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={onCerrar}
                hitSlop={8}
                style={({ pressed }) => [styles.cerrar, { backgroundColor: pressed ? colors.line : colors.surfaceSunken }]}
              >
                <IconClose color={colors.inkMuted} size={14} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.grupos} showsVerticalScrollIndicator={false}>
              {GRUPOS_MEDIO_CONTACTO.map((g) => (
                <View key={g.titulo} style={styles.grupo}>
                  <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
                    {g.titulo}
                  </Text>
                  <View style={styles.rejilla} accessibilityRole="radiogroup">
                    {g.medios.map((m) => {
                      const activo = m === valor;
                      const tono = tonoMedio(m, colors);
                      return (
                        <Pressable
                          key={m}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: activo }}
                          accessibilityLabel={medioLabel(m)}
                          onPress={() => onElegir(m)}
                          style={({ pressed }) => [
                            styles.mosaico,
                            {
                              borderColor: activo ? colors.primary : colors.line,
                              borderWidth: activo ? 1.5 : 1,
                              backgroundColor: activo ? colors.primaryRing : pressed ? colors.surfaceSunken : colors.surface,
                            },
                          ]}
                        >
                          <View style={[styles.mosaicoIcono, { backgroundColor: activo ? colors.surface : tono.bg }]}>
                            <MedioContactoIcon medio={m} color={tono.fg} size={20} />
                          </View>
                          <Text
                            style={[styles.mosaicoTexto, { color: activo ? colors.primary : colors.ink }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {medioLabel(m)}
                          </Text>
                          {activo ? (
                            <View style={[styles.marca, { backgroundColor: colors.primary }]}>
                              <IconCheck color={colors.onPrimary} size={10} />
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            {valor ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onElegir('')}
                style={({ pressed }) => [styles.quitar, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface }]}
              >
                <Text style={[styles.quitarTexto, { color: colors.inkMuted }]}>Quitar selección</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { backgroundColor: 'rgba(9, 9, 11, 0.45)' },
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  titulo: { fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, marginTop: 2 },
  cerrar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  grupos: { gap: spacing.lg },
  grupo: { gap: spacing.sm },
  grupoTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mosaico: {
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '32.5%',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: TOUCH_TARGET + 40,
  },
  mosaicoIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mosaicoTexto: { ...type.caption, fontFamily: font.semibold, fontSize: 12 },
  marca: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitar: { minHeight: TOUCH_TARGET, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quitarTexto: { fontFamily: font.semibold, fontSize: 14 },
});
