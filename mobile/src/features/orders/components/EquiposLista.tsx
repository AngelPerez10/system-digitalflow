import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { EquipoInventarioItem } from '@/types/orden';
import { agruparEquiposPorProducto } from '../ordenFormat';
import { IconBox } from './icons';

function Estado({ activo, texto }: { activo: boolean; texto: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.estado,
        { backgroundColor: activo ? colors.statusResueltoBg : colors.surfaceSunken },
      ]}
    >
      <Text
        style={[
          styles.estadoTexto,
          { color: activo ? colors.statusResueltoText : colors.inkSubtle },
        ]}
      >
        {texto}
      </Text>
    </View>
  );
}

/**
 * Miniatura del producto — `imagenUrl` es la foto que ya trae el ítem de
 * inventario (de SYSCOM, de TVC, o subida a mano al darlo de alta), copiada
 * a la línea de la orden al agregar el equipo. Sin imagen (ítems viejos o
 * dados de alta sin foto), un cuadro con el ícono de caja hace de relleno.
 *
 * El recuadro con imagen se queda en blanco fijo: las fotos de catálogo
 * (SYSCOM/TVC) vienen recortadas sobre blanco y sobre un fondo oscuro se
 * verían con un halo.
 */
function Miniatura({ url, nombre, onPress }: { url: string; nombre: string; onPress: () => void }) {
  const { colors } = useTheme();
  if (!url) {
    return (
      <View
        style={[
          styles.miniaturaVacia,
          { borderColor: colors.line, backgroundColor: colors.surfaceSunken },
        ]}
      >
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

function EquipoFila({ equipo, onVerFoto }: { equipo: EquipoInventarioItem; onVerFoto: (url: string) => void }) {
  const { colors } = useTheme();
  const detalle = [equipo.marca, equipo.modelo].filter(Boolean).join(' · ');
  const nombre = equipo.nombre || 'Equipo sin nombre';
  return (
    <View style={styles.fila}>
      <Miniatura url={equipo.imagenUrl} nombre={nombre} onPress={() => onVerFoto(equipo.imagenUrl)} />

      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
              {nombre}
            </Text>
            {detalle ? (
              <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                {detalle}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.cantidad, { color: colors.inkSubtle }]}>×{equipo.cantidad}</Text>
        </View>

        <View style={styles.estados}>
          <Estado activo={equipo.equipoEntregado} texto="Entregado" />
          <Estado activo={equipo.estadoInstalacion === 'instalado'} texto="Instalado" />
        </View>
      </View>
    </View>
  );
}

/**
 * Lista de equipos en lectura (detalle). La edición de instalación vive en
 * `EquiposOrdenEditor` dentro del formulario de campo.
 *
 * La tarjeta se muestra siempre, con aviso cuando la lista viene vacía.
 */
export function EquiposLista({ equipos }: { equipos: EquipoInventarioItem[] }) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();
  if (equipos.length === 0) {
    return (
      <Text style={[styles.vacio, { color: colors.inkSubtle }]}>
        Aún no se han asignado equipos a esta orden.
      </Text>
    );
  }
  const agrupados = agruparEquiposPorProducto(equipos);
  return (
    <View style={styles.lista}>
      {agrupados.map((equipo, index) => (
        <React.Fragment key={equipo.lineaIds.join(',')}>
          {index > 0 ? (
            <View style={[styles.separador, { backgroundColor: colors.line }]} />
          ) : null}
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
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // `flex: 1` no basta: un `Text` con `numberOfLines` dentro de una fila anidada varias
  // veces no se encoge por sí solo en RN/Yoga si el propio `Text` no declara
  // `flexShrink: 1` — sin esto, un nombre de producto largo (común en catálogos SYSCOM/TVC)
  // se salía de la tarjeta y de la pantalla en vez de truncarse con «…».
  textos: { flex: 1, flexShrink: 1, gap: 1 },
  nombre: { ...type.bodyMedium, flexShrink: 1 },
  detalle: { ...type.caption, flexShrink: 1 },
  cantidad: { ...type.mono, flexShrink: 0 },
  estados: { flexDirection: 'row', gap: spacing.xs },
  estado: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  estadoTexto: { ...type.caption, fontSize: 11, lineHeight: 14 },
  vacio: { ...type.body },
});
