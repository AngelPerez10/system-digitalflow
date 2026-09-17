import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconClose } from './icons';
import { spacing, type } from '@/theme/tokens';

interface VisorFotosModalProps {
  urls: string[];
  indiceInicial: number;
  onClose: () => void;
}

/**
 * Visor de pantalla completa — carrusel con paginación nativa (deslizar con
 * el dedo, no flechas): el `PanResponder` con `translateX` manual que tenía
 * antes solo movía la imagen actual y volvía a su sitio al soltar, sin
 * mostrar de verdad la siguiente foto entrando. Un `FlatList` horizontal con
 * `pagingEnabled` da el gesto real (con inercia) de una galería nativa.
 *
 * Nació dentro de `FotosGaleria` para las evidencias y se extrajo aquí para
 * que cualquier lugar de la app que muestre fotos (firmas, bitácora, equipos,
 * editor de evidencias) abra la misma miniatura en grande, para técnico y
 * cliente por igual.
 */
function VisorFotosModal({ urls, indiceInicial, onClose }: VisorFotosModalProps) {
  const [indice, setIndice] = useState(indiceInicial);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const alTerminarScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nuevoIndice = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndice(Math.min(Math.max(nuevoIndice, 0), urls.length - 1));
    },
    [width, urls.length],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <View style={[styles.pagina, { width }]}>
        <Image source={{ uri: item }} style={styles.imagenGrande} resizeMode="contain" />
      </View>
    ),
    [width],
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.visorFondo}>
        <FlatList
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          initialScrollIndex={indiceInicial}
          getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={alTerminarScroll}
          bounces={urls.length > 1}
        />

        <View style={[styles.encabezado, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.encabezadoFade} pointerEvents="none" />
          <View style={styles.encabezadoFila}>
            {urls.length > 1 ? (
              <View style={styles.contador}>
                <Text style={styles.contadorTexto}>
                  {indice + 1} / {urls.length}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.cerrar, pressed ? styles.cerrarPressed : null]}
            >
              <IconClose color="#FFFFFF" size={16} />
            </Pressable>
          </View>
        </View>

        {urls.length > 1 ? (
          <View style={[styles.piePuntos, { paddingBottom: insets.bottom + spacing.lg }]} pointerEvents="none">
            <View style={styles.pieFade} pointerEvents="none" />
            <View style={styles.puntos}>
              {urls.map((url, i) => (
                <View key={url + i} style={[styles.punto, i === indice ? styles.puntoActivo : null]} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/**
 * `const { abrir, visor } = useVisorFotos();` — `abrir(urls, indice)` en el
 * `onPress` de cada miniatura, `{visor}` una vez en el JSX del componente.
 */
export function useVisorFotos() {
  const [estado, setEstado] = useState<{ urls: string[]; indice: number } | null>(null);

  const abrir = useCallback((urls: string[], indice = 0) => {
    if (urls.length === 0) return;
    setEstado({ urls, indice });
  }, []);

  const cerrar = useCallback(() => setEstado(null), []);

  const visor = estado ? (
    <VisorFotosModal urls={estado.urls} indiceInicial={estado.indice} onClose={cerrar} />
  ) : null;

  return { abrir, visor };
}

const styles = StyleSheet.create({
  visorFondo: { flex: 1, backgroundColor: '#000000' },
  pagina: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagenGrande: { width: '100%', height: '100%' },
  encabezado: { position: 'absolute', top: 0, left: 0, right: 0 },
  encabezadoFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  encabezadoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  contador: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  contadorTexto: { ...type.label, fontSize: 12, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  cerrarPressed: { backgroundColor: 'rgba(255,255,255,0.28)' },
  piePuntos: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  pieFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  puntos: { flexDirection: 'row', gap: spacing.xs },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  puntoActivo: { backgroundColor: '#FFFFFF', width: 18 },
});
