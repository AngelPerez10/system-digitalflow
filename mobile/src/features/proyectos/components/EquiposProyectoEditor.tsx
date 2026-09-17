import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVisorFotos } from '@/components/VisorFotos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { EquipoEstadoInstalacion, ProyectoEquipoLinea } from '@/types/proyecto';
import { agruparEquiposPorProducto } from '../proyectoFormat';
import { IconBox } from '@/features/orders/components/icons';

interface Props {
  equipos: ProyectoEquipoLinea[];
  disabled?: boolean;
  /**
   * Recibe todas las `lineaId` agrupadas de golpe (no una función por línea):
   * el formulario de campo guarda `equipos` con un `setForm` no funcional, así
   * que aplicar el cambio a varias líneas requiere un solo pase sobre el
   * arreglo — llamar el callback varias veces seguidas pisaría cambios entre sí.
   */
  onChangeGrupo: (lineaIds: string[], patch: Partial<ProyectoEquipoLinea>) => void;
}

const OPCIONES_INSTALACION: { value: EquipoEstadoInstalacion; label: string }[] = [
  { value: 'instalado', label: 'Instalado' },
  { value: 'no_instalado', label: 'No instalado' },
];

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

/**
 * Solo lectura: la entrega la confirma oficina/almacén, no el técnico en
 * campo (mismo candado que aplica el backend — ver `assert_tecnico_locked_fields`).
 * Se muestra siempre para que el técnico sepa si ya puede instalar.
 */
function EntregaPlaca({ entregado }: { entregado: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Entrega: ${entregado ? 'Entregado' : 'Pendiente'}`}
      style={[
        styles.entrega,
        {
          borderColor: entregado ? colors.statusResueltoText : colors.line,
          backgroundColor: entregado ? colors.statusResueltoBg : colors.surfaceSunken,
        },
      ]}
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
  value: EquipoEstadoInstalacion;
  disabled?: boolean;
  onChange: (estado: EquipoEstadoInstalacion) => void;
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
              pressed && !disabled ? { opacity: 0.85 } : null,
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
  disabled,
  onChange,
  onVerFoto,
}: {
  equipo: ProyectoEquipoLinea;
  disabled?: boolean;
  onChange: (patch: Partial<ProyectoEquipoLinea>) => void;
  onVerFoto: (url: string) => void;
}) {
  const { colors } = useTheme();
  const titulo = equipo.modelo || equipo.modeloOriginal || 'Equipo';
  const instalado = equipo.estadoInstalacion === 'instalado';

  return (
    <View style={styles.fila}>
      <View style={[styles.accento, { backgroundColor: instalado ? colors.primary : colors.statusPendienteText }]} />
      <View style={styles.cuerpo}>
        <View style={styles.filaSuperior}>
          <Miniatura url={equipo.imagenUrl} nombre={titulo} onPress={() => onVerFoto(equipo.imagenUrl ?? '')} />
          <View style={styles.textos}>
            <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: instalado ? colors.statusResueltoBg : colors.statusPendienteBg },
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
            {equipo.marca ? (
              <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                {equipo.marca}
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
            <InstalacionSegment
              value={equipo.estadoInstalacion}
              disabled={disabled || !equipo.equipoEntregado}
              onChange={(estadoInstalacion) => onChange({ estadoInstalacion })}
            />
            {!equipo.equipoEntregado ? (
              <Text style={[styles.avisoEntrega, { color: colors.inkSubtle }]}>
                Se puede instalar cuando oficina marque la entrega.
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Equipos del proyecto agrupados por cotización — el técnico marca
 * instalación; la entrega (oficina/almacén) y el catálogo/modelo se quedan
 * como solo lectura / tarea de oficina. No se puede instalar lo que no está
 * entregado.
 */
export function EquiposProyectoEditor({ equipos, disabled, onChangeGrupo }: Props) {
  const { colors } = useTheme();
  const { abrir, visor } = useVisorFotos();

  const grupos = useMemo(() => {
    const map = new Map<string, ProyectoEquipoLinea[]>();
    for (const equipo of equipos) {
      const key = equipo.cotizacionVinculoId ?? 'sin-cotizacion';
      const lista = map.get(key) ?? [];
      lista.push(equipo);
      map.set(key, lista);
    }
    return Array.from(map.entries());
  }, [equipos]);

  if (equipos.length === 0) {
    return (
      <View style={[styles.vacio, { borderColor: colors.line, backgroundColor: colors.surfaceSunken }]} accessibilityRole="text">
        <Text style={[styles.vacioTitulo, { color: colors.inkMuted }]}>Sin equipos registrados</Text>
        <Text style={[styles.vacioAyuda, { color: colors.inkSubtle }]}>
          Este proyecto no tiene equipos vinculados a una cotización.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grupos}>
      {grupos.map(([key, lista]) => {
        const primero = lista[0];
        const encabezado =
          key !== 'sin-cotizacion' && primero?.cotizacionFolio
            ? `Cotización ${primero.cotizacionOrden ?? ''} · ${primero.cotizacionFolio}`
            : 'Sin cotización vinculada';
        const productos = agruparEquiposPorProducto(lista);
        return (
          <View key={key} style={styles.grupo}>
            <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]}>{encabezado}</Text>
            <View style={styles.lista}>
              {productos.map((equipo, index) => (
                <React.Fragment key={equipo.lineaIds.join(',')}>
                  {index > 0 ? <View style={[styles.separador, { backgroundColor: colors.line }]} /> : null}
                  <EquipoFila
                    equipo={equipo}
                    disabled={disabled}
                    onChange={(patch) => onChangeGrupo(equipo.lineaIds, patch)}
                    onVerFoto={(url) => abrir([url], 0)}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        );
      })}
      {visor}
    </View>
  );
}

const MINIATURA = 52;

const styles = StyleSheet.create({
  grupos: { gap: spacing.lg },
  grupo: { gap: spacing.sm },
  grupoTitulo: {
    ...type.caption,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
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
  entregaLabel: { ...type.caption, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
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
  campoLabel: { ...type.caption, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  cantidadValor: { ...type.bodyMedium, fontVariant: ['tabular-nums'] },
  avisoEntrega: { ...type.caption, fontSize: 11, marginTop: 2 },
  segmento: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 2, gap: 2 },
  segmentoOpcion: {
    flex: 1,
    minHeight: TOUCH_TARGET - 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
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
});
