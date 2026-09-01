import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, type, type ThemeColors } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  accionLabel,
  clienteDisplay,
  esEnlaceUbicacion,
  folioDisplay,
  statusLabel,
  statusSolid,
  statusTone,
  tipoOrdenLabel,
} from '../ordenFormat';
import { FallaBox } from './FallaBox';
import {
  IconCalendar,
  IconFlecha,
  IconPhone,
  IconPin,
  TipoOrdenIcon,
} from './icons';

interface Props {
  orden: OrdenListItem;
  onPress: (orden: OrdenListItem) => void;
}

function FilaDato({
  icon,
  children,
  accessoryLabel: label,
  colors,
}: {
  icon: React.ReactNode;
  children: string;
  accessoryLabel?: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.filaDato}>
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>{icon}</View>
      <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={2}>
        {children}
        {label ? <Text style={{ color: colors.inkSubtle }}> {label}</Text> : null}
      </Text>
    </View>
  );
}

function FilaUbicacion({ direccion, colors }: { direccion: string; colors: ThemeColors }) {
  if (esEnlaceUbicacion(direccion)) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Ver ubicación en el mapa"
        onPress={() =>
          void abrirEnlace(direccion, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.')
        }
        style={styles.filaDato}
        hitSlop={4}
      >
        <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>
          <IconPin color={colors.navy} size={12} />
        </View>
        <Text style={[styles.enlaceUbicacion, { color: colors.navy }]}>Ver ubicación en el mapa</Text>
      </Pressable>
    );
  }
  return (
    <FilaDato icon={<IconPin color={colors.navy} size={12} />} colors={colors}>
      {direccion}
    </FilaDato>
  );
}

function FilaTelefono({
  telefono,
  contacto,
  colors,
}: {
  telefono: string;
  contacto: string | null;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Llamar al ${telefono}`}
      onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
      style={styles.filaDato}
      hitSlop={4}
    >
      <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>
        <IconPhone color={colors.navy} size={12} />
      </View>
      <Text style={[styles.filaTexto, { color: colors.inkMuted }]}>
        <Text style={[styles.enlaceUbicacion, { color: colors.navy }]}>{telefono}</Text>
        {contacto ? <Text style={{ color: colors.inkSubtle }}> ({contacto})</Text> : null}
      </Text>
    </Pressable>
  );
}

/**
 * Tarjeta de orden — barra de acento por estatus, folio, falla y CTA.
 * Colores del tema activo (claro / oscuro).
 */
export function OrdenCard({ orden, onPress }: Props) {
  const { colors } = useTheme();
  const folio = folioDisplay(orden);
  const cliente = clienteDisplay(orden);
  const acento = statusSolid(orden.status, colors);
  const tono = statusTone(orden.status, colors);
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const fechaTexto = [formatFecha(orden.fecha_inicio), formatHora(orden.hora_inicio)]
    .filter((parte) => parte && parte !== '—')
    .join(' · ');

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Orden ${folio}, ${cliente}`}
        accessibilityHint="Abre el detalle de la orden"
        onPress={() => onPress(orden)}
        onPressIn={() => animarA(0.985)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.card,
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
              <Text
                style={[
                  styles.folio,
                  { color: colors.inkMuted, borderColor: colors.lineStrong },
                ]}
              >
                {folio}
              </Text>
              <View style={[styles.tipoChip, { backgroundColor: colors.surfaceSunken }]}>
                <TipoOrdenIcon tipo={orden.tipo_orden} color={colors.inkSubtle} size={11} />
                <Text style={[styles.tipoTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                  {tipoOrdenLabel(orden.tipo_orden)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: tono.bg }]}>
              <Text style={[styles.statusTexto, { color: tono.text }]}>{statusLabel(orden.status)}</Text>
            </View>
          </View>

          <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
            {cliente}
          </Text>

          {orden.problematica ? (
            <FallaBox
              titulo={orden.status === 'pausado' ? 'Motivo de la pausa' : 'Falla reportada'}
              texto={
                orden.status === 'pausado' && orden.motivo_pausa ? orden.motivo_pausa : orden.problematica
              }
              numberOfLines={3}
            />
          ) : null}

          <View style={styles.filasInfo}>
            {orden.direccion ? <FilaUbicacion direccion={orden.direccion} colors={colors} /> : null}
            {orden.telefono_cliente ? (
              <FilaTelefono
                telefono={orden.telefono_cliente}
                contacto={orden.nombre_cliente}
                colors={colors}
              />
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            {fechaTexto ? (
              <View style={styles.fechaFila}>
                <IconCalendar color={colors.inkSubtle} size={13} />
                <Text style={[styles.fechaTexto, { color: colors.inkSubtle }]}>{fechaTexto}</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={[styles.accionBoton, { backgroundColor: colors.navy }]}>
              <Text style={[styles.accionTexto, { color: colors.onNavy }]}>
                {accionLabel(orden.status)}
              </Text>
              <IconFlecha color={colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.card,
    marginBottom: spacing.md,
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
  cliente: { ...type.bodyMedium, fontSize: 16, flexShrink: 1 },
  filasInfo: { gap: spacing.sm },
  filaDato: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconoPlaca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  filaTexto: { ...type.caption, flex: 1, marginTop: 2 },
  enlaceUbicacion: { ...type.label, fontSize: 13 },
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
