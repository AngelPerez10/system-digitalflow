import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { BrandMark } from '@/components/Brand';
import { IconChevron, IconClose } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.86);

/** Abrir un poco más lento que cerrar — llegada confiada, salida rápida. */
const MS_OPEN = 280;
const MS_CLOSE = 200;

interface Props {
  titulo?: string;
  /** Nombre del técnico (saludo en el panel). */
  nombreUsuario?: string;
  onIrOrdenes?: () => void;
  onCerrarSesion?: () => void;
}

function IconMenu({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconOrdenes({ color, size = 20 }: { color: string; size?: number }) {
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

function IconSalir({ color, size = 20 }: { color: string; size?: number }) {
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
 * Chrome de la app autenticada: barra superior fina con hamburguesa + drawer
 * lateral izquierdo (marca, órdenes, tema, cerrar sesión).
 */
export function AppNavbar({
  titulo = 'SertelPro',
  nombreUsuario,
  onIrOrdenes,
  onCerrarSesion,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [deseado, setDeseado] = useState(false);
  const [montado, setMontado] = useState(false);
  const progreso = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const nombreVisible = nombreUsuario?.trim() || 'Técnico de campo';
  const iniciales = inicialesUsuarioDisplay(nombreVisible);

  const abrir = useCallback(() => {
    setDeseado(true);
    setMontado(true);
  }, []);

  const cerrar = useCallback(() => {
    setDeseado(false);
  }, []);

  useEffect(() => {
    if (!montado) return;

    animRef.current?.stop();

    if (reduced) {
      progreso.setValue(deseado ? 1 : 0);
      if (!deseado) setMontado(false);
      return;
    }

    if (deseado) {
      progreso.setValue(0);
    }

    const anim = Animated.timing(progreso, {
      toValue: deseado ? 1 : 0,
      duration: deseado ? MS_OPEN : MS_CLOSE,
      easing: deseado
        ? Easing.bezier(0.16, 1, 0.3, 1)
        : Easing.bezier(0.4, 0, 1, 1),
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

  const translateX = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH - 8, 0],
  });
  const backdropOpacity = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contenidoOpacity = progreso.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.4, 0.9, 1],
  });
  const contenidoShift = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const irOrdenes = () => {
    cerrar();
    onIrOrdenes?.();
  };

  const salir = () => {
    cerrar();
    onCerrarSesion?.();
  };

  const backdropColor =
    scheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(9, 9, 11, 0.42)';

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            paddingTop: insets.top,
            backgroundColor: colors.navy,
            borderBottomColor: colors.navy,
          },
        ]}
        accessibilityRole="header"
      >
        <View style={styles.fila}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            accessibilityHint="Abre el menú lateral"
            accessibilityState={{ expanded: deseado }}
            onPress={abrir}
            style={({ pressed }) => [
              styles.hamburguesa,
              { backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'transparent' },
            ]}
          >
            <IconMenu color={colors.onNavy} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir a mis órdenes"
            onPress={onIrOrdenes}
            style={styles.marca}
          >
            <BrandMark size={22} background={colors.gold} foreground={colors.onGold} />
            <Text style={[styles.titulo, { color: colors.onNavy }]} numberOfLines={1}>
              {titulo}
            </Text>
          </Pressable>

          <View style={styles.hamburguesaFantasma} />
        </View>
      </View>

      <Modal
        visible={montado}
        transparent
        animationType="none"
        onRequestClose={cerrar}
        statusBarTranslucent
      >
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Animated.View
            style={[styles.backdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
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
              {
                width: DRAWER_WIDTH,
                backgroundColor: colors.surface,
                borderRightColor: colors.line,
                transform: [{ translateX }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.drawerInner,
                {
                  paddingTop: insets.top + spacing.md,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  opacity: contenidoOpacity,
                  transform: [{ translateX: contenidoShift }],
                },
              ]}
            >
              <View style={styles.perfilFila}>
                <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
                  <Text style={[styles.avatarTexto, { color: colors.onNavy }]}>{iniciales}</Text>
                </View>
                <View style={styles.perfilTextos}>
                  <Text
                    style={[styles.perfilNombre, { color: colors.ink }]}
                    numberOfLines={2}
                    accessibilityRole="header"
                  >
                    {nombreVisible}
                  </Text>
                  <Text style={[styles.perfilRol, { color: colors.inkMuted }]}>Técnico de campo</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar menú"
                  onPress={cerrar}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.cerrar,
                    { opacity: pressed ? 0.55 : 1 },
                  ]}
                >
                  <IconClose color={colors.inkMuted} size={20} />
                </Pressable>
              </View>

              <View style={[styles.divisor, { backgroundColor: colors.line }]} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mis órdenes"
                accessibilityHint="Abre el listado de órdenes del mes"
                onPress={irOrdenes}
                style={({ pressed }) => [
                  styles.filaMenu,
                  styles.filaActiva,
                  { backgroundColor: pressed ? colors.surfaceSunken : colors.goldSoftBg },
                ]}
              >
                <View style={[styles.marcadorActivo, { backgroundColor: colors.gold }]} />
                <IconOrdenes color={colors.navy} />
                <Text style={[styles.filaTexto, { color: colors.ink }]}>Mis órdenes</Text>
                <IconChevron direction="right" color={colors.inkSubtle} size={16} />
              </Pressable>

              <View style={styles.spacer} />

              <View style={[styles.divisor, { backgroundColor: colors.line }]} />

              <View style={[styles.filaMenu, styles.filaEstatica]}>
                <View style={styles.filaTextos}>
                  <Text style={[styles.filaTexto, { color: colors.ink, flex: undefined }]}>Apariencia</Text>
                  <Text style={[styles.filaSub, { color: colors.inkMuted }]}>Claro u oscuro</Text>
                </View>
                <ThemeToggle />
              </View>

              {onCerrarSesion ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  onPress={salir}
                  style={({ pressed }) => [
                    styles.filaMenu,
                    { backgroundColor: pressed ? colors.dangerBg : 'transparent' },
                  ]}
                >
                  <IconSalir color={colors.danger} />
                  <Text style={[styles.filaTexto, { color: colors.danger }]}>Cerrar sesión</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 20,
  },
  fila: {
    minHeight: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hamburguesa: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburguesaFantasma: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
  },
  marca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
  },
  titulo: {
    fontFamily: font.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  drawerInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  perfilFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  cerrar: {
    width: TOUCH_TARGET - 8,
    height: TOUCH_TARGET - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontFamily: font.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  perfilTextos: {
    flex: 1,
    gap: 2,
  },
  perfilNombre: {
    ...type.bodyMedium,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  perfilRol: {
    ...type.caption,
    fontSize: 12,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.lg,
  },
  filaMenu: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  filaActiva: {
    overflow: 'hidden',
  },
  marcadorActivo: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  filaEstatica: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  filaTextos: {
    flex: 1,
    gap: 1,
  },
  filaTexto: {
    ...type.bodyMedium,
    flex: 1,
  },
  filaSub: {
    ...type.caption,
    fontSize: 12,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
});
