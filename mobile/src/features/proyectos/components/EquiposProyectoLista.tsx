import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { ProyectoEquipoLinea } from '@/types/proyecto';
import { agruparEquiposPorProducto } from '../proyectoFormat';
import { IconAlerta, IconBox } from '@/features/orders/components/icons';

/** Píldora de estado — el texto cambia con el estado, no solo el color: un
 *  "Entregado" atenuado todavía dice "Entregado" y se presta a confusión. */
function Estado({ tono, texto }: { tono: { bg: string; text: string }; texto: string }) {
  return (
    <View style={[styles.estado, { backgroundColor: tono.bg }]}>
      <Text style={[styles.estadoTexto, { color: tono.text }]}>{texto}</Text>
    </View>
  );
}

function Miniatura({
  url,
  nombre,
  onPress,
}: {
  url?: string;
  nombre: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  if (!url) {
    return (
      <View style={[styles.miniaturaVacia, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}>
        <IconBox color={colors.inkSubtle} size={18} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`Ver foto de ${nombre} en grande`}
      onPress={onPress}
      style={[styles.miniaturaWrap, { borderColor: colors.line }]}
    >
      <Image source={{ uri: url }} style={styles.miniatura} resizeMode="contain" />
    </Pressable>
  );
}

function EquipoFila({ equipo, onVerFoto }: { equipo: ProyectoEquipoLinea; onVerFoto: (url: string) => void }) {
  const { colors } = useTheme();
  const instalado = equipo.estadoInstalacion === 'instalado';
  const nombre = equipo.modelo || equipo.modeloOriginal || 'Equipo';

  return (
    <View style={styles.fila}>
      <Miniatura url={equipo.imagenUrl} nombre={nombre} onPress={() => onVerFoto(equipo.imagenUrl ?? '')} />
      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
              {nombre}
            </Text>
            {equipo.marca ? (
              <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                {equipo.marca}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.cantidad, { color: colors.inkSubtle }]}>×{equipo.cantidad}</Text>
        </View>

        {equipo.equipoEntregado ? (
          <View style={styles.estados}>
            <Estado tono={{ bg: colors.statusResueltoBg, text: colors.statusResueltoText }} texto="Entregado" />
            <Estado
              tono={
                instalado
                  ? { bg: colors.statusResueltoBg, text: colors.statusResueltoText }
                  : { bg: colors.statusPendienteBg, text: colors.statusPendienteText }
              }
              texto={instalado ? 'Instalado' : 'No instalado'}
            />
          </View>
        ) : (
          <View style={[styles.avisoNoEntregado, { backgroundColor: colors.dangerBg, borderColor: colors.dangerLine }]}>
            <IconAlerta color={colors.danger} size={12} />
            <Text style={[styles.avisoNoEntregadoTexto, { color: colors.danger }]}>Producto no entregado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Lista de equipos en lectura (resumen). La edición vive en `EquiposProyectoEditor`. */
export function EquiposProyectoLista({ equipos }: { equipos: ProyectoEquipoLinea[] }) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();
  if (equipos.length === 0) {
    return (
      <Text style={[styles.vacio, { color: colors.inkSubtle }]}>
        Aún no se han asignado equipos a este proyecto.
      </Text>
    );
  }
  const agrupados = agruparEquiposPorProducto(equipos);
  return (
    <View style={styles.lista}>
      {agrupados.map((equipo, index) => (
        <React.Fragment key={equipo.lineaIds.join(',')}>
          {index > 0 ? <View style={[styles.separador, { backgroundColor: colors.line }]} /> : null}
          <EquipoFila equipo={equipo} onVerFoto={(url) => abrir([url], 0)} />
        </React.Fragment>
      ))}
      {visor}
    </View>
  );
}

const MINIATURA = 48;

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  separador: { height: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  miniaturaWrap: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  miniatura: { width: '100%', height: '100%' },
  miniaturaVacia: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: { flex: 1, flexShrink: 1, gap: spacing.sm },
  filaSuperior: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  textos: { flex: 1, flexShrink: 1, gap: 1 },
  nombre: { ...type.bodyMedium, flexShrink: 1 },
  detalle: { ...type.caption, flexShrink: 1 },
  cantidad: { ...type.mono, flexShrink: 0 },
  estados: { flexDirection: 'row', gap: spacing.xs },
  estado: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  estadoTexto: { ...type.caption, fontSize: 11, lineHeight: 14 },
  avisoNoEntregado: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  avisoNoEntregadoTexto: { ...type.caption, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  vacio: { ...type.body },
});
