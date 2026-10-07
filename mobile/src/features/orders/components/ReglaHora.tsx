import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { PickerFechaHora } from '@/components/DateTimeField';
import { IconClock } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import { formatHora } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { franjaDelDia, horaDeMarca, marcaDeHora, REGLA_MARCAS, REGLA_PASO } from '../agendaFechas';
import { useActivo } from './movimientoNuevaOrden';
import { Aparece, rellenoCampo } from './nuevaOrdenUi';

/**
 * «Hora de llegada»: una regla de 06:00 a 21:00 que se desliza bajo una aguja
 * fija, en pasos de 15 minutos. Las marcas cercanas a la aguja crecen (efecto
 * lupa, en el hilo nativo) y la hora grande de arriba rueda al cambiar. Un
 * interruptor deja la orden sin hora fija; tocar la hora grande abre el reloj
 * del sistema para un minuto exacto.
 */

const MARCA = 16;
const VECINAS = 4;

export function ReglaHora({
  hora,
  error,
  disabled,
  onHora,
}: {
  hora: string;
  error?: string;
  disabled: boolean;
  onHora: (hhmm: string) => void;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const fija = hora.trim() !== '';
  const marcaActual = marcaDeHora(hora);
  const [ancho, setAncho] = useState(0);
  const [vista, setVista] = useState(marcaActual ?? marcaDeHora('09:00') ?? 0);
  const [reloj, setReloj] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const vistaRef = useRef(vista);
  /** El usuario movió la regla desde el último fijado (arrastre o lector de pantalla). */
  const tocada = useRef(false);
  /** Última hora que fijó la propia regla: no hay que volver a desplazarla hacia ella. */
  const horaPropia = useRef<string | null>(null);
  const ultimoX = useRef(0);
  const reposo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atenuada = useActivo(!fija, 220);

  const marcaDeOffset = (x: number) => Math.min(Math.max(Math.round(x / MARCA), 0), REGLA_MARCAS - 1);

  // La hora cambió por fuera (reloj del sistema, interruptor): la regla la sigue.
  // Si la cambió la propia regla, ya está ahí y no se toca.
  useEffect(() => {
    if (ancho === 0 || marcaActual === null || tocada.current) return;
    if (horaPropia.current !== null && formatHora(hora) === horaPropia.current) return;
    horaPropia.current = null;
    vistaRef.current = marcaActual;
    setVista(marcaActual);
    scrollRef.current?.scrollTo({ x: marcaActual * MARCA, animated: !reduced });
    // `hora` solo se lee para comparar con lo que fijó la regla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaActual, ancho, reduced]);

  // Primera vez: centra la hora actual (o 09:00) sin fijarla, para invitar a deslizar.
  useEffect(() => {
    if (ancho === 0) return;
    scrollRef.current?.scrollTo({ x: vistaRef.current * MARCA, animated: false });
  }, [ancho]);

  useEffect(
    () => () => {
      if (reposo.current) clearTimeout(reposo.current);
    },
    [],
  );

  /**
   * Se llama cuando la regla deja de moverse (sin eventos de scroll durante un
   * momento): primero la alinea a la marca exacta y, si la movió el usuario,
   * fija la hora una sola vez. Así no importa si Android manda el fin del
   * arrastre, el de la inercia, los dos o ninguno.
   */
  const alDetenerse = () => {
    const x = ultimoX.current;
    const i = marcaDeOffset(x);
    if (Math.abs(x - i * MARCA) > 0.5) {
      scrollRef.current?.scrollTo({ x: i * MARCA, animated: true });
      return; // Al terminar de alinearse vuelve a pasar por aquí.
    }
    vistaRef.current = i;
    setVista(i);
    if (!tocada.current) return;
    tocada.current = false;
    const nueva = horaDeMarca(i);
    if (nueva === formatHora(hora)) return;
    horaPropia.current = nueva;
    onHora(nueva);
  };

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const x = e.nativeEvent.contentOffset.x;
          ultimoX.current = x;
          const i = marcaDeOffset(x);
          if (i !== vistaRef.current) {
            vistaRef.current = i;
            setVista(i);
          }
          if (reposo.current) clearTimeout(reposo.current);
          reposo.current = setTimeout(() => alDetenerse(), 140);
        },
      }),
    // `alDetenerse` lee refs y la última `hora`; se recrea el listener con ella.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollX, hora],
  );

  const mover = (delta: number) => {
    const i = Math.min(Math.max(vistaRef.current + delta, 0), REGLA_MARCAS - 1);
    vistaRef.current = i;
    setVista(i);
    onHora(horaDeMarca(i));
  };

  const horaVista = fija && marcaActual === vista ? formatHora(hora) : horaDeMarca(vista);
  const relleno = Math.max(ancho / 2 - MARCA / 2, 0);

  return (
    <View style={r.grupo}>
      <View style={r.cabeza}>
        <Text style={[r.rotulo, { color: error ? colors.danger : colors.inkMuted }]}>Hora de llegada</Text>
        <Interruptor
          activo={fija}
          disabled={disabled}
          etiqueta="Hora fija"
          onCambio={(v) => onHora(v ? horaDeMarca(vistaRef.current) : '')}
        />
      </View>

      <View style={[r.panel, { backgroundColor: rellenoCampo(scheme), borderColor: error ? colors.danger : 'transparent' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fija ? `Hora de llegada ${horaVista}. Elegir minuto exacto` : 'Sin hora fija. Elegir una hora'}
          onPress={() => setReloj(true)}
          disabled={disabled}
          style={({ pressed }) => [r.lectura, pressed ? { opacity: 0.6 } : null]}
        >
          <Animated.View style={{ opacity: atenuada.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }}>
            <Rueda clave={horaVista} subiendo={vista >= (marcaActual ?? vista)}>
              <Text style={[r.hora, { color: colors.ink }]}>{horaVista}</Text>
            </Rueda>
          </Animated.View>
          <Aparece clave={fija ? franjaDelDia(horaVista) : 'sin'}>
            <View style={r.franjaFila}>
              <IconClock color={fija ? colors.primary : colors.inkSubtle} size={12} />
              <Text style={[r.franja, { color: fija ? colors.primary : colors.inkSubtle }]}>
                {fija ? `${franjaDelDia(horaVista)} · toca para el minuto exacto` : 'Sin hora fija · desliza para elegir'}
              </Text>
            </View>
          </Aparece>
        </Pressable>

        <View
          style={r.reglaCaja}
          onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Regla de hora"
          accessibilityValue={{ text: fija ? horaVista : 'Sin hora fija' }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => mover(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          {ancho > 0 ? (
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={MARCA}
              decelerationRate="fast"
              scrollEnabled={!disabled}
              scrollEventThrottle={16}
              onScroll={onScroll}
              onScrollBeginDrag={() => {
                tocada.current = true;
              }}
              contentContainerStyle={{ paddingHorizontal: relleno }}
              style={{ opacity: atenuada.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] }) }}
            >
              {Array.from({ length: REGLA_MARCAS }, (_, i) => (
                <Marca key={i} indice={i} scrollX={scrollX} />
              ))}
            </Animated.ScrollView>
          ) : null}

          {/* Aguja fija al centro. */}
          <View pointerEvents="none" style={r.aguja}>
            <View style={[r.agujaPunta, { borderTopColor: fija ? colors.primary : colors.inkSubtle }]} />
            <View style={[r.agujaLinea, { backgroundColor: fija ? colors.primary : colors.inkSubtle }]} />
          </View>
        </View>
      </View>

      {error ? (
        <Text style={[r.error, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <PickerFechaHora
        visible={reloj}
        mode="time"
        value={hora || horaDeMarca(vista)}
        titulo="Hora de llegada"
        onChange={onHora}
        onClose={() => setReloj(false)}
      />
    </View>
  );
}

/** Una marca de la regla: crece cerca de la aguja (interpolado del scroll nativo). */
function Marca({ indice, scrollX }: { indice: number; scrollX: Animated.Value }) {
  const { colors } = useTheme();
  const minutos = indice * REGLA_PASO;
  const esHora = minutos % 60 === 0;
  const esMedia = minutos % 30 === 0;
  const centro = indice * MARCA;
  const rango = {
    inputRange: [centro - VECINAS * MARCA, centro, centro + VECINAS * MARCA],
    extrapolate: 'clamp' as const,
  };

  return (
    <View style={r.marca}>
      <Animated.View
        style={[
          r.linea,
          {
            height: esHora ? 22 : esMedia ? 15 : 9,
            backgroundColor: esHora ? colors.ink : colors.lineStrong,
            transform: [{ scaleY: scrollX.interpolate({ ...rango, outputRange: [1, 1.7, 1] }) }],
          },
        ]}
      />
      {esHora ? (
        <Animated.Text
          style={[
            r.etiqueta,
            {
              color: colors.inkMuted,
              opacity: scrollX.interpolate({ ...rango, outputRange: [0.5, 1, 0.5] }),
              transform: [{ scale: scrollX.interpolate({ ...rango, outputRange: [1, 1.18, 1] }) }],
            },
          ]}
        >
          {horaDeMarca(indice).slice(0, 2)}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** La hora grande rueda hacia arriba o hacia abajo al cambiar. */
function Rueda({ clave, subiendo, children }: { clave: string; subiendo: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const previa = useRef(clave);
  const desde = useRef(0);
  if (previa.current !== clave) desde.current = subiendo ? 12 : -12;

  useEffect(() => {
    if (previa.current === clave) return;
    previa.current = clave;
    if (reduced) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, v, reduced]);

  return (
    <Animated.View
      style={{
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [desde.current, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Interruptor propio (perilla con resorte), con el rol nativo de switch. */
function Interruptor({
  activo,
  disabled,
  etiqueta,
  onCambio,
}: {
  activo: boolean;
  disabled: boolean;
  etiqueta: string;
  onCambio: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(activo ? 1 : 0);
      return;
    }
    const anim = Animated.spring(v, { toValue: activo ? 1 : 0, friction: 7, tension: 200, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [activo, v, reduced]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: activo, disabled }}
      accessibilityLabel={etiqueta}
      onPress={() => onCambio(!activo)}
      disabled={disabled}
      hitSlop={10}
      style={r.interruptorFila}
    >
      <Text style={[r.interruptorTexto, { color: activo ? colors.ink : colors.inkSubtle }]}>{etiqueta}</Text>
      <View style={[r.pista, { backgroundColor: colors.lineStrong }]}>
        <Animated.View style={[StyleSheet.absoluteFill, r.pistaRelleno, { backgroundColor: colors.primary, opacity: v }]} />
        <Animated.View
          style={[
            r.perilla,
            { backgroundColor: colors.onPrimary, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

const r = StyleSheet.create({
  grupo: { gap: spacing.sm },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  rotulo: { fontFamily: font.semibold, fontSize: 13.5, letterSpacing: -0.1 },
  panel: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  lectura: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  hora: { fontFamily: font.bold, fontSize: 36, lineHeight: 42, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  franjaFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  franja: { fontFamily: font.medium, fontSize: 12 },
  reglaCaja: { height: 58, justifyContent: 'center' },
  marca: { width: MARCA, height: 58, alignItems: 'center', paddingTop: 8 },
  linea: { width: 2, borderRadius: 1, transformOrigin: 'top' },
  etiqueta: { position: 'absolute', bottom: 6, width: 30, textAlign: 'center', fontFamily: font.semibold, fontSize: 11, fontVariant: ['tabular-nums'] },
  aguja: { position: 'absolute', top: 0, bottom: 0, left: '50%', marginLeft: -6, width: 12, alignItems: 'center' },
  agujaPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  agujaLinea: { width: 2.5, height: 36, borderRadius: 2 },
  error: { ...type.caption, fontSize: 12, paddingHorizontal: spacing.xs },
  interruptorFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  interruptorTexto: { fontFamily: font.semibold, fontSize: 12.5 },
  pista: { width: 38, height: 22, borderRadius: 11, padding: 3, overflow: 'hidden' },
  pistaRelleno: { borderRadius: 11 },
  perilla: { width: 16, height: 16, borderRadius: 8 },
});
