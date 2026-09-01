import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { EquipoInventarioItem, EstadoInstalacionEquipo } from '@/types/orden';
import { IconBox } from './icons';

interface Props {
  equipos: EquipoInventarioItem[];
  canMarkInstalacion: boolean;
  disabled?: boolean;
  onChangeInstalacion: (lineaId: string, estado: EstadoInstalacionEquipo) => void;
}

const OPCIONES_INSTALACION: { value: EstadoInstalacionEquipo; label: string }[] = [
  { value: 'instalado', label: 'Instalado' },
  { value: 'no_instalado', label: 'No instalado' },
];

function Miniatura({ url }: { url: string }) {
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

function EntregaPlaca({ entregado }: { entregado: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.entrega,
        {
          borderColor: entregado ? colors.statusResueltoText : colors.line,
          backgroundColor: entregado ? colors.statusResueltoBg : colors.surfaceSunken,
        },
      ]}
      accessibilityLabel={`Entrega: ${entregado ? 'Entregado' : 'Pendiente'}`}
    >
      <Text style={[styles.entregaLabel, { color: colors.inkSubtle }]}>Entrega</Text>
      <Text style={[styles.entregaValor, { color: colors.ink }]}>
        {entregado ? 'Entregado' : 'Pendiente'}
      </Text>
    </View>
  );
}

function InstalacionSegment({
  value,
  disabled,
  onChange,
}: {
  value: EstadoInstalacionEquipo;
  disabled?: boolean;
  onChange: (estado: EstadoInstalacionEquipo) => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.segmento, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Estado de instalación"
    >
      {OPCIONES_INSTALACION.map((opt) => {
        const activo = value === opt.value;
        const fondo = activo
          ? opt.value === 'instalado'
            ? colors.statusResueltoBg
            : colors.statusPendienteBg
          : 'transparent';
        const texto = activo
          ? opt.value === 'instalado'
            ? colors.statusResueltoText
            : colors.statusPendienteText
          : colors.inkMuted;

        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, disabled: Boolean(disabled) }}
            accessibilityLabel={opt.label}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segmentoOpcion,
              { backgroundColor: fondo },
              pressed && !disabled ? styles.segmentoPressed : null,
              disabled ? styles.segmentoInactivo : null,
            ]}
          >
            <Text style={[styles.segmentoTexto, { color: texto }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EquipoFila({
  equipo,
  canMarkInstalacion,
  disabled,
  onChangeInstalacion,
}: {
  equipo: EquipoInventarioItem;
  canMarkInstalacion: boolean;
  disabled?: boolean;
  onChangeInstalacion: (estado: EstadoInstalacionEquipo) => void;
}) {
  const { colors } = useTheme();
  const titulo = equipo.nombre || equipo.modelo || 'Equipo';
  const detalle = [equipo.marca, equipo.modelo].filter(Boolean).join(' · ');
  const instalado = equipo.estadoInstalacion === 'instalado';

  return (
    <View style={styles.fila}>
      <View style={[styles.accento, { backgroundColor: instalado ? colors.primary : colors.statusPendienteText }]} />
      <View style={styles.cuerpo}>
        <View style={styles.filaSuperior}>
          <Miniatura url={equipo.imagenUrl} />
          <View style={styles.textos}>
            <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: instalado ? colors.statusResueltoBg : colors.statusPendienteBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeTexto,
                    { color: instalado ? colors.statusResueltoText : colors.statusPendienteText },
                  ]}
                >
                  {instalado ? 'Instalado' : 'No instalado'}
                </Text>
              </View>
            </View>
            <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
              {titulo}
            </Text>
            {detalle ? (
              <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                {detalle}
              </Text>
            ) : null}
          </View>
          <EntregaPlaca entregado={equipo.equipoEntregado} />
        </View>

        <View style={[styles.pie, { borderTopColor: colors.line }]}>
          <View style={styles.cantidadCol}>
            <Text style={[styles.campoLabel, { color: colors.inkSubtle }]}>Cantidad</Text>
            <Text style={[styles.cantidadValor, { color: colors.ink }]}>{equipo.cantidad}</Text>
          </View>
          <View style={styles.instalacionCol}>
            <Text style={[styles.campoLabel, { color: colors.inkSubtle }]}>Instalación</Text>
            {canMarkInstalacion ? (
              <InstalacionSegment
                value={equipo.estadoInstalacion}
                disabled={disabled}
                onChange={onChangeInstalacion}
              />
            ) : (
              <Text style={[styles.soloLectura, { color: colors.inkMuted }]}>
                {instalado ? 'Instalado' : 'No instalado'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Equipos de inventario en edición de campo — entrega en lectura, instalación
 * editable para el técnico asignado (misma regla que el ERP).
 */
export function EquiposOrdenEditor({ equipos, canMarkInstalacion, disabled, onChangeInstalacion }: Props) {
  const { colors } = useTheme();

  if (equipos.length === 0) {
    return (
      <View
        style={[styles.vacio, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]}
        accessibilityRole="text"
      >
        <Text style={[styles.vacioTitulo, { color: colors.inkMuted }]}>Sin equipos registrados</Text>
        <Text style={[styles.vacioAyuda, { color: colors.inkSubtle }]}>
          Esta orden no tiene equipos de inventario.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.lista}>
      {equipos.map((equipo, index) => (
        <React.Fragment key={equipo.lineaId}>
          {index > 0 ? <View style={[styles.separador, { backgroundColor: colors.line }]} /> : null}
          <EquipoFila
            equipo={equipo}
            canMarkInstalacion={canMarkInstalacion}
            disabled={disabled}
            onChangeInstalacion={(estado) => onChangeInstalacion(equipo.lineaId, estado)}
          />
        </React.Fragment>
      ))}
      {!canMarkInstalacion ? (
        <Text style={[styles.aviso, { color: colors.inkSubtle }]} accessibilityRole="text">
          Solo puedes consultar el estado de los equipos en esta orden.
        </Text>
      ) : null}
    </View>
  );
}

const MINIATURA = 52;

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  separador: { height: StyleSheet.hairlineWidth },
  fila: { flexDirection: 'row', alignItems: 'stretch' },
  accento: { width: 3, borderRadius: 2, marginRight: spacing.sm },
  cuerpo: { flex: 1, gap: spacing.md },
  filaSuperior: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
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
  textos: { flex: 1, flexShrink: 1, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeTexto: { ...type.caption, fontSize: 10, fontWeight: '600' },
  nombre: { ...type.bodyMedium, flexShrink: 1 },
  detalle: { ...type.caption, flexShrink: 1 },
  entrega: {
    minWidth: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 1,
  },
  entregaLabel: {
    ...type.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  entregaValor: { ...type.caption, fontWeight: '600' },
  pie: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  cantidadCol: { minWidth: 72, gap: 4 },
  instalacionCol: { flex: 1, minWidth: 180, gap: 4 },
  campoLabel: {
    ...type.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cantidadValor: { ...type.bodyMedium, fontVariant: ['tabular-nums'] },
  soloLectura: { ...type.bodyMedium },
  segmento: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  segmentoOpcion: {
    flex: 1,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentoPressed: { opacity: 0.85 },
  segmentoInactivo: { opacity: 0.45 },
  segmentoTexto: { ...type.caption, fontWeight: '600', textAlign: 'center' },
  vacio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  vacioTitulo: { ...type.bodyMedium, textAlign: 'center' },
  vacioAyuda: { ...type.caption, textAlign: 'center' },
  aviso: { ...type.caption, textAlign: 'center' },
});
