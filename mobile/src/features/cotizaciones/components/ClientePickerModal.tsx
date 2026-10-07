import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarClientes } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconAlerta, IconChevron, IconClose, IconPerson, IconPhone, IconRefresh } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ClienteOpcion } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { Buscador, Resaltado } from './TipoTrabajoModal';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (cliente: ClienteOpcion) => void;
}

const ESPERA_MS = 300;
/** Recorrido del scroll en el que el título grande cede su lugar al de la barra. */
const COLAPSO = 56;
const ESCALONADAS = 10;

/**
 * Buscador de clientes a pantalla completa, con el mismo corte que «Tipo de
 * trabajo»: barra compacta (título pequeño que aparece al desplazar · cerrar),
 * título grande y buscador relleno. Busca en el servidor mientras se escribe
 * (con una pausa corta para no disparar una petición por tecla). Como en la
 * web, siempre va a un cliente del catálogo (los prospectos también viven ahí).
 *
 * Movimiento: el título colapsa atado al scroll (hilo nativo); los resultados
 * entran escalonados cada vez que llega una búsqueda nueva; mientras carga,
 * filas fantasma laten.
 */
export function ClientePickerModal({ visible, onCerrar, onElegir }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Dentro de un Modal de Android el área segura puede llegar en 0: se usa la barra de estado.
  const arriba = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ClienteOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  /** Cambia con cada respuesta: las filas nuevas vuelven a entrar escalonadas. */
  const [tanda, setTanda] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setTermino('');
    scrollY.setValue(0);
  }, [visible, scrollY]);

  useEffect(() => {
    if (!visible) return;
    const control = new AbortController();
    const temporizador = setTimeout(() => {
      setBuscando(true);
      setError(null);
      buscarClientes(termino, control.signal)
        .then((r) => {
          setResultados(r);
          setTanda((n) => n + 1);
        })
        .catch((e) => {
          if (!control.signal.aborted) setError(toUserMessage(e));
        })
        .finally(() => {
          if (!control.signal.aborted) setBuscando(false);
        });
    }, termino ? ESPERA_MS : 0);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [termino, visible, reintento]);

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
  ).current;
  const tituloChico = scrollY.interpolate({ inputRange: [COLAPSO * 0.6, COLAPSO], outputRange: [0, 1], extrapolate: 'clamp' });
  const subeChico = scrollY.interpolate({ inputRange: [COLAPSO * 0.6, COLAPSO], outputRange: [6, 0], extrapolate: 'clamp' });
  const tituloGrande = scrollY.interpolate({ inputRange: [0, COLAPSO], outputRange: [1, 0], extrapolate: 'clamp' });

  const hayTermino = termino.trim().length > 0;
  const mostrarFantasmas = buscando && resultados.length === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <View style={[styles.flex, { backgroundColor: colors.surface }]}>
        {/* Barra */}
        <View style={[styles.barra, { paddingTop: arriba + spacing.xs, backgroundColor: colors.surface }]}>
          <View style={styles.barraLado} />
          <Animated.Text
            style={[styles.tituloChico, { color: colors.ink, opacity: tituloChico, transform: [{ translateY: subeChico }] }]}
            numberOfLines={1}
            importantForAccessibility="no"
          >
            Elegir cliente
          </Animated.Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin elegir"
            onPress={onCerrar}
            hitSlop={6}
            style={({ pressed }) => [styles.cerrar, { backgroundColor: pressed ? colors.line : colors.surfaceSunken }]}
          >
            <IconClose color={colors.ink} size={15} />
          </Pressable>
          <Animated.View pointerEvents="none" style={[styles.barraLinea, { backgroundColor: colors.line, opacity: tituloChico }]} />
        </View>

        <Animated.FlatList
          data={mostrarFantasmas ? [] : resultados}
          // La tanda en la clave hace que cada respuesta vuelva a entrar escalonada.
          keyExtractor={(c: ClienteOpcion) => `${tanda}-${c.id}`}
          keyboardShouldPersistTaps="handled"
          // En Android, «on-drag» confundía el desplazamiento automático con un
          // arrastre y quitaba el foco al buscador (ver «Nueva orden»).
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            <View style={styles.encabezado}>
              <Animated.View style={{ opacity: tituloGrande }}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>Catálogo de clientes</Text>
                <Text style={[styles.tituloGrande, { color: colors.ink }]} accessibilityRole="header">
                  Elegir cliente
                </Text>
                <Text style={[styles.subtitulo, { color: colors.inkSubtle }]}>
                  Incluye prospectos. Toca uno para usarlo en la orden.
                </Text>
              </Animated.View>
              <Buscador valor={termino} onCambio={setTermino} placeholder="Nombre, RFC o teléfono" autoFocus />
              <View style={styles.estadoFila}>
                {buscando ? (
                  <Text style={[styles.resultados, { color: colors.inkSubtle }]}>Buscando…</Text>
                ) : !error && resultados.length > 0 ? (
                  <Text style={[styles.resultados, { color: colors.inkSubtle }]}>
                    {hayTermino
                      ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`
                      : 'Del catálogo'}
                  </Text>
                ) : null}
              </View>
              {mostrarFantasmas ? Array.from({ length: 5 }, (_, i) => <FilaFantasma key={i} />) : null}
            </View>
          }
          ListEmptyComponent={
            mostrarFantasmas ? null : error ? (
              <EstadoVacio
                icono={<IconAlerta color={colors.danger} size={20} />}
                tinte={colors.dangerBg}
                titulo="No se pudo buscar"
                ayuda={error}
                accion={{ label: 'Reintentar', onPress: () => setReintento((n) => n + 1) }}
              />
            ) : hayTermino ? (
              <EstadoVacio
                icono={<Lupa color={colors.primary} />}
                tinte={colors.primaryRing}
                titulo={`Sin clientes para «${termino.trim()}»`}
                ayuda="Prueba con el RFC, el teléfono o parte del nombre."
              />
            ) : (
              <EstadoVacio
                icono={<IconPerson color={colors.primary} size={20} />}
                tinte={colors.primaryRing}
                titulo="Busca un cliente"
                ayuda="Escribe su nombre, RFC o teléfono."
              />
            )
          }
          renderItem={({ item, index }: { item: ClienteOpcion; index: number }) => (
            <FilaCliente
              cliente={item}
              termino={termino}
              retraso={index < ESCALONADAS ? index * 30 : -1}
              onPress={() => onElegir(item)}
            />
          )}
        />
      </View>
    </Modal>
  );
}

/** Cliente: avatar con tinte (azul cliente, dorado prospecto), nombre con la coincidencia resaltada y contacto. */
const FilaCliente = memo(function FilaCliente({
  cliente,
  termino,
  retraso,
  onPress,
}: {
  cliente: ClienteOpcion;
  termino: string;
  retraso: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const llegada = useRef(new Animated.Value(retraso >= 0 && !reduced ? 0 : 1)).current;

  useEffect(() => {
    if (retraso < 0 || reduced) return;
    const anim = Animated.timing(llegada, {
      toValue: 1,
      duration: 260,
      delay: retraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prospecto = cliente.es_prospecto;
  const telefono = (cliente.contacto_telefono || cliente.telefono || '').trim();
  // Muchos clientes tienen como contacto su propio nombre: no se repite.
  const contactoCrudo = cliente.contacto_principal.trim();
  const contacto = contactoCrudo.toLowerCase() === cliente.nombre.trim().toLowerCase() ? '' : contactoCrudo;

  return (
    <Animated.View
      style={{
        opacity: llegada,
        transform: [{ translateY: llegada.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${cliente.nombre}${prospecto ? ', prospecto' : ''}${contacto ? `, contacto ${contacto}` : ''}`}
        onPress={onPress}
        style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
      >
        <View style={[styles.avatar, { backgroundColor: prospecto ? colors.goldSoftBg : colors.primaryRing }]}>
          <Text style={[styles.iniciales, { color: prospecto ? colors.goldSoftText : colors.primary }]}>
            {inicialesUsuarioDisplay(cliente.nombre, '?')}
          </Text>
        </View>
        <View style={styles.textos}>
          <View style={styles.nombreFila}>
            <Resaltado
              texto={cliente.nombre}
              termino={termino}
              style={[styles.nombre, { color: colors.ink }]}
              color={colors.primary}
            />
            {prospecto ? (
              <View style={[styles.insignia, { backgroundColor: colors.goldSoftBg }]}>
                <Text style={[styles.insigniaTexto, { color: colors.goldSoftText }]}>Prospecto</Text>
              </View>
            ) : null}
          </View>
          {contacto || telefono ? (
            <View style={styles.detalleFila}>
              {contacto ? (
                <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                  {contacto}
                </Text>
              ) : null}
              {telefono ? (
                <View style={styles.telefono}>
                  <IconPhone color={colors.inkSubtle} size={11} />
                  <Text style={[styles.detalle, styles.detalleNumero, { color: colors.inkSubtle }]} numberOfLines={1}>
                    {telefono}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.detalle, { color: colors.inkSubtle }]}>Sin datos de contacto</Text>
          )}
        </View>
        <IconChevron direction="right" color={colors.inkSubtle} size={13} />
      </Pressable>
    </Animated.View>
  );
});

/** Fila de carga: late suave mientras llega la búsqueda. */
function FilaFantasma() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return (
    <Animated.View style={[styles.fila, { opacity: v }]} importantForAccessibility="no-hide-descendants">
      <View style={[styles.avatar, { backgroundColor: colors.line }]} />
      <View style={styles.textos}>
        <View style={[styles.fantasmaLinea, { width: '62%', backgroundColor: colors.line }]} />
        <View style={[styles.fantasmaLinea, styles.fantasmaCorta, { width: '40%', backgroundColor: colors.line }]} />
      </View>
    </Animated.View>
  );
}

function EstadoVacio({
  icono,
  tinte,
  titulo,
  ayuda,
  accion,
}: {
  icono: React.ReactNode;
  tinte: string;
  titulo: string;
  ayuda: string;
  accion?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.spring(v, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return (
    <Animated.View
      style={[styles.vacio, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}
    >
      <View style={[styles.vacioIcono, { backgroundColor: tinte }]}>{icono}</View>
      <Text style={[styles.vacioTitulo, { color: colors.ink }]}>{titulo}</Text>
      <Text style={[styles.vacioAyuda, { color: colors.inkSubtle }]}>{ayuda}</Text>
      {accion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accion.label}
          onPress={accion.onPress}
          style={({ pressed }) => [styles.reintentar, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
        >
          <IconRefresh color={colors.onPrimary} size={14} />
          <Text style={[styles.reintentarTexto, { color: colors.onPrimary }]}>{accion.label}</Text>
        </Pressable>
      ) : null}
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
  barraLado: { width: CERRAR, height: CERRAR },
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

  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  encabezado: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs, gap: spacing.lg },
  eyebrow: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  tituloGrande: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -1, marginTop: 2 },
  subtitulo: { ...type.caption, fontSize: 13.5, marginTop: 2 },
  estadoFila: { minHeight: 16, marginTop: -spacing.sm },
  resultados: { ...type.caption, fontSize: 12 },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md + 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iniciales: { fontFamily: font.bold, fontSize: 14.5 },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { flexShrink: 1, fontFamily: font.semibold, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.2 },
  insignia: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  insigniaTexto: { fontFamily: font.semibold, fontSize: 10.5 },
  detalleFila: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md, rowGap: 2, flexWrap: 'wrap' },
  detalle: { ...type.caption, fontSize: 12.5, flexShrink: 1 },
  detalleNumero: { fontVariant: ['tabular-nums'] },
  telefono: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  fantasmaLinea: { height: 11, borderRadius: 6 },
  fantasmaCorta: { height: 9 },

  vacio: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  vacioIcono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 16, textAlign: 'center' },
  vacioAyuda: { ...type.caption, fontSize: 13, textAlign: 'center' },
  reintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: TOUCH_TARGET - 8,
  },
  reintentarTexto: { fontFamily: font.semibold, fontSize: 14 },
});
