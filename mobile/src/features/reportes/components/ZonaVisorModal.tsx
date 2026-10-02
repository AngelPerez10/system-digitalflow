import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonAccion } from '@/components/BotonAccion';
import { IconCamera, IconChevron, IconExpand } from '@/components/icons';
import { ModalHeader } from '@/components/ModalChrome';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { ReporteZona } from '@/types/reporte';
import { miniaturaUrl } from '@/utils/miniatura';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { zonaCompleta } from '../reporteFormat';
import type { LadoZona } from './ZonaFila';

interface Props {
  visible: boolean;
  /** Zonas que se recorren (las del filtro activo), en orden. */
  zonas: ReporteZona[];
  /** Número de cada zona en el reporte completo (no cambia al filtrar). */
  numeroDe: (zonaId: string) => number;
  /** Total de zonas del reporte. */
  totalReporte: number;
  zonaInicial: string | null;
  ladoInicial: LadoZona;
  onCerrar: () => void;
}

/** Carrusel de un lado: fotos que se deslizan página por página, con contador y puntos. */
function PanelLado({
  lado,
  urls,
  zona,
  onVer,
  onLayout,
}: {
  lado: LadoZona;
  urls: string[];
  zona: string;
  onVer: (urls: string[], indice: number) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const [ancho, setAncho] = useState(0);
  const [pagina, setPagina] = useState(0);
  const etiqueta = lado === 'antes' ? 'Antes' : 'Después';
  const alto = Math.round((ancho * 3) / 4);

  const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ancho > 0) setPagina(Math.round(e.nativeEvent.contentOffset.x / ancho));
  };

  return (
    <View style={styles.panel} onLayout={onLayout}>
      <View style={styles.panelCabeza}>
        <View style={[styles.panelPunto, { backgroundColor: lado === 'antes' ? colors.gold : colors.success }]} />
        <Text style={[styles.panelTitulo, { color: colors.ink }]} accessibilityRole="header">
          {etiqueta}
        </Text>
        <Text style={[styles.panelConteo, { color: colors.inkSubtle }]}>
          {urls.length === 0 ? 'Sin fotos' : `${pagina + 1} / ${urls.length}`}
        </Text>
      </View>
      <View
        style={[styles.marco, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}
        onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}
      >
        {urls.length > 0 && ancho > 0 ? (
          <FlatList
            data={urls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${u}-${i}`}
            onMomentumScrollEnd={alDeslizar}
            initialNumToRender={1}
            windowSize={3}
            getItemLayout={(_, i) => ({ length: ancho, offset: ancho * i, index: i })}
            renderItem={({ item, index }) => (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={`${etiqueta}, foto ${index + 1} de ${urls.length}, ${zona}`}
                accessibilityHint="Abre la foto con zoom"
                onPress={() => onVer(urls, index)}
                style={{ width: ancho, height: alto }}
              >
                <Image source={{ uri: miniaturaUrl(item, 960) }} style={styles.foto} resizeMode="cover" fadeDuration={220} />
              </Pressable>
            )}
          />
        ) : urls.length === 0 ? (
          <View style={[styles.vacio, { height: alto || undefined, aspectRatio: alto ? undefined : 4 / 3 }]}>
            <IconCamera color={colors.inkSubtle} size={20} />
            <Text style={[styles.vacioTexto, { color: colors.inkMuted }]}>Sin fotos de {etiqueta.toLowerCase()}</Text>
          </View>
        ) : (
          <View style={{ aspectRatio: 4 / 3 }} />
        )}

        {urls.length > 0 ? (
          <>
            <View style={styles.zoom} pointerEvents="none">
              <IconExpand color="#FFFFFF" size={12} />
            </View>
            {urls.length > 1 ? (
              <View style={styles.puntos} pointerEvents="none">
                {urls.map((u, i) => (
                  <View key={`${u}-${i}`} style={[styles.punto, i === pagina ? styles.puntoActivo : null]} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Visor de zona a pantalla completa: Antes arriba, Después abajo (comparación
 * vertical, natural en un teléfono), cada uno con su carrusel. Pensado para
 * reportes largos: «Anterior / Siguiente» recorre las zonas sin volver a la
 * lista, con una barra de posición arriba; al cambiar de zona el contenido se
 * desliza en la dirección del cambio (transform/opacity, hilo nativo).
 */
export function ZonaVisorModal({ visible, zonas, numeroDe, totalReporte, zonaInicial, ladoInicial, onCerrar }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { abrir, visor } = useVisorFotos();
  const [indice, setIndice] = useState(0);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const contenido = useRef(new Animated.Value(1)).current;
  const avance = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const yDespues = useRef(0);
  const irADespues = useRef(false);

  // Al abrir, colocarse en la zona tocada (y en Después si se tocó ese lado).
  useEffect(() => {
    if (!visible) return;
    const i = Math.max(0, zonas.findIndex((z) => z.id === zonaInicial));
    setIndice(i);
    irADespues.current = ladoInicial === 'despues';
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const total = zonas.length;
  const zona = zonas[Math.min(indice, Math.max(total - 1, 0))];

  useEffect(() => {
    if (!visible || total === 0) return;
    const fraccion = (indice + 1) / total;
    if (reduced) {
      contenido.setValue(1);
      avance.setValue(fraccion);
      return;
    }
    contenido.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(contenido, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(avance, { toValue: fraccion, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [indice, visible, total, reduced, contenido, avance]);

  const ir = (delta: 1 | -1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= total) return;
    setDireccion(delta);
    setIndice(destino);
    irADespues.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  if (!zona) return null;
  const numero = numeroDe(zona.id);
  const nombre = zona.titulo.trim() || `Zona ${numero}`;
  const completa = zonaCompleta(zona);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow={`Zona ${numero} de ${totalReporte}${completa ? ' · completa' : ''}`} titulo={nombre} onCerrar={onCerrar} />
        <View style={[styles.pista, { backgroundColor: colors.line }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.relleno, { backgroundColor: colors.gold, transform: [{ scaleX: avance }] }]} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          <Animated.View
            key={zona.id}
            style={[
              styles.paneles,
              {
                opacity: contenido,
                transform: [{ translateX: contenido.interpolate({ inputRange: [0, 1], outputRange: [24 * direccion, 0] }) }],
              },
            ]}
          >
            <PanelLado lado="antes" urls={zona.fotos_antes} zona={nombre} onVer={abrir} />
            <PanelLado
              lado="despues"
              urls={zona.fotos_despues}
              zona={nombre}
              onVer={abrir}
              onLayout={(e) => {
                yDespues.current = e.nativeEvent.layout.y;
                if (irADespues.current) {
                  irADespues.current = false;
                  scrollRef.current?.scrollTo({ y: yDespues.current, animated: !reduced });
                }
              }}
            />
          </Animated.View>
        </ScrollView>

        <View
          style={[
            styles.pie,
            { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <BotonAccion
            label="Anterior"
            variante="secundario"
            icon={(c) => <IconChevron direction="left" color={c} size={16} />}
            disabled={indice === 0}
            onPress={() => ir(-1)}
            accessibilityHint="Muestra la zona anterior"
          />
          <BotonAccion
            label="Siguiente"
            icon={(c) => <IconChevron direction="right" color={c} size={16} />}
            disabled={indice >= total - 1}
            onPress={() => ir(1)}
            accessibilityHint="Muestra la zona siguiente"
          />
        </View>
      </View>
      {visor}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pista: { height: 3, overflow: 'hidden' },
  relleno: { height: 3, width: '100%', transformOrigin: 'left' },
  contenido: { padding: spacing.lg, paddingBottom: spacing.xxl },
  paneles: { gap: spacing.xl },
  panel: { gap: spacing.sm },
  panelCabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  panelPunto: { width: 9, height: 9, borderRadius: 5 },
  panelTitulo: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, flex: 1 },
  panelConteo: { ...type.mono, fontSize: 12 },
  marco: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  vacio: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  vacioTexto: { ...type.caption },
  zoom: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(9, 9, 11, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntos: { position: 'absolute', bottom: spacing.sm, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  puntoActivo: { width: 16, backgroundColor: '#FFFFFF' },
  pie: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
