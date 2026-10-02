import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconCheck } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
import { hoyISO } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { jornadasDelProyecto, partesFecha, type EstadoJornada } from '../proyectoFormat';

const FICHA = 58;
const HUECO = spacing.sm;
/** Fichas que entran escalonadas; las demás aparecen ya colocadas. */
const ANIMADAS = 10;

/**
 * Jornadas del proyecto: estado en una línea («Día 2 de 5», «Siguiente: …»),
 * una barra con un segmento por jornada y la línea de tiempo deslizable de
 * fichas unidas por un riel. Hoy en dorado, lo trabajado en marino con
 * palomita, lo programado con contorno; un punto azul marca las jornadas con
 * nota en bitácora. Al entrar las fichas suben escalonadas y la vista se
 * centra en hoy (o en la siguiente jornada).
 */
export function JornadasPanel({ proyecto }: { proyecto: Pick<Proyecto, 'fechas_inicio' | 'notas_por_dia'> }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const hoy = hoyISO();
  const { jornadas, hechas, indiceHoy, siguiente } = useMemo(() => jornadasDelProyecto(proyecto, hoy), [proyecto, hoy]);
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const total = jornadas.length;
  const foco = indiceHoy ?? (siguiente ? siguiente.numero - 1 : total - 1);

  useEffect(() => {
    if (reduced || total === 0) return;
    const anim = Animated.timing(entrada, { toValue: 1, duration: 720, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [reduced, total, entrada]);

  if (total === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={[styles.vacioTitulo, { color: colors.ink }]}>Sin jornadas programadas</Text>
        <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>Las fechas de trabajo se asignan desde la oficina.</Text>
      </View>
    );
  }

  const fecha = (iso: string) => {
    const p = partesFecha(iso);
    return p ? `${p.dia.toLowerCase()} ${p.numero} ${p.mes}` : iso;
  };
  const titulo =
    indiceHoy !== null
      ? `Día ${indiceHoy + 1} de ${total}`
      : hechas === total
        ? 'Jornadas completas'
        : hechas === 0
          ? `${total} ${total === 1 ? 'jornada programada' : 'jornadas programadas'}`
          : `${hechas} de ${total} jornadas`;
  const detalle =
    indiceHoy !== null
      ? 'Hoy se trabaja en sitio'
      : hechas === total
        ? `${total} ${total === 1 ? 'día trabajado' : 'días trabajados'}`
        : siguiente
          ? `${hechas === 0 ? 'Inicia' : 'Siguiente'}: ${fecha(siguiente.iso)}`
          : '';

  const tono = (estado: EstadoJornada) =>
    estado === 'hoy'
      ? { fondo: colors.gold, borde: colors.gold, tinta: colors.onGold, sub: colors.onGold }
      : estado === 'hecha'
        ? { fondo: colors.navy, borde: colors.navy, tinta: colors.onNavy, sub: colors.onNavyMuted }
        : { fondo: colors.surface, borde: colors.lineStrong, tinta: colors.ink, sub: colors.inkSubtle };

  // Escalonado con un solo valor: cada ficha toma su tramo de 0→1.
  const aparece = (i: number) => {
    if (reduced || i >= ANIMADAS) return null;
    const inicio = (i / ANIMADAS) * 0.6;
    const v = entrada.interpolate({ inputRange: [inicio, inicio + 0.4], outputRange: [0, 1], extrapolate: 'clamp' });
    return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.cabeza} accessible accessibilityLabel={`${titulo}. ${detalle}`}>
        <View style={styles.cabezaTextos}>
          <Text style={[styles.titulo, { color: colors.ink }]}>{titulo}</Text>
          {detalle ? (
            <View style={styles.detalleFila}>
              {indiceHoy !== null ? <View style={[styles.detallePunto, { backgroundColor: colors.gold }]} /> : null}
              <Text style={[styles.detalle, { color: indiceHoy !== null ? colors.goldSoftText : colors.inkSubtle }]}>{detalle}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.conteo, { color: colors.inkSubtle }]}>
          {hechas}/{total}
        </Text>
      </View>

      {/* Un segmento por jornada; crece desde la izquierda con scaleX. */}
      <Animated.View
        style={[styles.segmentos, reduced ? null : { transform: [{ scaleX: entrada }] }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {jornadas.map((j) => (
          <View
            key={j.iso}
            style={[
              styles.segmento,
              { backgroundColor: j.estado === 'hoy' ? colors.gold : j.estado === 'hecha' ? colors.navy : colors.line },
            ]}
          />
        ))}
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.riel}
        accessibilityLabel={`${total} jornadas`}
        onContentSizeChange={() => {
          // Centra hoy (o la siguiente jornada) dejando ver una ficha a la izquierda.
          scrollRef.current?.scrollTo({ x: Math.max(0, (foco - 1) * (FICHA + HUECO)), animated: false });
        }}
      >
        <View style={[styles.linea, { backgroundColor: colors.line }]} />
        {jornadas.map((j, i) => {
          const p = partesFecha(j.iso);
          if (!p) return null;
          const t = tono(j.estado);
          return (
            <Animated.View key={j.iso} style={aparece(i)}>
              <View
                style={[styles.ficha, { backgroundColor: t.fondo, borderColor: t.borde }]}
                accessible
                accessibilityLabel={`Jornada ${j.numero}: ${p.dia} ${p.numero} de ${p.mes}, ${
                  j.estado === 'hoy' ? 'hoy' : j.estado === 'hecha' ? 'trabajada' : 'programada'
                }${j.conBitacora ? ', con nota en bitácora' : ''}`}
              >
                <Text style={[styles.dia, { color: t.sub }]}>{j.estado === 'hoy' ? 'Hoy' : p.dia}</Text>
                <Text style={[styles.numero, { color: t.tinta }]}>{p.numero}</Text>
                <Text style={[styles.mes, { color: t.sub }]}>{p.mes}</Text>
                {j.estado === 'hecha' ? (
                  <View style={[styles.palomita, { backgroundColor: colors.success, borderColor: colors.surface }]}>
                    <IconCheck color={colors.onPrimary} size={8} />
                  </View>
                ) : null}
              </View>
              <View style={[styles.nota, { backgroundColor: j.conBitacora ? colors.primary : 'transparent' }]} />
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={styles.leyenda}>
        <Leyenda color={colors.navy} texto="Trabajada" />
        <Leyenda color={colors.gold} texto="Hoy" />
        <Leyenda color={colors.lineStrong} texto="Programada" contorno />
        <Leyenda color={colors.primary} texto="Con bitácora" chico />
      </View>
    </View>
  );
}

function Leyenda({ color, texto, contorno = false, chico = false }: { color: string; texto: string; contorno?: boolean; chico?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.leyendaItem}>
      <View
        style={[
          chico ? styles.leyendaPuntoChico : styles.leyendaPunto,
          contorno ? { borderWidth: 1.5, borderColor: color } : { backgroundColor: color },
        ]}
      />
      <Text style={[styles.leyendaTexto, { color: colors.inkSubtle }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cabezaTextos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3 },
  detalleFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detallePunto: { width: 7, height: 7, borderRadius: 4 },
  detalle: { ...type.caption, fontSize: 13 },
  conteo: { ...type.mono, fontSize: 13, marginTop: 3 },
  segmentos: { flexDirection: 'row', gap: 3, height: 5, transformOrigin: 'left' },
  segmento: { flex: 1, borderRadius: 3 },
  // Arriba deja lugar a la palomita que sobresale de la ficha.
  riel: { gap: HUECO, paddingTop: 8, paddingBottom: 2, paddingRight: spacing.xs + 6 },
  linea: { position: 'absolute', left: FICHA / 2, right: FICHA / 2, top: 8 + 32, height: 2, borderRadius: 1 },
  ficha: { width: FICHA, alignItems: 'center', borderWidth: 1, borderRadius: radius.md + 2, paddingVertical: spacing.sm, gap: 1 },
  dia: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  numero: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  mes: { ...type.caption, fontSize: 11, lineHeight: 13 },
  palomita: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: { alignSelf: 'center', width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leyendaPunto: { width: 9, height: 9, borderRadius: 3 },
  leyendaPuntoChico: { width: 6, height: 6, borderRadius: 3 },
  leyendaTexto: { ...type.caption, fontSize: 11 },
  vacio: { gap: 2 },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 15 },
  vacioTexto: { ...type.caption },
});
