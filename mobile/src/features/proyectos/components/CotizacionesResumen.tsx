import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { IconCalendar, IconDocumento } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { CotizacionOrigen, ProyectoCotizacionBloque } from '@/types/proyecto';
import { esFechaValida, formatFecha } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';

const ORIGEN: Record<CotizacionOrigen, string> = { digitalflow: 'DigitalFlow', sicar: 'SICAR' };
/** Filas que entran escalonadas; las demás aparecen ya colocadas. */
const ANIMADAS = 6;

function Fila({ bloque, indice, primera }: { bloque: ProyectoCotizacionBloque; indice: number; primera: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const anima = !reduced && indice < ANIMADAS;
  const entrada = useRef(new Animated.Value(anima ? 0 : 1)).current;

  useEffect(() => {
    if (!anima) return;
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 300,
      delay: 100 + indice * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const c = bloque.cotizacion;
  const folio = c.folio || `Cotización ${bloque.orden}`;
  const fecha = esFechaValida(c.fecha.slice(0, 10)) ? formatFecha(c.fecha.slice(0, 10)) : c.fecha;
  const sicar = c.origen === 'sicar';

  return (
    <Animated.View
      style={[
        styles.fila,
        !primera ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
        { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
      accessible
      accessibilityLabel={`Cotización ${folio}, ${ORIGEN[c.origen]}, ${c.cliente || 'sin cliente'}${fecha ? `, ${fecha}` : ''}`}
    >
      <View style={[styles.placa, { backgroundColor: colors.primaryRing }]}>
        <IconDocumento color={colors.primary} size={17} />
      </View>
      <View style={styles.textos}>
        <View style={styles.cabeza}>
          <Text style={[styles.folio, { color: colors.ink }]} numberOfLines={1}>
            {folio}
          </Text>
          <View style={[styles.origen, { backgroundColor: sicar ? colors.goldSoftBg : colors.surfaceSunken }]}>
            <Text style={[styles.origenTexto, { color: sicar ? colors.goldSoftText : colors.inkMuted }]}>{ORIGEN[c.origen]}</Text>
          </View>
        </View>
        <Text style={[styles.cliente, { color: colors.inkMuted }]} numberOfLines={1}>
          {c.cliente || 'Sin cliente'}
        </Text>
        {fecha ? (
          <View style={styles.fechaFila}>
            <IconCalendar color={colors.inkSubtle} size={11} />
            <Text style={[styles.fecha, { color: colors.inkSubtle }]}>{fecha}</Text>
          </View>
        ) : null}
        {bloque.tiposTrabajo?.length ? (
          <View style={styles.tipos}>
            {bloque.tiposTrabajo.map((t) => (
              <View key={t.id} style={[styles.tipo, { borderColor: colors.line }]}>
                <Text style={[styles.tipoTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                  {t.nombre}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={[styles.indice, { color: colors.inkSubtle }]}>#{bloque.orden}</Text>
    </Animated.View>
  );
}

/**
 * Cotizaciones vinculadas al proyecto — solo lectura en mobile: el técnico
 * asignado no puede vincular ni quitar cotizaciones (`assert_tecnico_locked_fields`
 * en el backend). Vincularlas es tarea de oficina en la web. Lista dentro de
 * la tarjeta, separada por líneas de 1 px; las primeras filas entran escalonadas.
 */
export function CotizacionesResumen({ bloques }: { bloques: ProyectoCotizacionBloque[] }) {
  const { colors } = useTheme();

  if (bloques.length === 0) {
    return (
      <View style={styles.vacio}>
        <View style={[styles.placa, { backgroundColor: colors.surfaceSunken }]}>
          <IconDocumento color={colors.inkSubtle} size={17} />
        </View>
        <View style={styles.textos}>
          <Text style={[styles.vacioTitulo, { color: colors.ink }]}>Sin cotizaciones vinculadas</Text>
          <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>Se vinculan desde la oficina, en el ERP.</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {bloques.map((bloque, i) => (
        <Fila key={bloque.vinculoId} bloque={bloque} indice={i} primera={i === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  placa: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  folio: { ...type.mono, fontSize: 14, fontFamily: font.semibold, flexShrink: 1 },
  origen: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  origenTexto: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.3 },
  cliente: { ...type.label, fontSize: 13 },
  fechaFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  fecha: { ...type.mono, fontSize: 11.5 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tipo: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tipoTexto: { ...type.caption, fontSize: 11 },
  indice: { ...type.mono, fontSize: 12, marginTop: 2 },
  vacio: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 14 },
  vacioTexto: { ...type.caption, fontSize: 12 },
});
