import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  /** Conteo a la derecha de la etiqueta (0 u omitido = nada). */
  badge?: number;
}

/**
 * Control segmentado con indicador que se desliza bajo la pestaña activa.
 * Pestañas de ancho igual: con 3–4 etiquetas cortas caben en cualquier
 * teléfono sin scroll horizontal.
 */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: {
  tabs: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const indice = Math.max(0, tabs.findIndex((t) => t.key === value));
  const posicion = useRef(new Animated.Value(indice)).current;

  useEffect(() => {
    if (reduced) {
      posicion.setValue(indice);
      return;
    }
    Animated.timing(posicion, {
      toValue: indice,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indice, posicion, reduced]);

  const anchoTab = tabs.length ? (ancho - 8) / tabs.length : 0;
  const medir = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={medir}
      style={[styles.pista, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {ancho > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicador,
            {
              width: anchoTab,
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              transform: [{ translateX: Animated.multiply(posicion, anchoTab) }],
            },
          ]}
        />
      ) : null}
      {tabs.map((tab) => {
        const activo = tab.key === value;
        const badge = tab.badge ?? 0;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={badge > 0 ? `${tab.label}, ${badge}` : tab.label}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <Text
              style={[styles.label, { color: activo ? colors.ink : colors.inkSubtle }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: activo ? colors.navy : colors.line }]}>
                <Text style={[styles.badgeTexto, { color: activo ? colors.onNavy : colors.inkMuted }]}>
                  {badge > 99 ? '99+' : badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md + 4,
    padding: 3,
  },
  indicador: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.md + 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    minHeight: TOUCH_TARGET - 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: spacing.xs,
  },
  label: { fontFamily: font.semibold, fontSize: 13, letterSpacing: -0.1, flexShrink: 1 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeTexto: { fontFamily: font.semibold, fontSize: 10, fontVariant: ['tabular-nums'] },
});
