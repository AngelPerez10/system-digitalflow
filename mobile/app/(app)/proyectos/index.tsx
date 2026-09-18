import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nombreUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { BarraCarga } from '@/components/BarraCarga';
import { EmptyState, InlineError } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { MesSelector } from '@/components/MesSelector';
import { ProyectoCard } from '@/features/proyectos/components/ProyectoCard';
import { ProyectoEstadoConteo } from '@/features/proyectos/components/ProyectoEstadoConteo';
import { ProyectosSkeletonList } from '@/features/proyectos/components/ProyectoCardSkeleton';
import { ProyectosHero } from '@/features/proyectos/components/ProyectosHero';
import { statusSolid } from '@/features/proyectos/proyectoFormat';
import { useProyectos } from '@/features/proyectos/useProyectos';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, type } from '@/theme/tokens';
import type { ProyectoListItem } from '@/types/proyecto';

function Lupa({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={1.8} />
      <Line x1={15.3} y1={15.3} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SinProyectos({ line, inkSubtle }: { line: string; inkSubtle: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Circle cx={28} cy={28} r={19} stroke={line} strokeWidth={1.8} strokeDasharray="1 7" strokeLinecap="round" />
      <Circle cx={28} cy={28} r={3.5} fill={inkSubtle} />
    </Svg>
  );
}

export default function ProyectosScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { colors, scheme } = useTheme();
  const { mes, setMes, busqueda, setBusqueda, secciones, total, cargando, refrescando, error, recargar } =
    useProyectos();

  const abrirProyecto = useCallback(
    (proyecto: ProyectoListItem) => router.push(`/proyectos/${proyecto.id}` as Href),
    [router],
  );

  const cargaInicial = cargando && total === 0 && !error;

  const buscador = (
    <View style={styles.controles}>
      <View style={styles.buscadorFila}>
        <TextField
          label="Buscar"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Folio, cliente, técnico…"
          autoCapitalize="none"
          autoCorrect={false}
          leadingIcon={<Lupa color={colors.inkSubtle} />}
        />
      </View>
      {error ? <InlineError message={error} /> : null}
    </View>
  );

  // Paginación al final: después de ver los proyectos del mes, no antes.
  const pie = (
    <View style={styles.pie}>
      <MesSelector mes={mes} onChange={setMes} cargando={cargando && !cargaInicial} />
    </View>
  );

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
      <View style={{ backgroundColor: colors.navy }}>
        <BarraCarga visible={!cargaInicial && (cargando || refrescando)} />
      </View>

      <ProyectosHero nombre={nombreUsuarioDisplay(user)} mes={mes} />

      <View style={[styles.hoja, hoja]}>
        {cargaInicial ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.lista}>
            {buscador}
            <ProyectosSkeletonList />
            {pie}
          </ScrollView>
        ) : (
          <SectionList
            style={styles.flex}
            sections={secciones}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={buscador}
            ListFooterComponent={pie}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.lista}
            renderSectionHeader={({ section }) => (
              <View style={styles.seccionRow}>
                <View style={styles.seccionTitulo}>
                  <View style={[styles.seccionPunto, { backgroundColor: statusSolid(section.key, colors).bg }]} />
                  <Text style={[styles.seccion, { color: colors.ink }]}>{section.title}</Text>
                </View>
                <ProyectoEstadoConteo status={section.key} count={section.data.length} />
              </View>
            )}
            renderItem={({ item }) => <ProyectoCard proyecto={item} onPress={abrirProyecto} />}
            ListEmptyComponent={
              error ? null : (
                <EmptyState
                  icon={<SinProyectos line={colors.line} inkSubtle={colors.inkSubtle} />}
                  title="Sin proyectos este mes"
                  description="Cambia de mes o desliza hacia abajo para actualizar."
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hoja: { flex: 1, marginTop: -20, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  lista: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  controles: { gap: spacing.md, marginBottom: spacing.sm },
  buscadorFila: { gap: spacing.xs },
  totalTexto: { ...type.caption, fontSize: 11, paddingHorizontal: 2 },
  pie: { marginTop: spacing.lg },
  seccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  seccionTitulo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seccionPunto: { width: 7, height: 7, borderRadius: 4 },
  seccion: { ...type.label, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
});
