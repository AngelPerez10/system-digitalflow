import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconBox, IconCalendar, IconFlecha, IconNote, IconPause, IconVisto } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { ProyectoListItem } from '@/types/proyecto';
import { formatFecha, hoyISO } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  clienteDisplay,
  diasDeTrabajo,
  folioDisplay,
  primeraFechaInicio,
  resumenEquipo,
  statusLabel,
  statusTone,
} from '../proyectoFormat';
import { AnilloAvance } from './AnilloAvance';
import { ProyectoStatusIcon } from './ProyectoStatusIcon';

interface Props {
  proyecto: ProyectoListItem;
  onPress: (proyecto: ProyectoListItem) => void;
  /** Posición en la lista: escalona la entrada de las primeras tarjetas. */
  indice?: number;
}

/** Hasta tres avatares encimados con iniciales + el nombre principal. */
function Equipo({ proyecto }: { proyecto: ProyectoListItem }) {
  const { colors } = useTheme();
  const { nombres, titulo, extra } = resumenEquipo(proyecto);
  const visibles = nombres.slice(0, 3);
  // Fondos con texto blanco legible en ambos temas.
  const fondos = [colors.navy, colors.primary, colors.navyDeep];
  return (
    <View
      style={styles.equipo}
      accessible
      accessibilityLabel={nombres.length ? `Equipo: ${nombres.join(', ')}` : 'Sin técnico asignado'}
    >
      {visibles.length > 0 ? (
        <View style={styles.avatares}>
          {visibles.map((nombre, i) => (
            <View
              key={`${nombre}-${i}`}
              style={[
                styles.avatar,
                { backgroundColor: fondos[i % fondos.length], borderColor: colors.surface, marginLeft: i === 0 ? 0 : -8 },
              ]}
            >
              <Text style={[styles.avatarTexto, { color: colors.onNavy }]}>{inicialesUsuarioDisplay(nombre, '?')}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={[styles.equipoTexto, { color: nombres.length ? colors.inkMuted : colors.inkSubtle }]} numberOfLines={1}>
        {titulo}
        {extra > 0 ? <Text style={{ color: colors.inkSubtle }}>{`  +${extra}`}</Text> : null}
      </Text>
    </View>
  );
}

/** Una celda del bloque de métricas: valor, etiqueta y minibarra opcional. */
function Metrica({
  icon,
  valor,
  label,
  fraccion,
  color,
}: {
  icon: React.ReactNode;
  valor: string;
  label: string;
  /** 0–1 para la minibarra; `undefined` = sin barra. */
  fraccion?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const completa = fraccion === 1;
  return (
    <View style={styles.metrica} accessible accessibilityLabel={`${label}: ${valor}`}>
      <View style={styles.metricaCabeza}>
        {icon}
        <Text style={[styles.metricaValor, { color: completa ? colors.statusResueltoText : colors.ink }]}>{valor}</Text>
      </View>
      <Text style={[styles.metricaLabel, { color: colors.inkSubtle }]} numberOfLines={1}>
        {label}
      </Text>
      {fraccion !== undefined ? (
        <View style={[styles.miniPista, { backgroundColor: colors.line }]}>
          <View
            style={[
              styles.miniRelleno,
              {
                width: `${Math.round(fraccion * 100)}%`,
                backgroundColor: completa ? colors.statusResueltoText : (color ?? colors.primary),
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Tarjeta de proyecto. Arriba identidad (estatus en la placa, folio, tipo,
 * cliente) y el anillo de avance; en medio el equipo y tres métricas
 * (entregados, instalados, días de bitácora); abajo la fecha y la acción.
 */
export function ProyectoCard({ proyecto, onPress, indice = 0 }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  // Entrada: solo las primeras tarjetas se escalonan; el resto aparece ya.
  const retraso = Math.min(indice, 5) * 60;
  const entrada = useRef(new Animated.Value(reduced || indice > 5 ? 1 : 0)).current;

  useEffect(() => {
    if (reduced || indice > 5) return;
    Animated.timing(entrada, {
      toValue: 1,
      duration: 320,
      delay: retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const folio = folioDisplay(proyecto);
  const cliente = clienteDisplay(proyecto);
  const tono = statusTone(proyecto.status, colors);
  const fecha = primeraFechaInicio(proyecto);
  const trabajaHoy = proyecto.fechas_inicio.includes(hoyISO()) && proyecto.status === 'en_proceso';
  const jornadas = diasDeTrabajo(proyecto).total;
  const diasBitacora = proyecto.notas_por_dia.filter((n) => n.nota.trim() || n.imagenesUrls.length > 0).length;
  const total = proyecto.equipos_total;
  const pausado = proyecto.status === 'pausado';

  const animarA = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.envoltura,
        {
          opacity: entrada,
          transform: [
            { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: escala },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Proyecto ${folio}, ${cliente}, ${statusLabel(proyecto.status)}, avance ${proyecto.porcentaje_avance} por ciento`}
        accessibilityHint="Abre el detalle del proyecto"
        onPress={() => onPress(proyecto)}
        onPressIn={() => animarA(0.98)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: pressed ? tono.text : colors.line,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={styles.cabeza}>
          <View style={[styles.placa, { backgroundColor: tono.bg }]} importantForAccessibility="no">
            <ProyectoStatusIcon status={proyecto.status} color={tono.text} size={18} />
          </View>
          <View style={styles.titulos}>
            <View style={styles.metaFila}>
              <Text style={[styles.folio, { color: colors.inkMuted }]} numberOfLines={1}>
                {folio}
              </Text>
              {proyecto.tipo_trabajo_nombre ? (
                <>
                  <View style={[styles.separador, { backgroundColor: colors.lineStrong }]} />
                  <Text style={[styles.tipo, { color: colors.inkSubtle }]} numberOfLines={1}>
                    {proyecto.tipo_trabajo_nombre}
                  </Text>
                </>
              ) : null}
            </View>
            <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
              {cliente}
            </Text>
            <View style={styles.estatusFila}>
              <View style={[styles.estatusPunto, { backgroundColor: tono.text }]} />
              <Text style={[styles.estatusTexto, { color: tono.text }]}>{statusLabel(proyecto.status)}</Text>
              {trabajaHoy ? (
                <View style={[styles.hoy, { backgroundColor: colors.gold }]}>
                  <Text style={[styles.hoyTexto, { color: colors.onGold }]}>Hoy</Text>
                </View>
              ) : null}
            </View>
          </View>
          <AnilloAvance valor={proyecto.porcentaje_avance} retraso={retraso} />
        </View>

        {pausado && proyecto.motivo_pausa ? (
          <View style={[styles.pausa, { backgroundColor: colors.statusPausadoBg }]}>
            <IconPause color={colors.statusPausadoText} size={12} />
            <Text style={[styles.pausaTexto, { color: colors.statusPausadoText }]} numberOfLines={2}>
              {proyecto.motivo_pausa}
            </Text>
          </View>
        ) : null}

        <Equipo proyecto={proyecto} />

        <View style={[styles.metricas, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
          <Metrica
            icon={<IconBox color={colors.inkSubtle} size={12} />}
            valor={total > 0 ? `${proyecto.equipos_entregados}/${total}` : '—'}
            label="Entregados"
            fraccion={total > 0 ? proyecto.equipos_entregados / total : undefined}
            color={colors.primary}
          />
          <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
          <Metrica
            icon={<IconVisto color={colors.inkSubtle} size={12} />}
            valor={total > 0 ? `${proyecto.equipos_instalados}/${total}` : '—'}
            label="Instalados"
            fraccion={total > 0 ? proyecto.equipos_instalados / total : undefined}
            color={colors.success}
          />
          <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
          <Metrica
            icon={<IconNote color={colors.inkSubtle} size={12} />}
            valor={`${diasBitacora}`}
            label={diasBitacora === 1 ? 'Día bitácora' : 'Días bitácora'}
          />
        </View>

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          <View style={styles.cuando}>
            <IconCalendar color={trabajaHoy ? colors.goldSoftText : colors.inkSubtle} size={13} />
            <Text
              style={[styles.cuandoTexto, { color: trabajaHoy ? colors.goldSoftText : colors.inkSubtle }]}
              numberOfLines={1}
            >
              {fecha ? formatFecha(fecha) : 'Sin fecha'}
              {jornadas > 1 ? ` · ${jornadas} días` : ''}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={[styles.ctaTexto, { color: colors.navyText }]}>Ver proyecto</Text>
            <View style={[styles.ctaFlecha, { backgroundColor: colors.navy }]}>
              <IconFlecha color={colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const PLACA = 42;
const AVATAR = 26;

const styles = StyleSheet.create({
  envoltura: { marginBottom: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: { width: PLACA, height: PLACA, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { ...type.mono, fontSize: 12, flexShrink: 0 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  tipo: { ...type.caption, fontSize: 12, flexShrink: 1 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  estatusFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  estatusPunto: { width: 6, height: 6, borderRadius: 3 },
  estatusTexto: { ...type.caption, fontSize: 12, fontFamily: font.semibold },
  hoy: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1, marginLeft: 2 },
  hoyTexto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 15 },
  pausa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pausaTexto: { ...type.caption, fontSize: 12, flex: 1, marginTop: -1 },
  equipo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatares: { flexDirection: 'row' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: font.semibold, fontSize: 9, letterSpacing: -0.2 },
  equipoTexto: { ...type.label, fontSize: 13, flex: 1 },
  metricas: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingVertical: spacing.sm + 2,
  },
  metrica: { flex: 1, minWidth: 0, paddingHorizontal: spacing.md, gap: 2 },
  metricaDivisor: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  metricaCabeza: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricaValor: { fontFamily: font.semibold, fontSize: 15, lineHeight: 19, fontVariant: ['tabular-nums'] },
  metricaLabel: { ...type.caption, fontSize: 11, lineHeight: 14 },
  miniPista: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  miniRelleno: { height: 3, borderRadius: 2 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  cuando: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  cuandoTexto: { ...type.mono, fontSize: 12, flexShrink: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctaTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  ctaFlecha: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
