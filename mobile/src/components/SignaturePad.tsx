import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { IconCheck, IconExpand, IconRefresh, IconSignature } from './icons';
import { ModalFooter, ModalHeader, ModalPrimaryButton } from './ModalChrome';
import { useVisorFotos } from './VisorFotos';

/**
 * El lienzo de firma es blanco fijo al firmar (contraste del trazo). Al
 * confirmar se captura solo el área de tinta —sin borde ni guía— y el backend
 * convierte el blanco a transparente y recorta. El trazo, el texto de ayuda y
 * la línea guía llevan tonos fijos oscuros (en modo oscuro del tema serían
 * invisibles sobre el lienzo blanco).
 */
const LIENZO_BG = '#FFFFFF';
const TINTA_FIRMA = '#09090B';
const LIENZO_TEXTO = '#71717A';
const LIENZO_GUIA = '#D3D3D8';
/** Pad horizontal 400×250, igual que el del ERP web — evita el «marco de celular» en PDF. */
const LIENZO_ASPECT = 1.6;

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
  const { abrir, visor } = useVisorFotos();
  const hayFirma = Boolean(value.trim());

  const borrarFirma = () => {
    Alert.alert(
      'Borrar firma',
      '¿Seguro que quieres borrar esta firma? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => onChange('') },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      {hayFirma ? (
        // Fondo blanco fijo: la firma subida es tinta oscura sobre transparente
        // y en modo oscuro se volvía invisible sobre `surfaceSunken`.
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel="Firma del cliente capturada"
          accessibilityHint="Abre la firma en grande"
          onPress={() => abrir([value], 0, { lienzoClaro: true })}
          style={({ pressed }) => [
            styles.preview,
            { borderColor: colors.line, backgroundColor: LIENZO_BG, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Image source={{ uri: value }} style={styles.previewImg} resizeMode="contain" />
          <View style={styles.ampliar} pointerEvents="none">
            <IconExpand color="#FFFFFF" size={11} />
            <Text style={styles.ampliarTexto}>Ver en grande</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir firma del cliente"
          accessibilityHint="Abre un lienzo grande para firmar con el dedo"
          disabled={disabled}
          onPress={() => setAbierto(true)}
          style={({ pressed }) => [
            styles.ctaVacio,
            { borderColor: colors.lineStrong, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
          ]}
        >
          <View style={[styles.ctaPlaca, { backgroundColor: colors.primaryRing }]}>
            <IconSignature color={colors.primary} size={20} />
          </View>
          <Text style={[styles.ctaTitulo, { color: colors.ink }]}>Toca para firmar</Text>
          <Text style={[styles.ctaSub, { color: colors.inkSubtle }]}>
            El cliente firma con el dedo en pantalla completa
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
              onPress={borrarFirma}
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
      {visor}
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
  const { colors } = useTheme();
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
      // Un frame para ocultar la guía antes del snapshot (no va en el PNG).
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const uri = await captureRef(lienzoRef, {
        format: 'png',
        quality: 1,
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
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.modal, { backgroundColor: colors.canvas }]}>
        <ModalHeader
          eyebrow="Evidencia"
          titulo="Firma del cliente"
          cerrarLabel="Cerrar firma sin guardar"
          onCerrar={onClose}
          accion={{
            icon: <IconRefresh color={colors.onNavy} size={14} />,
            label: 'Limpiar',
            onPress: limpiar,
            disabled: !hayTrazo || capturando,
          }}
        />

        <View style={styles.instruccion}>
          <IconSignature color={colors.inkSubtle} size={15} />
          <Text style={[styles.modalHint, { color: colors.inkMuted }]}>
            Pide al cliente que firme dentro del recuadro
          </Text>
        </View>

        {/* Marco visual (borde) fuera del ref: el PNG no lleva «celular» ni guía. */}
        <View style={[styles.lienzoMarco, { borderColor: colors.lineStrong }]}>
          <View
            ref={lienzoRef}
            collapsable={false}
            onLayout={medirOrigen}
            style={styles.lienzoCaptura}
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
            {!hayTrazo && !capturando ? (
              <Text style={styles.placeholder} pointerEvents="none">
                Firme aquí
              </Text>
            ) : null}
            {/* Guía y «×» se ocultan un frame antes de la captura: no van en el PNG. */}
            {!capturando ? (
              <>
                <View style={styles.lineaGuia} pointerEvents="none" />
                <Text style={styles.marcaX} pointerEvents="none">
                  ×
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <Text style={[styles.legal, { color: colors.inkSubtle }]}>
          La firma se adjunta al reporte de la orden.
        </Text>

        <View style={styles.modalSpacer} />

        <ModalFooter>
          {error ? (
            <Text
              style={[styles.error, { color: colors.danger }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          ) : null}
          <ModalPrimaryButton
            label="Usar esta firma"
            icon={<IconCheck color={colors.onPrimary} size={17} />}
            onPress={() => void confirmar()}
            disabled={!hayTrazo}
            loading={capturando}
          />
        </ModalFooter>
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
  ctaPlaca: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  ctaTitulo: { ...type.bodyMedium },
  ctaSub: { ...type.caption, textAlign: 'center' },
  preview: {
    height: 160,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: '100%' },
  ampliar: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9,9,11,0.62)',
  },
  ampliarTexto: { ...type.label, fontSize: 11, color: '#FFFFFF' },
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
  modal: { flex: 1 },
  instruccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalHint: { ...type.caption },
  lienzoMarco: {
    aspectRatio: LIENZO_ASPECT,
    alignSelf: 'stretch',
    maxHeight: 360,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: LIENZO_BG,
  },
  lienzoCaptura: {
    flex: 1,
    backgroundColor: LIENZO_BG,
    justifyContent: 'center',
  },
  modalSpacer: { flex: 1, minHeight: spacing.md },
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
    left: spacing.xl + spacing.lg,
    right: spacing.xl,
    bottom: '26%',
    height: 1,
    backgroundColor: LIENZO_GUIA,
  },
  marcaX: {
    position: 'absolute',
    left: spacing.xl,
    bottom: '26%',
    marginBottom: -4,
    fontSize: 20,
    lineHeight: 22,
    color: LIENZO_TEXTO,
  },
  legal: { ...type.caption, fontSize: 12, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.xl },
  error: { ...type.caption, textAlign: 'center' },
});
