import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { EmptyState, InlineError } from '@/components/StateViews';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useEntrance } from '@/utils/useEntrance';
import { etiquetaDiaCabecera, type AgendaItem, type DiaSemana } from '../agendaItems';

function IconPin({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.4} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function AvatarPersona({
  nombre,
  url,
  onFeatured,
}: {
  nombre: string | null;
  url: string | null;
  onFeatured: boolean;
}) {
  const { colors } = useTheme();
  const inicial = (nombre?.trim()?.[0] ?? '?').toUpperCase();
  const bg = onFeatured ? 'rgba(255,255,255,0.28)' : colors.primaryDisabled;
  const fg = onFeatured ? colors.onPrimary : colors.primary;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={styles.avatar}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]} accessibilityElementsHidden>
      <Text style={[styles.avatarTexto, { color: fg }]}>{inicial}</Text>
    </View>
  );
}

function EventoCard({
  item,
  onPress,
}: {
  item: AgendaItem;
  onPress: (item: AgendaItem) => void;
}) {
  const { colors, scheme } = useTheme();
  const featured = item.destacado;
  // Verde del diseño de referencia; en oscuro el `success` claro rompe contraste
  // con texto blanco → navy (misma familia de acento sólido).
  const bg = featured ? (scheme === 'dark' ? colors.navy : colors.success) : colors.surfaceSunken;
  const ink = featured ? colors.onPrimary : colors.ink;
  const muted = featured ? 'rgba(255,255,255,0.85)' : colors.inkMuted;
  const tipoLabel = item.kind === 'orden' ? 'Orden' : 'Proyecto';

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${tipoLabel} ${item.titulo}. ${item.subtitulo}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.92 : 1,
          ...elevationFor(colors, featured ? 'card' : 'panel'),
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitulos}>
          <Text style={[styles.cardTitulo, { color: ink }]} numberOfLines={1}>
            {item.titulo}
          </Text>
          <Text style={[styles.cardSub, { color: muted }]} numberOfLines={2}>
            {item.subtitulo}
          </Text>
        </View>
        <View style={[styles.badgeTipo, { backgroundColor: featured ? 'rgba(255,255,255,0.2)' : colors.line }]}>
          <Text style={[styles.badgeTipoTexto, { color: featured ? colors.onPrimary : colors.inkMuted }]}>
            {tipoLabel}
          </Text>
        </View>
      </View>

      {item.ubicacion ? (
        <View style={styles.metaFila}>
          <IconPin color={muted} />
          <Text style={[styles.metaTexto, { color: muted }]} numberOfLines={1}>
            {item.ubicacion}
          </Text>
        </View>
      ) : null}

      {item.persona ? (
        <View style={styles.metaFila}>
          <AvatarPersona nombre={item.persona} url={item.avatarUrl} onFeatured={featured} />
          <Text style={[styles.metaTexto, { color: muted }]} numberOfLines={1}>
            {item.persona}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FilaHorario({
  item,
  onPress,
}: {
  item: AgendaItem;
  onPress: (item: AgendaItem) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <View style={styles.horaCol}>
        <Text style={[styles.horaInicio, { color: colors.ink }]}>
          {item.horaInicio ?? '—'}
        </Text>
        {item.horaFin ? (
          <Text style={[styles.horaFin, { color: colors.inkSubtle }]}>{item.horaFin}</Text>
        ) : null}
      </View>
      <View style={[styles.rail, { backgroundColor: colors.line }]} />
      <View style={styles.cardCol}>
        <EventoCard item={item} onPress={onPress} />
      </View>
    </View>
  );
}

export interface AgendaVistaProps {
  fecha: string;
  semana: DiaSemana[];
  items: AgendaItem[];
  esHoy: boolean;
  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  onSeleccionarDia: (fecha: string) => void;
  onHoy: () => void;
  onRecargar: () => void;
  onAbrir: (item: AgendaItem) => void;
  /** Texto vacío (técnico vs cliente). */
  vacioTitulo?: string;
  vacioCuerpo?: string;
}

/**
 * Layout tipo Schedule del Figma: día grande + «Hoy», tira semanal,
 * franja Hora / Actividad y tarjetas. Colores SertelPro (azul / verde).
 */
export function AgendaVista({
  fecha,
  semana,
  items,
  esHoy,
  cargando,
  refrescando,
  error,
  onSeleccionarDia,
  onHoy,
  onRecargar,
  onAbrir,
  vacioTitulo = 'Sin actividad este día',
  vacioCuerpo = 'No hay órdenes ni proyectos programados para la fecha seleccionada.',
}: AgendaVistaProps) {
  const { colors } = useTheme();
  const entrada = useEntrance(3);
  const cabecera = etiquetaDiaCabecera(fecha);
  const cargaInicial = cargando && items.length === 0 && !error;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRecargar} tintColor={colors.primary} />
        }
      >
        <Animated.View style={[styles.cabecera, entrada(0)]}>
          <View style={styles.fechaBloque}>
            <Text
              style={[styles.diaNumero, { color: colors.ink }]}
              accessibilityRole="header"
            >
              {cabecera.numero}
            </Text>
            <View style={styles.fechaMeta}>
              <Text style={[styles.fechaMetaTexto, { color: colors.inkSubtle }]}>{cabecera.dia}</Text>
              <Text style={[styles.fechaMetaTexto, { color: colors.inkSubtle }]}>{cabecera.mesAnio}</Text>
            </View>
          </View>
          <Pressable
            onPress={onHoy}
            disabled={esHoy}
            accessibilityRole="button"
            accessibilityLabel="Ir a hoy"
            style={({ pressed }) => [
              styles.hoyBtn,
              {
                backgroundColor: esHoy ? colors.primaryDisabled : 'rgba(4, 114, 77, 0.12)',
                opacity: pressed && !esHoy ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.hoyTexto,
                { color: esHoy ? colors.onPrimaryDisabled : colors.success },
              ]}
            >
              Hoy
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.semana, entrada(1)]}>
          {semana.map((dia) => {
            const seleccionado = dia.fecha === fecha;
            return (
              <Pressable
                key={dia.fecha}
                onPress={() => onSeleccionarDia(dia.fecha)}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
                accessibilityLabel={`${dia.letra} ${dia.diaNumero}${dia.esHoy ? ', hoy' : ''}`}
                style={({ pressed }) => [
                  styles.diaPill,
                  seleccionado
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: pressed ? colors.surfaceSunken : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.diaLetra,
                    { color: seleccionado ? colors.onPrimary : colors.inkSubtle },
                  ]}
                >
                  {dia.letra}
                </Text>
                <Text
                  style={[
                    styles.diaNum,
                    { color: seleccionado ? colors.onPrimary : colors.ink },
                  ]}
                >
                  {dia.diaNumero}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        <View style={[styles.separador, { backgroundColor: colors.line }]} />

        <Animated.View style={entrada(2)}>
          <View style={styles.listaHeader}>
            <Text style={[styles.listaHeaderTexto, { color: colors.inkSubtle }]}>Hora</Text>
            <Text style={[styles.listaHeaderTexto, styles.listaHeaderActividad, { color: colors.inkSubtle }]}>
              Actividad
            </Text>
          </View>

          {cargaInicial ? (
            <View style={styles.cargando} accessibilityRole="progressbar" accessibilityLabel="Cargando agenda">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorBloque}>
              <InlineError message={error} />
              <AppButton label="Reintentar" variant="secondary" onPress={onRecargar} />
            </View>
          ) : items.length === 0 ? (
            <EmptyState title={vacioTitulo} description={vacioCuerpo} />
          ) : (
            <View style={styles.lista}>
              {items.map((item) => (
                <FilaHorario key={item.key} item={item} onPress={onAbrir} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  fechaBloque: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  diaNumero: {
    fontFamily: font.semibold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
  },
  fechaMeta: { gap: 2 },
  fechaMetaTexto: { ...type.label, fontSize: 14, lineHeight: 18 },
  hoyBtn: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoyTexto: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  semana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  diaPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 56,
    gap: 2,
  },
  diaLetra: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  diaNum: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  separador: { height: StyleSheet.hairlineWidth, width: '100%' },
  listaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingRight: spacing.xs,
  },
  listaHeaderTexto: { ...type.label, fontSize: 14 },
  listaHeaderActividad: { marginLeft: 69 },
  lista: { gap: spacing.lg },
  fila: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  horaCol: { width: 52, alignItems: 'flex-end', paddingTop: 2 },
  horaInicio: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
  horaFin: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, marginTop: 4 },
  rail: { width: 2, borderRadius: 1, alignSelf: 'stretch', marginVertical: 4 },
  cardCol: { flex: 1 },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 120,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitulos: { flex: 1, gap: 4 },
  cardTitulo: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  cardSub: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  badgeTipo: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeTipoTexto: { fontFamily: font.medium, fontSize: 11, lineHeight: 14 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaTexto: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTexto: { fontFamily: font.semibold, fontSize: 9, lineHeight: 11 },
  cargando: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  errorBloque: { gap: spacing.md, paddingVertical: spacing.lg },
});
