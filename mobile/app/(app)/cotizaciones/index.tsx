import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canCreateModule } from '@/auth/permissions';
import { BarraCarga } from '@/components/BarraCarga';
import {
  hojaEstilo,
  listadoStyles,
  Lupa,
  MesEncabezado,
  SaludoBanda,
  SeccionEncabezado,
  SinElementos,
} from '@/components/ListadoChrome';
import { SkeletonBar, SkeletonRegion } from '@/components/Skeleton';
import { EmptyState, InlineError } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { statusLabel, statusTone } from '@/features/cotizaciones/cotizacionFormat';
import { CotizacionCard } from '@/features/cotizaciones/components/CotizacionCard';
import { CotizacionStatusIcon } from '@/features/cotizaciones/components/CotizacionStatusIcon';
import { ResumenMesCotizaciones } from '@/features/cotizaciones/components/ResumenMesCotizaciones';
import { useCotizaciones } from '@/features/cotizaciones/useCotizaciones';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET } from '@/theme/tokens';
import type { CotizacionListItem } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Cotizaciones del mes — misma anatomía que Órdenes y Proyectos (saludo, hoja
 * con el mes, búsqueda y secciones por estatus) más el panel de montos. Crear
 * vive en un botón flotante que solo aparece con permiso de `create`.
 */
export default function CotizacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, permissions } = useSession();
  const { colors, scheme } = useTheme();
  const puedeCrear = canCreateModule(permissions, user, 'cotizaciones');
  const {
    mes, setMes, busqueda, setBusqueda, filtro, setFiltro, secciones, resumen, total,
    cargando, refrescando, error, recargar,
  } = useCotizaciones();

  const abrir = useCallback(
    (cotizacion: CotizacionListItem) => router.push(`/cotizaciones/${cotizacion.id}` as Href),
    [router],
  );

  const cargaInicial = cargando && total === 0 && !error;
  const filtrado = filtro !== 'todas' || busqueda.trim().length > 0;

  const encabezado = (
    <View style={listadoStyles.controles}>
      <MesEncabezado
        mes={mes}
        resumen={`${total} ${total === 1 ? 'cotización' : 'cotizaciones'} en el mes`}
        cargando={cargando && !cargaInicial}
        onChange={setMes}
      />
      {!cargaInicial && total > 0 ? (
        <ResumenMesCotizaciones resumen={resumen} filtro={filtro} onFiltro={setFiltro} />
      ) : null}
      <TextField
        label="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Folio, cliente, contacto…"
        autoCapitalize="none"
        autoCorrect={false}
        leadingIcon={<Lupa color={colors.inkSubtle} />}
      />
      {error ? <InlineError message={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[listadoStyles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <View style={{ backgroundColor: colors.navy }}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
      </View>

      <SaludoBanda nombre={nombreUsuarioDisplay(user)} />

      <View style={hojaEstilo(colors, scheme)}>
        {cargaInicial ? (
          <ScrollView style={listadoStyles.flex} contentContainerStyle={listadoStyles.lista}>
            {encabezado}
            <SiluetaLista />
          </ScrollView>
        ) : (
          <SectionList
            style={listadoStyles.flex}
            sections={secciones}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={encabezado}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[listadoStyles.lista, puedeCrear ? { paddingBottom: 120 + insets.bottom } : null]}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={8}
            windowSize={7}
            removeClippedSubviews
            renderSectionHeader={({ section }) => (
              <SeccionEncabezado
                titulo={section.title}
                cantidad={section.data.length}
                tono={statusTone(section.key, colors)}
                icon={(c) => <CotizacionStatusIcon status={section.key} color={c} size={12} />}
              />
            )}
            renderItem={({ item, index }) => <CotizacionCard cotizacion={item} onPress={abrir} indice={index} />}
            ListEmptyComponent={
              error ? null : (
                <EmptyState
                  icon={<SinElementos />}
                  title={
                    filtro !== 'todas'
                      ? `Sin cotizaciones «${statusLabel(filtro).toLowerCase()}»`
                      : busqueda.trim()
                        ? 'Sin resultados'
                        : 'Sin cotizaciones este mes'
                  }
                  description={
                    filtrado
                      ? 'Quita el filtro o prueba con otro folio o cliente.'
                      : puedeCrear
                        ? 'Crea una con el botón «Nueva cotización» o cambia de mes.'
                        : 'Cambia de mes o desliza hacia abajo para actualizar.'
                  }
                />
              )
            }
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colors.navy]} tintColor={colors.navy} />
            }
          />
        )}
      </View>

      {puedeCrear ? (
        <BotonNueva bottom={insets.bottom + spacing.lg} onPress={() => router.push('/cotizaciones/nueva' as Href)} />
      ) : null}
    </SafeAreaView>
  );
}

/** Botón flotante «Nueva cotización»: entra desde abajo y se hunde al tocarlo. */
function BotonNueva({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const entrada = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.spring(entrada, { toValue: 1, friction: 8, tension: 90, delay: 250, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [entrada, reduced]);

  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.spring(escala, { toValue: destino, friction: 9, tension: 300, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        styles.fabCaja,
        {
          bottom,
          opacity: entrada,
          transform: [
            { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: escala },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva cotización"
        onPress={onPress}
        onPressIn={() => presionar(0.95)}
        onPressOut={() => presionar(1)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
          elevationFor(colors, 'panel'),
        ]}
      >
        <Text style={[styles.fabMas, { color: colors.onPrimary }]}>+</Text>
        <Text style={[styles.fabTexto, { color: colors.onPrimary }]}>Nueva cotización</Text>
      </Pressable>
    </Animated.View>
  );
}

function SiluetaLista() {
  const { colors } = useTheme();
  return (
    <SkeletonRegion label="Cargando cotizaciones">
      <SkeletonBar width="100%" height={170} radiusOverride={radius.card} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.silueta, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.siluetaFila}>
            <SkeletonBar width={42} height={42} radiusOverride={radius.md + 2} />
            <View style={styles.siluetaTextos}>
              <SkeletonBar width="40%" height={11} />
              <SkeletonBar width="75%" height={16} />
            </View>
          </View>
          <SkeletonBar width="45%" height={22} />
        </View>
      ))}
    </SkeletonRegion>
  );
}

const styles = StyleSheet.create({
  fabCaja: { position: 'absolute', right: spacing.lg },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
  },
  fabMas: { fontFamily: font.semibold, fontSize: 22, lineHeight: 24, marginTop: -2 },
  fabTexto: { fontFamily: font.semibold, fontSize: 15 },
  silueta: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, marginTop: spacing.md },
  siluetaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siluetaTextos: { flex: 1, gap: spacing.sm },
});
