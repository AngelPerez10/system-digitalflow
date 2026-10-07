import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconClose } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalFooter, ModalPrimaryButton } from '@/components/ModalChrome';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ServicioOpcion } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';

interface Props {
  visible: boolean;
  servicios: ServicioOpcion[];
  seleccion: number[];
  onCerrar: () => void;
  onListo: (ids: number[]) => void;
}

/** Marcas combinantes (U+0300–U+036F) que deja `normalize('NFD')`; así «cámara» se encuentra con «camara». */
const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase();
}

function letraDe(nombre: string): string {
  const c = normalizar(nombre.trim()).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

/** «CCTV, Alarmas y 2 más». */
function resumirNombres(nombres: string[]): string {
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

/** Filas que entran escalonadas al abrir o filtrar; las que se montan al desplazar, no. */
const ESCALONADAS = 12;
/** Recorrido del scroll en el que el título grande cede su lugar al de la barra. */
const COLAPSO = 56;

/**
 * Tipo de trabajo a pantalla completa, con el patrón de «título grande» de
 * iOS: arriba una barra compacta (cerrar · título pequeño · contador) y, en
 * la lista, el título grande con el buscador. Al desplazar, el título grande
 * se va y el pequeño aparece; todo atado al scroll en el hilo nativo.
 *
 * Lo elegido se resume en el pie («CCTV, Alarmas y 1 más» · Quitar todos):
 * marcar nunca empuja la lista bajo el dedo.
 *
 * Movimiento: entrada suave del título y el buscador; filas escalonadas; la
 * casilla se rellena con resorte y la fila se tiñe; el contador salta. Solo
 * `opacity`/`transform` y con «reducir movimiento» respetado.
 */
export function TipoTrabajoModal({ visible, servicios, seleccion, onCerrar, onListo }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Dentro de un Modal de Android el área segura puede llegar en 0: se usa la barra de estado.
  const arriba = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const reduced = useReducedMotion();
  const [elegidos, setElegidos] = useState<number[]>(seleccion);
  const [termino, setTermino] = useState('');
  const [apertura, setApertura] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setElegidos(seleccion);
    setTermino('');
    setApertura((n) => n + 1);
    scrollY.setValue(0);
    if (reduced) return;
    entrada.setValue(0);
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 420,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, seleccion, reduced, scrollY, entrada]);

  const nombres = useMemo(() => new Map(servicios.map((s) => [s.id, s.nombre])), [servicios]);

  const secciones = useMemo(() => {
    const t = normalizar(termino.trim());
    const filtrados = servicios
      .filter((s) => !t || normalizar(s.nombre).includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const grupos = new Map<string, ServicioOpcion[]>();
    for (const s of filtrados) {
      const l = letraDe(s.nombre);
      grupos.set(l, [...(grupos.get(l) ?? []), s]);
    }
    let indice = 0;
    return [...grupos.entries()].map(([letra, data]) => ({
      letra,
      data: data.map((s) => ({ ...s, indice: indice++ })),
    }));
  }, [servicios, termino]);

  const total = secciones.reduce((n, s) => n + s.data.length, 0);
  const alternar = (id: number) =>
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );

  // Barra: el título pequeño y la línea inferior aparecen al colapsar.
  const tituloChico = scrollY.interpolate({ inputRange: [COLAPSO * 0.6, COLAPSO], outputRange: [0, 1], extrapolate: 'clamp' });
  const subeChico = scrollY.interpolate({ inputRange: [COLAPSO * 0.6, COLAPSO], outputRange: [6, 0], extrapolate: 'clamp' });
  // Título grande: se desvanece y encoge un poco al subir (sin tocar layout).
  const tituloGrande = scrollY.interpolate({ inputRange: [0, COLAPSO], outputRange: [1, 0], extrapolate: 'clamp' });
  const escalaGrande = scrollY.interpolate({ inputRange: [-80, 0, COLAPSO], outputRange: [1.08, 1, 0.94], extrapolate: 'clamp' });
  const llegada = (px: number) => ({
    opacity: entrada,
    transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [px, 0] }) }],
  });

  const nombresElegidos = elegidos.map((id) => nombres.get(id) ?? 'Servicio');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <View style={[styles.flex, { backgroundColor: colors.surface }]}>
        {/* ---------------------------- Barra ---------------------------- */}
        <View style={[styles.barra, { paddingTop: arriba + spacing.xs, backgroundColor: colors.surface }]}>
          <Contador n={elegidos.length} />
          <Animated.Text
            style={[
              styles.tituloChico,
              { color: colors.ink, opacity: tituloChico, transform: [{ translateY: subeChico }] },
            ]}
            numberOfLines={1}
            importantForAccessibility="no"
          >
            Tipo de trabajo
          </Animated.Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin aplicar"
            onPress={onCerrar}
            hitSlop={6}
            style={({ pressed }) => [styles.cerrar, { backgroundColor: pressed ? colors.line : colors.surfaceSunken }]}
          >
            <IconClose color={colors.ink} size={15} />
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[styles.barraLinea, { backgroundColor: colors.line, opacity: tituloChico }]}
          />
        </View>

        {/* ---------------------------- Lista ---------------------------- */}
        <Animated.SectionList
          key={apertura}
          sections={secciones}
          keyExtractor={(s) => String(s.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          stickySectionHeadersEnabled
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.lista}
          initialNumToRender={24}
          ListHeaderComponent={
            <View style={styles.encabezado}>
              <Animated.View
                style={[llegada(10), { opacity: Animated.multiply(entrada, tituloGrande) }]}
              >
                <Animated.View style={[styles.tituloGrandeCaja, { transform: [{ scale: escalaGrande }] }]}>
                  <Text style={[styles.eyebrow, { color: colors.primary }]}>Clasificación</Text>
                  <Text style={[styles.tituloGrande, { color: colors.ink }]} accessibilityRole="header">
                    Tipo de trabajo
                  </Text>
                  <Text style={[styles.subtitulo, { color: colors.inkSubtle }]}>
                    {servicios.length} {servicios.length === 1 ? 'servicio' : 'servicios'} en el catálogo · elige uno o varios
                  </Text>
                </Animated.View>
              </Animated.View>
              <Animated.View style={llegada(16)}>
                <Buscador valor={termino} onCambio={setTermino} />
              </Animated.View>
              {termino.trim() && total > 0 ? (
                <Text style={[styles.resultados, { color: colors.inkSubtle }]}>
                  {total} {total === 1 ? 'resultado' : 'resultados'}
                </Text>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.letra, { backgroundColor: colors.surface }]}>
              <View style={[styles.letraPlaca, { backgroundColor: colors.primaryRing }]}>
                <Text style={[styles.letraTexto, { color: colors.primary }]}>{section.letra}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <FilaServicio
              nombre={item.nombre}
              termino={termino}
              activo={elegidos.includes(item.id)}
              retraso={item.indice < ESCALONADAS ? 140 + item.indice * 26 : -1}
              onPress={() => alternar(item.id)}
            />
          )}
          ListEmptyComponent={<SinResultados termino={termino} />}
        />

        {/* ----------------------------- Pie ----------------------------- */}
        <ModalFooter>
          {elegidos.length ? (
            <Cruce clave={nombresElegidos.join('|')}>
              <View style={styles.resumen}>
                <Text style={[styles.resumenTexto, { color: colors.inkMuted }]} numberOfLines={1}>
                  {resumirNombres(nombresElegidos)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar todos los servicios elegidos"
                  onPress={() => setElegidos([])}
                  hitSlop={8}
                  style={({ pressed }) => [pressed ? { opacity: 0.55 } : null]}
                >
                  <Text style={[styles.quitarTodos, { color: colors.danger }]}>Quitar todos</Text>
                </Pressable>
              </View>
            </Cruce>
          ) : null}
          <ModalPrimaryButton
            label={elegidos.length ? `Listo · ${elegidos.length} ${elegidos.length === 1 ? 'servicio' : 'servicios'}` : 'Listo'}
            icon={elegidos.length ? <IconCheck color={colors.onPrimary} size={16} /> : undefined}
            onPress={() => onListo(elegidos)}
          />
        </ModalFooter>
      </View>
    </Modal>
  );
}

/** Buscador hundido; al enfocar, el borde y la lupa toman el azul con un anillo suave. */
export function Buscador({
  valor,
  onCambio,
  placeholder = 'Buscar: CCTV, alarmas, redes…',
  autoFocus = false,
}: {
  valor: string;
  onCambio: (t: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [enfocado, setEnfocado] = useState(false);
  const foco = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(foco, { toValue: enfocado ? 1 : 0, duration: reduced ? 0 : 160, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enfocado, foco, reduced]);

  return (
    <View
      style={[
        styles.buscador,
        { backgroundColor: enfocado ? colors.surface : colors.surfaceSunken, borderColor: enfocado ? colors.primary : colors.line },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.anillo,
          {
            borderColor: colors.primaryRing,
            opacity: foco,
            transform: [{ scale: foco.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
          },
        ]}
      />
      <Lupa color={enfocado ? colors.primary : colors.inkSubtle} />
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.primary}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        style={[styles.buscadorInput, { color: colors.ink }]}
      />
      {valor ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onCambio('')}
          hitSlop={10}
          style={[styles.borrar, { backgroundColor: colors.lineStrong }]}
        >
          <IconClose color={colors.surface} size={10} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Contador de elegidos: entra creciendo con el primero, salta con cada cambio, sale con el último. */
function Contador({ n }: { n: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const visible = useRef(new Animated.Value(n > 0 ? 1 : 0)).current;
  const salto = useRef(new Animated.Value(1)).current;
  const previo = useRef(n);
  const [mostrado, setMostrado] = useState(n);

  useEffect(() => {
    if (n > 0) setMostrado(n);
    if (previo.current === n) return;
    const antes = previo.current;
    previo.current = n;
    if (reduced) {
      visible.setValue(n > 0 ? 1 : 0);
      return;
    }
    const anims: Animated.CompositeAnimation[] = [
      Animated.spring(visible, { toValue: n > 0 ? 1 : 0, friction: 7, tension: 200, useNativeDriver: true }),
    ];
    if (antes > 0 && n > 0) {
      salto.setValue(0.8);
      anims.push(Animated.spring(salto, { toValue: 1, friction: 4, tension: 280, useNativeDriver: true }));
    }
    const anim = Animated.parallel(anims);
    anim.start();
    return () => anim.stop();
  }, [n, visible, salto, reduced]);

  return (
    <Animated.View
      style={[
        styles.contador,
        {
          backgroundColor: colors.primary,
          opacity: visible,
          transform: [{ scale: Animated.multiply(salto, visible.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })) }],
        },
      ]}
      accessible={n > 0}
      accessibilityLabel={`${n} ${n === 1 ? 'servicio elegido' : 'servicios elegidos'}`}
      accessibilityLiveRegion="polite"
    >
      <IconCheck color={colors.onPrimary} size={11} />
      <Text style={[styles.contadorTexto, { color: colors.onPrimary }]}>{mostrado}</Text>
    </Animated.View>
  );
}

/** Fila con casilla animada; `retraso` ≥ 0 = entra escalonada. */
const FilaServicio = memo(function FilaServicio({
  nombre,
  termino,
  activo,
  retraso,
  onPress,
}: {
  nombre: string;
  termino: string;
  activo: boolean;
  retraso: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const llegada = useRef(new Animated.Value(retraso >= 0 && !reduced ? 0 : 1)).current;
  const marca = useRef(new Animated.Value(activo ? 1 : 0)).current;

  useEffect(() => {
    if (retraso < 0 || reduced) return;
    const anim = Animated.timing(llegada, {
      toValue: 1,
      duration: 280,
      delay: retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) {
      marca.setValue(activo ? 1 : 0);
      return;
    }
    const anim = activo
      ? Animated.spring(marca, { toValue: 1, friction: 5, tension: 240, useNativeDriver: true })
      : Animated.timing(marca, { toValue: 0, duration: 140, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [activo, marca, reduced]);

  return (
    <Animated.View
      style={{
        opacity: llegada,
        transform: [{ translateX: llegada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: activo }}
        accessibilityLabel={nombre}
        onPress={onPress}
        style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.filaTinte, { backgroundColor: colors.primaryRing, opacity: marca }]}
        />
        <View style={[styles.caja, { borderColor: activo ? colors.primary : colors.lineStrong }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.cajaRelleno,
              { backgroundColor: colors.primary, opacity: marca, transform: [{ scale: marca }] },
            ]}
          />
          <Animated.View style={{ opacity: marca, transform: [{ scale: marca.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
            <IconCheck color={colors.onPrimary} size={13} />
          </Animated.View>
        </View>
        <Resaltado
          texto={nombre}
          termino={termino}
          style={[styles.nombre, { color: colors.ink }, activo ? { fontFamily: font.semibold } : null]}
          color={colors.primary}
        />
      </Pressable>
    </Animated.View>
  );
});

/** Pinta en el acento la parte del nombre que coincide con la búsqueda. */
export function Resaltado({
  texto,
  termino,
  style,
  color,
}: {
  texto: string;
  termino: string;
  style: React.ComponentProps<typeof Text>['style'];
  color: string;
}) {
  const t = normalizar(termino.trim());
  const i = t ? normalizar(texto).indexOf(t) : -1;
  if (i < 0) {
    return (
      <Text style={style} numberOfLines={2}>
        {texto}
      </Text>
    );
  }
  return (
    <Text style={style} numberOfLines={2}>
      {texto.slice(0, i)}
      <Text style={{ color, fontFamily: font.bold }}>{texto.slice(i, i + t.length)}</Text>
      {texto.slice(i + t.length)}
    </Text>
  );
}

function SinResultados({ termino }: { termino: string }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return (
    <Animated.View
      style={[
        styles.vacio,
        { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
      ]}
    >
      <View style={[styles.vacioIcono, { backgroundColor: colors.primaryRing }]}>
        <Lupa color={colors.primary} />
      </View>
      <Text style={[styles.vacioTitulo, { color: colors.ink }]}>
        {termino.trim() ? `Sin resultados para «${termino.trim()}»` : 'El catálogo está vacío'}
      </Text>
      <Text style={[styles.vacioAyuda, { color: colors.inkSubtle }]}>
        {termino.trim() ? 'Prueba con otra palabra o revisa la ortografía.' : 'Agrega servicios desde la web.'}
      </Text>
    </Animated.View>
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
    const anim = Animated.timing(v, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, v, reduced]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

const CERRAR = 36;

const styles = StyleSheet.create({
  flex: { flex: 1 },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 1,
  },
  cerrar: { width: CERRAR, height: CERRAR, borderRadius: CERRAR / 2, alignItems: 'center', justifyContent: 'center' },
  tituloChico: {
    position: 'absolute',
    left: spacing.xxxl + spacing.lg,
    right: spacing.xxxl + spacing.lg,
    bottom: spacing.sm + 8,
    textAlign: 'center',
    fontFamily: font.semibold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  barraLinea: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: CERRAR,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: spacing.sm + 2,
    justifyContent: 'center',
  },
  contadorTexto: { fontFamily: font.bold, fontSize: 13, fontVariant: ['tabular-nums'] },

  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  encabezado: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.lg },
  tituloGrandeCaja: { transformOrigin: 'left center' },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  tituloGrande: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -1, marginTop: 2 },
  subtitulo: { ...type.caption, fontSize: 13.5, marginTop: 2 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  anillo: { position: 'absolute', top: -4, right: -4, bottom: -4, left: -4, borderWidth: 3, borderRadius: radius.md + 6 },
  buscadorInput: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 16, paddingVertical: spacing.sm },
  borrar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultados: { ...type.caption, fontSize: 12, marginTop: -spacing.sm },

  letra: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xs },
  letraPlaca: { alignSelf: 'flex-start', minWidth: 24, height: 24, borderRadius: 7, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  letraTexto: { fontFamily: font.bold, fontSize: 12.5 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  filaTinte: { borderRadius: radius.md },
  caja: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cajaRelleno: { borderRadius: 5 },
  nombre: { ...type.body, fontSize: 15, flex: 1 },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resumenTexto: { ...type.caption, fontSize: 13, flex: 1 },
  quitarTodos: { fontFamily: font.semibold, fontSize: 13 },

  vacio: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  vacioIcono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 16, textAlign: 'center' },
  vacioAyuda: { ...type.caption, fontSize: 13, textAlign: 'center' },
});
