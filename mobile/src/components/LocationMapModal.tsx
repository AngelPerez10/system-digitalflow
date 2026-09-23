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
// Solo tipos: se borran al compilar. Los paquetes se cargan con `require`
// (ver `cargarWebView` / `cargarLocation`) porque en el APK 1.0.0 no existen.
import type * as LocationTypes from 'expo-location';
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import { IconCheck, IconLocateMe, IconPin, IconRefresh } from '@/components/icons';
import { ModalFooter, ModalHeader, ModalPrimaryButton } from '@/components/ModalChrome';
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
const PIN_SIZE = 40;

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
    ${filtroOscuro}
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var mapa = L.map('mapa', { zoomControl: true, attributionControl: true }).setView(
      [${center.lat}, ${center.lng}], 16
    );
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
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          mapa.setView([data.lat, data.lng], mapa.getZoom());
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
 * Selector de ubicación con mapa interactivo (Leaflet dentro de un WebView) —
 * mismo criterio que `OrdenLocationMapModal` del ERP web, con el pin fijo al
 * centro en vez de coordenadas manuales: se arrastra el mapa, se confirma, y
 * se guarda un enlace de Google Maps (`?q=lat,lng`) como dirección.
 */
export function LocationMapModal({ visible, onClose, onConfirm, direccion = '' }: Props) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const webRef = useRef<WebViewType>(null);
  const WebViewMod = useMemo(() => cargarWebView(), []);
  const Location = useMemo(() => cargarLocation(), []);

  const inicial = useMemo(
    () => parseLatLngFromDireccion(direccion) ?? DEFAULT_CENTER,
    // Solo se recalcula cuando el modal se abre con una dirección distinta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible],
  );
  const html = useMemo(() => buildMapHtml(inicial, scheme === 'dark'), [inicial, scheme]);

  const [location, setLocation] = useState<MapLatLng>(inicial);
  const [mapaListo, setMapaListo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [ubicando, setUbicando] = useState(false);

  const pinLevanta = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const mapaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setMapaListo(false);
      setArrastrando(false);
      pinLevanta.setValue(0);
      hintOpacity.setValue(0);
      mapaOpacity.setValue(0);
      return;
    }
    setLocation(inicial);
  }, [visible, inicial, pinLevanta, hintOpacity, mapaOpacity]);

  useEffect(() => {
    Animated.timing(pinLevanta, {
      toValue: arrastrando ? 1 : 0,
      duration: reduced ? 0 : arrastrando ? 120 : 260,
      easing: arrastrando ? Easing.out(Easing.quad) : Easing.elastic(1.1),
      useNativeDriver: true,
    }).start();
  }, [arrastrando, pinLevanta, reduced]);

  useEffect(() => {
    if (!mapaListo) return;
    Animated.timing(mapaOpacity, {
      toValue: 1,
      duration: reduced ? 0 : 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    Animated.timing(hintOpacity, {
      toValue: 1,
      duration: reduced ? 0 : 320,
      delay: reduced ? 0 : 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [mapaListo, mapaOpacity, hintOpacity, reduced]);

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

  const restablecer = () => {
    setLocation(inicial);
    webRef.current?.postMessage(JSON.stringify(inicial));
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
      webRef.current?.postMessage(JSON.stringify(punto));
    } catch {
      Alert.alert('No se pudo obtener tu ubicación', 'Verifica que el GPS esté activado e inténtalo de nuevo.');
    } finally {
      setUbicando(false);
    }
  };

  const confirmar = () => {
    onConfirm(mapsUrlFrom(location), location);
  };

  const pinTranslateY = pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const sombraEscala = pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] });
  const sombraOpacidad = pinLevanta.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.12] });

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
          eyebrow="Ubicación del servicio"
          titulo="Selecciona el punto"
          cerrarLabel="Cancelar selección de ubicación"
          onCerrar={onClose}
          accion={{
            icon: <IconRefresh color={colors.onNavy} size={14} />,
            label: 'Restablecer',
            onPress: restablecer,
            disabled: !mapaListo,
          }}
        />

        <View style={[styles.mapaWrap, { backgroundColor: scheme === 'dark' ? '#141418' : '#f4f4f5' }]}>
          <Animated.View style={[styles.mapaFill, { opacity: mapaOpacity }]}>
            {WebViewMod ? (
            <WebViewMod.WebView
              ref={webRef}
              source={{ html }}
              style={styles.mapa}
              onMessage={onMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              decelerationRate="normal"
            />
            ) : null}
          </Animated.View>

          {!mapaListo ? (
            <View style={styles.cargando} pointerEvents="none">
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null}

          {/* Pin fijo al centro — el mapa se mueve debajo. */}
          <View style={styles.pinContenedor} pointerEvents="none">
            <Animated.View
              style={[
                styles.sombraPin,
                { backgroundColor: colors.shadow, opacity: sombraOpacidad, transform: [{ scaleX: sombraEscala }] },
              ]}
            />
            <Animated.View style={{ transform: [{ translateY: pinTranslateY }], alignItems: 'center' }}>
              <View style={[styles.pinPlaca, { backgroundColor: colors.primary }]}>
                <IconPin color={colors.onPrimary} size={19} />
              </View>
              <View style={[styles.pinPunta, { borderTopColor: colors.primary }]} />
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.hintPill, { backgroundColor: colors.surface, borderColor: colors.line, opacity: hintOpacity }]}
            pointerEvents="none"
          >
            <Text style={[styles.hintTexto, { color: colors.inkMuted }]}>Arrastra el mapa para mover el pin</Text>
          </Animated.View>

          {Location ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Usar mi ubicación actual"
            accessibilityHint="Coloca el pin en tu posición de GPS"
            disabled={!mapaListo || ubicando}
            onPress={() => void usarMiUbicacion()}
            style={({ pressed }) => [
              styles.miUbicacionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                opacity: mapaListo ? 1 : 0.5,
              },
              pressed ? { backgroundColor: colors.surfaceSunken } : null,
            ]}
          >
            {ubicando ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <IconLocateMe color={colors.primary} size={20} />
            )}
          </Pressable>
          ) : null}
        </View>

        <ModalFooter>
          <View style={styles.pieInfo}>
            <View style={[styles.piePlaca, { backgroundColor: colors.primaryRing }]}>
              <IconPin color={colors.primary} size={14} />
            </View>
            <View style={styles.pieTextos}>
              <Text style={[styles.pieTitulo, { color: colors.ink }]}>
                {arrastrando ? 'Moviendo el pin…' : 'Punto seleccionado'}
              </Text>
              <Text style={[styles.pieSub, { color: colors.inkSubtle }]} numberOfLines={1}>
                Se guardará como enlace de Google Maps
              </Text>
            </View>
          </View>
          <ModalPrimaryButton
            label="Usar esta ubicación"
            icon={<IconCheck color={colors.onPrimary} size={17} />}
            onPress={confirmar}
            disabled={!mapaListo || arrastrando}
          />
        </ModalFooter>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  pieInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  piePlaca: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieTextos: { flex: 1, minWidth: 0, gap: 1 },
  pieTitulo: { ...type.label },
  pieSub: { ...type.caption, fontSize: 12 },
  mapaWrap: { flex: 1, overflow: 'hidden' },
  mapaFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapa: { flex: 1, ...Platform.select({ android: { backgroundColor: 'transparent' } }) },
  cargando: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinContenedor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -PIN_SIZE / 2,
    marginTop: -(PIN_SIZE + 9),
    alignItems: 'center',
  },
  sombraPin: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 6,
    borderRadius: 8,
    alignSelf: 'center',
  },
  pinPlaca: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pinPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  hintPill: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  hintTexto: { ...type.caption, fontSize: 12 },
  miUbicacionBtn: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
