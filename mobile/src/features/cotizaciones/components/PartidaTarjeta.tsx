import React, { memo, useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconBasura, IconBox, IconEditar, IconMas, IconMenos, IconWrench } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { CotizacionItem } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  ETIQUETA_FUENTE_PARTIDA,
  formatCantidad,
  formatMoneda,
  fuentePartida,
  importeLinea,
  precioUnitario,
  type FuentePartida,
} from '../cotizacionFormat';

interface Props {
  item: CotizacionItem;
  /** En garantía los montos se muestran en $0. */
  enCeros: boolean;
  disabled: boolean;
  /** Recién agregada: entra con una animación más notoria. */
  nueva: boolean;
  onEditar: (item: CotizacionItem) => void;
  onCantidad: (item: CotizacionItem, cantidad: number) => void;
  onQuitar: (item: CotizacionItem) => void;
}

/**
 * Partida del formulario como tarjeta: imagen o icono con la fuente
 * (SYSCOM, TVC, Manual o Concepto), nombre, precio unitario y descuento, el
 * importe a la derecha y abajo los controles directos: cantidad −/+, editar
 * y quitar. Entra deslizándose, el importe «late» al cambiar y al quitarla
 * sale hacia la izquierda antes de desaparecer.
 */
function PartidaTarjetaBase({ item, enCeros, disabled, nueva, onEditar, onCantidad, onQuitar }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const pulso = useRef(new Animated.Value(1)).current;
  const importe = importeLinea(item);
  const importePrevio = useRef(importe);

  useEffect(() => {
    if (reduced) return;
    const anim = nueva
      ? Animated.spring(entrada, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true })
      : Animated.timing(entrada, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (importePrevio.current === importe) return;
    importePrevio.current = importe;
    if (reduced) return;
    pulso.setValue(1.08);
    const anim = Animated.spring(pulso, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [importe, pulso, reduced]);

  const fuente = fuentePartida(item);
  const tono = tonoFuente(fuente, colors);
  const pu = precioUnitario(item);
  const monto = (n: number) => formatMoneda(enCeros ? 0 : n);
  const descripcion = (item.pdf_descripcion_corta || item.producto_descripcion).replace(/\s+/g, ' ').trim();
  const puedeRestar = item.cantidad > 1;

  const quitar = () => {
    Alert.alert('Quitar partida', `¿Quitar «${item.producto_nombre || 'esta partida'}» de la cotización?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          if (reduced) {
            onQuitar(item);
            return;
          }
          Animated.timing(entrada, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => onQuitar(item));
        },
      },
    ]);
  };

  const cambiar = (delta: number) => {
    const siguiente = Math.max(1, Math.round((item.cantidad + delta) * 100) / 100);
    if (siguiente !== item.cantidad) onCantidad(item, siguiente);
  };

  return (
    <Animated.View
      style={[
        styles.tarjeta,
        { backgroundColor: colors.surface, borderColor: colors.line },
        {
          opacity: entrada,
          transform: [
            { translateX: entrada.interpolate({ inputRange: [0, 1], outputRange: [nueva ? 24 : -8, 0] }) },
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.producto_nombre || 'Partida sin nombre'}, ${ETIQUETA_FUENTE_PARTIDA[fuente]}, ${formatCantidad(item.cantidad)} por ${monto(pu)}, importe ${monto(importe)}`}
        accessibilityHint="Edita la partida"
        onPress={() => onEditar(item)}
        disabled={disabled}
        style={({ pressed }) => [styles.cuerpo, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
      >
        <View style={[styles.miniatura, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.imagen} resizeMode="contain" />
          ) : fuente === 'concepto' ? (
            <IconWrench color={tono.fg} size={19} />
          ) : (
            <IconBox color={tono.fg} size={20} />
          )}
          <View style={[styles.sello, { backgroundColor: tono.fg, borderColor: colors.surface }]}>
            {fuente === 'concepto' ? <IconWrench color={colors.onPrimary} size={9} /> : <IconBox color={colors.onPrimary} size={9} />}
          </View>
        </View>

        <View style={styles.textos}>
          <Text style={[styles.nombre, { color: item.producto_nombre ? colors.ink : colors.inkSubtle }]} numberOfLines={2}>
            {item.producto_nombre || 'Partida sin nombre'}
          </Text>
          {descripcion ? (
            <Text style={[styles.descripcion, { color: colors.inkSubtle }]} numberOfLines={1}>
              {descripcion}
            </Text>
          ) : null}
          <View style={styles.etiquetas}>
            <View style={[styles.etiqueta, { backgroundColor: tono.bg }]}>
              <Text style={[styles.etiquetaTexto, { color: tono.fg }]}>{ETIQUETA_FUENTE_PARTIDA[fuente]}</Text>
            </View>
            {item.descuento_pct > 0 ? (
              <View style={[styles.etiqueta, { backgroundColor: colors.statusResueltoBg }]}>
                <Text style={[styles.etiquetaTexto, { color: colors.statusResueltoText }]}>-{formatCantidad(item.descuento_pct)}%</Text>
              </View>
            ) : null}
            {item.sin_iva ? (
              <View style={[styles.etiqueta, { backgroundColor: colors.surfaceSunken }]}>
                <Text style={[styles.etiquetaTexto, { color: colors.inkMuted }]}>Sin IVA</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.derecha}>
          <Animated.Text style={[styles.importe, { color: colors.ink, transform: [{ scale: pulso }] }]}>{monto(importe)}</Animated.Text>
          <Text style={[styles.pu, { color: colors.inkSubtle }]}>
            {monto(pu)} {item.unidad ? `/ ${item.unidad.toLowerCase()}` : 'c/u'}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.controles, { borderTopColor: colors.line }]}>
        <View style={[styles.stepper, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}>
          <BotonIcono
            etiqueta="Restar uno"
            onPress={() => cambiar(-1)}
            disabled={disabled || !puedeRestar}
            icon={<IconMenos color={puedeRestar ? colors.ink : colors.inkSubtle} size={13} />}
          />
          <Text style={[styles.cantidad, { color: colors.ink }]} accessibilityLabel={`Cantidad ${formatCantidad(item.cantidad)}`}>
            {formatCantidad(item.cantidad)}
          </Text>
          <BotonIcono etiqueta="Sumar uno" onPress={() => cambiar(1)} disabled={disabled} icon={<IconMas color={colors.ink} size={13} />} />
        </View>
        <View style={styles.espacio} />
        <BotonIcono
          etiqueta="Editar partida"
          onPress={() => onEditar(item)}
          disabled={disabled}
          icon={<IconEditar color={colors.primary} size={15} />}
          fondo={colors.primaryRing}
        />
        <BotonIcono
          etiqueta="Quitar partida"
          onPress={quitar}
          disabled={disabled}
          icon={<IconBasura color={colors.danger} size={15} />}
          fondo={colors.dangerBg}
        />
      </View>
    </Animated.View>
  );
}

function BotonIcono({
  etiqueta,
  icon,
  onPress,
  disabled,
  fondo,
}: {
  etiqueta: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled: boolean;
  fondo?: string;
}) {
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const presionar = (v: number) => {
    if (reduced) return;
    Animated.spring(escala, { toValue: v, friction: 9, tension: 320, useNativeDriver: true }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled }}
        onPress={onPress}
        onPressIn={() => presionar(0.88)}
        onPressOut={() => presionar(1)}
        disabled={disabled}
        hitSlop={6}
        style={[styles.boton, fondo ? { backgroundColor: fondo } : null, disabled ? styles.atenuado : null]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}

function tonoFuente(fuente: FuentePartida, colors: ReturnType<typeof useTheme>['colors']) {
  if (fuente === 'syscom') return { bg: colors.primaryRing, fg: colors.primary };
  if (fuente === 'tvc') return { bg: colors.statusPausadoBg, fg: colors.statusPausadoText };
  if (fuente === 'manual') return { bg: colors.goldSoftBg, fg: colors.goldSoftText };
  return { bg: colors.statusResueltoBg, fg: colors.statusResueltoText };
}

export const PartidaTarjeta = memo(PartidaTarjetaBase);

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  cuerpo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  miniatura: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagen: { width: '100%', height: '100%', borderRadius: radius.md },
  sello: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  nombre: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, letterSpacing: -0.1 },
  descripcion: { ...type.caption, fontSize: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  etiqueta: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  etiquetaTexto: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.2 },
  derecha: { alignItems: 'flex-end', gap: 2, maxWidth: '38%' },
  importe: { fontFamily: font.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  pu: { ...type.mono, fontSize: 11, textAlign: 'right' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 2 },
  cantidad: { ...type.mono, fontFamily: font.bold, fontSize: 14, minWidth: 30, textAlign: 'center' },
  espacio: { flex: 1 },
  boton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  atenuado: { opacity: 0.4 },
});
