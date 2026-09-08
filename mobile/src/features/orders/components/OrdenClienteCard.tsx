import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { formatFecha } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  folioDisplay,
  statusLabel,
  statusSolid,
  statusTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { FallaBox } from './FallaBox';
import { IconCalendar, IconFlecha, IconPin, TipoOrdenIcon } from './icons';

interface Props {
  orden: OrdenListItem;
  onPress: (orden: OrdenListItem) => void;
}

/**
 * Tarjeta de orden del **portal cliente**. Misma anatomía que `OrdenCard` del
 * técnico —barra de acento por estatus, folio en placa, chip de tipo, falla en
 * `FallaBox` y pie con separador— para que las dos superficies se lean igual.
 * Solo cambia el pie: el cliente no ejecuta nada, así que en vez de «Atender
 * orden» lleva un «Ver detalle» que abre el resumen en lectura.
 */
export function OrdenClienteCard({ orden, onPress }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const acento = statusSolid(orden.status, colors);
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
            backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
            borderColor: pressed ? colors.gold : colors.line,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={[styles.acento, { backgroundColor: acento.bg }]} />

        <View style={styles.contenido}>
          <View style={styles.filaSuperior}>
            <View style={styles.insignias}>
              <Text style={[styles.folio, { color: colors.inkMuted, borderColor: colors.lineStrong }]}>
                {folioDisplay(orden)}
              </Text>
              <View style={[styles.tipoChip, { backgroundColor: colors.surfaceSunken }]}>
                <TipoOrdenIcon tipo={orden.tipo_orden} color={colors.inkSubtle} size={11} />
                <Text style={[styles.tipoTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                  {tipoOrdenLabel(orden.tipo_orden)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: tono.bg }]}>
              <Text style={[styles.statusTexto, { color: tono.text }]}>
                {statusLabel(orden.status)}
              </Text>
            </View>
          </View>

          {orden.problematica ? (
            <FallaBox
              titulo={orden.status === 'pausado' ? 'Motivo de la pausa' : 'Falla reportada'}
              texto={
                orden.status === 'pausado' && orden.motivo_pausa
                  ? orden.motivo_pausa
                  : orden.problematica
              }
              numberOfLines={3}
            />
          ) : null}

          <View style={styles.filasInfo}>
            {orden.direccion ? (
              <Fila
                icon={<IconPin color={colors.navy} size={12} />}
                texto={orden.direccion}
                colors={colors}
              />
            ) : null}
            {orden.tecnico_asignado_full_name ? (
              <View style={styles.filaDato}>
                <Avatar
                  uri={orden.tecnico_asignado_avatar_url}
                  iniciales={inicialesUsuarioDisplay(orden.tecnico_asignado_full_name, 'T')}
                  size={22}
                  fondo={colors.navy}
                  color={colors.onNavy}
                />
                <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                  {orden.tecnico_asignado_full_name}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            {fecha ? (
              <View style={styles.fechaFila}>
                <IconCalendar color={colors.inkSubtle} size={13} />
                <Text style={[styles.fechaTexto, { color: colors.inkSubtle }]}>{fecha}</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={[styles.accionBoton, { backgroundColor: colors.navy }]}>
              <Text style={[styles.accionTexto, { color: colors.onNavy }]}>Ver detalle</Text>
              <IconFlecha color={colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Fila({
  icon,
  texto,
  colors,
}: {
  icon: React.ReactNode;
  texto: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.filaDato}>
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>{icon}</View>
      <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={2}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  acento: { width: 3 },
  contenido: { flex: 1, padding: spacing.lg, gap: spacing.md },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  insignias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  folio: {
    ...type.mono,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tipoTexto: { ...type.caption, fontSize: 11 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusTexto: { ...type.caption, fontSize: 11, fontFamily: type.label.fontFamily },
  filasInfo: { gap: spacing.sm },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconoPlaca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: { ...type.caption, flex: 1, flexShrink: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  fechaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  fechaTexto: { ...type.mono, fontSize: 12 },
  accionBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accionTexto: { ...type.label, fontSize: 12 },
});
