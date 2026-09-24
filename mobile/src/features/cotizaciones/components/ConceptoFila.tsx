import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconBox, IconChevron, IconWrench } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { CotizacionItem } from '@/types/cotizacion';
import { esProducto, formatMoneda, importeLinea, precioUnitario } from '../cotizacionFormat';

interface Props {
  item: CotizacionItem;
  /** Con `onPress` la fila es tocable (formulario); sin él es de solo lectura. */
  onPress?: (item: CotizacionItem) => void;
  primera?: boolean;
}

function cantidadTexto(cantidad: number): string {
  return Number.isInteger(cantidad) ? String(cantidad) : cantidad.toFixed(2);
}

/**
 * Una línea de la cotización: imagen o icono, nombre, «cantidad × precio» y
 * el importe a la derecha. Etiquetas chicas para producto, descuento y
 * «sin IVA». La descripción larga se corta a dos líneas.
 */
function ConceptoFilaBase({ item, onPress, primera = false }: Props) {
  const { colors } = useTheme();
  const producto = esProducto(item);
  const importe = importeLinea(item);
  const pu = precioUnitario(item);
  const descripcion = (item.pdf_descripcion_corta || item.producto_descripcion).replace(/\s+/g, ' ').trim();

  const contenido = (
    <>
      <View style={[styles.miniatura, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.imagen} resizeMode="contain" />
        ) : producto ? (
          <IconBox color={colors.inkSubtle} size={18} />
        ) : (
          <IconWrench color={colors.inkSubtle} size={17} />
        )}
      </View>
      <View style={styles.textos}>
        <Text style={[styles.nombre, { color: item.producto_nombre ? colors.ink : colors.inkSubtle }]} numberOfLines={2}>
          {item.producto_nombre || 'Concepto sin nombre'}
        </Text>
        {descripcion ? (
          <Text style={[styles.descripcion, { color: colors.inkSubtle }]} numberOfLines={2}>
            {descripcion}
          </Text>
        ) : null}
        <View style={styles.etiquetas}>
          <Text style={[styles.cantidad, { color: colors.inkMuted }]}>
            {cantidadTexto(item.cantidad)} {item.unidad ? item.unidad.toLowerCase() : ''} × {formatMoneda(pu)}
          </Text>
          {producto ? <Etiqueta texto="Producto" bg={colors.primaryRing} fg={colors.primary} /> : null}
          {item.descuento_pct > 0 ? (
            <Etiqueta texto={`-${cantidadTexto(item.descuento_pct)}%`} bg={colors.statusResueltoBg} fg={colors.statusResueltoText} />
          ) : null}
          {item.sin_iva ? <Etiqueta texto="Sin IVA" bg={colors.surfaceSunken} fg={colors.inkMuted} /> : null}
        </View>
      </View>
      <View style={styles.derecha}>
        <Text style={[styles.importe, { color: colors.ink }]}>{formatMoneda(importe)}</Text>
        {onPress ? <IconChevron direction="right" color={colors.inkSubtle} size={13} /> : null}
      </View>
    </>
  );

  const estilo = [styles.fila, primera ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }];

  if (!onPress) {
    return (
      <View style={estilo} accessible accessibilityLabel={`${item.producto_nombre}, ${cantidadTexto(item.cantidad)} por ${formatMoneda(pu)}, importe ${formatMoneda(importe)}`}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.producto_nombre || 'Concepto sin nombre'}, importe ${formatMoneda(importe)}`}
      accessibilityHint="Edita el concepto"
      onPress={() => onPress(item)}
      style={({ pressed }) => [...estilo, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      {contenido}
    </Pressable>
  );
}

function Etiqueta({ texto, bg, fg }: { texto: string; bg: string; fg: string }) {
  return (
    <View style={[styles.etiqueta, { backgroundColor: bg }]}>
      <Text style={[styles.etiquetaTexto, { color: fg }]}>{texto}</Text>
    </View>
  );
}

export const ConceptoFila = memo(ConceptoFilaBase);

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  miniatura: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: { width: '100%', height: '100%' },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  nombre: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, letterSpacing: -0.1 },
  descripcion: { ...type.caption, fontSize: 12, lineHeight: 16 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 1 },
  cantidad: { ...type.mono, fontSize: 12 },
  etiqueta: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
  etiquetaTexto: { fontFamily: font.semibold, fontSize: 10 },
  derecha: { alignItems: 'flex-end', gap: 6 },
  importe: { fontFamily: font.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
});
