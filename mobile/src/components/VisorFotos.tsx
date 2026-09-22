import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconAlerta, IconClose } from './icons';

export interface VisorOpciones {
  /**
   * Muestra cada imagen sobre una hoja blanca. Para firmas: son tinta oscura
   * sobre fondo transparente y sobre el negro del visor serían invisibles.
   */
  lienzoClaro?: boolean;
}

interface VisorFotosModalProps {
  urls: string[];
  indiceInicial: number;
  opciones: VisorOpciones;
  onClose: () => void;
}

const ZOOM = 2.5;
const DOBLE_TOQUE_MS = 260;
/** El visor es siempre oscuro (como Fotos de iOS/Android), en ambos temas. */
const BLANCO = '#FFFFFF';
const BLANCO_SUAVE = 'rgba(255,255,255,0.72)';
const VIDRIO = 'rgba(255,255,255,0.12)';
const VIDRIO_PRESSED = 'rgba(255,255,255,0.24)';
const VELO = 'rgba(0,0,0,0.55)';

/**
 * Visor de pantalla completa. Deslizar cambia de foto (paginación nativa);
 * doble toque acerca ×2.5 y, ya ampliada, se arrastra con un dedo; un toque
 * oculta los controles para ver la foto limpia. La tira de miniaturas
 * permite saltar directo a cualquier foto.
 */
function VisorFotosModal({ urls, indiceInicial, opciones, onClose }: VisorFotosModalProps) {
  const [indice, setIndice] = useState(indiceInicial);
  const [controles, setControles] = useState(true);
  const [ampliada, setAmpliada] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const listaRef = useRef<FlatList<string>>(null);
  const miniaturasRef = useRef<ScrollView>(null);
  const opacidadControles = useRef(new Animated.Value(1)).current;
  const varias = urls.length > 1;

  useEffect(() => {
    Animated.timing(opacidadControles, {
      toValue: controles ? 1 : 0,
      duration: reduced ? 0 : 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controles, opacidadControles, reduced]);

  useEffect(() => {
    miniaturasRef.current?.scrollTo({ x: Math.max(indice * (MINI + MINI_GAP) - width / 2 + MINI, 0), animated: !reduced });
  }, [indice, width, reduced]);

  const alTerminarScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nuevo = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndice(Math.min(Math.max(nuevo, 0), urls.length - 1));
    },
    [width, urls.length],
  );

  const irA = (i: number) => {
    setIndice(i);
    listaRef.current?.scrollToIndex({ index: i, animated: !reduced });
  };

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => (
      <PaginaZoom
        uri={item}
        ancho={width}
        activa={index === indice}
        lienzoClaro={Boolean(opciones.lienzoClaro)}
        onToque={() => setControles((v) => !v)}
        onZoom={setAmpliada}
      />
    ),
    [width, indice, opciones.lienzoClaro],
  );

  const sujeto = opciones.lienzoClaro ? 'Firma' : 'Foto';
  const titulo = varias ? `${sujeto} ${indice + 1} de ${urls.length}` : sujeto;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.fondo}>
        <FlatList
          ref={listaRef}
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          scrollEnabled={!ampliada}
          initialScrollIndex={indiceInicial}
          getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={alTerminarScroll}
          bounces={varias}
        />

        <Animated.View
          style={[styles.encabezado, { paddingTop: insets.top + spacing.sm, opacity: opacidadControles }]}
          pointerEvents={controles ? 'box-none' : 'none'}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar visor"
            onPress={onClose}
            hitSlop={4}
            style={({ pressed }) => [styles.boton, { backgroundColor: pressed ? VIDRIO_PRESSED : VIDRIO }]}
          >
            <IconClose color={BLANCO} size={16} />
          </Pressable>
          <Text style={styles.titulo} accessibilityRole="header" accessibilityLiveRegion="polite">
            {titulo}
          </Text>
          <View style={styles.boton} />
        </Animated.View>

        <Animated.View
          style={[styles.pie, { paddingBottom: insets.bottom + spacing.md, opacity: opacidadControles }]}
          pointerEvents={controles ? 'box-none' : 'none'}
        >
          {varias ? (
            <ScrollView
              ref={miniaturasRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.miniaturas}
            >
              {urls.map((url, i) => (
                <Pressable
                  key={`${url}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${sujeto.toLowerCase()} ${i + 1}`}
                  accessibilityState={{ selected: i === indice }}
                  onPress={() => irA(i)}
                  style={[styles.mini, i === indice ? styles.miniActiva : styles.miniInactiva]}
                >
                  <Image
                    source={{ uri: url }}
                    style={[styles.miniImg, opciones.lienzoClaro ? styles.miniClara : null]}
                    resizeMode={opciones.lienzoClaro ? 'contain' : 'cover'}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.ayuda}>
            {ampliada ? 'Arrastra para recorrer · doble toque para alejar' : 'Doble toque para acercar'}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PaginaZoom({
  uri,
  ancho,
  activa,
  lienzoClaro,
  onToque,
  onZoom,
}: {
  uri: string;
  ancho: number;
  activa: boolean;
  lienzoClaro: boolean;
  onToque: () => void;
  onZoom: (ampliada: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [alto, setAlto] = useState(0);
  const escala = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const ampliadaRef = useRef(false);
  const ultimoToque = useRef(0);
  const toqueSimple = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limites = useCallback(
    () => ({ x: (ancho * (ZOOM - 1)) / 2, y: (alto * (ZOOM - 1)) / 2 }),
    [ancho, alto],
  );

  const ajustarZoom = useCallback(
    (ampliar: boolean) => {
      ampliadaRef.current = ampliar;
      offset.current = { x: 0, y: 0 };
      onZoom(ampliar);
      const dur = reduced ? 0 : 220;
      Animated.parallel([
        Animated.timing(escala, {
          toValue: ampliar ? ZOOM : 1,
          duration: dur,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pan, {
          toValue: { x: 0, y: 0 },
          duration: dur,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [escala, pan, onZoom, reduced],
  );

  // Al salir de la página (deslizar a otra foto) vuelve a su tamaño normal.
  useEffect(() => {
    if (!activa && ampliadaRef.current) ajustarZoom(false);
  }, [activa, ajustarZoom]);

  useEffect(
    () => () => {
      if (toqueSimple.current) clearTimeout(toqueSimple.current);
    },
    [],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          ampliadaRef.current && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
        onPanResponderMove: (_e, g) => {
          const lim = limites();
          pan.setValue({
            x: Math.max(-lim.x, Math.min(lim.x, offset.current.x + g.dx)),
            y: Math.max(-lim.y, Math.min(lim.y, offset.current.y + g.dy)),
          });
        },
        onPanResponderRelease: (_e, g) => {
          const lim = limites();
          offset.current = {
            x: Math.max(-lim.x, Math.min(lim.x, offset.current.x + g.dx)),
            y: Math.max(-lim.y, Math.min(lim.y, offset.current.y + g.dy)),
          };
        },
      }),
    [limites, pan],
  );

  const alTocar = () => {
    const ahora = Date.now();
    if (ahora - ultimoToque.current < DOBLE_TOQUE_MS) {
      if (toqueSimple.current) clearTimeout(toqueSimple.current);
      ultimoToque.current = 0;
      ajustarZoom(!ampliadaRef.current);
      return;
    }
    ultimoToque.current = ahora;
    toqueSimple.current = setTimeout(onToque, DOBLE_TOQUE_MS);
  };

  return (
    <View
      style={[styles.pagina, { width: ancho }]}
      onLayout={(e) => setAlto(e.nativeEvent.layout.height)}
      {...responder.panHandlers}
    >
      <Pressable
        style={styles.paginaToque}
        onPress={alTocar}
        accessibilityRole="image"
        accessibilityLabel={lienzoClaro ? 'Firma en tamaño completo' : 'Foto en tamaño completo'}
        accessibilityHint="Toca dos veces para acercar o alejar"
      >
        <Animated.View
          style={[
            styles.imagenCaja,
            lienzoClaro ? styles.lienzoClaro : null,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: escala }] },
          ]}
        >
          <Image
            source={{ uri }}
            style={styles.imagen}
            resizeMode="contain"
            onLoad={() => setEstado('lista')}
            onError={() => setEstado('error')}
          />
        </Animated.View>
      </Pressable>

      {estado === 'cargando' ? (
        <View style={styles.estado} pointerEvents="none">
          <ActivityIndicator color={BLANCO} />
        </View>
      ) : estado === 'error' ? (
        <View style={styles.estado} pointerEvents="none">
          <IconAlerta color={BLANCO_SUAVE} size={22} />
          <Text style={styles.estadoTexto}>No se pudo cargar la imagen</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * `const { abrir, visor } = useVisorFotos();` — `abrir(urls, indice)` en el
 * `onPress` de cada miniatura, `{visor}` una vez en el JSX del componente.
 */
export function useVisorFotos() {
  const [estado, setEstado] = useState<{ urls: string[]; indice: number; opciones: VisorOpciones } | null>(
    null,
  );

  const abrir = useCallback((urls: string[], indice = 0, opciones: VisorOpciones = {}) => {
    if (urls.length === 0) return;
    setEstado({ urls, indice, opciones });
  }, []);

  const cerrar = useCallback(() => setEstado(null), []);

  const visor = estado ? (
    <VisorFotosModal
      urls={estado.urls}
      indiceInicial={estado.indice}
      opciones={estado.opciones}
      onClose={cerrar}
    />
  ) : null;

  return { abrir, visor };
}

const MINI = 52;
const MINI_GAP = spacing.sm;

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#000000' },
  pagina: { flex: 1, overflow: 'hidden' },
  paginaToque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagenCaja: { width: '100%', height: '100%' },
  lienzoClaro: {
    width: '92%',
    height: undefined,
    aspectRatio: 1.6,
    backgroundColor: BLANCO,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  imagen: { width: '100%', height: '100%' },
  estado: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  estadoTexto: { ...type.caption, color: BLANCO_SUAVE },
  encabezado: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: VELO,
  },
  boton: {
    width: TOUCH_TARGET - 6,
    height: TOUCH_TARGET - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: font.semibold, fontSize: 15, color: BLANCO, fontVariant: ['tabular-nums'] },
  pie: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: VELO,
  },
  miniaturas: { paddingHorizontal: spacing.lg, gap: MINI_GAP },
  mini: {
    width: MINI,
    height: MINI,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
  },
  miniActiva: { borderColor: BLANCO, opacity: 1 },
  miniInactiva: { borderColor: 'transparent', opacity: 0.5 },
  miniImg: { width: '100%', height: '100%' },
  miniClara: { backgroundColor: BLANCO },
  ayuda: { ...type.caption, fontSize: 12, color: BLANCO_SUAVE },
});
