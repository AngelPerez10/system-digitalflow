import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { BarraCarga } from '@/components/BarraCarga';
import { BotonFlotante } from '@/components/BotonFlotante';
import {
  FiltroChips,
  hojaEstilo,
  listadoStyles as styles,
  Lupa,
  MesEncabezado,
  SaludoBanda,
  SeccionEncabezado,
  SinElementos,
  type OpcionFiltro,
} from '@/components/ListadoChrome';
import { EmptyState, ErrorState, InlineError } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { EstadoEvidenciaIcon } from '@/features/reportes/components/EstadoEvidenciaIcon';
import { ReporteCard } from '@/features/reportes/components/ReporteCard';
import { ReportesSkeletonList } from '@/features/reportes/components/ReporteSkeletons';
import { ESTADOS_EVIDENCIA, estadoLabel, estadoTone, type FiltroReporte } from '@/features/reportes/reporteFormat';
import { usePermisosReportes } from '@/features/reportes/usePermisosReportes';
import { useReportes } from '@/features/reportes/useReportes';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { Reporte } from '@/types/reporte';

/**
 * Reportes de mantenimiento del mes — misma anatomía que Órdenes y Proyectos:
 * saludo, hoja con el mes, búsqueda, chips de estado y secciones. Las secciones
 * van por estado de la evidencia, con lo que falta primero. Lo que se ve y se
 * puede hacer depende del rol (`usePermisosReportes`); crear vive en el botón
 * flotante, solo con permiso de `create`.
 */
export default function ReportesScreen() {
  const permisos = usePermisosReportes();
  // Sin `view` el servidor respondería 403: se explica en lugar de mostrar un error crudo.
  if (!permisos.ver) {
    return <ErrorState message="Tu cuenta no tiene permiso para ver reportes de mantenimiento. Solicítalo a un administrador." />;
  }
  return <Listado puedeCrear={permisos.crear} soloPropios={permisos.soloPropios} />;
}

function Listado({ puedeCrear, soloPropios }: { puedeCrear: boolean; soloPropios: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const {
    global, mes, setMes, busqueda, setBusqueda, filtro, setFiltro, secciones, total, conteos,
    cargando, refrescando, error, recargar,
  } = useReportes();

  const opcionesFiltro: OpcionFiltro<FiltroReporte>[] = [
    { key: 'todos', label: 'Todos', cantidad: total },
    ...ESTADOS_EVIDENCIA.map((estado) => ({
      key: estado,
      label: estadoLabel(estado),
      cantidad: conteos[estado],
      tono: estadoTone(estado, colors),
      icon: (c: string) => <EstadoEvidenciaIcon estado={estado} color={c} size={12} />,
    })),
  ];

  const abrir = useCallback((reporte: Reporte) => router.push(`/reportes/${reporte.id}` as Href), [router]);

  const cargaInicial = cargando && total === 0 && !error;
  const filtrado = filtro !== 'todos' || busqueda.trim().length > 0;

  const encabezado = (
    <View style={styles.controles}>
      <MesEncabezado
        mes={mes}
        resumen={
          global
            ? `${total} ${total === 1 ? 'resultado' : 'resultados'}, lo más reciente primero`
            : `${total} ${total === 1 ? 'reporte' : 'reportes'} ${soloPropios ? 'tuyos ' : ''}en el mes`
        }
        cargando={cargando && !cargaInicial}
        onChange={setMes}
        global={global}
      />
      <TextField
        label="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Folio, orden, cliente o técnico…"
        autoCapitalize="none"
        autoCorrect={false}
        leadingIcon={<Lupa color={colors.inkSubtle} />}
      />
      <FiltroChips opciones={opcionesFiltro} valor={filtro} onChange={setFiltro} accessibilityLabel="Filtrar por evidencia" />
      {error ? <InlineError message={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <View style={{ backgroundColor: colors.navy }}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
      </View>

      <SaludoBanda nombre={nombreUsuarioDisplay(user)} />

      <View style={hojaEstilo(colors, scheme)}>
        {cargaInicial ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.lista}>
            {encabezado}
            <ReportesSkeletonList />
          </ScrollView>
        ) : (
          <SectionList
            style={styles.flex}
            sections={secciones}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={encabezado}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.lista, puedeCrear ? { paddingBottom: 120 + insets.bottom } : null]}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={6}
            windowSize={7}
            removeClippedSubviews
            renderSectionHeader={({ section }) => (
              <SeccionEncabezado
                titulo={section.title}
                cantidad={section.data.length}
                tono={estadoTone(section.key, colors)}
                icon={(c) => <EstadoEvidenciaIcon estado={section.key} color={c} size={12} />}
              />
            )}
            renderItem={({ item, index }) => <ReporteCard reporte={item} onPress={abrir} indice={index} />}
            ListEmptyComponent={
              error ? null : (
                <EmptyState
                  icon={<SinElementos />}
                  title={
                    filtro !== 'todos'
                      ? `Sin reportes «${estadoLabel(filtro).toLowerCase()}»`
                      : busqueda.trim()
                        ? 'Sin resultados'
                        : 'Sin reportes este mes'
                  }
                  description={
                    filtrado
                      ? 'Quita el filtro o prueba con otro folio, cliente o técnico.'
                      : puedeCrear
                        ? 'Crea uno con «Nuevo reporte»: liga la orden o el proyecto y toma las fotos de Antes y Después.'
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
          label="Nuevo reporte"
          bottom={insets.bottom + spacing.lg}
          onPress={() => router.push('/reportes/nuevo' as Href)}
        />
      ) : null}
    </SafeAreaView>
  );
}
