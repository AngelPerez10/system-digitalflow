import React, { memo, useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { subirFotoReporte } from '@/api/reportesApi';
import { FotosEditor } from '@/components/FotosEditor';
import { IconBasura, IconCheck } from '@/components/icons';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { REPORTE_MAX_FOTOS_POR_LADO, type ReporteZona } from '@/types/reporte';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  zona: ReporteZona;
  numero: number;
  error?: string;
  disabled: boolean;
  /** Recién agregada: entra con un fundido corto (las que ya existían aparecen quietas). */
  nueva: boolean;
  /** Única zona del reporte: no se puede quitar (el formulario siempre ofrece una). */
  unica: boolean;
  onChange: (zona: ReporteZona) => void;
  onQuitar: (id: string) => void;
}

/** Encabezado de un lado (Antes / Después) con su punto de color y el cupo. */
function Lado({ titulo, color, cantidad }: { titulo: string; color: string; cantidad: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.lado}>
      <View style={[styles.ladoPunto, { backgroundColor: color }]} />
      <Text style={[styles.ladoTitulo, { color: colors.ink }]}>{titulo}</Text>
      {cantidad > 0 ? (
        <View style={[styles.ladoListo, { backgroundColor: colors.statusResueltoBg }]}>
          <IconCheck color={colors.statusResueltoText} size={10} />
          <Text style={[styles.ladoListoTexto, { color: colors.statusResueltoText }]}>{cantidad}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Una zona en el formulario: nombre, fotos de Antes y fotos de Después. Las
 * fotos se comprimen en el teléfono y se suben al servidor en cuanto se toman
 * (`FotosEditor`); la zona solo guarda las URL.
 */
export const ZonaEditor = memo(function ZonaEditor({ zona, numero, error, disabled, nueva, unica, onChange, onQuitar }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(nueva && !reduced ? 0 : 1)).current;

  useEffect(() => {
    if (!nueva || reduced) return;
    const anim = Animated.timing(entrada, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombre = zona.titulo.trim() || `Zona ${numero}`;
  const fotos = zona.fotos_antes.length + zona.fotos_despues.length;

  const quitar = () => {
    if (fotos === 0 && !zona.titulo.trim()) {
      onQuitar(zona.id);
      return;
    }
    Alert.alert('¿Quitar esta zona?', `«${nombre}» y sus ${fotos} ${fotos === 1 ? 'foto' : 'fotos'} se quitarán del reporte.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => onQuitar(zona.id) },
    ]);
  };

  return (
    <Animated.View
      style={[
        styles.zona,
        { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <View style={styles.cabeza}>
        <View style={[styles.numero, { backgroundColor: colors.navy }]}>
          <Text style={[styles.numeroTexto, { color: colors.onNavy }]}>{numero}</Text>
        </View>
        <Text style={[styles.cabezaTitulo, { color: colors.ink }]} numberOfLines={1}>
          {nombre}
        </Text>
        {!unica ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${nombre}`}
            disabled={disabled}
            onPress={quitar}
            hitSlop={6}
            style={({ pressed }) => [styles.quitar, { backgroundColor: pressed ? colors.dangerBg : 'transparent' }]}
          >
            <IconBasura color={colors.danger} size={16} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.campo}>
      <TextField
        label="Nombre de la zona"
        value={zona.titulo}
        onChangeText={(titulo) => onChange({ ...zona, titulo })}
        placeholder="Cámara entrada, Tablero, Azotea…"
        error={error}
        editable={!disabled}
        maxLength={200}
      />
      </View>

      <View style={[styles.bloque, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <Lado titulo="Antes" color={colors.gold} cantidad={zona.fotos_antes.length} />
        <FotosEditor
          urls={zona.fotos_antes}
          maxFotos={REPORTE_MAX_FOTOS_POR_LADO}
          onChange={(fotos_antes) => onChange({ ...zona, fotos_antes })}
          disabled={disabled}
          subirFoto={subirFotoReporte}
          contexto={`antes, ${nombre}`}
        />
      </View>

      <View style={[styles.bloque, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <Lado titulo="Después" color={colors.success} cantidad={zona.fotos_despues.length} />
        <FotosEditor
          urls={zona.fotos_despues}
          maxFotos={REPORTE_MAX_FOTOS_POR_LADO}
          onChange={(fotos_despues) => onChange({ ...zona, fotos_despues })}
          disabled={disabled}
          subirFoto={subirFotoReporte}
          contexto={`después, ${nombre}`}
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  /** Sin borde propio: vive dentro de la tarjeta del paso «Evidencia» (nada de caja dentro de caja). */
  zona: { gap: spacing.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numero: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  cabezaTitulo: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2, flex: 1, flexShrink: 1 },
  quitar: { width: TOUCH_TARGET - 8, height: TOUCH_TARGET - 8, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  /** `TextField` trae su propio margen inferior; dentro de la tarjeta sobra. */
  campo: { marginBottom: -spacing.sm },
  bloque: { borderWidth: 1, borderRadius: radius.md + 2, padding: spacing.md, gap: spacing.sm },
  lado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ladoPunto: { width: 8, height: 8, borderRadius: 4 },
  ladoTitulo: { ...type.label, fontFamily: font.semibold, fontSize: 14 },
  ladoListo: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 'auto' },
  ladoListoTexto: { fontFamily: font.semibold, fontSize: 11, fontVariant: ['tabular-nums'] },
});
