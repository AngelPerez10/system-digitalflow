import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';

/**
 * El lienzo de firma es blanco fijo en ambos temas (la imagen capturada tiene
 * que imprimirse bien y adjuntarse al PDF), así que el trazo, el texto de
 * ayuda y la línea guía llevan tonos fijos oscuros — no los del tema, que en
 * modo oscuro serían casi blancos e invisibles sobre el lienzo.
 */
const LIENZO_BG = '#FFFFFF';
const TINTA_FIRMA = '#09090B';
const LIENZO_TEXTO = '#71717A';
const LIENZO_GUIA = '#D3D3D8';

interface Props {
  value: string;
  onChange: (dataUrlOrEmpty: string) => void;
  disabled?: boolean;
}

type Punto = { x: number; y: number };
type Trazo = Punto[];

const STROKE = 4.8;
/** Distancia mínima entre puntos (px²). Más baja = más suave al dedo lento. */
const MIN_DIST2 = 0.81;
/** Si el dedo salta más de esto, rellenamos puntos intermedios. */
const MAX_SALTO = 10;

/**
 * Catmull-Rom → cúbicas Bezier. Las Q punto-a-punto se veían angulosas;
 * esto sigue el dedo con curvas continuas.
 */
function trazoAPath(trazo: Trazo): string {
  if (trazo.length === 0) return '';
  const p0 = trazo[0];
  if (!p0) return '';
  if (trazo.length === 1) {
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} l 0.01 0`;
  }
  if (trazo.length === 2) {
    const p1 = trazo[1]!;
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  let d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`;
  for (let i = 0; i < trazo.length - 1; i++) {
    const a = trazo[i - 1] ?? trazo[i]!;
    const b = trazo[i]!;
    const c = trazo[i + 1]!;
    const e = trazo[i + 2] ?? c;
    const cp1x = b.x + (c.x - a.x) / 6;
    const cp1y = b.y + (c.y - a.y) / 6;
    const cp2x = c.x - (e.x - b.x) / 6;
    const cp2y = c.y - (e.y - b.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
  }
  return d;
}

function empujarPunto(trazo: Trazo, x: number, y: number) {
  const prev = trazo[trazo.length - 1];
  if (!prev) {
    trazo.push({ x, y });
    return;
  }
  const dx = x - prev.x;
  const dy = y - prev.y;
  const dist2 = dx * dx + dy * dy;
  if (dist2 < MIN_DIST2) return;

  const dist = Math.sqrt(dist2);
  if (dist > MAX_SALTO) {
    const pasos = Math.min(8, Math.floor(dist / (MAX_SALTO * 0.55)));
    for (let i = 1; i < pasos; i++) {
      const t = i / pasos;
      trazo.push({ x: prev.x + dx * t, y: prev.y + dy * t });
    }
  }
  trazo.push({ x, y });
}

/**
 * Firma del cliente en modal a pantalla completa.
 *
 * Sin scroll padre (el ScrollView del formulario robaba el gesto). Path con
 * Catmull-Rom, puntos interpolados en saltos rápidos y flush por rAF para que
 * el trazo no vaya a trompicones.
 */
export function SignaturePad({ value, onChange, disabled = false }: Props) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const hayFirma = Boolean(value.trim());

  return (
    <View style={styles.wrap}>
      {hayFirma ? (
        <View style={[styles.preview, { borderColor: colors.line }]}>
          <Image
            source={{ uri: value }}
            style={styles.previewImg}
            resizeMode="contain"
            accessibilityLabel="Firma del cliente capturada"
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir firma del cliente"
          accessibilityHint="Abre un lienzo grande para firmar con el dedo"
          disabled={disabled}
          onPress={() => setAbierto(true)}
          style={({ pressed }) => [
            styles.ctaVacio,
            { borderColor: colors.primaryRing, backgroundColor: colors.surfaceSunken },
            pressed ? { backgroundColor: colors.line } : null,
          ]}
        >
          <Text style={[styles.ctaTitulo, { color: colors.primary }]}>Toca para firmar</Text>
          <Text style={[styles.ctaSub, { color: colors.inkMuted }]}>
            Lienzo a pantalla completa · trazo fluido
          </Text>
        </Pressable>
      )}

      <View style={styles.acciones}>
        {hayFirma ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a firmar"
              disabled={disabled}
              onPress={() => setAbierto(true)}
              style={({ pressed }) => [
                styles.botonSec,
                { borderColor: colors.line, backgroundColor: colors.surface },
                pressed ? { backgroundColor: colors.surfaceSunken } : null,
              ]}
            >
              <Text style={[styles.botonSecTexto, { color: colors.ink }]}>Volver a firmar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar firma del cliente"
              disabled={disabled}
              onPress={() => onChange('')}
              style={({ pressed }) => [
                styles.botonSec,
                { borderColor: colors.line, backgroundColor: colors.surface },
                pressed ? { backgroundColor: colors.surfaceSunken } : null,
              ]}
            >
              <Text style={[styles.botonSecTexto, { color: colors.ink }]}>Borrar</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <FirmaModal
        visible={abierto}
        onClose={() => setAbierto(false)}
        onConfirm={(dataUrl) => {
          onChange(dataUrl);
          setAbierto(false);
        }}
      />
    </View>
  );
}

function FirmaModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [pathsCerrados, setPathsCerrados] = useState<string[]>([]);
  const [pathVivo, setPathVivo] = useState('');
  const [capturando, setCapturando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lienzoRef = useRef<View>(null);
  const trazoActual = useRef<Trazo>([]);
  const raf = useRef<number | null>(null);
  const pendiente = useRef(false);
  /** Origen del lienzo en pantalla — pageX/pageY menos esto = coords locales. */
  const origen = useRef({ x: 0, y: 0 });

  const hayTrazo = pathsCerrados.length > 0 || pathVivo.length > 0;

  const medirOrigen = useCallback(() => {
    lienzoRef.current?.measureInWindow((x, y) => {
      origen.current = { x, y };
    });
  }, []);

  const flushVivo = useCallback(() => {
    pendiente.current = false;
    raf.current = null;
    setPathVivo(trazoAPath(trazoActual.current));
  }, []);

  const pedirFlush = useCallback(() => {
    if (pendiente.current) return;
    pendiente.current = true;
    raf.current = requestAnimationFrame(flushVivo);
  }, [flushVivo]);

  const pedirFlushRef = useRef(pedirFlush);
  pedirFlushRef.current = pedirFlush;

  useEffect(() => {
    if (!visible) {
      setPathsCerrados([]);
      setPathVivo('');
      trazoActual.current = [];
      setError(null);
      setCapturando(false);
      return;
    }
    // Tras el slide del Modal, medir otra vez (el layout puede moverse).
    const t = setTimeout(medirOrigen, 80);
    return () => clearTimeout(t);
  }, [visible, medirOrigen]);

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const localDesdeEvento = (pageX: number, pageY: number, locationX: number, locationY: number) => {
    // El SVG tiene pointerEvents="none", así que location* suele ser del lienzo.
    // Si viene raro (NaN / fuera), caemos a page − origen medido.
    if (Number.isFinite(locationX) && Number.isFinite(locationY) && locationX >= 0 && locationY >= 0) {
      return { x: locationX, y: locationY };
    }
    return { x: pageX - origen.current.x, y: pageY - origen.current.y };
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        setError(null);
        medirOrigen();
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        const p = localDesdeEvento(pageX, pageY, locationX, locationY);
        trazoActual.current = [{ x: p.x, y: p.y }];
        setPathVivo(trazoAPath(trazoActual.current));
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        const p = localDesdeEvento(pageX, pageY, locationX, locationY);
        empujarPunto(trazoActual.current, p.x, p.y);
        pedirFlushRef.current();
      },
      onPanResponderRelease: () => {
        if (raf.current != null) {
          cancelAnimationFrame(raf.current);
          raf.current = null;
          pendiente.current = false;
        }
        const cerrado = trazoAPath(trazoActual.current);
        if (cerrado) setPathsCerrados((prev) => [...prev, cerrado]);
        trazoActual.current = [];
        setPathVivo('');
      },
      onPanResponderTerminate: () => {
        if (raf.current != null) {
          cancelAnimationFrame(raf.current);
          raf.current = null;
          pendiente.current = false;
        }
        const cerrado = trazoAPath(trazoActual.current);
        if (cerrado) setPathsCerrados((prev) => [...prev, cerrado]);
        trazoActual.current = [];
        setPathVivo('');
      },
    }),
  ).current;

  const limpiar = () => {
    setPathsCerrados([]);
    setPathVivo('');
    trazoActual.current = [];
    setError(null);
  };

  const confirmar = async () => {
    if (!hayTrazo || !lienzoRef.current) return;
    setCapturando(true);
    setError(null);
    try {
      const uri = await captureRef(lienzoRef, {
        format: 'png',
        quality: 0.92,
        result: 'data-uri',
      });
      if (typeof uri !== 'string' || !uri.startsWith('data:image/')) {
        throw new Error('No se pudo capturar la firma.');
      }
      onConfirm(uri);
    } catch {
      setError('No se pudo guardar la firma. Inténtalo de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.canvas}
      />
      <View
        style={[
          styles.modal,
          { backgroundColor: colors.canvas, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <View style={styles.modalChrome}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar firma"
            onPress={onClose}
            style={({ pressed }) => [
              styles.modalLink,
              pressed ? { backgroundColor: colors.surfaceSunken } : null,
            ]}
          >
            <Text style={[styles.modalLinkTexto, { color: colors.primary }]}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.modalTitulo, { color: colors.ink }]} accessibilityRole="header">
            Firma del cliente
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar trazo"
            disabled={!hayTrazo || capturando}
            onPress={limpiar}
            style={({ pressed }) => [
              styles.modalLink,
              pressed ? { backgroundColor: colors.surfaceSunken } : null,
              !hayTrazo ? styles.botonInactivo : null,
            ]}
          >
            <Text style={[styles.modalLinkTexto, { color: colors.primary }]}>Limpiar</Text>
          </Pressable>
        </View>

        <Text style={[styles.modalHint, { color: colors.inkMuted }]}>
          Deslice el dedo con naturalidad — el trazo se suaviza solo
        </Text>

        <View
          ref={lienzoRef}
          collapsable={false}
          onLayout={medirOrigen}
          style={styles.lienzo}
          {...pan.panHandlers}
          accessibilityLabel="Área para firmar"
          accessibilityHint="Deslice el dedo para firmar"
        >
          <Svg width="100%" height="100%" pointerEvents="none">
            {pathsCerrados.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={TINTA_FIRMA}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {pathVivo ? (
              <Path
                d={pathVivo}
                stroke={TINTA_FIRMA}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
          {!hayTrazo ? (
            <Text style={styles.placeholder} pointerEvents="none">
              Firme aquí
            </Text>
          ) : null}
          <View style={styles.lineaGuia} pointerEvents="none" />
        </View>

        {error ? (
          <Text
            style={[styles.error, { color: colors.danger }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar esta firma"
          disabled={!hayTrazo || capturando}
          onPress={() => void confirmar()}
          style={({ pressed }) => [
            styles.botonPri,
            { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
            !hayTrazo || capturando ? styles.botonInactivo : null,
          ]}
        >
          {capturando ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.botonPriTexto}>Usar esta firma</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  ctaVacio: {
    minHeight: 128,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
  },
  ctaTitulo: { ...type.bodyMedium },
  ctaSub: { ...type.caption, textAlign: 'center' },
  preview: {
    height: 148,
    backgroundColor: LIENZO_BG,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: '100%' },
  acciones: { flexDirection: 'row', gap: spacing.sm },
  botonSec: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  botonSecTexto: { ...type.label },
  botonInactivo: { opacity: 0.4 },
  botonPri: {
    minHeight: TOUCH_TARGET + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  botonPriTexto: { ...type.button, color: '#FFFFFF' },
  modal: { flex: 1 },
  modalChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  modalTitulo: { ...type.bodyMedium },
  modalLink: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.sm },
  modalLinkTexto: { ...type.label },
  modalHint: {
    ...type.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  lienzo: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: LIENZO_BG,
    borderColor: LIENZO_GUIA,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  placeholder: {
    ...type.title,
    color: LIENZO_TEXTO,
    textAlign: 'center',
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    opacity: 0.4,
  },
  lineaGuia: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: '26%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: LIENZO_GUIA,
  },
  error: {
    ...type.caption,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
