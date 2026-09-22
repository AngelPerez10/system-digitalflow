import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { IconClose } from './icons';

interface HeaderProps {
  /** Contexto corto arriba del título («Evidencia», «Ubicación del servicio»). */
  eyebrow: string;
  titulo: string;
  onCerrar: () => void;
  cerrarLabel?: string;
  /** Acción secundaria a la derecha (ícono + texto corto). */
  accion?: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

/**
 * Banda marina de las vistas de pantalla completa (mapa, firma). Mismo corte
 * que `EditarHeader`: al abrir un modal desde el formulario no se siente
 * como otra app.
 */
export function ModalHeader({ eyebrow, titulo, onCerrar, cerrarLabel = 'Cerrar', accion }: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banda, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cerrarLabel}
        onPress={onCerrar}
        hitSlop={4}
        style={({ pressed }) => [styles.cerrar, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
      >
        <IconClose color={colors.onNavy} size={16} />
      </Pressable>

      <View style={styles.titulos}>
        <Text style={[styles.eyebrow, { color: colors.onNavyMuted }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={1} accessibilityRole="header">
          {titulo}
        </Text>
      </View>

      {accion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accion.label}
          accessibilityState={{ disabled: accion.disabled }}
          disabled={accion.disabled}
          onPress={accion.onPress}
          hitSlop={4}
          style={({ pressed }) => [
            styles.accion,
            { backgroundColor: pressed ? GLASS_PRESSED : GLASS, opacity: accion.disabled ? 0.4 : 1 },
          ]}
        >
          {accion.icon}
          <Text style={[styles.accionTexto, { color: colors.onNavy }]}>{accion.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pie fijo con la acción principal; respeta el área segura inferior. */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.pie,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Botón principal de pie de modal: ícono + texto, relleno del acento. */
export function ModalPrimaryButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View
        style={[styles.botonPri, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: true, disabled: true }}
      >
        <ActivityIndicator color={colors.onPrimary} size="small" />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botonPri,
        {
          backgroundColor: disabled
            ? colors.primaryDisabled
            : pressed
              ? colors.primaryPressed
              : colors.primary,
        },
      ]}
    >
      {icon}
      <Text style={[styles.botonPriTexto, { color: disabled ? colors.onPrimaryDisabled : colors.onPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Vidrio sobre la banda marina (siempre oscura en ambos temas). */
const GLASS = 'rgba(255,255,255,0.1)';
const GLASS_PRESSED = 'rgba(255,255,255,0.2)';

const styles = StyleSheet.create({
  banda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  cerrar: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  titulo: { fontFamily: font.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.5 },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TOUCH_TARGET - 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  accionTexto: { ...type.label, fontSize: 13 },
  pie: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  botonPri: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
  },
  botonPriTexto: { ...type.button },
});
