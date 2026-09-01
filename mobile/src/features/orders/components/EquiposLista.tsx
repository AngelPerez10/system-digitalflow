import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '@/theme/tokens';
import type { EquipoInventarioItem } from '@/types/orden';
import { IconBox } from './icons';

function Estado({ activo, texto }: { activo: boolean; texto: string }) {
  return (
    <View style={[styles.estado, activo ? styles.estadoActivo : styles.estadoInactivo]}>
      <Text style={[styles.estadoTexto, activo ? styles.estadoTextoActivo : styles.estadoTextoInactivo]}>
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
 */
function Miniatura({ url }: { url: string }) {
  if (!url) {
    return (
      <View style={styles.miniaturaVacia}>
        <IconBox color={colors.inkSubtle} size={18} />
      </View>
    );
  }
  return (
    <View style={styles.miniaturaWrap}>
      <Image source={{ uri: url }} style={styles.miniatura} resizeMode="contain" />
    </View>
  );
}

function EquipoFila({ equipo }: { equipo: EquipoInventarioItem }) {
  const detalle = [equipo.marca, equipo.modelo].filter(Boolean).join(' · ');
  return (
    <View style={styles.fila}>
      <Miniatura url={equipo.imagenUrl} />

      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <View style={styles.textos}>
            <Text style={styles.nombre} numberOfLines={2}>
              {equipo.nombre || 'Equipo sin nombre'}
            </Text>
            {detalle ? (
              <Text style={styles.detalle} numberOfLines={1}>
                {detalle}
              </Text>
            ) : null}
          </View>
          <Text style={styles.cantidad}>×{equipo.cantidad}</Text>
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
  if (equipos.length === 0) {
    return <Text style={styles.vacio}>Aún no se han asignado equipos a esta orden.</Text>;
  }
  return (
    <View style={styles.lista}>
      {equipos.map((equipo, index) => (
        <React.Fragment key={equipo.lineaId}>
          {index > 0 ? <View style={styles.separador} /> : null}
          <EquipoFila equipo={equipo} />
        </React.Fragment>
      ))}
    </View>
  );
}

const MINIATURA = 48;

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  separador: { height: 1, backgroundColor: colors.line },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  miniaturaWrap: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  miniatura: { width: '100%', height: '100%' },
  miniaturaVacia: {
    width: MINIATURA,
    height: MINIATURA,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSunken,
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
  nombre: { ...type.bodyMedium, color: colors.ink, flexShrink: 1 },
  detalle: { ...type.caption, color: colors.inkSubtle, flexShrink: 1 },
  cantidad: { ...type.mono, color: colors.inkSubtle, flexShrink: 0 },
  estados: { flexDirection: 'row', gap: spacing.xs },
  estado: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  estadoActivo: { backgroundColor: colors.statusResueltoBg },
  estadoInactivo: { backgroundColor: colors.surfaceSunken },
  estadoTexto: { ...type.caption, fontSize: 11, lineHeight: 14 },
  estadoTextoActivo: { color: colors.statusResueltoText },
  estadoTextoInactivo: { color: colors.inkSubtle },
  vacio: { ...type.body, color: colors.inkSubtle },
});
