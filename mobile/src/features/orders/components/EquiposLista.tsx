import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { EquipoInventarioItem } from '@/types/orden';
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
function Miniatura({ url }: { url: string }) {
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
    <View style={[styles.miniaturaWrap, { borderColor: colors.line }]}>
      <Image source={{ uri: url }} style={styles.miniatura} resizeMode="contain" />
    </View>
  );
}

function EquipoFila({ equipo }: { equipo: EquipoInventarioItem }) {
  const { colors } = useTheme();
  const detalle = [equipo.marca, equipo.modelo].filter(Boolean).join(' · ');
  return (
    <View style={styles.fila}>
      <Miniatura url={equipo.imagenUrl} />

      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
              {equipo.nombre || 'Equipo sin nombre'}
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
  if (equipos.length === 0) {
    return (
      <Text style={[styles.vacio, { color: colors.inkSubtle }]}>
        Aún no se han asignado equipos a esta orden.
      </Text>
    );
  }
  return (
    <View style={styles.lista}>
      {equipos.map((equipo, index) => (
        <React.Fragment key={equipo.lineaId}>
          {index > 0 ? (
            <View style={[styles.separador, { backgroundColor: colors.line }]} />
          ) : null}
          <EquipoFila equipo={equipo} />
        </React.Fragment>
      ))}
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
