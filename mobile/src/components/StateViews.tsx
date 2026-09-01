import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { AppButton } from './AppButton';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.muted, { color: colors.inkMuted }]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <InlineError message={message} />
        {onRetry ? <AppButton label="Reintentar" variant="secondary" onPress={onRetry} style={styles.action} /> : null}
      </View>
    </SafeAreaView>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      {icon}
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text>
      {description ? <Text style={[styles.muted, { color: colors.inkMuted }]}>{description}</Text> : null}
    </View>
  );
}

function AlertGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8.5v4.2M12 16.4h.01M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Aviso en línea. No bloquea el contenido ya cargado. */
export function InlineError({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.errorBox,
        { backgroundColor: colors.dangerBg, borderColor: colors.dangerLine },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.errorGlyph}>
        <AlertGlyph color={colors.danger} />
      </View>
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  muted: { ...type.body, textAlign: 'center' },
  emptyTitle: { ...type.title, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  errorGlyph: { paddingTop: 2 },
  errorText: { ...type.body, flex: 1 },
  action: { alignSelf: 'stretch' },
});
