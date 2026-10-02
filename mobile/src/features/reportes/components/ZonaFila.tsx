import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCamera, IconCheck, IconChevron } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { ReporteZona } from '@/types/reporte';
import { miniaturaUrl } from '@/utils/miniatura';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { zonaCompleta } from '../reporteFormat';

export type LadoZona = 'antes' | 'despues';

interface Props {
  zona: ReporteZona;
  /** Número de la zona en el reporte (no cambia al filtrar). */
  numero: number;
  /** Posición en la lista visible: escalona la entrada de las primeras filas. */
  indice: number;
  onAbrir: (zonaId: string, lado: LadoZona) => void;
}

/** Medio panel: la primera foto de ese lado con su conteo, o el hueco que falta. */
function Lado({ urls, lado, onPress, zona }: { urls: string[]; lado: LadoZona; onPress: () => void; zona: string }) {
  const { colors } = useTheme();
  const etiqueta = lado === 'antes' ? 'Antes' : 'Después';
  const punto = lado === 'antes' ? colors.gold : colors.success;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={urls.length ? `${etiqueta} de ${zona}, ${urls.length} ${urls.length === 1 ? 'foto' : 'fotos'}` : `${zona}, sin fotos de ${etiqueta.toLowerCase()}`}
      accessibilityHint="Abre la zona para comparar"
      onPress={onPress}
      style={({ pressed }) => [styles.lado, { backgroundColor: colors.surfaceSunken, opacity: pressed ? 0.88 : 1 }]}
    >
      {urls[0] ? (
        <Image source={{ uri: miniaturaUrl(urls[0], 420) }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={200} />
      ) : (
        <View style={[styles.ladoVacio, { borderColor: colors.lineStrong }]}>
          <IconCamera color={colors.inkSubtle} size={16} />
          <Text style={[styles.ladoVacioTexto, { color: colors.inkSubtle }]}>Sin fotos</Text>
        </View>
      )}
      <View style={styles.etiqueta} pointerEvents="none">
        <View style={[styles.etiquetaPunto, { backgroundColor: punto }]} />
        <Text style={styles.etiquetaTexto}>{etiqueta}</Text>
        {urls.length > 1 ? <Text style={styles.etiquetaConteo}>{urls.length}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Fila de zona del detalle: número, nombre, estado y el par Antes | Después
 * lado a lado (primera foto de cada lado, miniatura de Cloudinary). Pensada
 * para reportes largos: la lista que la contiene está virtualizada.
 */
export const ZonaFila = memo(function ZonaFila({ zona, numero, indice, onAbrir }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const anima = !reduced && indice < 6;
  const entrada = useRef(new Animated.Value(anima ? 0 : 1)).current;

  useEffect(() => {
    if (!anima) return;
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 300,
      delay: indice * 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombre = zona.titulo.trim() || `Zona ${numero}`;
  const completa = zonaCompleta(zona);
  const falta = zona.fotos_antes.length === 0 && zona.fotos_despues.length === 0 ? 'Sin fotos' : zona.fotos_antes.length === 0 ? 'Falta antes' : 'Falta después';
  const tono = completa
    ? { bg: colors.statusResueltoBg, fg: colors.statusResueltoText }
    : falta === 'Sin fotos'
      ? { bg: colors.statusPendienteBg, fg: colors.statusPendienteText }
      : { bg: colors.statusPausadoBg, fg: colors.statusPausadoText };

  return (
    <Animated.View
      style={[
        styles.envoltura,
        { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Zona ${numero}, ${nombre}, ${completa ? 'completa' : falta.toLowerCase()}`}
          accessibilityHint="Abre la zona para comparar Antes y Después"
          onPress={() => onAbrir(zona.id, zona.fotos_antes.length > 0 || zona.fotos_despues.length === 0 ? 'antes' : 'despues')}
          style={({ pressed }) => [styles.cabeza, pressed ? { opacity: 0.7 } : null]}
          hitSlop={4}
        >
          <View style={[styles.numero, { backgroundColor: colors.navy }]}>
            <Text style={[styles.numeroTexto, { color: colors.onNavy }]}>{String(numero).padStart(2, '0')}</Text>
          </View>
          <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={1}>
            {nombre}
          </Text>
          <View style={[styles.estado, { backgroundColor: tono.bg }]}>
            {completa ? <IconCheck color={tono.fg} size={10} /> : null}
            <Text style={[styles.estadoTexto, { color: tono.fg }]}>{completa ? 'Completa' : falta}</Text>
          </View>
          <IconChevron direction="right" color={colors.inkSubtle} size={14} />
        </Pressable>

        <View style={styles.par}>
          <Lado urls={zona.fotos_antes} lado="antes" zona={nombre} onPress={() => onAbrir(zona.id, 'antes')} />
          <Lado urls={zona.fotos_despues} lado="despues" zona={nombre} onPress={() => onAbrir(zona.id, 'despues')} />
        </View>
      </View>
    </Animated.View>
  );
});

const ESCRIM = 'rgba(9, 9, 11, 0.55)';

const styles = StyleSheet.create({
  envoltura: { marginBottom: spacing.md },
  tarjeta: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  numero: { minWidth: 30, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  numeroTexto: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  nombre: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2, flex: 1, flexShrink: 1 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  estadoTexto: { fontFamily: font.semibold, fontSize: 11 },
  par: { flexDirection: 'row', gap: spacing.sm },
  lado: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.md, overflow: 'hidden' },
  ladoVacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  ladoVacioTexto: { ...type.caption, fontSize: 11 },
  etiqueta: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ESCRIM,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etiquetaPunto: { width: 6, height: 6, borderRadius: 3 },
  etiquetaTexto: { fontFamily: font.semibold, fontSize: 11, color: '#FFFFFF' },
  etiquetaConteo: { fontFamily: font.semibold, fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariant: ['tabular-nums'] },
});
