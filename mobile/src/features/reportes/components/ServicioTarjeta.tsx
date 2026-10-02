import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { DatosAvance, DatosPersonas, DatosRejilla, HojaDatos } from '@/components/DetalleChrome';
import { IconBox, IconCalendar, IconClipboard, IconPerson } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/tokens';
import type { Reporte } from '@/types/reporte';
import { formatFecha } from '@/utils/fecha';
import { diaSemana, estadoEvidencia, estadoTone, evidenciaDe, tecnicosDe } from '../reporteFormat';

/** Avatar de iniciales (los reportes guardan solo el nombre del técnico, sin foto). */
function Iniciales({ nombre, fondo }: { nombre: string; fondo: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: fondo }]}>
      <Text style={[styles.avatarTexto, { color: colors.onNavy }]}>{inicialesUsuarioDisplay(nombre, '?')}</Text>
    </View>
  );
}

/**
 * «Datos del servicio» del reporte: fecha (con día de la semana) y proyecto en
 * la rejilla, los técnicos y, al pie, el avance de la evidencia por zonas.
 * Arma la hoja con las piezas compartidas de `DetalleChrome`.
 */
export function ServicioTarjeta({ reporte }: { reporte: Reporte }) {
  const { colors } = useTheme();
  const ev = evidenciaDe(reporte);
  const estado = estadoEvidencia(reporte);
  const tecnicos = tecnicosDe(reporte.tecnico_nombre);
  const esProyecto = reporte.origen_tipo === 'proyecto';
  const dia = diaSemana(reporte.fecha_servicio);

  return (
    <HojaDatos titulo="Datos del servicio">
      <DatosRejilla
        celdas={[
          {
            key: 'fecha',
            icon: <IconCalendar color={colors.primary} size={12} />,
            label: 'Fecha',
            valor: formatFecha(reporte.fecha_servicio),
            secundario: dia ? dia.charAt(0).toUpperCase() + dia.slice(1) : null,
          },
          {
            key: 'origen',
            icon: esProyecto ? <IconBox color={colors.primary} size={12} /> : <IconClipboard color={colors.primary} size={12} />,
            label: esProyecto ? 'Proyecto' : 'Orden',
            valor: reporte.orden_folio ?? 'Sin folio',
            secundario: reporte.orden_cliente,
            mono: true,
          },
        ]}
      />
      <DatosPersonas
        etiqueta={tecnicos.length > 1 ? 'Técnicos' : 'Técnico'}
        icon={<IconPerson color={colors.primary} size={12} />}
        vacio="Sin técnico registrado"
        personas={tecnicos.map((nombre, i) => ({
          nombre,
          avatar: <Iniciales nombre={nombre} fondo={i % 2 === 0 ? colors.navy : colors.primary} />,
        }))}
      />
      <DatosAvance
        label="Evidencia"
        valor={ev.zonas > 0 ? `${ev.completas} de ${ev.zonas} zonas completas` : 'Sin zonas'}
        fraccion={ev.zonas > 0 ? ev.completas / ev.zonas : 0}
        color={estadoTone(estado, colors).text}
        completo={estado === 'completa'}
      />
    </HojaDatos>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: font.semibold, fontSize: 11 },
});
