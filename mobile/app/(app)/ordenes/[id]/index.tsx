import React, { useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { liberarOrden } from '@/api/ordenesApi';
import { toUserMessage } from '@/api/errors';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule, isAdmin, ownsOrden } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/StateViews';
import { AccionesRapidas } from '@/features/orders/components/AccionesRapidas';
import { CampoDato, CampoTelefono, CampoUbicacion } from '@/features/orders/components/CampoDato';
import { EquiposLista } from '@/features/orders/components/EquiposLista';
import { FallaBox } from '@/features/orders/components/FallaBox';
import { FirmasTarjeta } from '@/features/orders/components/FirmasTarjeta';
import { FotosGaleria } from '@/features/orders/components/FotosGaleria';
import { IconComment, IconPerson } from '@/features/orders/components/icons';
import { OrdenDetalleHero } from '@/features/orders/components/OrdenDetalleHero';
import { DetalleOrdenSkeleton } from '@/features/orders/components/OrdenSkeletons';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import { folioDisplay, statusSolid, statusLabel } from '@/features/orders/ordenFormat';
import { useOrden } from '@/features/orders/useOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';
import { useEntrance } from '@/utils/useEntrance';
import { formatFecha, formatHora } from '@/utils/fecha';

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

export default function DetalleOrdenScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ordenId = Number(id);
  const { orden, cargando, error, recargar, aplicarOrden } = useOrden(
    Number.isFinite(ordenId) ? ordenId : null,
  );
  const { user, permissions } = useSession();
  const entrance = useEntrance(9);
  const { colors, scheme } = useTheme();
  const [liberando, setLiberando] = useState(false);

  if (cargando) return <DetalleOrdenSkeleton />;
  if (error || !orden) return <ErrorState message={error ?? 'Orden no encontrada.'} onRetry={recargar} />;

  const puedeEditar = canEditModule(permissions, user, 'ordenes');
  const puedeLiberar =
    !orden.en_pool &&
    orden.status !== 'resuelto' &&
    (ownsOrden(user, orden) || isAdmin(user));

  const confirmarLiberar = () => {
    Alert.alert(
      'Liberar orden',
      '¿Enviar esta orden a la bolsa para que otro técnico la tome? Dejará de estar asignada a ti.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: async () => {
            setLiberando(true);
            try {
              aplicarOrden(await liberarOrden(orden.id));
              router.back();
            } catch (e) {
              Alert.alert('No se pudo liberar', toUserMessage(e));
            } finally {
              setLiberando(false);
            }
          },
        },
      ],
    );
  };
  const tono = statusSolid(orden.status, colors).bg;
  const folio = folioDisplay(orden);
  const pausada = orden.status === 'pausado';
  const hayFirmas = Boolean(orden.firma_cliente_url || orden.firma_encargado_url);

  const hoja = {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
    elevation: 12,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['bottom']}>
      {/* Título de pantalla para recientes de Android y el árbol de accesibilidad. */}
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(orden.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <Animated.View style={entrance(0)}>
        <OrdenDetalleHero orden={orden} onVolver={() => router.back()} />
      </Animated.View>

      <View style={[styles.hoja, hoja]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          accessibilityLabel={`Detalle de la orden ${folio}`}
        >
          <Animated.View style={entrance(1)}>
            <AccionesRapidas telefono={orden.telefono_cliente} direccion={orden.direccion} />
          </Animated.View>

          <Animated.View style={entrance(2)}>
            <SeccionCard titulo="Contacto" tono={tono}>
              {orden.telefono_cliente ? (
                <CampoTelefono label="Teléfono" telefono={orden.telefono_cliente} />
              ) : null}
              <CampoUbicacion label="Dirección" direccion={orden.direccion ?? '—'} />
              <CampoDato
                icon={<IconPerson color={colors.inkMuted} size={12} />}
                label="Contacto en sitio"
                value={orden.nombre_cliente ?? '—'}
              />
              <CampoDato
                icon={<IconPerson color={colors.inkMuted} size={12} />}
                label="Técnico asignado"
                value={orden.tecnico_asignado_full_name ?? '—'}
              />
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(3)}>
            <SeccionCard titulo="Servicio" tono={tono}>
              {pausada && orden.motivo_pausa ? (
                <FallaBox titulo="Motivo de la pausa" texto={orden.motivo_pausa} tono={colors.statusPausadoText} />
              ) : null}
              {orden.problematica ? (
                <FallaBox titulo="Falla reportada" texto={orden.problematica} />
              ) : (
                <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Sin problemática capturada.</Text>
              )}
              <CampoDato
                icon={<IconComment color={colors.inkMuted} size={12} />}
                label="Comentario técnico"
                value={orden.comentario_tecnico ?? '—'}
              />
              {orden.servicios_realizados.length > 0 ? (
                <View style={styles.servicios}>
                  {orden.servicios_realizados.map((servicio, i) => (
                    <View key={`${servicio}-${i}`} style={styles.vinieta}>
                      <View style={[styles.punto, { backgroundColor: colors.gold }]} />
                      <Text style={[styles.servicioTexto, { color: colors.inkMuted }]}>{servicio}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(4)}>
            <SeccionCard titulo="Equipos" tono={tono} conteo={orden.equipos_inventario.length}>
              <EquiposLista equipos={orden.equipos_inventario} />
            </SeccionCard>
          </Animated.View>

          {orden.fotos_urls.length > 0 ? (
            <Animated.View style={entrance(5)}>
              <SeccionCard titulo="Fotos" tono={tono} conteo={orden.fotos_urls.length}>
                <FotosGaleria urls={orden.fotos_urls} />
              </SeccionCard>
            </Animated.View>
          ) : null}

          {hayFirmas ? (
            <Animated.View style={entrance(6)}>
              <SeccionCard titulo="Firmas" tono={tono}>
                <FirmasTarjeta firmaCliente={orden.firma_cliente_url} firmaEncargado={orden.firma_encargado_url} />
              </SeccionCard>
            </Animated.View>
          ) : null}

          <Animated.View style={entrance(7)}>
            <SeccionCard titulo="Programación" tono={tono}>
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

          <Animated.View style={[entrance(8), styles.accionesBloque]}>
            {puedeEditar ? (
              <AppButton
                label="Editar orden"
                onPress={() => router.push(`/ordenes/${orden.id}/editar`)}
                accessibilityHint="Abre el formulario de campo"
              />
            ) : (
              <Text style={[styles.aviso, { color: colors.inkSubtle }]}>
                Tu cuenta no tiene permiso para editar órdenes.
              </Text>
            )}

            {orden.en_pool ? (
              <View
                style={[
                  styles.poolPill,
                  { backgroundColor: colors.goldSoftBg, borderColor: colors.goldSoftText },
                ]}
                accessibilityRole="text"
              >
                <Text style={[styles.poolPillTexto, { color: colors.goldSoftText }]}>
                  En bolsa de órdenes disponibles
                </Text>
              </View>
            ) : puedeLiberar ? (
              <AppButton
                label="Liberar orden"
                variant="secondary"
                loading={liberando}
                onPress={confirmarLiberar}
                accessibilityHint="Envía la orden a la bolsa para que otro técnico la tome"
              />
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hoja: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  content: { padding: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  accionesBloque: { marginTop: spacing.xs, gap: spacing.sm },
  poolPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  poolPillTexto: { ...type.label, fontFamily: type.label.fontFamily },
  vacio: { ...type.body },
  servicios: { gap: spacing.sm },
  vinieta: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  servicioTexto: { ...type.body, lineHeight: 21, flex: 1 },
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
  aviso: { ...type.caption, textAlign: 'center' },
});
