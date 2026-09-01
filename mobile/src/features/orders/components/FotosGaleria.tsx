import React, { useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { IconChevron, IconClose } from '@/components/icons';
import { colors, elevation, radius, spacing, type } from '@/theme/tokens';

interface Props {
  urls: string[];
}

const COLUMNAS = 2;
const HUECO = spacing.sm;
const UMBRAL_DESLIZE = 60;

/**
 * Cuadrícula de miniaturas de la orden con visor de pantalla completa al
 * tocar — antes `fotos_urls` llegaba de la API y no se mostraba en ningún
 * lado. No hay galería nativa disponible, así que el visor (deslizar,
 * puntos, contador) se construye aquí mismo con `Modal` + `PanResponder`.
 *
 * Dos columnas, no tres: con tres la miniatura quedaba casi un ícono —
 * pocas fotos por orden (5–10), así que el tamaño importa más que la
 * densidad.
 */
export function FotosGaleria({ urls }: Props) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const deslizeX = useRef(new Animated.Value(0)).current;

  const cambiar = (delta: number) => {
    setAbierta((i) => (i === null ? null : (i + delta + urls.length) % urls.length));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_e, gesture) => deslizeX.setValue(gesture.dx),
        onPanResponderRelease: (_e, gesture) => {
          if (gesture.dx <= -UMBRAL_DESLIZE && urls.length > 1) cambiar(1);
          else if (gesture.dx >= UMBRAL_DESLIZE && urls.length > 1) cambiar(-1);
          Animated.spring(deslizeX, { toValue: 0, friction: 9, tension: 60, useNativeDriver: true }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urls.length],
  );

  if (urls.length === 0) return null;

  const cerrar = () => setAbierta(null);

  return (
    <>
      <View style={styles.grid}>
        {urls.map((url, index) => (
          <Pressable
            key={`${url}-${index}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Ver foto ${index + 1} de ${urls.length}`}
            onPress={() => setAbierta(index)}
            style={styles.miniaturaTouch}
          >
            <Image source={{ uri: url }} style={styles.miniatura} resizeMode="cover" />
          </Pressable>
        ))}
      </View>

      <Modal visible={abierta !== null} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.visorFondo}>
          <View style={[styles.visorHeader, { top: insets.top + spacing.md }]}>
            <Text style={styles.visorContador}>{abierta !== null ? `${abierta + 1} / ${urls.length}` : ''}</Text>
            <IconButton
              icon={<IconClose color="#FFFFFF" />}
              accessibilityLabel="Cerrar"
              variant="ghost"
              onPress={cerrar}
            />
          </View>

          {abierta !== null ? (
            <Animated.View
              style={[styles.imagenWrap, { transform: [{ translateX: deslizeX }] }]}
              {...panResponder.panHandlers}
            >
              <Image source={{ uri: urls[abierta] }} style={styles.imagenGrande} resizeMode="contain" />
            </Animated.View>
          ) : null}

          {urls.length > 1 ? (
            <>
              <View style={styles.visorNav} pointerEvents="box-none">
                <IconButton
                  icon={<IconChevron direction="left" color="#FFFFFF" />}
                  accessibilityLabel="Foto anterior"
                  variant="ghost"
                  onPress={() => cambiar(-1)}
                />
                <IconButton
                  icon={<IconChevron direction="right" color="#FFFFFF" />}
                  accessibilityLabel="Foto siguiente"
                  variant="ghost"
                  onPress={() => cambiar(1)}
                />
              </View>

              <View style={[styles.puntos, { bottom: insets.bottom + spacing.lg }]} pointerEvents="none">
                {urls.map((url, index) => (
                  <View key={url + index} style={[styles.punto, index === abierta ? styles.puntoActivo : null]} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // El hueco lo pone el `padding` de cada celda, no un `gap` en la fila: con las
  // dos cosas juntas, 50 % + 50 % + gap pasa del ancho disponible y `flexWrap`
  // manda cada miniatura a su propio renglón. El margen negativo compensa ese
  // padding para que la cuadrícula quede a ras de la tarjeta.
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -HUECO / 2 },
  miniaturaTouch: {
    width: `${100 / COLUMNAS}%`,
    aspectRatio: 4 / 3,
    padding: HUECO / 2,
  },
  miniatura: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    ...elevation.panel,
  },
  visorFondo: { flex: 1, backgroundColor: 'rgba(9,9,11,0.96)', justifyContent: 'center' },
  visorHeader: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  visorContador: { ...type.label, color: '#FFFFFF' },
  imagenWrap: { width: '100%', height: '72%' },
  imagenGrande: { width: '100%', height: '100%' },
  visorNav: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: '50%',
    marginTop: -24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  puntos: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  puntoActivo: { backgroundColor: '#FFFFFF', width: 16 },
});
