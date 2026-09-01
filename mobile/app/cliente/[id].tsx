import React, { useRef } from 'react';
import {
  Image,
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
import { FotosGaleria } from '@/features/orders/components/FotosGaleria';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import {
  IconCalendar,
  IconClock,
  IconEstrella,
  IconPause,
  IconPin,
  IconVisto,
} from '@/features/orders/components/icons';
import { folioDisplay, statusLabel, statusTone, tipoOrdenLabel } from '@/features/orders/ordenFormat';
import { useOrdenCliente } from '@/features/orders/useOrdenCliente';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import type { OrdenStatus } from '@/types/orden';
import { formatFecha, formatHora } from '@/utils/fecha';

const STATUS_ICON: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={14} />,
  pausado: (color) => <IconPause color={color} size={14} />,
  resuelto: (color) => <IconVisto color={color} size={14} />,
};

/**
 * Resumen del servicio para el cliente. **Solo lectura**: sin cambio de estado,
 * sin editar, sin firmar. Muestra lo que le importa —quién lo atiende, en qué
 * va, qué se hizo y la evidencia— y termina en la calificación del técnico.
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
  const nombreCliente = nombreUsuarioDisplay(user, 'Cliente');
  const tono = orden ? statusTone(orden.status, colors) : null;

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
            <View style={styles.heroTextos}>
              <Text style={[styles.folio, { color: colors.onNavy }]} accessibilityRole="header">
                {folioDisplay(orden)}
              </Text>
              <Text style={[styles.tipo, { color: colors.onNavyMuted }]}>
                {tipoOrdenLabel(orden.tipo_orden)} · {nombreCliente}
              </Text>
            </View>

            {tono ? (
              <View style={[styles.statusPill, { backgroundColor: tono.bg }]}>
                {STATUS_ICON[orden.status](tono.text)}
                <Text style={[styles.statusTexto, { color: tono.text }]}>
                  {statusLabel(orden.status)}
                </Text>
              </View>
            ) : null}
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
              <View
                style={[
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
              </View>
            ) : null}

            {orden.motivo_pausa ? (
              <View
                style={[
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
              </View>
            ) : null}

            <SeccionCard titulo="Datos del servicio">
              {orden.direccion ? (
                <Dato icono={<IconPin color={colors.inkSubtle} size={14} />} valor={orden.direccion} />
              ) : null}
              {formatFecha(orden.fecha_inicio) ? (
                <Dato
                  icono={<IconCalendar color={colors.inkSubtle} size={13} />}
                  valor={formatFecha(orden.fecha_inicio)}
                  etiqueta="Inicio"
                />
              ) : null}
              {formatHora(orden.hora_inicio) || formatHora(orden.hora_termino) ? (
                <Dato
                  icono={<IconClock color={colors.inkSubtle} size={14} />}
                  valor={[formatHora(orden.hora_inicio), formatHora(orden.hora_termino)]
                    .filter(Boolean)
                    .join(' — ')}
                  etiqueta="Horario"
                />
              ) : null}
              {formatFecha(orden.fecha_finalizacion) ? (
                <Dato
                  icono={<IconVisto color={colors.inkSubtle} size={14} />}
                  valor={formatFecha(orden.fecha_finalizacion)}
                  etiqueta="Finalizado"
                />
              ) : null}
            </SeccionCard>

            {orden.problematica ? (
              <SeccionCard titulo="Lo que reportaste">
                <Text style={[styles.parrafo, { color: colors.inkMuted }]}>{orden.problematica}</Text>
              </SeccionCard>
            ) : null}

            {orden.servicios_realizados.length > 0 ? (
              <SeccionCard titulo="Lo que se hizo">
                {orden.servicios_realizados.map((servicio, i) => (
                  <View key={`${servicio}-${i}`} style={styles.vinieta}>
                    <View style={[styles.punto, { backgroundColor: colors.gold }]} />
                    <Text style={[styles.parrafo, { color: colors.inkMuted, flex: 1 }]}>
                      {servicio}
                    </Text>
                  </View>
                ))}
              </SeccionCard>
            ) : null}

            {orden.comentario_tecnico ? (
              <SeccionCard titulo="Comentario del técnico">
                <Text style={[styles.parrafo, { color: colors.inkMuted }]}>
                  {orden.comentario_tecnico}
                </Text>
              </SeccionCard>
            ) : null}

            {orden.fotos_urls.length > 0 ? (
              <SeccionCard titulo="Evidencia">
                <FotosGaleria urls={orden.fotos_urls} />
              </SeccionCard>
            ) : null}

            {orden.firma_cliente_url ? (
              <SeccionCard titulo="Tu firma de conformidad">
                <View style={[styles.firma, { borderColor: colors.line, backgroundColor: colors.surface }]}>
                  <Image
                    source={{ uri: orden.firma_cliente_url }}
                    style={styles.firmaImagen}
                    resizeMode="contain"
                    accessibilityLabel="Firma registrada al cierre del servicio"
                  />
                </View>
              </SeccionCard>
            ) : null}

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
          </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
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
  heroCuerpo: { marginTop: spacing.md, gap: spacing.md },
  heroTextos: { gap: 2 },
  folio: { fontFamily: font.bold, fontSize: 28, lineHeight: 32, letterSpacing: -1 },
  tipo: { ...type.caption },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  statusTexto: { ...type.label, fontFamily: font.semibold },
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
  firma: { borderWidth: 1, borderRadius: radius.md, height: 140, padding: spacing.sm },
  firmaImagen: { width: '100%', height: '100%' },
});
