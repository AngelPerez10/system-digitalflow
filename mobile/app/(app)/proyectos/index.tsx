import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { BarraCarga } from '@/components/BarraCarga';
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
import { EmptyState, InlineError } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { PROYECTO_STATUS_ORDER, type FiltroProyecto } from '@/features/proyectos/agrupar';
import { ProyectoCard } from '@/features/proyectos/components/ProyectoCard';
import { ProyectosSkeletonList } from '@/features/proyectos/components/ProyectoCardSkeleton';
import { ProyectoStatusIcon } from '@/features/proyectos/components/ProyectoStatusIcon';
import { statusLabel, statusTone } from '@/features/proyectos/proyectoFormat';
import { useProyectos } from '@/features/proyectos/useProyectos';
import { useTheme } from '@/theme/ThemeProvider';
import type { ProyectoListItem, ProyectoStatus } from '@/types/proyecto';

function iconoStatus(status: ProyectoStatus) {
  return function IconoStatus(color: string) {
    return <ProyectoStatusIcon status={status} color={color} size={12} />;
  };
}

/**
 * Listado de proyectos del técnico — misma anatomía que Órdenes (saludo,
 * hoja redondeada con el mes, búsqueda, chips de estatus y secciones), con
 * tarjetas propias de proyecto: avance, equipo y métricas de instalación.
 */
export default function ProyectosScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const {
    mes, setMes, busqueda, setBusqueda, filtro, setFiltro, secciones, total, conteos,
    cargando, refrescando, error, recargar,
  } = useProyectos();

  const abrirProyecto = useCallback(
    (proyecto: ProyectoListItem) => router.push(`/proyectos/${proyecto.id}` as Href),
    [router],
  );

  const cargaInicial = cargando && total === 0 && !error;

  // Cancelados solo aparece como chip si hay alguno (es raro y ocupa espacio).
  const opcionesFiltro: OpcionFiltro<FiltroProyecto>[] = [
    { key: 'todos', label: 'Todos', cantidad: total },
    ...PROYECTO_STATUS_ORDER.filter((status) => status !== 'cancelado' || conteos.cancelado > 0).map((status) => ({
      key: status,
      label: statusLabel(status),
      cantidad: conteos[status],
      tono: statusTone(status, colors),
      icon: iconoStatus(status),
    })),
  ];

  const encabezado = (
    <View style={styles.controles}>
      <MesEncabezado
        mes={mes}
        resumen={`${total} ${total === 1 ? 'proyecto' : 'proyectos'} en el mes`}
        cargando={cargando && !cargaInicial}
        onChange={setMes}
      />

      <TextField
        label="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Folio, cliente, técnico…"
        autoCapitalize="none"
        autoCorrect={false}
        leadingIcon={<Lupa color={colors.inkSubtle} />}
      />

      <FiltroChips opciones={opcionesFiltro} valor={filtro} onChange={setFiltro} />

      {error ? <InlineError message={error} /> : null}
    </View>
  );

  const vacioFiltrado = filtro !== 'todos' && total > 0;

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
            <ProyectosSkeletonList />
          </ScrollView>
        ) : (
          <SectionList
            style={styles.flex}
            sections={secciones}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={encabezado}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.lista}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section }) => (
              <SeccionEncabezado
                titulo={section.title}
                cantidad={section.data.length}
                tono={statusTone(section.key, colors)}
                icon={iconoStatus(section.key)}
              />
            )}
            renderItem={({ item, index }) => <ProyectoCard proyecto={item} onPress={abrirProyecto} indice={index} />}
            ListEmptyComponent={
              error ? null : (
                <EmptyState
                  icon={<SinElementos />}
                  title={
                    vacioFiltrado
                      ? `Sin proyectos «${statusLabel(filtro as ProyectoStatus).toLowerCase()}»`
                      : busqueda.trim()
                        ? 'Sin resultados'
                        : 'Sin proyectos este mes'
                  }
                  description={
                    vacioFiltrado
                      ? 'Toca «Todos» para ver el resto del mes.'
                      : busqueda.trim()
                        ? 'Prueba con otro folio, cliente o técnico.'
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
    </SafeAreaView>
  );
}
