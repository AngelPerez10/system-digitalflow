import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconCotizaciones } from '@/components/AppNavbar';
import { Avatar } from '@/components/Avatar';
import { IconPerson, IconPhone, IconWrench } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { CotizacionListItem } from '@/types/cotizacion';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { formatFecha } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  clienteDisplay,
  folioDisplay,
  formatCantidad,
  formatMoneda,
  statusLabel,
  statusTone,
  totalMostrado,
} from '../cotizacionFormat';

interface Props {
  cotizacion: CotizacionListItem;
  onPress: (cotizacion: CotizacionListItem) => void;
  /** Posición en la lista: solo las primeras tarjetas entran escalonadas. */
  indice?: number;
}

/**
 * Tarjeta de cotización. Arriba identidad (estatus en la placa, folio, fecha,
 * quién la hizo, cliente y contacto); en medio tres métricas del contenido
 * (conceptos, productos de catálogo y piezas); abajo garantía o el tipo
 * de trabajo y el total.
 */
function CotizacionCardBase({ cotizacion, onPress, indice = 0 }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const animarEntrada = !reduced && indice <= 5;
  const entrada = useRef(new Animated.Value(animarEntrada ? 0 : 1)).current;

  useEffect(() => {
    if (!animarEntrada) return;
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 300,
      delay: indice * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.timing(escala, {
      toValue: destino,
      duration: destino < 1 ? 90 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const tono = statusTone(cotizacion.status, colors);
  const folio = folioDisplay(cotizacion);
  const cliente = clienteDisplay(cotizacion);
  const cancelada = cotizacion.status === 'CANCELADA';
  const total = totalMostrado(cotizacion);
  const autor = cotizacion.creado_por_full_name?.trim() || null;
  const telefono = cotizacion.contacto_telefono || cotizacion.cliente_telefono || '';
  const tipos = cotizacion.tipo_trabajo_nombres.split(',').map((t) => t.trim()).filter(Boolean);
  const conceptosManuales = cotizacion.numero_conceptos - cotizacion.numero_productos;

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [
          { scale: escala },
          { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${folio}, ${cliente}, ${statusLabel(cotizacion.status)}, ${cotizacion.numero_conceptos} conceptos, ${formatCantidad(cotizacion.piezas)} piezas, total ${formatMoneda(total)}${cotizacion.es_garantia ? ', garantía' : ''}`}
        accessibilityHint="Abre el detalle de la cotización"
        onPress={() => onPress(cotizacion)}
        onPressIn={() => presionar(0.98)}
        onPressOut={() => presionar(1)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.line },
          elevationFor(colors, 'card'),
        ]}
      >
        {/* Franja de estatus a la izquierda: el color se lee antes que el texto. */}
        <View style={[styles.franja, { backgroundColor: tono.text }]} />

        <View style={styles.cabeza}>
          <View style={[styles.placa, { backgroundColor: tono.bg }]}>
            <IconCotizaciones color={tono.text} size={20} />
          </View>
          <View style={styles.titulos}>
            <Text style={[styles.meta, { color: colors.inkSubtle }]} numberOfLines={1}>
              <Text style={styles.folio}>{folio}</Text>
              {cotizacion.fecha ? `  ·  ${formatFecha(cotizacion.fecha)}` : ''}
            </Text>
            <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={1}>
              {cliente}
            </Text>
            <View style={styles.contactoFila}>
              <IconPerson color={colors.inkSubtle} size={12} />
              <Text style={[styles.contacto, { color: cotizacion.contacto ? colors.inkMuted : colors.inkSubtle }]} numberOfLines={1}>
                {cotizacion.contacto || 'Sin contacto'}
                {cotizacion.prospecto ? '  ·  Prospecto' : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.pill, { backgroundColor: tono.bg }]}>
            <View style={[styles.pillPunto, { backgroundColor: tono.text }]} />
            <Text style={[styles.pillTexto, { color: tono.text }]}>{statusLabel(cotizacion.status)}</Text>
          </View>
        </View>

        <View style={[styles.metricas, { backgroundColor: colors.surfaceSunken }]}>
          <Metrica valor={String(cotizacion.numero_conceptos)} label={cotizacion.numero_conceptos === 1 ? 'Concepto' : 'Conceptos'} />
          <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
          <Metrica
            valor={String(cotizacion.numero_productos)}
            label={cotizacion.numero_productos === 1 ? 'Producto' : 'Productos'}
            detalle={conceptosManuales > 0 ? `+${conceptosManuales} servicio${conceptosManuales === 1 ? '' : 's'}` : undefined}
          />
          <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
          <Metrica valor={formatCantidad(cotizacion.piezas)} label="Piezas" />
        </View>

        {/* Quién la creó y el teléfono del cliente (tocar llama). */}
        <View style={[styles.personas, { borderTopColor: colors.line, borderBottomColor: colors.line }]}>
          <View style={styles.autor} accessible accessibilityLabel={`Creada por ${autor ?? 'usuario desconocido'}`}>
            <Avatar
              uri={cotizacion.creado_por_avatar_url}
              iniciales={inicialesUsuarioDisplay(autor ?? '', '?')}
              size={32}
              fondo={colors.navy}
              color={colors.onNavy}
              borderColor={colors.line}
            />
            <View style={styles.autorTextos}>
              <Text style={[styles.personasLabel, { color: colors.inkSubtle }]}>Creó</Text>
              <Text style={[styles.personasValor, { color: autor ? colors.ink : colors.inkSubtle }]} numberOfLines={1}>
                {autor ?? 'Sin registro'}
              </Text>
            </View>
          </View>
          {telefono ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Llamar al ${telefono}`}
              onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
              hitSlop={6}
              style={({ pressed }) => [
                styles.telefono,
                { backgroundColor: pressed ? colors.statusResueltoBg : colors.surfaceSunken },
              ]}
            >
              <IconPhone color={colors.statusResueltoText} size={13} />
              <Text style={[styles.telefonoTexto, { color: colors.ink }]} numberOfLines={1}>
                {telefono}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.telefono, { backgroundColor: colors.surfaceSunken }]}>
              <IconPhone color={colors.inkSubtle} size={13} />
              <Text style={[styles.telefonoTexto, { color: colors.inkSubtle }]}>Sin teléfono</Text>
            </View>
          )}
        </View>

        <View style={styles.pie}>
          <View style={styles.pieIzq}>
            {cotizacion.es_garantia ? (
              <View style={[styles.chip, { backgroundColor: colors.goldSoftBg }]}>
                <Text style={[styles.chipTexto, { color: colors.goldSoftText }]}>Garantía</Text>
              </View>
            ) : tipos.length > 0 ? (
              <View style={[styles.chip, { backgroundColor: colors.statusPausadoBg }]}>
                <IconWrench color={colors.statusPausadoText} size={11} />
                <Text style={[styles.chipTexto, { color: colors.statusPausadoText }]} numberOfLines={1}>
                  {tipos[0]}
                  {tipos.length > 1 ? ` +${tipos.length - 1}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.totalCaja}>
            <Text style={[styles.totalLabel, { color: colors.inkSubtle }]}>Total</Text>
            <Text
              style={[styles.total, { color: cancelada ? colors.inkSubtle : colors.ink }, cancelada ? styles.tachado : null]}
              numberOfLines={1}
            >
              {formatMoneda(total)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Metrica({ valor, label, detalle }: { valor: string; label: string; detalle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metrica}>
      <Text style={[styles.metricaValor, { color: colors.ink }]}>{valor}</Text>
      <Text style={[styles.metricaLabel, { color: colors.inkSubtle }]} numberOfLines={1}>
        {label}
      </Text>
      {detalle ? (
        <Text style={[styles.metricaDetalle, { color: colors.inkSubtle }]} numberOfLines={1}>
          {detalle}
        </Text>
      ) : null}
    </View>
  );
}

export const CotizacionCard = memo(CotizacionCardBase);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
    gap: spacing.md,
    overflow: 'hidden',
  },
  franja: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: { width: 42, height: 42, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  meta: { ...type.caption, fontSize: 12 },
  folio: { ...type.mono, fontSize: 12 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  contactoFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contacto: { ...type.caption, fontSize: 13, flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillPunto: { width: 6, height: 6, borderRadius: 3 },
  pillTexto: { fontFamily: font.semibold, fontSize: 11 },
  metricas: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  metrica: { flex: 1, alignItems: 'center', gap: 1 },
  metricaValor: { fontFamily: font.bold, fontSize: 17, lineHeight: 21, fontVariant: ['tabular-nums'] },
  metricaLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  metricaDetalle: { ...type.caption, fontSize: 10, lineHeight: 12 },
  metricaDivisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  personas: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  autor: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  autorTextos: { flex: 1, minWidth: 0 },
  personasLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  personasValor: { fontFamily: font.semibold, fontSize: 13 },
  telefono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    maxWidth: '52%',
  },
  telefonoTexto: { ...type.mono, fontSize: 12, fontFamily: font.semibold, flexShrink: 1 },
  pie: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  pieIzq: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  chipTexto: { fontFamily: font.semibold, fontSize: 11, flexShrink: 1 },
  totalCaja: { alignItems: 'flex-end' },
  totalLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase' },
  total: { fontFamily: font.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
});
