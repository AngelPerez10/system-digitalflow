import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { BrandMark } from '@/components/Brand';
import { IconChevron, IconClose } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

const DRAWER_WIDTH = Math.min(340, Dimensions.get('window').width * 0.88);

/** Abrir un poco más lento que cerrar — llegada confiada, salida rápida. */
const MS_OPEN = 300;
const MS_CLOSE = 200;

/** Vidrio sobre marino (siempre oscuro en ambos temas). */
const GLASS = 'rgba(255,255,255,0.08)';
const GLASS_PRESSED = 'rgba(255,255,255,0.18)';
const GLASS_LINE = 'rgba(255,255,255,0.14)';

export interface NavItem {
  key: string;
  label: string;
  hint?: string;
  icon: (color: string) => React.ReactNode;
  /** Resalta la fila como la sección actual. */
  active?: boolean;
  /**
   * Encabezado bajo el que se agrupa en el panel («Trabajo de campo»,
   * «Inventario»…). Los grupos salen en el orden en que aparece su primer
   * elemento; sin grupo cae en «Secciones».
   */
  grupo?: string;
  /** Contador en la fila (p. ej. disponibles sin ver). 0 u omitido = nada. */
  badge?: number;
  onPress: () => void;
}

/** A partir de cuántas vistas el panel muestra el buscador. */
const BUSCADOR_DESDE = 7;
const GRUPO_POR_DEFECTO = 'Secciones';

/** Agrupa conservando el orden de aparición (función pura, exportada para pruebas). */
export function agruparNavItems(items: NavItem[], filtro = ''): { grupo: string; items: NavItem[] }[] {
  const termino = filtro.trim().toLowerCase();
  const grupos: { grupo: string; items: NavItem[] }[] = [];
  for (const item of items) {
    if (termino && !`${item.label} ${item.hint ?? ''}`.toLowerCase().includes(termino)) continue;
    const nombre = item.grupo ?? GRUPO_POR_DEFECTO;
    let destino = grupos.find((g) => g.grupo === nombre);
    if (!destino) {
      destino = { grupo: nombre, items: [] };
      grupos.push(destino);
    }
    destino.items.push(item);
  }
  return grupos;
}

interface Props {
  titulo?: string;
  /** Nombre de la persona (saludo en el panel). */
  nombreUsuario?: string;
  /** Rol bajo el nombre en el panel. Técnico por defecto; el portal pasa «Cliente». */
  rolLabel?: string;
  /** Número de usuario (login del portal cliente). Se muestra bajo el rol si llega. */
  numeroUsuario?: string;
  /** Accesos directos del menú (Órdenes, Proyectos…). Con varios, cada uno
   *  resalta según `active`. Si se omite, cae a un solo acceso vía
   *  `itemLabel`/`onIrInicio` (compat con el portal cliente). */
  items?: NavItem[];
  /** Texto del acceso directo principal del menú (a la pantalla de inicio de la sección). */
  itemLabel?: string;
  /** Pista accesible para ese acceso directo. */
  itemHint?: string;
  /** Vuelve a la pantalla de inicio de la sección (listado). */
  onIrInicio?: () => void;
  onCerrarSesion?: () => void;
}

function IconMenu({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={14} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconOrdenes({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconProyectos({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4v-9Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path d="M3.5 7.5 12 11.5l8.5-4" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Line x1={12} y1={11.5} x2={12} y2={20.5} stroke={color} strokeWidth={1.9} />
    </Svg>
  );
}

function IconLupa({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={1.8} />
      <Line x1={15.3} y1={15.3} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconSalir({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 16l4-4-4-4M19 12H9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Chrome de la app autenticada: marca a la izquierda y, a la derecha, el
 * botón de cuenta (menú + iniciales) que abre un panel lateral derecho con el
 * perfil, las secciones y, al pie, el cierre de sesión con el tema. Lo comparten las
 * vistas del técnico y el portal del cliente — el rol y los accesos llegan
 * por props.
 */
export function AppNavbar({
  titulo = 'SertelPro',
  nombreUsuario,
  rolLabel = 'Técnico de campo',
  numeroUsuario,
  items,
  itemLabel = 'Mis órdenes',
  itemHint = 'Abre el listado del mes',
  onIrInicio,
  onCerrarSesion,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [deseado, setDeseado] = useState(false);
  const [montado, setMontado] = useState(false);
  const progreso = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const nombreVisible = nombreUsuario?.trim() || rolLabel;
  const iniciales = inicialesUsuarioDisplay(nombreVisible);
  const version = Constants.expoConfig?.version;

  const menuItems: NavItem[] =
    items ?? [
      {
        key: 'inicio',
        label: itemLabel,
        hint: itemHint,
        icon: (color) => <IconOrdenes color={color} />,
        active: true,
        onPress: () => onIrInicio?.(),
      },
    ];
  const seccionActiva = menuItems.find((item) => item.active);
  const [filtro, setFiltro] = useState('');
  const conBuscador = menuItems.length >= BUSCADOR_DESDE;
  const grupos = agruparNavItems(menuItems, filtro);
  const pendientesTotal = menuItems.reduce((suma, item) => suma + (item.badge ?? 0), 0);

  const abrir = useCallback(() => {
    setDeseado(true);
    setMontado(true);
  }, []);

  const cerrar = useCallback(() => {
    setDeseado(false);
    setFiltro('');
  }, []);

  useEffect(() => {
    if (!montado) return;

    animRef.current?.stop();

    if (reduced) {
      progreso.setValue(deseado ? 1 : 0);
      if (!deseado) setMontado(false);
      return;
    }

    if (deseado) progreso.setValue(0);

    const anim = Animated.timing(progreso, {
      toValue: deseado ? 1 : 0,
      duration: deseado ? MS_OPEN : MS_CLOSE,
      easing: deseado ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !deseado) setMontado(false);
    });

    return () => {
      anim.stop();
    };
  }, [deseado, montado, progreso, reduced]);

  const translateX = progreso.interpolate({ inputRange: [0, 1], outputRange: [DRAWER_WIDTH + 8, 0] });
  const contenidoOpacity = progreso.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.7, 1] });
  const contenidoShift = progreso.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const salir = () => {
    cerrar();
    onCerrarSesion?.();
  };

  const backdropColor = scheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(9, 9, 11, 0.45)';

  return (
    <>
      <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.navy }]} accessibilityRole="header">
        <View style={styles.fila}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${titulo}, ir al inicio`}
            onPress={() => (menuItems[0] ? menuItems[0].onPress() : onIrInicio?.())}
            style={({ pressed }) => [styles.marca, pressed ? { opacity: 0.75 } : null]}
          >
            <BrandMark size={34} background={colors.gold} foreground={colors.onGold} />
            <View style={styles.marcaTextos}>
              <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={1}>
                {titulo}
              </Text>
              {seccionActiva ? (
                <Text style={[styles.seccion, { color: colors.onNavyMuted }]} numberOfLines={1}>
                  {seccionActiva.label}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pendientesTotal > 0 ? `Abrir menú, ${pendientesTotal} avisos` : 'Abrir menú'}
            accessibilityHint="Perfil, secciones, apariencia y cerrar sesión"
            accessibilityState={{ expanded: deseado }}
            onPress={abrir}
            hitSlop={4}
            style={({ pressed }) => [
              styles.cuenta,
              { backgroundColor: pressed ? GLASS_PRESSED : GLASS, borderColor: GLASS_LINE },
            ]}
          >
            <IconMenu color={colors.onNavy} />
            <View style={[styles.cuentaAvatar, { backgroundColor: colors.gold }]}>
              <Text style={[styles.cuentaIniciales, { color: colors.onGold }]}>{iniciales}</Text>
              {pendientesTotal > 0 ? (
                <View style={[styles.cuentaAviso, { backgroundColor: colors.danger, borderColor: colors.navy }]} />
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      <Modal visible={montado} transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Animated.View
            style={[styles.backdrop, { backgroundColor: backdropColor, opacity: progreso }]}
            pointerEvents={deseado ? 'auto' : 'none'}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú"
              onPress={cerrar}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawer,
              { width: DRAWER_WIDTH, backgroundColor: colors.canvas, transform: [{ translateX }] },
            ]}
          >
            {/* Perfil: bloque marino, la misma familia que las cabeceras. */}
            <View style={[styles.perfil, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.md }]}>
              <View style={styles.perfilFila}>
                <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
                  <Text style={[styles.avatarTexto, { color: colors.onGold }]}>{iniciales}</Text>
                </View>
                <View style={styles.perfilTextos}>
                  <Text
                    style={[styles.perfilNombre, { color: colors.onNavy }]}
                    numberOfLines={2}
                    accessibilityRole="header"
                  >
                    {nombreVisible}
                  </Text>
                  <View style={styles.perfilMeta}>
                    <View style={[styles.rolPill, { backgroundColor: GLASS, borderColor: GLASS_LINE }]}>
                      <View style={[styles.rolPunto, { backgroundColor: colors.success }]} />
                      <Text style={[styles.rolTexto, { color: colors.onNavy }]} numberOfLines={1}>
                        {rolLabel}
                      </Text>
                    </View>
                    {numeroUsuario ? (
                      <Text
                        style={[styles.perfilId, { color: colors.onNavyMuted }]}
                        accessibilityLabel={`Número de usuario ${numeroUsuario}`}
                      >
                        Usuario {numeroUsuario}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar menú"
                  onPress={cerrar}
                  hitSlop={8}
                  style={({ pressed }) => [styles.cerrar, { backgroundColor: pressed ? GLASS_PRESSED : GLASS }]}
                >
                  <IconClose color={colors.onNavy} size={18} />
                </Pressable>
              </View>
            </View>

            <Animated.View
              style={[
                styles.cuerpo,
                {
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  opacity: contenidoOpacity,
                  transform: [{ translateX: contenidoShift }],
                },
              ]}
            >
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContenido}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {conBuscador ? (
                  <View style={[styles.buscador, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                    <IconLupa color={colors.inkSubtle} />
                    <TextInput
                      value={filtro}
                      onChangeText={setFiltro}
                      placeholder="Buscar vista…"
                      placeholderTextColor={colors.inkSubtle}
                      accessibilityLabel="Buscar vista"
                      autoCorrect={false}
                      autoCapitalize="none"
                      style={[styles.buscadorInput, { color: colors.ink }]}
                    />
                    {filtro ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Borrar búsqueda"
                        onPress={() => setFiltro('')}
                        hitSlop={8}
                      >
                        <IconClose color={colors.inkSubtle} size={14} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {grupos.map(({ grupo, items: filas }) => (
                  <View key={grupo} style={styles.bloque}>
                    <Text style={[styles.grupo, { color: colors.inkSubtle }]} accessibilityRole="header">
                      {grupo}
                    </Text>
                    <View style={[styles.lista, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                      {filas.map((item, i) => (
                        <FilaMenu
                          key={item.key}
                          item={item}
                          primera={i === 0}
                          onPress={() => {
                            cerrar();
                            item.onPress();
                          }}
                        />
                      ))}
                    </View>
                  </View>
                ))}
                {grupos.length === 0 ? (
                  <Text style={[styles.sinResultados, { color: colors.inkSubtle }]}>
                    Ninguna vista coincide con «{filtro}».
                  </Text>
                ) : null}

              </ScrollView>

              <View style={[styles.pieDrawer, { borderTopColor: colors.line }]}>
                <View style={styles.pieFila}>
                {onCerrarSesion ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar sesión"
                    onPress={salir}
                    style={({ pressed }) => [
                      styles.salir,
                      { borderColor: colors.dangerLine, backgroundColor: pressed ? colors.dangerBg : 'transparent' },
                    ]}
                  >
                    <IconSalir color={colors.danger} />
                    <Text style={[styles.salirTexto, { color: colors.danger }]}>Cerrar sesión</Text>
                  </Pressable>
                ) : (
                  <View style={styles.flex} />
                )}
                {/* Apariencia: solo el ícono (luna / sol), sin fila propia. */}
                <ThemeToggle />
                </View>
                {version ? (
                  <Text style={[styles.version, { color: colors.inkSubtle }]}>
                    {titulo} · v{version}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/** Fila compacta del panel: caben muchas vistas sin que el menú se vuelva una pared de tarjetas. */
function FilaMenu({ item, primera, onPress }: { item: NavItem; primera: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const activo = Boolean(item.active);
  const badge = item.badge ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${item.label}, ${badge} nuevas` : item.label}
      accessibilityHint={item.hint}
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filaMenu,
        !primera ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
        { backgroundColor: activo ? colors.primaryRing : pressed ? colors.surfaceSunken : 'transparent' },
      ]}
    >
      {activo ? <View style={[styles.marcador, { backgroundColor: colors.primary }]} /> : null}
      <View style={[styles.itemIcono, { backgroundColor: activo ? colors.primary : colors.surfaceSunken }]}>
        {item.icon(activo ? colors.onPrimary : colors.inkMuted)}
      </View>
      <View style={styles.itemTextos}>
        <Text style={[styles.itemTexto, { color: activo ? colors.primary : colors.ink }]} numberOfLines={1}>
          {item.label}
        </Text>
        {item.hint ? (
          <Text style={[styles.itemSub, { color: colors.inkSubtle }]} numberOfLines={1}>
            {item.hint}
          </Text>
        ) : null}
      </View>
      {badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.gold }]}>
          <Text style={[styles.badgeTexto, { color: colors.onGold }]}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : activo ? null : (
        <IconChevron direction="right" color={colors.inkSubtle} size={14} />
      )}
    </Pressable>
  );
}

const AVATAR = 52;

const styles = StyleSheet.create({
  bar: { zIndex: 20 },
  fila: {
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  marca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: TOUCH_TARGET },
  marcaTextos: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: font.bold, fontSize: 17, lineHeight: 21, letterSpacing: -0.4 },
  seccion: { ...type.caption, fontSize: 11, lineHeight: 14 },
  cuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: spacing.md,
    paddingRight: 4,
  },
  cuentaAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cuentaAviso: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  cuentaIniciales: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.2 },
  modalRoot: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  drawer: {
    height: '100%',
    borderTopLeftRadius: radius.card,
    borderBottomLeftRadius: radius.card,
    overflow: 'hidden',
  },
  perfil: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  perfilFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perfilTextos: { flex: 1, minWidth: 0, gap: 6 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: font.bold, fontSize: 18, letterSpacing: -0.4 },
  cerrar: {
    width: TOUCH_TARGET - 8,
    height: TOUCH_TARGET - 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilNombre: { fontFamily: font.bold, fontSize: 17, lineHeight: 21, letterSpacing: -0.4 },
  perfilMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  rolPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  rolPunto: { width: 6, height: 6, borderRadius: 3 },
  rolTexto: { ...type.caption, fontSize: 12, fontFamily: font.medium },
  perfilId: { ...type.mono, fontSize: 12 },
  cuerpo: { flex: 1 },
  scroll: { flex: 1 },
  scrollContenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  buscadorInput: { flex: 1, ...type.body, fontSize: 14, paddingVertical: spacing.sm },
  bloque: { gap: spacing.sm },
  grupo: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  lista: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  filaMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  marcador: { position: 'absolute', left: 0, top: spacing.sm, bottom: spacing.sm, width: 3, borderRadius: 2 },
  itemIcono: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemTextos: { flex: 1, minWidth: 0, gap: 1 },
  itemTexto: { ...type.bodyMedium, fontFamily: font.semibold, fontSize: 14 },
  itemSub: { ...type.caption, fontSize: 12 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexto: { fontFamily: font.bold, fontSize: 11, fontVariant: ['tabular-nums'] },
  sinResultados: { ...type.caption, textAlign: 'center', paddingVertical: spacing.lg },
  pieDrawer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
  pieFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  salir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  salirTexto: { ...type.button, fontFamily: font.semibold },
  version: { ...type.mono, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
