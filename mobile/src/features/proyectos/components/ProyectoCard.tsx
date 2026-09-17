import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, radius, spacing, type } from '@/theme/tokens';
import type { ProyectoListItem } from '@/types/proyecto';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { formatFecha } from '@/utils/fecha';
import {
  clienteDisplay,
  folioDisplay,
  primeraFechaInicio,
  statusLabel,
  statusSolid,
  statusTone,
  tecnicoResponsableDisplay,
} from '../proyectoFormat';
import { IconCalendar, IconFlecha, IconNote, IconPerson } from '@/features/orders/components/icons';
import { colorPorAvance } from './PorcentajeAvance';
import { ProyectoStatusIcon } from './ProyectoStatusIcon';

interface Props {
  proyecto: ProyectoListItem;
  onPress: (proyecto: ProyectoListItem) => void;
}

/** Tarjeta de proyecto — mismo lenguaje visual que `OrdenCard`. */
export function ProyectoCard({ proyecto, onPress }: Props) {
  const { colors } = useTheme();
  const folio = folioDisplay(proyecto);
  const cliente = clienteDisplay(proyecto);
  const acento = statusSolid(proyecto.status, colors);
  const tono = statusTone(proyecto.status, colors);
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const fecha = primeraFechaInicio(proyecto);
  const auxiliaresDisplay = proyecto.auxiliares.map((a) => a.nombre).join(', ');
  const avanceTono = colorPorAvance(proyecto.porcentaje_avance, colors);
  const notaDia1 = proyecto.notas_por_dia[0]?.nota.trim() || '';

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Proyecto ${folio}, ${cliente}`}
        accessibilityHint="Abre el detalle del proyecto"
        onPress={() => onPress(proyecto)}
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
              <Text style={[styles.folio, { color: colors.inkMuted, borderColor: colors.lineStrong }]}>{folio}</Text>
              {proyecto.tipo_trabajo_nombre ? (
                <View style={[styles.tipoChip, { backgroundColor: colors.surfaceSunken }]}>
                  <Text style={[styles.tipoTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                    {proyecto.tipo_trabajo_nombre}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: tono.bg }]}>
              <ProyectoStatusIcon status={proyecto.status} color={tono.text} size={11} />
              <Text style={[styles.statusTexto, { color: tono.text }]}>{statusLabel(proyecto.status)}</Text>
            </View>
          </View>

          <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
            {cliente}
          </Text>

          <View style={styles.filasInfo}>
            <View style={styles.filaDato}>
              <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>
                <IconPerson color={colors.inkMuted} size={12} />
              </View>
              <Text style={[styles.filaTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                {tecnicoResponsableDisplay(proyecto)}
              </Text>
            </View>
            {auxiliaresDisplay ? (
              <View style={styles.filaDato}>
                <View style={[styles.iconoPlaca, { backgroundColor: colors.surfaceSunken }]}>
                  <IconPerson color={colors.inkSubtle} size={12} />
                </View>
                <Text style={[styles.filaTexto, { color: colors.inkSubtle }]} numberOfLines={1}>
                  Auxiliar: {auxiliaresDisplay}
                </Text>
              </View>
            ) : null}
          </View>

          {proyecto.porcentaje_avance > 0 ? (
            <View style={styles.avanceBloque}>
              <View style={styles.avanceEncabezado}>
                <Text style={[styles.avanceLabel, { color: colors.inkSubtle }]}>Avance</Text>
                <Text style={[styles.avanceValor, { color: avanceTono.text }]}>{proyecto.porcentaje_avance}%</Text>
              </View>
              <View style={[styles.avancePista, { backgroundColor: colors.surfaceSunken }]}>
                <View
                  style={[styles.avanceBarra, { backgroundColor: avanceTono.bg, width: `${proyecto.porcentaje_avance}%` }]}
                />
              </View>
            </View>
          ) : null}

          {proyecto.equipos_total > 0 ? (
            <View style={styles.progresoFila}>
              <Text style={[styles.progresoTexto, { color: colors.inkSubtle }]}>
                {proyecto.equipos_entregados}/{proyecto.equipos_total} entregados · {proyecto.equipos_instalados}/
                {proyecto.equipos_total} instalados
              </Text>
            </View>
          ) : null}

          {notaDia1 ? (
            <View style={[styles.bitacoraCaja, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
              <View style={styles.bitacoraEncabezado}>
                <IconNote color={colors.inkSubtle} size={12} />
                <Text style={[styles.bitacoraTitulo, { color: colors.inkMuted }]}>Día 1 de bitácora</Text>
              </View>
              <Text style={[styles.bitacoraTexto, { color: colors.inkSubtle }]} numberOfLines={2}>
                {notaDia1}
              </Text>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            {fecha ? (
              <View style={styles.fechaFila}>
                <IconCalendar color={colors.inkSubtle} size={13} />
                <Text style={[styles.fechaTexto, { color: colors.inkSubtle }]}>{formatFecha(fecha)}</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={[styles.accionBoton, { backgroundColor: colors.navy }]}>
              <Text style={[styles.accionTexto, { color: colors.onNavy }]}>Ver proyecto</Text>
              <IconFlecha color={colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.card, marginBottom: spacing.md, overflow: 'hidden' },
  acento: { width: 3 },
  contenido: { flex: 1, padding: spacing.lg, gap: spacing.md },
  filaSuperior: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, flex: 1 },
  folio: { ...type.mono, fontSize: 12, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tipoChip: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tipoTexto: { ...type.caption, fontSize: 11 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusTexto: { ...type.caption, fontSize: 11, fontFamily: type.label.fontFamily },
  cliente: { ...type.bodyMedium, fontSize: 16, flexShrink: 1 },
  filasInfo: { gap: spacing.sm },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconoPlaca: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { ...type.caption, flex: 1 },
  progresoFila: { marginTop: -spacing.xs },
  progresoTexto: { ...type.caption, fontSize: 11 },
  avanceBloque: { gap: 4 },
  avanceEncabezado: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  avanceLabel: { ...type.caption, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  avanceValor: { ...type.label, fontSize: 12, fontVariant: ['tabular-nums'] },
  avancePista: { height: 5, borderRadius: 3, overflow: 'hidden' },
  avanceBarra: { height: '100%', borderRadius: 3 },
  bitacoraCaja: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 3 },
  bitacoraEncabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bitacoraTitulo: { ...type.caption, fontSize: 11, fontFamily: type.label.fontFamily },
  bitacoraTexto: { ...type.caption, fontSize: 12, lineHeight: 17 },
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
  accionBoton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  accionTexto: { ...type.label, fontSize: 12 },
});
