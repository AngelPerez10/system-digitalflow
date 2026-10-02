import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canCreateModule } from '@/auth/permissions';
import { BarraCarga } from '@/components/BarraCarga';
import { BotonFlotante } from '@/components/BotonFlotante';
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
import { radius, spacing } from '@/theme/tokens';
import type { CotizacionListItem } from '@/types/cotizacion';

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
    global, mes, setMes, busqueda, setBusqueda, filtro, setFiltro, secciones, resumen, total,
    cargando, refrescando, error, recargar,
  } = useCotizaciones();

  const abrir = useCallback(
    (cotizacion: CotizacionListItem) => router.push(`/cotizaciones/${cotizacion.id}` as Href),
    [router],
  );

  // Al buscar no se vuelve a la silueta: remontaría el buscador y cerraría el teclado.
  const cargaInicial = cargando && total === 0 && !error && !global;
  const filtrado = filtro !== 'todas' || busqueda.trim().length > 0;

  const encabezado = (
    <View style={listadoStyles.controles}>
      <MesEncabezado
        mes={mes}
        resumen={
          global
            ? `${total} ${total === 1 ? 'resultado' : 'resultados'}, lo más reciente primero`
            : `${total} ${total === 1 ? 'cotización' : 'cotizaciones'} en el mes`
        }
        cargando={cargando && !cargaInicial}
        onChange={setMes}
        global={global}
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
              error || (global && cargando) ? null : (
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
        <BotonFlotante
          label="Nueva cotización"
          bottom={insets.bottom + spacing.lg}
          onPress={() => router.push('/cotizaciones/nueva' as Href)}
        />
      ) : null}
    </SafeAreaView>
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
  silueta: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, marginTop: spacing.md },
  siluetaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siluetaTextos: { flex: 1, gap: spacing.sm },
});
