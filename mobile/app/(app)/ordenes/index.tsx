import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
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
import type { FiltroStatus } from '@/features/orders/agrupar';
import { IconClock, IconPause, IconVisto } from '@/features/orders/components/icons';
import { OrdenCard } from '@/features/orders/components/OrdenCard';
import { OrdenesSkeletonList } from '@/features/orders/components/OrdenCardSkeleton';
import { PoolAccesoCard } from '@/features/orders/components/PoolAccesoCard';
import { statusLabel, statusTone } from '@/features/orders/ordenFormat';
import { useOrdenes } from '@/features/orders/useOrdenes';
import { usePush } from '@/notifications/PushProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { ORDEN_STATUSES, type OrdenListItem, type OrdenStatus } from '@/types/orden';

const ICONO_STATUS: Record<OrdenStatus, (color: string) => React.ReactNode> = {
  pendiente: (color) => <IconClock color={color} size={13} />,
  pausado: (color) => <IconPause color={color} size={12} />,
  resuelto: (color) => <IconVisto color={color} size={13} />,
};

/**
 * Listado del técnico: banda marina con el saludo y, encima, la hoja con el
 * mes como encabezado, acceso a disponibles, búsqueda, filtro de estatus y las
 * órdenes agrupadas por estatus.
 */
export default function OrdenesScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const { disponiblesSinVer } = usePush();
  const {
    mes, setMes, busqueda, setBusqueda, filtro, setFiltro, secciones, total, conteos,
    cargando, refrescando, error, recargar,
  } = useOrdenes();

  const abrirOrden = useCallback(
    (orden: OrdenListItem) => router.push(`/ordenes/${orden.id}`),
    [router],
  );

  const cargaInicial = cargando && total === 0 && !error;
  const opcionesFiltro: OpcionFiltro<FiltroStatus>[] = [
    { key: 'todas', label: 'Todas', cantidad: total },
    ...ORDEN_STATUSES.map((status) => ({
      key: status,
      label: `${statusLabel(status)}s`,
      cantidad: conteos[status],
      tono: statusTone(status, colors),
      icon: ICONO_STATUS[status],
    })),
  ];

  const encabezado = (
    <View style={styles.controles}>
      <MesEncabezado
        mes={mes}
        resumen={`${total} ${total === 1 ? 'orden asignada' : 'órdenes asignadas'}`}
        cargando={cargando && !cargaInicial}
        onChange={setMes}
      />

      <PoolAccesoCard nuevas={disponiblesSinVer} onPress={() => router.push('/ordenes/pool')} />

      <TextField
        label="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Folio, cliente, dirección…"
        autoCapitalize="none"
        autoCorrect={false}
        leadingIcon={<Lupa color={colors.inkSubtle} />}
      />

      <FiltroChips opciones={opcionesFiltro} valor={filtro} onChange={setFiltro} />

      {error ? <InlineError message={error} /> : null}
    </View>
  );

  const vacioFiltrado = filtro !== 'todas' && total > 0;

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
            <OrdenesSkeletonList />
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
                icon={ICONO_STATUS[section.key]}
              />
            )}
            renderItem={({ item }) => <OrdenCard orden={item} onPress={abrirOrden} />}
            ListEmptyComponent={
              error ? null : (
                <EmptyState
                  icon={<SinElementos />}
                  title={
                    vacioFiltrado
                      ? `Sin órdenes ${statusLabel(filtro as OrdenStatus).toLowerCase()}s`
                      : busqueda.trim()
                        ? 'Sin resultados'
                        : 'Sin órdenes este mes'
                  }
                  description={
                    vacioFiltrado
                      ? 'Toca «Todas» para ver el resto del mes.'
                      : busqueda.trim()
                        ? 'Prueba con otro folio, cliente o dirección.'
                        : 'Cambia de mes o desliza hacia abajo para actualizar.'
                  }
                />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={recargar}
                colors={[colors.navy]}
                tintColor={colors.navy}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
