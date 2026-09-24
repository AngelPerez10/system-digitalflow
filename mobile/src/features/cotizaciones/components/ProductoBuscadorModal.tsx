import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  buscarSyscom,
  buscarTvc,
  filtrarManuales,
  listProductosManuales,
  obtenerTipoCambio,
  type FuenteProducto,
  type ProductoCatalogo,
} from '@/api/productosCatalogoApi';
import { IconBox } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalHeader } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { formatMoneda } from '../cotizacionFormat';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (producto: ProductoCatalogo) => void;
}

type Filtro = 'todos' | FuenteProducto;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'manual', label: 'Manual' },
  { key: 'syscom', label: 'SYSCOM' },
  { key: 'tvc', label: 'TVC' },
];

const ESPERA_MS = 400;

/**
 * Buscador de productos de las tres fuentes de la web: catálogo manual
 * (filtrado en el teléfono), SYSCOM y TVC (en el servidor). Busca mientras se
 * escribe, con una pausa para no disparar una petición por tecla; si una
 * fuente falla, las demás siguen mostrando resultados.
 */
export function ProductoBuscadorModal({ visible, onCerrar, onElegir }: Props) {
  const { colors } = useTheme();
  const [termino, setTermino] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [manuales, setManuales] = useState<ProductoCatalogo[]>([]);
  const [externos, setExternos] = useState<ProductoCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const tipoCambio = useRef<number | null>(null);
  const preparado = useRef(false);

  // Catálogo manual y tipo de cambio, una sola vez por sesión del modal.
  useEffect(() => {
    if (!visible || preparado.current) return;
    preparado.current = true;
    const control = new AbortController();
    listProductosManuales(control.signal)
      .then(setManuales)
      .catch(() => undefined);
    obtenerTipoCambio(control.signal)
      .then((tc) => {
        tipoCambio.current = tc;
      })
      .catch(() => undefined);
    return () => control.abort();
  }, [visible]);

  useEffect(() => {
    const t = termino.trim();
    if (!visible || t.length < 2) {
      setExternos([]);
      setBuscando(false);
      setAviso(null);
      return;
    }
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      setAviso(null);
      const [tvc, syscom] = await Promise.allSettled([
        buscarTvc(t, tipoCambio.current, control.signal),
        buscarSyscom(t, tipoCambio.current, control.signal),
      ]);
      if (control.signal.aborted) return;
      const lista: ProductoCatalogo[] = [];
      const vistos = new Set<string>();
      for (const r of [tvc, syscom]) {
        if (r.status !== 'fulfilled') continue;
        for (const p of r.value) {
          if (vistos.has(p.clave)) continue;
          vistos.add(p.clave);
          lista.push(p);
        }
      }
      setExternos(lista);
      if (tvc.status === 'rejected' && syscom.status === 'rejected') {
        setAviso('No se pudo consultar SYSCOM ni TVC en este momento.');
      }
      setBuscando(false);
    }, ESPERA_MS);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [termino, visible]);

  const resultados = useMemo(() => {
    const todos = [...filtrarManuales(manuales, termino), ...externos];
    return filtro === 'todos' ? todos : todos.filter((p) => p.fuente === filtro);
  }, [manuales, externos, termino, filtro]);

  const conteo = (f: Filtro) => {
    const todos = [...filtrarManuales(manuales, termino), ...externos];
    return f === 'todos' ? todos.length : todos.filter((p) => p.fuente === f).length;
  };

  const vacio = termino.trim().length < 2;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow="Agregar partida" titulo="Buscar producto" onCerrar={onCerrar} />
        <View style={styles.cabeza}>
          <TextField
            label="Producto"
            value={termino}
            onChangeText={setTermino}
            placeholder="Nombre, marca o modelo"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
          <View style={[styles.segmento, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
            {FILTROS.map((f) => {
              const activo = filtro === f.key;
              const n = vacio ? null : conteo(f.key);
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                  accessibilityLabel={`${f.label}${n !== null ? `, ${n} resultados` : ''}`}
                  onPress={() => setFiltro(f.key)}
                  style={[styles.segmentoOpcion, activo ? { backgroundColor: colors.surface } : null]}
                >
                  <Text style={[styles.segmentoTexto, { color: activo ? colors.ink : colors.inkMuted }]}>{f.label}</Text>
                  {n !== null ? <Text style={[styles.segmentoConteo, { color: colors.inkSubtle }]}>{n}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <FlatList
          data={resultados}
          keyExtractor={(p) => p.clave}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          initialNumToRender={10}
          ListHeaderComponent={
            buscando ? (
              <View style={styles.cargando}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.cargandoTexto, { color: colors.inkSubtle }]}>Buscando en SYSCOM y TVC…</Text>
              </View>
            ) : aviso ? (
              <Text style={[styles.aviso, { color: colors.danger }]}>{aviso}</Text>
            ) : null
          }
          ListEmptyComponent={
            buscando ? null : (
              <View style={styles.vacio}>
                <View style={[styles.vacioIcono, { backgroundColor: colors.surfaceSunken }]}>
                  <IconBox color={colors.inkSubtle} size={22} />
                </View>
                <Text style={[styles.vacioTexto, { color: colors.inkSubtle }]}>
                  {vacio ? 'Escribe al menos 2 letras para buscar en el catálogo manual, SYSCOM y TVC.' : 'Sin productos con ese texto.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item, index }) => <FilaProducto producto={item} primera={index === 0} onPress={() => onElegir(item)} />}
        />
      </View>
    </Modal>
  );
}

const ETIQUETA_FUENTE: Record<FuenteProducto, string> = { manual: 'Manual', syscom: 'SYSCOM', tvc: 'TVC' };

function FilaProducto({ producto, primera, onPress }: { producto: ProductoCatalogo; primera: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const tono =
    producto.fuente === 'syscom'
      ? { bg: colors.primaryRing, fg: colors.primary }
      : producto.fuente === 'tvc'
        ? { bg: colors.statusPausadoBg, fg: colors.statusPausadoText }
        : { bg: colors.goldSoftBg, fg: colors.goldSoftText };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${producto.titulo}, ${ETIQUETA_FUENTE[producto.fuente]}, ${formatMoneda(producto.precio)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fila,
        primera ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
        pressed ? { backgroundColor: colors.surfaceSunken } : null,
      ]}
    >
      <View style={[styles.miniatura, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {producto.imagenUrl ? (
          <Image source={{ uri: producto.imagenUrl }} style={styles.imagen} resizeMode="contain" />
        ) : (
          <IconBox color={colors.inkSubtle} size={18} />
        )}
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: colors.ink }]} numberOfLines={2}>
          {producto.titulo}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.fuente, { backgroundColor: tono.bg }]}>
            <Text style={[styles.fuenteTexto, { color: tono.fg }]}>{ETIQUETA_FUENTE[producto.fuente]}</Text>
          </View>
          {producto.subtitulo ? (
            <Text style={[styles.subtitulo, { color: colors.inkSubtle }]} numberOfLines={1}>
              {producto.subtitulo}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.derecha}>
        <Text style={[styles.precio, { color: producto.precio > 0 ? colors.ink : colors.inkSubtle }]}>
          {producto.precio > 0 ? formatMoneda(producto.precio) : 'Sin precio'}
        </Text>
        {producto.existencia !== null ? (
          <Text style={[styles.existencia, { color: producto.existencia > 0 ? colors.statusResueltoText : colors.inkSubtle }]}>
            {producto.existencia > 0 ? `${producto.existencia} en stock` : 'Sin stock'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabeza: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  segmento: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3, marginBottom: spacing.sm },
  segmentoOpcion: { flex: 1, minHeight: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  segmentoTexto: { fontFamily: font.semibold, fontSize: 12 },
  segmentoConteo: { ...type.mono, fontSize: 11 },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  cargandoTexto: { ...type.caption, fontSize: 12 },
  aviso: { ...type.caption, fontSize: 12, paddingVertical: spacing.sm },
  vacio: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  vacioIcono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { ...type.caption, textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_TARGET + 20, paddingVertical: spacing.sm },
  miniatura: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagen: { width: '100%', height: '100%' },
  textos: { flex: 1, minWidth: 0, gap: 4 },
  titulo: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fuente: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
  fuenteTexto: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.3 },
  subtitulo: { ...type.caption, fontSize: 11, flexShrink: 1 },
  derecha: { alignItems: 'flex-end', gap: 2 },
  precio: { fontFamily: font.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  existencia: { ...type.caption, fontSize: 11 },
});
