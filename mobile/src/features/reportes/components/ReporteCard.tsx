import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconCalendar, IconCamera, IconFlecha } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { Reporte } from '@/types/reporte';
import { formatFecha, hoyISO } from '@/utils/fecha';
import { miniaturaUrl } from '@/utils/miniatura';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  clienteReporte,
  estadoEvidencia,
  estadoLabelCorto,
  estadoTone,
  estadoZonas,
  evidenciaDe,
  folioReporte,
  fotosPortada,
  origenLabel,
  tecnicosDe,
} from '../reporteFormat';
import { EstadoEvidenciaIcon } from './EstadoEvidenciaIcon';

interface Props {
  reporte: Reporte;
  onPress: (reporte: Reporte) => void;
  /** Posición en la lista: escalona la entrada de las primeras tarjetas. */
  indice?: number;
}

const MINIS = 4;
const MINI = 54;
const MAX_SEGMENTOS = 8;

/** Tira de miniaturas: un Antes y un Después por zona; la última dice cuántas más hay. */
function TiraFotos({ reporte, total }: { reporte: Reporte; total: number }) {
  const { colors } = useTheme();
  const fotos = fotosPortada(reporte, MINIS);
  const resto = total - fotos.length;
  return (
    <View style={styles.tira} importantForAccessibility="no-hide-descendants">
      {fotos.map((foto, i) => {
        const ultima = i === fotos.length - 1 && resto > 0;
        return (
          <View key={`${foto.url}-${i}`} style={[styles.mini, { backgroundColor: colors.surfaceSunken }]}>
            {/* Miniatura recortada por Cloudinary (unos KB) con el fundido nativo de Android al llegar. */}
            <Image source={{ uri: miniaturaUrl(foto.url, MINI * 3, 1) }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={220} />
            <View
              style={[
                styles.miniLado,
                { backgroundColor: foto.lado === 'antes' ? colors.gold : colors.success, borderColor: colors.surface },
              ]}
            />
            {ultima ? (
              <View style={styles.miniMas}>
                <Text style={styles.miniMasTexto}>+{resto}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
      <View style={styles.leyenda}>
        <View style={styles.leyendaFila}>
          <View style={[styles.leyendaPunto, { backgroundColor: colors.gold }]} />
          <Text style={[styles.leyendaTexto, { color: colors.inkSubtle }]}>Antes</Text>
        </View>
        <View style={styles.leyendaFila}>
          <View style={[styles.leyendaPunto, { backgroundColor: colors.success }]} />
          <Text style={[styles.leyendaTexto, { color: colors.inkSubtle }]}>Después</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Una barra por zona (verde = completa, índigo = le falta un lado, gris = sin
 * fotos). Crece desde la izquierda una sola vez al aparecer (scaleX, hilo nativo).
 */
function BarraZonas({ reporte, animar, retraso }: { reporte: Reporte; animar: boolean; retraso: number }) {
  const { colors } = useTheme();
  const estados = estadoZonas(reporte);
  const visibles = estados.slice(0, MAX_SEGMENTOS);
  const completas = estados.filter((e) => e === 'completa').length;
  const crecer = useRef(new Animated.Value(animar ? 0 : 1)).current;

  useEffect(() => {
    if (!animar) return;
    const anim = Animated.timing(crecer, {
      toValue: 1,
      duration: 520,
      delay: retraso + 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={styles.zonas}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Zonas con Antes y Después"
      accessibilityValue={{ min: 0, max: estados.length, now: completas, text: `${completas} de ${estados.length}` }}
    >
      <Animated.View style={[styles.segmentos, { transform: [{ scaleX: crecer }] }]}>
        {visibles.map((estado, i) => (
          <View
            key={i}
            style={[
              styles.segmento,
              { backgroundColor: estado === 'sin' ? colors.line : estadoTone(estado, colors).text },
            ]}
          />
        ))}
      </Animated.View>
      <Text style={[styles.zonasTexto, { color: colors.inkMuted }]}>
        <Text style={{ color: colors.ink, fontFamily: font.semibold }}>
          {completas} de {estados.length}
        </Text>{' '}
        {estados.length === 1 ? 'zona completa' : 'zonas completas'}
      </Text>
    </View>
  );
}

/**
 * Tarjeta de reporte, misma gramática que las de Órdenes y Proyectos: placa de
 * color con el estado de la evidencia, folio · origen, el cliente como ancla,
 * la evidencia (miniaturas + avance por zona) y al pie fecha, técnico y la
 * acción. Sin portada a sangre: la tarjeta se lee igual que sus vecinas.
 */
export const ReporteCard = memo(function ReporteCard({ reporte, onPress, indice = 0 }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const anima = !reduced && indice <= 5;
  const retraso = Math.min(indice, 5) * 60;
  const entrada = useRef(new Animated.Value(anima ? 0 : 1)).current;

  useEffect(() => {
    if (!anima) return;
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 320,
      delay: retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const folio = folioReporte(reporte);
  const cliente = clienteReporte(reporte);
  const ev = evidenciaDe(reporte);
  const estado = estadoEvidencia(reporte);
  const tono = estadoTone(estado, colors);
  const esHoy = reporte.fecha_servicio === hoyISO();
  const tecnicos = tecnicosDe(reporte.tecnico_nombre);
  const sinFotos = estado === 'sin';

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
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: escala }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reporte ${folio}, ${cliente}, ${estadoLabelCorto(estado)}, ${ev.fotos} ${ev.fotos === 1 ? 'foto' : 'fotos'}${esHoy ? ', de hoy' : ''}`}
        accessibilityHint="Abre el detalle del reporte"
        onPress={() => onPress(reporte)}
        onPressIn={() => animarA(0.98)}
        onPressOut={() => animarA(1)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: pressed ? tono.text : colors.line, ...elevationFor(colors, 'card') },
        ]}
      >
        <View style={styles.cabeza}>
          <View style={[styles.placa, { backgroundColor: tono.bg }]} importantForAccessibility="no">
            <EstadoEvidenciaIcon estado={estado} color={tono.text} size={18} />
          </View>
          <View style={styles.titulos}>
            <View style={styles.metaFila}>
              <Text style={[styles.folio, { color: colors.inkMuted }]} numberOfLines={1}>
                {folio}
              </Text>
              <View style={[styles.separador, { backgroundColor: colors.lineStrong }]} />
              <Text style={[styles.origen, { color: colors.inkSubtle }]} numberOfLines={1}>
                {origenLabel(reporte)}
                {reporte.orden_folio ? ` ${reporte.orden_folio}` : ''}
              </Text>
            </View>
            <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={2}>
              {cliente}
            </Text>
            <View style={styles.estadoFila}>
              <View style={[styles.estadoPunto, { backgroundColor: tono.text }]} />
              <Text style={[styles.estadoTexto, { color: tono.text }]}>{estadoLabelCorto(estado)}</Text>
            </View>
          </View>
          {esHoy ? (
            <View style={[styles.insignia, { backgroundColor: colors.gold }]}>
              <Text style={[styles.insigniaTexto, { color: colors.onGold }]}>Hoy</Text>
            </View>
          ) : null}
        </View>

        {sinFotos ? (
          <View style={[styles.sinFotos, { borderColor: colors.lineStrong, backgroundColor: colors.surfaceSunken }]}>
            <View style={[styles.sinFotosIcono, { backgroundColor: colors.statusPendienteBg }]}>
              <IconCamera color={colors.statusPendienteText} size={14} />
            </View>
            <Text style={[styles.sinFotosTexto, { color: colors.inkMuted }]}>Faltan las fotos de Antes y Después.</Text>
          </View>
        ) : (
          <View style={styles.evidencia}>
            <TiraFotos reporte={reporte} total={ev.fotos} />
            {ev.zonas > 0 ? <BarraZonas reporte={reporte} animar={anima} retraso={retraso} /> : null}
          </View>
        )}

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          <View style={styles.pieIzq}>
            <View style={styles.dato}>
              <IconCalendar color={esHoy ? colors.goldSoftText : colors.inkSubtle} size={13} />
              <Text style={[styles.datoTexto, { color: esHoy ? colors.goldSoftText : colors.inkSubtle }]} numberOfLines={1}>
                {esHoy ? 'Hoy' : formatFecha(reporte.fecha_servicio)}
              </Text>
            </View>
            {tecnicos.length > 0 ? (
              <View style={styles.dato} accessible accessibilityLabel={`Técnicos: ${tecnicos.join(', ')}`}>
                <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
                  <Text style={[styles.avatarTexto, { color: colors.onNavy }]}>{inicialesUsuarioDisplay(tecnicos[0] ?? '', '?')}</Text>
                </View>
                <Text style={[styles.tecnico, { color: colors.inkMuted }]} numberOfLines={1}>
                  {tecnicos[0]}
                  {tecnicos.length > 1 ? <Text style={{ color: colors.inkSubtle }}>{` +${tecnicos.length - 1}`}</Text> : null}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cta}>
            <Text style={[styles.ctaTexto, { color: colors.navyText }]}>{sinFotos ? 'Tomar fotos' : 'Ver reporte'}</Text>
            <View style={[styles.ctaFlecha, { backgroundColor: sinFotos ? colors.gold : colors.navy }]}>
              <IconFlecha color={sinFotos ? colors.onGold : colors.onNavy} size={12} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const PLACA = 42;

const styles = StyleSheet.create({
  envoltura: { marginBottom: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placa: { width: PLACA, height: PLACA, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, gap: 2 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folio: { ...type.mono, fontSize: 12, flexShrink: 0 },
  separador: { width: 3, height: 3, borderRadius: 2 },
  origen: { ...type.caption, fontSize: 12, flexShrink: 1 },
  cliente: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  estadoPunto: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { ...type.caption, fontSize: 12, fontFamily: font.semibold },
  insignia: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  insigniaTexto: { fontFamily: font.semibold, fontSize: 11, lineHeight: 15 },
  evidencia: { gap: spacing.md },
  tira: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mini: { width: MINI, height: MINI, borderRadius: radius.md, overflow: 'hidden' },
  miniLado: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  miniMas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 9, 11, 0.55)', alignItems: 'center', justifyContent: 'center' },
  miniMasTexto: { fontFamily: font.semibold, fontSize: 14, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  leyenda: { marginLeft: 'auto', gap: 3 },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leyendaPunto: { width: 7, height: 7, borderRadius: 4 },
  leyendaTexto: { ...type.caption, fontSize: 11, lineHeight: 14 },
  zonas: { gap: 6 },
  segmentos: { flexDirection: 'row', gap: 3, height: 5, transformOrigin: 'left' },
  segmento: { flex: 1, borderRadius: 3 },
  zonasTexto: { ...type.caption, fontSize: 12 },
  sinFotos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sinFotosIcono: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sinFotosTexto: { ...type.caption, fontSize: 13, flex: 1 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  pieIzq: { flex: 1, minWidth: 0, gap: 6 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  datoTexto: { ...type.mono, fontSize: 12, flexShrink: 1 },
  avatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: font.semibold, fontSize: 8 },
  tecnico: { ...type.label, fontSize: 12, flexShrink: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctaTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  ctaFlecha: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
