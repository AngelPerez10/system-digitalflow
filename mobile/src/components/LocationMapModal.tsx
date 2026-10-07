import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Solo tipos: se borran al compilar. Los paquetes se cargan con `require`
// (ver `cargarWebView` / `cargarLocation`) porque en el APK 1.0.0 no existen.
import type * as LocationTypes from 'expo-location';
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { IconCheck, IconClose, IconLocateMe, IconMas, IconMenos, IconPin, IconRefresh } from '@/components/icons';
import { mapaDisponible, ubicacionDisponible } from '@/utils/modulosNativos';
import { useReducedMotion } from '@/utils/useReducedMotion';

type WebViewModulo = typeof import('react-native-webview');

function cargarWebView(): WebViewModulo | null {
  if (!mapaDisponible()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webview') as WebViewModulo;
  } catch {
    return null;
  }
}

function cargarLocation(): typeof LocationTypes | null {
  if (!ubicacionDisponible()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-location') as typeof LocationTypes;
  } catch {
    return null;
  }
}

export type MapLatLng = { lat: number; lng: number };

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (mapsUrl: string, location: MapLatLng) => void;
  /** Dirección actual; si trae `q=lat,lng` (enlace de Google Maps) se usa como centro inicial. */
  direccion?: string;
}

const DEFAULT_CENTER: MapLatLng = { lat: 19.0653, lng: -104.2831 };
const PIN_SIZE = 44;
/** Cuánto se monta la hoja inferior sobre el mapa (esquinas redondeadas). */
const SOLAPE = 24;

/** Detecta `q=lat,lng` en un enlace de Google Maps ya guardado como dirección. */
function parseLatLngFromDireccion(direccion: string): MapLatLng | null {
  const m = direccion.trim().match(/q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]!);
  const lng = Number.parseFloat(m[2]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function mapsUrlFrom(loc: MapLatLng): string {
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

/**
 * Pin fijo al centro de la pantalla — el mapa se arrastra debajo de él (mismo
 * patrón que Uber / Google Maps al elegir un domicilio). Evita depender de un
 * marcador dibujado dentro del WebView, que no se puede animar con resortes
 * nativos ni seguir el tema claro/oscuro de la app.
 *
 * Tiles: OpenStreetMap puro (gratis, sin cuenta ni API key). El modo oscuro
 * se logra invirtiendo los colores del propio tile con CSS
 * (`filter: invert + hue-rotate`), un truco estándar para «oscurecer» OSM
 * sin depender de un proveedor con key.
 *
 * Mensajes desde la app: `{ lat, lng, vuelo? }` centra (con `flyTo` animado
 * si `vuelo`); `{ zoom: ±1 }` acerca o aleja con animación.
 */
function buildMapHtml(center: MapLatLng, dark: boolean): string {
  const bg = dark ? '#141418' : '#f4f4f5';
  const filtroOscuro = dark
    ? '.leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.9); }'
    : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; background: ${bg}; }
    .leaflet-control-attribution { font-size: 9px; }
    /* La hoja inferior tapa ${SOLAPE}px del mapa: la atribución sube para seguir visible. */
    .leaflet-bottom { margin-bottom: ${SOLAPE + 4}px; }
    ${filtroOscuro}
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var mapa = L.map('mapa', { zoomControl: false, attributionControl: false }).setView(
      [${center.lat}, ${center.lng}], 16
    );
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(mapa);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    function enviar(tipo, extra) {
      var payload = Object.assign({ tipo: tipo }, extra || {});
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    mapa.on('movestart zoomstart', function () { enviar('inicioMovimiento'); });
    mapa.on('moveend zoomend', function () {
      var c = mapa.getCenter();
      enviar('finMovimiento', { lat: c.lat, lng: c.lng });
    });
    mapa.whenReady(function () { enviar('listo'); });

    window.addEventListener('message', function (event) {
      try {
        var data = JSON.parse(event.data);
        if (typeof data.zoom === 'number') {
          mapa.setZoom(mapa.getZoom() + data.zoom, { animate: true });
        } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          if (data.vuelo) {
            mapa.flyTo([data.lat, data.lng], Math.max(mapa.getZoom(), 17), { duration: 0.9 });
          } else {
            mapa.setView([data.lat, data.lng], mapa.getZoom());
          }
        }
      } catch (e) {}
    });
    document.addEventListener('message', function (event) {
      window.dispatchEvent(new MessageEvent('message', { data: event.data }));
    });
  </script>
</body>
</html>`;
}

/**
 * Selector de ubicación a pantalla completa (Leaflet dentro de un WebView).
 * El mapa ocupa toda la vista; encima flotan cerrar / restablecer, una
 * píldora de estado y los controles; abajo, una hoja con las coordenadas en
 * vivo y la acción principal.
 *
 * Coreografía: al abrir, el mapa aparece, los controles caen desde arriba y la
 * hoja sube con resorte. Al arrastrar, el pin se levanta y su sombra se
 * encoge; al soltar, aterriza con rebote y emite una onda. «Mi ubicación» y
 * «Restablecer» vuelan (`flyTo`) en vez de saltar. Al confirmar, el pin late
 * y el botón muestra la palomita antes de cerrar.
 */
export function LocationMapModal({ visible, onClose, onConfirm, direccion = '' }: Props) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebViewType>(null);
  const WebViewMod = useMemo(() => cargarWebView(), []);
  const Location = useMemo(() => cargarLocation(), []);
  const dark = scheme === 'dark';
  const fondoMapa = dark ? '#141418' : '#f4f4f5';

  const inicial = useMemo(
    () => parseLatLngFromDireccion(direccion) ?? DEFAULT_CENTER,
    // Solo se recalcula cuando el modal se abre con una dirección distinta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible],
  );
  const html = useMemo(() => buildMapHtml(inicial, dark), [inicial, dark]);

  const [location, setLocation] = useState<MapLatLng>(inicial);
  const [mapaListo, setMapaListo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const cerrando = useRef(false);

  const entrada = useRef(new Animated.Value(0)).current;
  const controles = useRef(new Animated.Value(0)).current;
  const mapaOpacity = useRef(new Animated.Value(0)).current;
  const pinLevanta = useRef(new Animated.Value(0)).current;
  const onda = useRef(new Animated.Value(0)).current;
  const latido = useRef(new Animated.Value(0)).current;

  // Apertura / reinicio.
  useEffect(() => {
    if (!visible) {
      setMapaListo(false);
      setArrastrando(false);
      setConfirmando(false);
      cerrando.current = false;
      [entrada, controles, mapaOpacity, pinLevanta, onda, latido].forEach((v) => v.setValue(0));
      return;
    }
    setLocation(inicial);
    if (reduced) {
      entrada.setValue(1);
      controles.setValue(1);
      return;
    }
    const anim = Animated.parallel([
      Animated.spring(entrada, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(controles, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, inicial, reduced, entrada, controles, mapaOpacity, pinLevanta, onda, latido]);

  // Pin: se levanta al arrastrar; al soltar cae con rebote y emite una onda.
  useEffect(() => {
    if (reduced) {
      pinLevanta.setValue(arrastrando ? 1 : 0);
      return;
    }
    const caer = Animated.spring(pinLevanta, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true });
    const anim = arrastrando
      ? Animated.timing(pinLevanta, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true })
      : mapaListo
        ? Animated.parallel([
            caer,
            Animated.sequence([
              Animated.timing(onda, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(onda, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
          ])
        : caer;
    anim.start();
    return () => anim.stop();
  }, [arrastrando, mapaListo, pinLevanta, onda, reduced]);

  useEffect(() => {
    if (!mapaListo) return;
    const anim = Animated.timing(mapaOpacity, {
      toValue: 1,
      duration: reduced ? 0 : 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [mapaListo, mapaOpacity, reduced]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        tipo: 'listo' | 'inicioMovimiento' | 'finMovimiento';
        lat?: number;
        lng?: number;
      };
      if (data.tipo === 'listo') {
        setMapaListo(true);
      } else if (data.tipo === 'inicioMovimiento') {
        setArrastrando(true);
      } else if (data.tipo === 'finMovimiento') {
        setArrastrando(false);
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          setLocation({ lat: data.lat, lng: data.lng });
        }
      }
    } catch {
      /* mensaje no reconocido */
    }
  };

  const enviar = (msg: object) => webRef.current?.postMessage(JSON.stringify(msg));

  const restablecer = () => {
    setLocation(inicial);
    enviar({ ...inicial, vuelo: !reduced });
  };

  const usarMiUbicacion = async () => {
    if (ubicando || !Location) return;
    setUbicando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación',
          'Activa el permiso de ubicación de SertelPro para colocar tu posición actual en el mapa.',
        );
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const punto: MapLatLng = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
      setLocation(punto);
      enviar({ ...punto, vuelo: !reduced });
    } catch {
      Alert.alert('No se pudo obtener tu ubicación', 'Verifica que el GPS esté activado e inténtalo de nuevo.');
    } finally {
      setUbicando(false);
    }
  };

  /** Salida: la hoja baja y los controles suben antes de cerrar. */
  const cerrar = () => {
    if (cerrando.current) return;
    cerrando.current = true;
    if (reduced) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(entrada, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(controles, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const confirmar = () => {
    if (confirmando) return;
    setConfirmando(true);
    if (reduced) {
      onConfirm(mapsUrlFrom(location), location);
      return;
    }
    Animated.sequence([
      Animated.spring(latido, { toValue: 1, friction: 3, tension: 220, useNativeDriver: true }),
      Animated.delay(220),
    ]).start(() => onConfirm(mapsUrlFrom(location), location));
  };

  const bajar = (desde: number) => ({
    opacity: controles,
    transform: [{ translateY: controles.interpolate({ inputRange: [0, 1], outputRange: [desde, 0] }) }],
  });
  const aparecerEscala = {
    opacity: controles,
    transform: [{ scale: controles.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  };
  const vidrio = { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'card') };
  const bloqueado = !mapaListo || confirmando;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={cerrar} statusBarTranslucent>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.modal, { backgroundColor: fondoMapa }]}>
        {/* ------------------------------ Mapa ------------------------------ */}
        <View style={styles.mapaWrap}>
          <Animated.View style={[styles.relleno, { opacity: mapaOpacity }]}>
            {WebViewMod ? (
              <WebViewMod.WebView
                ref={webRef}
                source={{ html }}
                style={styles.mapa}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />
            ) : null}
          </Animated.View>

          {!mapaListo ? (
            <View style={[styles.relleno, styles.centro]} pointerEvents="none">
              <View style={[styles.cargando, vidrio]}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.cargandoTexto, { color: colors.inkMuted }]}>Cargando mapa…</Text>
              </View>
            </View>
          ) : null}

          {/* Pin fijo al centro (con su punta en el centro exacto del mapa). */}
          <View style={[styles.relleno, styles.centro]} pointerEvents="none">
            <View style={styles.anclaPin}>
              <Animated.View
                style={[
                  styles.onda,
                  {
                    borderColor: colors.primary,
                    opacity: onda.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.6, 0] }),
                    transform: [{ scaleX: onda.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3] }) }, { scaleY: onda.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3] }) }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.sombra,
                  {
                    backgroundColor: colors.ink,
                    opacity: pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.1] }),
                    transform: [{ scaleX: pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }],
                  },
                ]}
              />
              <View style={[styles.punto, { backgroundColor: colors.primary }]} />
              <Animated.View
                style={[
                  styles.pin,
                  {
                    transform: [
                      { translateY: pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
                      { scale: latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
                    ],
                  },
                ]}
              >
                <View style={[styles.pinCabeza, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                  {confirmando ? <IconCheck color={colors.onPrimary} size={20} /> : <IconPin color={colors.onPrimary} size={20} />}
                </View>
                <View style={[styles.pinPunta, { borderTopColor: colors.primary }]} />
              </Animated.View>
            </View>
          </View>

          {/* Barra superior flotante. */}
          <View style={[styles.arriba, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
            <Animated.View style={bajar(-24)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar selección de ubicación"
                onPress={cerrar}
                hitSlop={4}
                style={({ pressed }) => [styles.circulo, vidrio, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
              >
                <IconClose color={colors.ink} size={16} />
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.estadoCaja, bajar(-32)]} pointerEvents="none">
              <View style={[styles.estado, vidrio]}>
                <Text style={[styles.estadoEyebrow, { color: colors.primary }]}>Ubicación del servicio</Text>
                <Cruce clave={arrastrando ? 'mueve' : 'quieto'}>
                  <Text style={[styles.estadoTexto, { color: colors.ink }]} numberOfLines={1}>
                    {arrastrando ? 'Suelta para fijar el punto' : 'Arrastra el mapa bajo el pin'}
                  </Text>
                </Cruce>
              </View>
            </Animated.View>

            <Animated.View style={bajar(-24)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restablecer al punto inicial"
                onPress={restablecer}
                disabled={bloqueado}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.circulo,
                  vidrio,
                  { opacity: bloqueado ? 0.5 : 1 },
                  pressed ? { backgroundColor: colors.surfaceSunken } : null,
                ]}
              >
                <IconRefresh color={colors.ink} size={16} />
              </Pressable>
            </Animated.View>
          </View>

          {/* Controles a la derecha: zoom y mi ubicación. */}
          <View style={[styles.lateral, { bottom: SOLAPE + spacing.lg }]} pointerEvents="box-none">
            <Animated.View style={[styles.zoom, vidrio, aparecerEscala]}>
              <BotonMapa label="Acercar" disabled={bloqueado} onPress={() => enviar({ zoom: 1 })}>
                <IconMas color={colors.ink} size={16} />
              </BotonMapa>
              <View style={[styles.zoomDivisor, { backgroundColor: colors.line }]} />
              <BotonMapa label="Alejar" disabled={bloqueado} onPress={() => enviar({ zoom: -1 })}>
                <IconMenos color={colors.ink} size={16} />
              </BotonMapa>
            </Animated.View>
            {Location ? (
              <Animated.View style={aparecerEscala}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Usar mi ubicación actual"
                  accessibilityHint="Lleva el mapa a tu posición de GPS"
                  disabled={bloqueado || ubicando}
                  onPress={() => void usarMiUbicacion()}
                  style={({ pressed }) => [
                    styles.circuloGrande,
                    { backgroundColor: pressed ? colors.primaryPressed : colors.primary, opacity: bloqueado ? 0.5 : 1 },
                    elevationFor(colors, 'card'),
                  ]}
                >
                  {ubicando ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <IconLocateMe color={colors.onPrimary} size={21} />
                  )}
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* ------------------------- Hoja inferior ------------------------- */}
        <Animated.View
          style={[
            styles.hoja,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
              shadowColor: colors.shadow,
              transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [280, 0] }) }],
            },
          ]}
        >
          <View style={[styles.asa, { backgroundColor: colors.lineStrong }]} />
          <View style={styles.hojaFila}>
            <View style={[styles.hojaIcono, { backgroundColor: arrastrando ? colors.surfaceSunken : colors.primaryRing }]}>
              <IconPin color={arrastrando ? colors.inkSubtle : colors.primary} size={18} />
            </View>
            <View style={styles.hojaTextos}>
              <Cruce clave={arrastrando ? 'mueve' : confirmando ? 'listo' : 'punto'}>
                <Text style={[styles.hojaTitulo, { color: colors.ink }]}>
                  {arrastrando ? 'Moviendo el pin…' : confirmando ? 'Ubicación lista' : 'Punto seleccionado'}
                </Text>
              </Cruce>
              <Text style={[styles.hojaAyuda, { color: colors.inkSubtle }]}>
                Se guarda como enlace de Google Maps para que el técnico llegue con la ruta exacta.
              </Text>
            </View>
          </View>
          <BotonConfirmar
            listo={confirmando}
            disabled={!mapaListo || arrastrando}
            onPress={confirmar}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Botón de control sobre el mapa (zoom). */
function BotonMapa({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.zoomBoton, { opacity: disabled ? 0.45 : 1 }, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Acción principal: se hunde al tocar; al confirmar, la palomita entra con rebote. */
function BotonConfirmar({ listo, disabled, onPress }: { listo: boolean; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const check = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      check.setValue(listo ? 1 : 0);
      return;
    }
    const anim = Animated.spring(check, { toValue: listo ? 1 : 0, friction: 5, tension: 200, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [listo, check, reduced]);

  const ir = (v: number) => {
    if (!reduced) Animated.spring(escala, { toValue: v, friction: 8, tension: 300, useNativeDriver: true }).start();
  };

  const fondo = disabled && !listo ? colors.primaryDisabled : listo ? colors.success : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Usar esta ubicación"
      accessibilityState={{ disabled, busy: listo }}
      disabled={disabled || listo}
      onPress={onPress}
      onPressIn={() => ir(0.97)}
      onPressOut={() => ir(1)}
    >
      <Animated.View style={[styles.confirmar, { backgroundColor: fondo, transform: [{ scale: escala }] }]}>
        <Animated.View style={{ transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }}>
          <IconCheck color={disabled && !listo ? colors.onPrimaryDisabled : colors.onPrimary} size={17} />
        </Animated.View>
        <Text style={[styles.confirmarTexto, { color: disabled && !listo ? colors.onPrimaryDisabled : colors.onPrimary }]}>
          {listo ? 'Listo' : 'Usar esta ubicación'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Fundido corto con leve subida cuando cambia `clave`. */
function Cruce({ clave, children }: { clave: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const previa = useRef(clave);
  useEffect(() => {
    if (previa.current === clave) return;
    previa.current = clave;
    if (reduced) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, v, reduced]);
  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

const CIRCULO = TOUCH_TARGET - 4;

const styles = StyleSheet.create({
  modal: { flex: 1 },
  mapaWrap: { flex: 1, overflow: 'hidden' },
  relleno: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  mapa: { flex: 1, ...Platform.select({ android: { backgroundColor: 'transparent' } }) },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  cargandoTexto: { fontFamily: font.medium, fontSize: 13 },

  // El ancla es un punto de 0×0 en el centro del mapa; todo se cuelga de él.
  anclaPin: { width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  onda: { position: 'absolute', width: 28, height: 12, borderRadius: 14, borderWidth: 2 },
  sombra: { position: 'absolute', top: -2, width: 18, height: 6, borderRadius: 9 },
  punto: { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: -3 },
  pin: { position: 'absolute', bottom: 2, alignItems: 'center' },
  pinCabeza: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pinPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
  },

  arriba: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  circulo: { width: CIRCULO, height: CIRCULO, borderRadius: CIRCULO / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  estadoCaja: { flex: 1, alignItems: 'center' },
  estado: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: CIRCULO,
    justifyContent: 'center',
  },
  estadoEyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' },
  estadoTexto: { fontFamily: font.semibold, fontSize: 13.5, marginTop: 1 },

  lateral: { position: 'absolute', right: spacing.md, alignItems: 'center', gap: spacing.md },
  zoom: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  zoomBoton: { width: CIRCULO, height: CIRCULO, alignItems: 'center', justifyContent: 'center' },
  zoomDivisor: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.sm },
  circuloGrande: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  hoja: {
    marginTop: -SOLAPE,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    shadowOpacity: 0.12,
    elevation: 16,
  },
  asa: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2 },
  hojaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hojaIcono: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hojaTextos: { flex: 1, minWidth: 0, gap: 2 },
  hojaTitulo: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3 },
  hojaAyuda: { ...type.caption, fontSize: 12.5, lineHeight: 17 },
  confirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md + 2,
  },
  confirmarTexto: { ...type.button, fontSize: 16 },
});
