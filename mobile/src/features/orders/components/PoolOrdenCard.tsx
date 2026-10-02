import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconAlerta, IconCalendar, IconCheck, IconClock, IconClose, IconFlecha, IconPin } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { OrdenListItem } from '@/types/orden';
import { abrirEnlace, esEnlaceUbicacion } from '@/utils/abrirEnlace';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { clienteDisplay, folioDisplay, haceCuanto, prioridadLabel, prioridadTone, tipoOrdenLabel } from '../ordenFormat';
import { TipoOrdenIcon } from './icons';

export type FaseToma = 'reposo' | 'confirmando' | 'tomando' | 'tomada';

interface Props {
  orden: OrdenListItem;
  fase: FaseToma;
  /** Otra orden se está tomando: esta se bloquea para no disparar dos. */
  bloqueada?: boolean;
  /** Posición en la lista: solo las primeras tarjetas entran escalonadas. */
  indice?: number;
  /** Primer toque: pide confirmar. Segundo toque (en «confirmando»): toma. */
  onTomar: (orden: OrdenListItem) => void;
  onCancelar: () => void;
  /** La animación de salida terminó: ya se puede quitar de la lista. */
  onSalida: (orden: OrdenListItem) => void;
}

/**
 * Tarjeta de una orden disponible. Tomar es una decisión, no un toque
 * accidental al hacer scroll: el botón pide un segundo toque para confirmar
 * (se transforma ahí mismo, sin diálogo) y, al tomarla, la tarjeta se despide
 * con una palomita antes de salir de la lista.
 */
export function PoolOrdenCard({ orden, fase, bloqueada = false, indice = 0, onTomar, onCancelar, onSalida }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const prio = prioridadTone(orden.prioridad_pool, colors);

  const animarEntrada = !reduced && indice <= 5;
  const entrada = useRef(new Animated.Value(animarEntrada ? 0 : 1)).current;
  const salida = useRef(new Animated.Value(1)).current;
  const confirmar = useRef(new Animated.Value(0)).current;
  const presion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animarEntrada) return;
    Animated.timing(entrada, {
      toValue: 1,
      duration: 340,
      delay: Math.min(indice, 5) * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El botón cruza de «Tomar orden» (marino) a «Confirmar» (dorado).
  useEffect(() => {
    const destino = fase === 'confirmando' || fase === 'tomando' || fase === 'tomada' ? 1 : 0;
    if (reduced) {
      confirmar.setValue(destino);
      return;
    }
    Animated.timing(confirmar, {
      toValue: destino,
      duration: destino ? 200 : 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fase, confirmar, reduced]);

  // Tomada: se sostiene la palomita un instante y la tarjeta sale.
  useEffect(() => {
    if (fase !== 'tomada') return;
    if (reduced) {
      onSalida(orden);
      return;
    }
    Animated.sequence([
      Animated.delay(MOTION.success),
      Animated.timing(salida, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onSalida(orden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.timing(presion, {
      toValue: destino,
      duration: destino < 1 ? 90 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const folio = folioDisplay(orden);
  const cliente = clienteDisplay(orden);
  const fecha = formatFecha(orden.fecha_inicio);
  const hora = formatHora(orden.hora_inicio);
  const cuando = [fecha, hora].filter((p) => p && p !== '—').join(' · ');
  const espera = haceCuanto(orden.liberada_at);
  const direccion = orden.direccion?.trim() || null;
  const esMapa = direccion ? esEnlaceUbicacion(direccion) : false;
  const ocupado = fase === 'tomando' || fase === 'tomada';

  const abrirMapa = () => {
    if (!direccion) return;
    const url = esMapa ? direccion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    void abrirEnlace(url, 'No se pudo abrir el mapa. Verifica que tengas una app de mapas instalada.');
  };

  const etiquetaBoton =
    fase === 'confirmando'
      ? `Confirmar: tomar la orden ${folio}`
      : fase === 'tomada'
        ? `Orden ${folio} tomada`
        : `Tomar la orden ${folio}`;

  return (
    <Animated.View
      style={{
        opacity: Animated.multiply(entrada, salida),
        transform: [
          { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: salida.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }}
    >
      <View
        style={[
          styles.tarjeta,
          {
            backgroundColor: colors.surface,
            borderColor: fase === 'confirmando' ? colors.gold : colors.line,
            ...elevationFor(colors, 'card'),
          },
        ]}
      >
        <View style={[styles.lomo, { backgroundColor: prio.text }]} importantForAccessibility="no" />

        <View style={styles.cuerpo}>
          <View style={styles.cabeza}>
            <View style={[styles.placa, { backgroundColor: prio.bg }]} importantForAccessibility="no">
              <TipoOrdenIcon tipo={orden.tipo_orden} color={prio.text} size={18} />
            </View>
            <View style={styles.titulos}>
              <View style={styles.metaFila}>
                <Text style={[styles.folio, { color: colors.inkMuted }]} numberOfLines={1}>
                  {folio}
                </Text>
                <View style={[styles.separador, { backgroundColor: colors.lineStrong }]} />
                <Text style={[styles.tipo, { color: colors.inkSubtle }]} numberOfLines={1}>
                  {tipoOrdenLabel(orden.tipo_orden)}
                </Text>
              </View>
              <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
                {cliente}
              </Text>
            </View>
            <View
              style={[styles.prioridad, { backgroundColor: prio.bg }]}
              accessible
              accessibilityLabel={`Prioridad ${prioridadLabel(orden.prioridad_pool).toLowerCase()}`}
            >
              <View style={[styles.prioridadPunto, { backgroundColor: prio.text }]} />
              <Text style={[styles.prioridadTexto, { color: prio.text }]}>{prioridadLabel(orden.prioridad_pool)}</Text>
            </View>
          </View>

          {orden.problematica ? (
            <View style={[styles.nota, { backgroundColor: colors.surfaceSunken }]}>
              <IconAlerta color={colors.statusPendienteText} size={13} />
              <Text style={[styles.notaTexto, { color: colors.inkMuted }]} numberOfLines={3}>
                {orden.problematica}
              </Text>
            </View>
          ) : null}

          {direccion || cuando ? (
            <View style={styles.datos}>
              {cuando ? (
                <View style={[styles.dato, { borderColor: colors.line }]}>
                  <IconCalendar color={colors.inkSubtle} size={13} />
                  <Text style={[styles.datoTexto, styles.mono, { color: colors.inkMuted }]} numberOfLines={1}>
                    {cuando}
                  </Text>
                </View>
              ) : null}
              {direccion ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={esMapa ? 'Ver ubicación en el mapa' : `Abrir en el mapa: ${direccion}`}
                  onPress={abrirMapa}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.dato,
                    { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : 'transparent' },
                  ]}
                >
                  <IconPin color={colors.primary} size={13} />
                  <Text style={[styles.datoTexto, { color: colors.ink }]} numberOfLines={1}>
                    {esMapa ? 'Ver en el mapa' : direccion}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.pie, { borderTopColor: colors.line }]}>
            <View style={styles.espera}>
              {fase === 'confirmando' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar, no tomar la orden"
                  onPress={onCancelar}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.cancelar,
                    { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
                  ]}
                >
                  <IconClose color={colors.inkMuted} size={14} />
                  <Text style={[styles.cancelarTexto, { color: colors.inkMuted }]}>Cancelar</Text>
                </Pressable>
              ) : (
                <>
                  <IconClock color={colors.inkSubtle} size={12} />
                  <Text style={[styles.esperaTexto, { color: colors.inkSubtle }]} numberOfLines={1}>
                    {espera ? `Liberada ${espera}` : 'Sin técnico asignado'}
                  </Text>
                </>
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: presion }] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={etiquetaBoton}
                accessibilityHint={fase === 'confirmando' ? 'Te asigna esta orden' : 'Pide confirmación antes de asignarte la orden'}
                accessibilityState={{ disabled: bloqueada || ocupado, busy: fase === 'tomando' }}
                disabled={bloqueada || ocupado}
                onPress={() => onTomar(orden)}
                onPressIn={() => presionar(0.96)}
                onPressOut={() => presionar(1)}
                style={[styles.tomar, { backgroundColor: bloqueada ? colors.navyDisabled : colors.navy }]}
              >
                {/* Capa dorada de confirmación: cruza encima del marino. */}
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, styles.tomarCapa, { backgroundColor: colors.gold, opacity: confirmar }]}
                />
                {fase === 'tomando' ? (
                  <ActivityIndicator size="small" color={colors.onGold} />
                ) : fase === 'tomada' ? (
                  <>
                    <Text style={[styles.tomarTexto, { color: colors.onGold }]}>Tomada</Text>
                    <View style={[styles.tomarIcono, { backgroundColor: colors.onGold }]}>
                      <IconCheck color={colors.gold} size={14} />
                    </View>
                  </>
                ) : fase === 'confirmando' ? (
                  <>
                    <Text style={[styles.tomarTexto, { color: colors.onGold }]}>Confirmar</Text>
                    <View style={[styles.tomarIcono, { backgroundColor: colors.onGold }]}>
                      <IconCheck color={colors.gold} size={14} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tomarTexto, { color: colors.onNavy }]}>Tomar orden</Text>
                    <View style={[styles.tomarIcono, { backgroundColor: colors.gold }]}>
                      <IconFlecha color={colors.onGold} size={12} />
                    </View>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const PLACA = 42;

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  lomo: { width: 4 },
  cuerpo: { flex: 1, padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: { width: PLACA, height: PLACA, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { ...type.mono, fontSize: 12, flexShrink: 0 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  tipo: { ...type.caption, fontSize: 12, flexShrink: 1 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  prioridad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  prioridadPunto: { width: 6, height: 6, borderRadius: 3 },
  prioridadTexto: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  nota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notaTexto: { ...type.caption, flex: 1, fontSize: 13, lineHeight: 18 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dato: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  datoTexto: { ...type.label, fontSize: 12, flexShrink: 1 },
  mono: { ...type.mono, fontSize: 12 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  espera: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  esperaTexto: { ...type.caption, fontSize: 12 },
  cancelar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TOUCH_TARGET - 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  cancelarTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  tomar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET - 4,
    minWidth: 148,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    overflow: 'hidden',
  },
  tomarCapa: { borderRadius: radius.pill },
  tomarTexto: { ...type.button, fontFamily: font.semibold, fontSize: 14 },
  tomarIcono: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
