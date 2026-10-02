import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DatoEtiqueta } from '@/components/DetalleChrome';
import { IconCalendar, IconEtiqueta, IconPerson, IconPin, IconVisto, IconWrench } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing } from '@/theme/tokens';
import type { Proyecto } from '@/types/proyecto';
import { formatFecha } from '@/utils/fecha';
import { proyectoTieneTipoAlarmas } from '../proyectoFormat';

interface Celda {
  key: string;
  icon: React.ReactNode;
  label: string;
  contenido: React.ReactNode;
  /** Textos largos ocupan las dos columnas. */
  ancha?: boolean;
  accesible: string;
}

/**
 * «Detalles» como ficha técnica: celdas en dos columnas separadas por líneas
 * de 1 px (sin cajas), cada una con ícono + versalitas y el valor. El tipo de
 * trabajo va en píldoras y el monitoreo (solo Alarmas) como estado con color;
 * vehículo y herramientas, si existen, ocupan el ancho completo.
 */
export function DetallesProyecto({ proyecto }: { proyecto: Proyecto }) {
  const { colors } = useTheme();
  const vacio = (texto: string) => <Text style={[styles.valor, { color: colors.inkSubtle }]}>{texto}</Text>;
  const valor = (texto: string) => (
    <Text style={[styles.valor, { color: colors.ink }]} numberOfLines={3}>
      {texto}
    </Text>
  );

  const monitoreo =
    proyecto.monitoreo === true
      ? { texto: 'Sí cuenta', bg: colors.statusResueltoBg, fg: colors.statusResueltoText }
      : proyecto.monitoreo === false
        ? { texto: 'No cuenta', bg: colors.surfaceSunken, fg: colors.inkMuted }
        : { texto: 'Pendiente', bg: colors.statusPendienteBg, fg: colors.statusPendienteText };

  const celdas: Celda[] = [
    {
      key: 'tipo',
      icon: <IconEtiqueta color={colors.primary} size={12} />,
      label: proyecto.tipos_trabajo.length > 1 ? 'Tipos de trabajo' : 'Tipo de trabajo',
      ancha: true,
      accesible: proyecto.tipos_trabajo.map((t) => t.nombre).join(', ') || 'Sin tipo',
      contenido: proyecto.tipos_trabajo.length ? (
        <View style={styles.pildoras}>
          {proyecto.tipos_trabajo.map((t) => (
            <View key={t.id} style={[styles.pildora, { backgroundColor: colors.primaryRing }]}>
              <Text style={[styles.pildoraTexto, { color: colors.primary }]}>{t.nombre}</Text>
            </View>
          ))}
        </View>
      ) : (
        vacio('Sin tipo')
      ),
    },
    ...(proyectoTieneTipoAlarmas(proyecto.tipos_trabajo)
      ? [
          {
            key: 'monitoreo',
            icon: <IconVisto color={colors.primary} size={12} />,
            label: 'Monitoreo',
            accesible: monitoreo.texto,
            contenido: (
              <View style={[styles.estado, { backgroundColor: monitoreo.bg }]}>
                <View style={[styles.estadoPunto, { backgroundColor: monitoreo.fg }]} />
                <Text style={[styles.estadoTexto, { color: monitoreo.fg }]}>{monitoreo.texto}</Text>
              </View>
            ),
          },
        ]
      : []),
    {
      key: 'autorizado',
      icon: <IconCalendar color={colors.primary} size={12} />,
      label: 'Autorizado',
      accesible: proyecto.fecha_autorizacion ? formatFecha(proyecto.fecha_autorizacion) : 'Sin fecha',
      contenido: proyecto.fecha_autorizacion ? valor(formatFecha(proyecto.fecha_autorizacion)) : vacio('Sin fecha'),
    },
    {
      key: 'autorizo',
      icon: <IconPerson color={colors.primary} size={12} />,
      label: 'Autorizó',
      accesible: proyecto.quien_autorizo?.trim() || 'Sin dato',
      contenido: proyecto.quien_autorizo?.trim() ? valor(proyecto.quien_autorizo.trim()) : vacio('Sin dato'),
    },
    ...(proyecto.vehiculo_asignado
      ? [{ key: 'vehiculo', icon: <IconPin color={colors.primary} size={12} />, label: 'Vehículo', ancha: true, accesible: proyecto.vehiculo_asignado, contenido: valor(proyecto.vehiculo_asignado) }]
      : []),
    ...(proyecto.herramientas_generales
      ? [{ key: 'herramientas', icon: <IconWrench color={colors.primary} size={12} />, label: 'Herramientas', ancha: true, accesible: proyecto.herramientas_generales, contenido: valor(proyecto.herramientas_generales) }]
      : []),
  ];

  // Filas: una celda ancha sola; las angostas se emparejan.
  const filas: Celda[][] = [];
  for (const c of celdas) {
    const ultima = filas[filas.length - 1];
    if (!c.ancha && ultima && ultima.length === 1 && !ultima[0]!.ancha) ultima.push(c);
    else filas.push([c]);
  }

  return (
    <View>
      {filas.map((fila, i) => (
        <View key={fila.map((c) => c.key).join('-')} style={[styles.fila, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null]}>
          {fila.map((c, j) => (
            <React.Fragment key={c.key}>
              {j > 0 ? <View style={[styles.divisorV, { backgroundColor: colors.line }]} /> : null}
              <View style={styles.celda} accessible accessibilityLabel={`${c.label}: ${c.accesible}`}>
                <DatoEtiqueta icon={c.icon} texto={c.label} />
                {c.contenido}
              </View>
            </React.Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', paddingVertical: spacing.md },
  celda: { flex: 1, minWidth: 0, gap: 6 },
  divisorV: { width: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  valor: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pildora: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pildoraTexto: { fontFamily: font.semibold, fontSize: 12 },
  estado: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  estadoPunto: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { fontFamily: font.semibold, fontSize: 12 },
});
