import React from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/auth/SessionProvider';
import { canEditModule } from '@/auth/permissions';
import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/StateViews';
import { CampoDato } from '@/features/orders/components/CampoDato';
import { FotosGaleria } from '@/features/orders/components/FotosGaleria';
import { IconClipboard, IconComment, IconPerson, IconWrench } from '@/features/orders/components/icons';
import { SeccionCard } from '@/features/orders/components/SeccionCard';
import { CotizacionesResumen } from '@/features/proyectos/components/CotizacionesResumen';
import { EquiposProyectoLista } from '@/features/proyectos/components/EquiposProyectoLista';
import { FirmasProyectoTarjeta } from '@/features/proyectos/components/FirmasProyectoTarjeta';
import { NotasPorDiaLista } from '@/features/proyectos/components/NotasPorDiaLista';
import { ProyectoDetalleHero } from '@/features/proyectos/components/ProyectoDetalleHero';
import { DetalleProyectoSkeleton } from '@/features/proyectos/components/ProyectoSkeletons';
import { folioDisplay, statusLabel, statusSolid } from '@/features/proyectos/proyectoFormat';
import { useProyecto } from '@/features/proyectos/useProyecto';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';
import { useEntrance } from '@/utils/useEntrance';
import { formatFecha } from '@/utils/fecha';

/** Misma placa que `PlacaFecha` del detalle de Órdenes: etiqueta chica arriba, dato grande, subdato debajo. */
function Placa({ label, valor, subvalor }: { label: string; valor: string; subvalor?: string }) {
  const { colors } = useTheme();
  const sinDato = valor === '—';
  return (
    <View style={[styles.placa, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={[styles.placaLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.placaValor, { color: sinDato ? colors.inkSubtle : colors.ink }]} numberOfLines={2}>
        {sinDato ? 'Sin programar' : valor}
      </Text>
      {subvalor ? <Text style={[styles.placaSub, { color: colors.inkSubtle }]}>{subvalor}</Text> : null}
    </View>
  );
}

export default function DetalleProyectoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const { proyecto, cargando, error, recargar } = useProyecto(Number.isFinite(proyectoId) ? proyectoId : null);
  const { user, permissions } = useSession();
  const entrance = useEntrance(10);
  const { colors, scheme } = useTheme();

  if (cargando) return <DetalleProyectoSkeleton />;
  if (error || !proyecto) return <ErrorState message={error ?? 'Proyecto no encontrado.'} onRetry={recargar} />;

  const puedeEditar = canEditModule(permissions, user, 'proyectos');
  const tono = statusSolid(proyecto.status, colors).bg;
  const folio = folioDisplay(proyecto);
  const hayFirmas = Boolean(proyecto.firma_cliente_url || proyecto.firma_tecnico_url);
  const responsable = proyecto.tecnicos.find((t) => t.responsable) ?? proyecto.tecnicos[0];
  const restoTecnicos = proyecto.tecnicos.filter((t) => t.id !== responsable?.id);
  const diasTrabajo = proyecto.fechas_inicio.length;
  const fechaInicioDisplay = diasTrabajo > 0 ? formatFecha(proyecto.fechas_inicio[0]!) : '—';
  const fechaFinDisplay = diasTrabajo > 0 ? formatFecha(proyecto.fechas_inicio[diasTrabajo - 1]!) : '—';
  const auxiliaresDisplay = proyecto.auxiliares.map((a) => a.nombre).join(', ');

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
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(proyecto.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <Animated.View style={entrance(0)}>
        <ProyectoDetalleHero proyecto={proyecto} onVolver={() => router.back()} />
      </Animated.View>

      <View style={[styles.hoja, hoja]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          accessibilityLabel={`Detalle del proyecto ${folio}`}
        >
          <Animated.View style={entrance(1)}>
            <SeccionCard titulo="Equipo de trabajo" tono={tono}>
              <CampoDato
                icon={<IconPerson color={colors.inkMuted} size={12} />}
                label="Técnico responsable"
                value={responsable?.nombre || 'Sin asignar'}
              />
              {restoTecnicos.length > 0 ? (
                <CampoDato
                  icon={<IconPerson color={colors.inkMuted} size={12} />}
                  label="Otros técnicos"
                  value={restoTecnicos.map((t) => t.nombre).join(', ')}
                />
              ) : null}
              {proyecto.auxiliares.length > 0 ? (
                <CampoDato
                  icon={<IconPerson color={colors.inkMuted} size={12} />}
                  label="Auxiliares"
                  value={auxiliaresDisplay}
                />
              ) : null}
              {proyecto.vehiculo_asignado ? (
                <CampoDato
                  icon={<IconWrench color={colors.inkMuted} size={12} />}
                  label="Vehículo asignado"
                  value={proyecto.vehiculo_asignado}
                />
              ) : null}
              {proyecto.herramientas_generales ? (
                <CampoDato
                  icon={<IconWrench color={colors.inkMuted} size={12} />}
                  label="Herramientas generales"
                  value={proyecto.herramientas_generales}
                />
              ) : null}
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(2)}>
            <SeccionCard titulo="Programación" tono={tono}>
              <Placa label="Fecha de autorización" valor={proyecto.fecha_autorizacion ? formatFecha(proyecto.fecha_autorizacion) : '—'} />
              <View style={styles.placasFila}>
                <Placa label="Hora de llegada" valor={proyecto.hora_llegada || '—'} />
                <Placa label="Hora de salida" valor={proyecto.hora_salida || '—'} />
              </View>

              <View style={[styles.divisorGrupo, { borderTopColor: colors.line }]}>
                <Text style={[styles.grupoLabel, { color: colors.inkMuted }]}>Periodo de trabajo</Text>
              </View>
              <View style={styles.placasFila}>
                <Placa label="Fecha de inicio" valor={fechaInicioDisplay} />
                <Placa label="Fecha de fin" valor={fechaFinDisplay} />
              </View>
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(3)}>
            <SeccionCard titulo="Cotizaciones" tono={tono} conteo={proyecto.cotizaciones.length}>
              <CotizacionesResumen bloques={proyecto.cotizaciones} />
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(4)}>
            <SeccionCard titulo="Equipos" tono={tono} conteo={proyecto.equipos.length}>
              <EquiposProyectoLista equipos={proyecto.equipos} />
            </SeccionCard>
          </Animated.View>

          <Animated.View style={entrance(5)}>
            <SeccionCard titulo="Bitácora por jornada" tono={tono}>
              <NotasPorDiaLista notas={proyecto.notas_por_dia} />
            </SeccionCard>
          </Animated.View>

          {(proyecto.incidencias || proyecto.requerimientos_adicionales) ? (
            <Animated.View style={entrance(6)}>
              <SeccionCard titulo="Incidencias y requerimientos" tono={tono}>
                {proyecto.incidencias ? (
                  <CampoDato
                    icon={<IconComment color={colors.inkMuted} size={12} />}
                    label="Incidencias"
                    value={proyecto.incidencias}
                  />
                ) : null}
                {proyecto.requerimientos_adicionales ? (
                  <CampoDato
                    icon={<IconClipboard color={colors.inkMuted} size={12} />}
                    label="Requerimientos adicionales"
                    value={proyecto.requerimientos_adicionales}
                  />
                ) : null}
                {proyecto.requiere_presupuesto_adicional && !proyecto.cotizacion_adicional ? (
                  <Text style={[styles.aviso, { color: colors.danger }]}>
                    Requiere presupuesto adicional — pendiente de vincular por oficina.
                  </Text>
                ) : null}
              </SeccionCard>
            </Animated.View>
          ) : null}

          {proyecto.evidencias_urls.length > 0 ? (
            <Animated.View style={entrance(7)}>
              <SeccionCard titulo="Evidencias" tono={tono} conteo={proyecto.evidencias_urls.length}>
                <FotosGaleria urls={proyecto.evidencias_urls} />
              </SeccionCard>
            </Animated.View>
          ) : null}

          {hayFirmas ? (
            <Animated.View style={entrance(8)}>
              <SeccionCard titulo="Firmas" tono={tono}>
                <FirmasProyectoTarjeta firmaCliente={proyecto.firma_cliente_url} firmaTecnico={proyecto.firma_tecnico_url} />
              </SeccionCard>
            </Animated.View>
          ) : null}

          <Animated.View style={[entrance(9), styles.accionesBloque]}>
            {puedeEditar ? (
              <AppButton
                label="Editar proyecto"
                onPress={() => router.push(`/proyectos/${proyecto.id}/editar` as Href)}
                accessibilityHint="Abre el formulario de campo"
              />
            ) : (
              <Text style={[styles.aviso, { color: colors.inkSubtle }]}>
                Tu cuenta no tiene permiso para editar proyectos.
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hoja: { flex: 1, marginTop: -20, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  content: { padding: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  accionesBloque: { marginTop: spacing.xs, gap: spacing.sm },
  aviso: { ...type.caption, textAlign: 'center' },
  placasFila: { flexDirection: 'row', gap: spacing.sm },
  placa: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, gap: 2 },
  placaLabel: { ...type.caption, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  placaValor: {
    fontFamily: type.display.fontFamily,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  placaSub: { ...type.caption, fontSize: 11 },
  divisorGrupo: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs },
  grupoLabel: { ...type.label, fontSize: 13 },
});
