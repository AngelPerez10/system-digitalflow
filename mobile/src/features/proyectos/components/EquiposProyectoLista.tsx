import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, type } from '@/theme/tokens';
import type { ProyectoEquipoLinea } from '@/types/proyecto';
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

function Miniatura({ url }: { url?: string }) {
  const { colors } = useTheme();
  if (!url) {
    return (
      <View style={[styles.miniaturaVacia, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}>
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

function EquipoFila({ equipo }: { equipo: ProyectoEquipoLinea }) {
  const { colors } = useTheme();
  const instalado = equipo.estadoInstalacion === 'instalado';

  return (
    <View style={styles.fila}>
      <Miniatura url={equipo.imagenUrl} />
      <View style={styles.contenido}>
        <View style={styles.filaSuperior}>
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
              {equipo.modelo || equipo.modeloOriginal || 'Equipo'}
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
  if (equipos.length === 0) {
    return (
      <Text style={[styles.vacio, { color: colors.inkSubtle }]}>
        Aún no se han asignado equipos a este proyecto.
      </Text>
    );
  }
  return (
    <View style={styles.lista}>
      {equipos.map((equipo, index) => (
        <React.Fragment key={equipo.lineaId}>
          {index > 0 ? <View style={[styles.separador, { backgroundColor: colors.line }]} /> : null}
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
