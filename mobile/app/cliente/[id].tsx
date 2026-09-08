import React, { useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { inicialesUsuarioDisplay, nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { IconChevron } from '@/components/icons';
import { SkeletonPanel, SkeletonRegion } from '@/components/Skeleton';
import { InlineError } from '@/components/StateViews';
import { CalificacionTecnico } from '@/features/orders/components/CalificacionTecnico';
import { EquiposLista } from '@/features/orders/components/EquiposLista';
import { FirmasTarjeta } from '@/features/orders/components/FirmasTarjeta';
import { FotosGaleria } from '@/features/orders/components/FotosGaleria';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import {
  IconClock,
  IconEstrella,
  IconPause,
  IconPin,
  IconVisto,
} from '@/features/orders/components/icons';
import {
  folioDisplay,
  statusLabel,
  statusSolid,
  statusTone,
  tipoOrdenLabel,
} from '@/features/orders/ordenFormat';
import { useOrdenCliente } from '@/features/orders/useOrdenCliente';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { OrdenStatus } from '@/types/orden';
import { formatFecha, formatHora } from '@/utils/fecha';
import { useEntrance } from '@/utils/useEntrance';

const STATUS_ICON: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={14} />,
  pausado: (color) => <IconPause color={color} size={14} />,
  resuelto: (color) => <IconVisto color={color} size={14} />,
};

/**
 * Resumen del servicio para el cliente. **Solo lectura** —sin cambio de estado,
 * sin editar—, salvo la calificación al cierre. Muestra el mismo expediente que
 * ve el técnico —contacto, servicio, equipos, fotos y ambas firmas— con el
 * mismo patrón de tarjetas (`SeccionCard`) para que las dos superficies no
 * diverjan; solo cambia la voz («lo que reportaste», «tu firma»).
 */
export default function ClienteOrdenScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const ordenId = Number.parseInt(String(id ?? ''), 10);
  const { orden, cargando, error, recargar, aplicarCalificacion } = useOrdenCliente(
    Number.isFinite(ordenId) ? ordenId : null,
  );

  const scrollRef = useRef<ScrollView>(null);
  const entrance = useEntrance(11);
  const nombreCliente = nombreUsuarioDisplay(user, 'Cliente');
  const tono = orden ? statusTone(orden.status, colors) : null;
  const tonoSolido = orden ? statusSolid(orden.status, colors).bg : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />

      <View style={[styles.hero, { backgroundColor: colors.navy, paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis servicios"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.volver, pressed ? { opacity: 0.6 } : null]}
        >
          <IconChevron color={colors.onNavy} size={16} direction="left" />
          <Text style={[styles.volverTexto, { color: colors.onNavy }]}>Mis servicios</Text>
        </Pressable>

        {orden ? (
          <View style={styles.heroCuerpo}>
            <View style={styles.tituloFila}>
              <Text
                style={[styles.folio, { color: colors.onNavy }]}
                numberOfLines={1}
                accessibilityRole="header"
              >
                {folioDisplay(orden)}
              </Text>

              {tono ? (
                <View
                  style={[styles.statusPill, { backgroundColor: tono.bg, borderColor: tono.text }]}
                  accessibilityRole="text"
                  accessibilityLabel={`Estatus: ${statusLabel(orden.status)}`}
                >
                  {STATUS_ICON[orden.status](tono.text)}
                  <Text style={[styles.statusTexto, { color: tono.text }]} numberOfLines={1}>
                    {statusLabel(orden.status)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tipo, { color: colors.onNavyMuted }]} numberOfLines={2}>
              {tipoOrdenLabel(orden.tipo_orden)} · {nombreCliente}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            ...elevationFor(colors, 'card'),
            shadowOffset: { width: 0, height: -10 },
            shadowRadius: 24,
            shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
          },
        ]}
      >
        {cargando ? (
          <SkeletonRegion label="Cargando el servicio" style={styles.esqueletos}>
            <SkeletonPanel height={72} />
            <SkeletonPanel height={140} />
            <SkeletonPanel height={180} />
          </SkeletonRegion>
        ) : error || !orden ? (
          <View style={styles.errorBloque}>
            <InlineError message={error ?? 'No se encontró el servicio.'} />
            <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {orden.tecnico_asignado_full_name ? (
                <Animated.View
                  style={[
                    entrance(0),
                    styles.tecnicoCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      ...elevationFor(colors, 'card'),
                    },
                  ]}
                >
                  <Avatar
                    uri={orden.tecnico_asignado_avatar_url}
                    iniciales={inicialesUsuarioDisplay(orden.tecnico_asignado_full_name, 'T')}
                    size={46}
                    fondo={colors.navy}
                    color={colors.onNavy}
                  />
                  <View style={styles.tecnicoTextos}>
                    <Text style={[styles.tecnicoEtiqueta, { color: colors.inkSubtle }]}>
                      Tu técnico
                    </Text>
                    <Text style={[styles.tecnicoNombre, { color: colors.ink }]}>
                      {orden.tecnico_asignado_full_name}
                    </Text>
                  </View>
                  {orden.calificacion ? (
                    <View style={styles.miniEstrellas}>
                      <IconEstrella color={colors.gold} size={15} relleno />
                      <Text style={[styles.miniEstrellasTexto, { color: colors.inkMuted }]}>
                        {orden.calificacion.estrellas}.0
                      </Text>
                    </View>
                  ) : null}
                </Animated.View>
              ) : null}

              {orden.motivo_pausa ? (
                <Animated.View
                  style={[
                    entrance(1),
                    styles.aviso,
                    { backgroundColor: colors.statusPausadoBg, borderColor: colors.statusPausadoText },
                  ]}
                >
                  <Text style={[styles.avisoTitulo, { color: colors.statusPausadoText }]}>
                    Servicio en pausa
                  </Text>
                  <Text style={[styles.avisoTexto, { color: colors.statusPausadoText }]}>
                    {orden.motivo_pausa}
                  </Text>
                </Animated.View>
              ) : null}

              <Animated.View style={entrance(3)}>
                <SeccionCard titulo="Datos del servicio" tono={tonoSolido}>
                  {orden.direccion ? (
                    <Dato
                      icono={<IconPin color={colors.inkSubtle} size={14} />}
                      valor={orden.direccion}
                    />
                  ) : null}
                  {orden.nombre_encargado ? (
                    <Dato
                      icono={<IconVisto color={colors.inkSubtle} size={13} />}
                      valor={orden.nombre_encargado}
                      etiqueta="Recibió el servicio"
                    />
                  ) : null}
                </SeccionCard>
              </Animated.View>

              {orden.problematica ? (
                <Animated.View style={entrance(4)}>
                  <SeccionCard titulo="Lo que reportaste" tono={tonoSolido}>
                    <Text style={[styles.parrafo, { color: colors.inkMuted }]}>
                      {orden.problematica}
                    </Text>
                  </SeccionCard>
                </Animated.View>
              ) : null}

              {orden.servicios_realizados.length > 0 || orden.comentario_tecnico ? (
                <Animated.View style={entrance(5)}>
                  <SeccionCard titulo="Lo que se hizo" tono={tonoSolido}>
                    {orden.servicios_realizados.map((servicio, i) => (
                      <View key={`${servicio}-${i}`} style={styles.vinieta}>
                        <View style={[styles.punto, { backgroundColor: colors.gold }]} />
                        <Text style={[styles.parrafo, { color: colors.inkMuted, flex: 1 }]}>
                          {servicio}
                        </Text>
                      </View>
                    ))}
                    {orden.comentario_tecnico ? (
                      <Text style={[styles.parrafo, { color: colors.inkMuted }]}>
                        {orden.comentario_tecnico}
                      </Text>
                    ) : null}
                  </SeccionCard>
                </Animated.View>
              ) : null}

              {orden.equipos_inventario.length > 0 ? (
                <Animated.View style={entrance(6)}>
                  <SeccionCard
                    titulo="Equipos"
                    tono={tonoSolido}
                    conteo={orden.equipos_inventario.length}
                  >
                    <EquiposLista equipos={orden.equipos_inventario} />
                  </SeccionCard>
                </Animated.View>
              ) : null}

              {orden.fotos_urls.length > 0 ? (
                <Animated.View style={entrance(7)}>
                  <SeccionCard titulo="Fotos" tono={tonoSolido} conteo={orden.fotos_urls.length}>
                    <FotosGaleria urls={orden.fotos_urls} />
                  </SeccionCard>
                </Animated.View>
              ) : null}

              {orden.firma_cliente_url || orden.firma_encargado_url ? (
                <Animated.View style={entrance(8)}>
                  <SeccionCard titulo="Firmas" tono={tonoSolido}>
                    <FirmasTarjeta
                      firmaCliente={orden.firma_cliente_url}
                      firmaEncargado={orden.firma_encargado_url}
                    />
                  </SeccionCard>
                </Animated.View>
              ) : null}

              <Animated.View style={entrance(9)}>
                <SeccionCard titulo="Programación" tono={tonoSolido}>
                  <View style={styles.placasFila}>
                    <PlacaFecha
                      label="Inicio"
                      fecha={formatFecha(orden.fecha_inicio)}
                      hora={formatHora(orden.hora_inicio)}
                    />
                    <PlacaFecha
                      label="Finalización"
                      fecha={formatFecha(orden.fecha_finalizacion)}
                      hora={formatHora(orden.hora_termino)}
                    />
                  </View>
                </SeccionCard>
              </Animated.View>

              <Animated.View style={entrance(10)}>
                <CalificacionTecnico
                  ordenId={orden.id}
                  tecnico={orden.tecnico_asignado_full_name}
                  calificacion={orden.calificacion}
                  puedeCalificar={orden.puede_calificar}
                  onCalificada={aplicarCalificacion}
                  onComentarioFocus={() =>
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)
                  }
                />
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Placa de fecha: etiqueta chica arriba y el dato en grande, dos por fila. */
function PlacaFecha({ label, fecha, hora }: { label: string; fecha: string; hora: string }) {
  const { colors } = useTheme();
  const sinDato = fecha === '—';
  return (
    <View style={[styles.placa, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={[styles.placaLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.placaFecha, { color: sinDato ? colors.inkSubtle : colors.ink }]}>
        {sinDato ? 'Sin programar' : fecha}
      </Text>
      <Text style={[styles.placaHora, { color: colors.inkSubtle }]}>
        {sinDato ? 'Sin programar' : hora}
      </Text>
    </View>
  );
}

function Dato({
  icono,
  valor,
  etiqueta,
}: {
  icono: React.ReactNode;
  valor: string;
  etiqueta?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.dato}>
      <View style={[styles.datoIcono, { backgroundColor: colors.surface }]}>{icono}</View>
      <View style={styles.datoTextos}>
        {etiqueta ? (
          <Text style={[styles.datoEtiqueta, { color: colors.inkSubtle }]}>{etiqueta}</Text>
        ) : null}
        <Text style={[styles.datoValor, { color: colors.ink }]}>{valor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  volver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  volverTexto: { ...type.label },
  heroCuerpo: { marginTop: spacing.sm, gap: spacing.xs },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  folio: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.bold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -1,
  },
  tipo: { ...type.caption, fontSize: 13 },
  statusPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 3,
  },
  statusTexto: {
    ...type.label,
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  panel: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  // paddingBottom holgado: deja sitio para subir la tarjeta de calificación por
  // encima del teclado al enfocar el comentario (ver `scrollToEnd` en onFocus).
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl * 2, gap: spacing.lg },
  esqueletos: { padding: spacing.xl, gap: spacing.md },
  errorBloque: { padding: spacing.xl, gap: spacing.lg },
  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  tecnicoTextos: { flex: 1, gap: 1 },
  tecnicoEtiqueta: {
    ...type.caption,
    fontSize: 11,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tecnicoNombre: { ...type.bodyMedium, fontSize: 16 },
  miniEstrellas: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniEstrellasTexto: { ...type.label, fontFamily: font.semibold },
  aviso: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  avisoTitulo: { ...type.label, fontFamily: font.semibold },
  avisoTexto: { ...type.caption, lineHeight: 18 },
  parrafo: { ...type.body, lineHeight: 21 },
  vinieta: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datoIcono: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datoTextos: { flex: 1, gap: 1 },
  datoEtiqueta: { ...type.caption, fontSize: 11 },
  datoValor: { ...type.bodyMedium, flexShrink: 1 },
  placasFila: { flexDirection: 'row', gap: spacing.sm },
  placa: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    gap: 2,
  },
  placaLabel: {
    ...type.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  placaFecha: {
    fontFamily: type.display.fontFamily,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  placaHora: { ...type.mono, fontSize: 12 },
});
