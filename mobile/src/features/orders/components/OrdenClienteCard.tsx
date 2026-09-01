import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { formatFecha } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { folioDisplay, statusLabel, statusTone, tipoOrdenLabel } from '../ordenFormat';
import { IconCalendar, IconFlecha, IconPin } from './icons';

interface Props {
  orden: OrdenListItem;
  onPress: (orden: OrdenListItem) => void;
}

/**
 * Tarjeta de orden del **portal cliente**: solo lectura. No lleva el botón de
 * acción de `OrdenCard` («Atender orden») porque el cliente no ejecuta nada;
 * abre el resumen y ya. Familia marino + dorado, como el resto del portal.
 */
export function OrdenClienteCard({ orden, onPress }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const tono = statusTone(orden.status, colors);

  const animar = (activar: boolean) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: activar ? 0.985 : 1,
      duration: activar ? 90 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const fecha = formatFecha(orden.fecha_inicio) || formatFecha(orden.fecha_creacion);

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Orden ${folioDisplay(orden)}, ${statusLabel(orden.status)}`}
        accessibilityHint="Abre el resumen del servicio"
        onPress={() => onPress(orden)}
        onPressIn={() => animar(true)}
        onPressOut={() => animar(false)}
        style={({ pressed }) => [
          styles.tarjeta,
          {
            backgroundColor: colors.surface,
            borderColor: pressed ? colors.gold : colors.line,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={styles.cabecera}>
          <Text style={[styles.folio, { color: colors.ink }]}>{folioDisplay(orden)}</Text>
          <View style={[styles.chip, { backgroundColor: tono.bg }]}>
            <Text style={[styles.chipTexto, { color: tono.text }]}>{statusLabel(orden.status)}</Text>
          </View>
        </View>

        <Text style={[styles.tipo, { color: colors.inkSubtle }]}>
          {tipoOrdenLabel(orden.tipo_orden)}
        </Text>

        {orden.problematica ? (
          <Text style={[styles.problematica, { color: colors.inkMuted }]} numberOfLines={2}>
            {orden.problematica}
          </Text>
        ) : null}

        <View style={styles.datos}>
          {orden.direccion ? (
            <Fila icon={<IconPin color={colors.inkSubtle} size={14} />} texto={orden.direccion} />
          ) : null}
          {fecha ? (
            <Fila icon={<IconCalendar color={colors.inkSubtle} size={13} />} texto={fecha} />
          ) : null}
          {orden.tecnico_asignado_full_name ? (
            <View style={styles.fila}>
              <Avatar
                uri={orden.tecnico_asignado_avatar_url}
                iniciales={inicialesUsuarioDisplay(orden.tecnico_asignado_full_name, 'T')}
                size={26}
                fondo={colors.navy}
                color={colors.onNavy}
              />
              <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                {orden.tecnico_asignado_full_name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pie}>
          <Text style={[styles.verMas, { color: colors.navy }]}>Ver detalle</Text>
          <View style={[styles.flecha, { backgroundColor: colors.gold }]}>
            <IconFlecha color={colors.onGold} size={13} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Fila({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <View style={[styles.filaIcono, { backgroundColor: colors.surfaceSunken }]}>{icon}</View>
      <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={2}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  folio: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3 },
  chip: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  chipTexto: { ...type.caption, fontSize: 11, fontFamily: font.semibold },
  tipo: { ...type.caption, fontSize: 12, marginTop: -4 },
  problematica: { ...type.body, fontSize: 14, lineHeight: 19 },
  datos: { gap: spacing.xs, marginTop: spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filaIcono: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: { ...type.caption, flex: 1, flexShrink: 1 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  verMas: { ...type.label, fontFamily: font.semibold },
  flecha: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
