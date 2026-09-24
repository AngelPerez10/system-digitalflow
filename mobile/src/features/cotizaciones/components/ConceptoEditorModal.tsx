import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconCheck } from '@/components/icons';
import { ModalFooter, ModalHeader, ModalPrimaryButton } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { CategoriaPartidas, CotizacionItem } from '@/types/cotizacion';
import { esProducto, formatMoneda, importeLinea, precioUnitario } from '../cotizacionFormat';

interface Props {
  item: CotizacionItem | null;
  /** Solo un admin puede marcar «sin IVA» en productos de catálogo (regla del backend). */
  esAdmin: boolean;
  /** Categorías de la cotización (se crean en la web); vacías = sin selector. */
  categorias: CategoriaPartidas[];
  onCerrar: () => void;
  onGuardar: (item: CotizacionItem) => void;
  onEliminar: (item: CotizacionItem) => void;
}

/** «1,5» o «1.5» → 1.5; vacío o inválido → `null`. */
function aNumero(texto: string): number | null {
  const limpio = texto.replace(',', '.').replace(/[^\d.]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function aTexto(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Edición de una línea a pantalla completa. Los números se capturan como
 * texto (para permitir «1.» a medio escribir) y el importe se recalcula en
 * vivo con la misma regla de IVA que el servidor.
 */
export function ConceptoEditorModal({ item, esAdmin, categorias, onCerrar, onGuardar, onEliminar }: Props) {
  const { colors } = useTheme();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('0');
  const [descuento, setDescuento] = useState('0');
  const [sinIva, setSinIva] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!item) return;
    setNombre(item.producto_nombre);
    setDescripcion(item.producto_descripcion);
    setUnidad(item.unidad);
    setCantidad(aTexto(item.cantidad));
    setPrecio(aTexto(item.precio_lista));
    setDescuento(aTexto(item.descuento_pct));
    setSinIva(item.sin_iva);
    setCategoria(item.categoria_id);
    setIntentado(false);
  }, [item]);

  if (!item) return null;

  const producto = esProducto(item);
  const cantidadN = aNumero(cantidad);
  const precioN = aNumero(precio);
  const descuentoN = aNumero(descuento) ?? 0;
  const errores = {
    nombre: !nombre.trim() ? 'Escribe el nombre del concepto.' : null,
    cantidad: cantidadN === null || cantidadN <= 0 ? 'La cantidad debe ser mayor a 0.' : null,
    precio: precioN === null ? 'Escribe un precio válido.' : null,
    descuento: descuentoN > 100 ? 'Máximo 100%.' : null,
  };
  const valido = !Object.values(errores).some(Boolean);
  const vista = {
    producto_externo_id: item.producto_externo_id,
    cantidad: cantidadN ?? 0,
    precio_lista: precioN ?? 0,
    descuento_pct: Math.min(100, descuentoN),
    sin_iva: sinIva,
  };
  const bloqueoSinIva = producto && !esAdmin;

  const guardar = () => {
    setIntentado(true);
    if (!valido) return;
    onGuardar({
      ...item,
      producto_nombre: nombre.trim(),
      producto_descripcion: descripcion,
      unidad: unidad.trim(),
      cantidad: vista.cantidad,
      precio_lista: vista.precio_lista,
      descuento_pct: vista.descuento_pct,
      sin_iva: sinIva,
      categoria_id: categoria,
    });
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.canvas }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader
          eyebrow={producto ? 'Producto de catálogo' : 'Concepto'}
          titulo={item.producto_nombre ? 'Editar concepto' : 'Nuevo concepto'}
          onCerrar={onCerrar}
          accion={{ icon: null, label: 'Quitar', onPress: () => onEliminar(item) }}
        />
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <TextField
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Instalación de cámara, cableado UTP…"
            maxLength={255}
            error={intentado ? errores.nombre : null}
          />
          <TextField
            label="Descripción"
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Detalle que verá el cliente en el PDF"
            multiline
          />
          <View style={styles.fila}>
            <View style={styles.celda}>
              <TextField
                label="Cantidad"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="decimal-pad"
                selectTextOnFocus
                error={intentado ? errores.cantidad : null}
              />
            </View>
            <View style={styles.celda}>
              <TextField label="Unidad" value={unidad} onChangeText={setUnidad} placeholder="Pieza, servicio…" maxLength={50} />
            </View>
          </View>
          <View style={styles.fila}>
            <View style={styles.celda}>
              <TextField
                label={producto ? 'Precio (con IVA)' : 'Precio (sin IVA)'}
                value={precio}
                onChangeText={setPrecio}
                keyboardType="decimal-pad"
                selectTextOnFocus
                error={intentado ? errores.precio : null}
              />
            </View>
            <View style={styles.celda}>
              <TextField
                label="Descuento %"
                value={descuento}
                onChangeText={setDescuento}
                keyboardType="decimal-pad"
                selectTextOnFocus
                error={errores.descuento}
              />
            </View>
          </View>

          {categorias.length > 0 ? (
            <View style={styles.categorias}>
              <Text style={[styles.categoriasLabel, { color: colors.inkMuted }]}>Categoría</Text>
              <View style={styles.categoriasChips}>
                {[{ id: '', nombre: 'Sin categoría' }, ...categorias].map((c) => {
                  const activa = categoria === c.id;
                  return (
                    <Pressable
                      key={c.id || 'ninguna'}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activa }}
                      accessibilityLabel={c.nombre}
                      onPress={() => setCategoria(c.id)}
                      style={({ pressed }) => [
                        styles.categoriaChip,
                        {
                          borderColor: activa ? colors.primary : colors.line,
                          backgroundColor: activa ? colors.primary : pressed ? colors.surfaceSunken : colors.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.categoriaTexto, { color: activa ? colors.onPrimary : colors.inkMuted }]}>{c.nombre}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: sinIva, disabled: bloqueoSinIva }}
            accessibilityLabel="Sin IVA"
            disabled={bloqueoSinIva}
            onPress={() => setSinIva((v) => !v)}
            style={({ pressed }) => [
              styles.check,
              {
                borderColor: sinIva ? colors.primary : colors.line,
                backgroundColor: sinIva ? colors.primaryRing : pressed ? colors.surfaceSunken : colors.surface,
                opacity: bloqueoSinIva ? 0.55 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.checkCaja,
                { borderColor: sinIva ? colors.primary : colors.lineStrong, backgroundColor: sinIva ? colors.primary : 'transparent' },
              ]}
            >
              {sinIva ? <IconCheck color={colors.onPrimary} size={12} /> : null}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.checkTitulo, { color: colors.ink }]}>Sin IVA</Text>
              <Text style={[styles.checkAyuda, { color: colors.inkSubtle }]}>
                {bloqueoSinIva
                  ? 'En productos de catálogo solo lo puede marcar un administrador.'
                  : producto
                    ? 'Le quita el 16% al precio del producto.'
                    : 'No se le suma el 16% a este concepto.'}
              </Text>
            </View>
          </Pressable>

          <View style={[styles.resumen, { backgroundColor: colors.surfaceSunken }]}>
            <View style={styles.resumenFila}>
              <Text style={[styles.resumenLabel, { color: colors.inkMuted }]}>Precio unitario final</Text>
              <Text style={[styles.resumenValor, { color: colors.ink }]}>{formatMoneda(precioUnitario(vista))}</Text>
            </View>
            <View style={styles.resumenFila}>
              <Text style={[styles.resumenLabel, { color: colors.ink, fontFamily: font.semibold }]}>Importe</Text>
              <Text style={[styles.importe, { color: colors.ink }]}>{formatMoneda(importeLinea(vista))}</Text>
            </View>
          </View>
        </ScrollView>
        <ModalFooter>
          <ModalPrimaryButton label="Guardar concepto" onPress={guardar} disabled={intentado && !valido} />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: spacing.lg, paddingBottom: spacing.xxl },
  fila: { flexDirection: 'row', gap: spacing.sm },
  celda: { flex: 1 },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkCaja: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkTitulo: { ...type.bodyMedium, fontFamily: font.semibold, fontSize: 14 },
  checkAyuda: { ...type.caption, fontSize: 12 },
  categorias: { gap: spacing.sm, marginBottom: spacing.lg },
  categoriasLabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.3 },
  categoriasChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoriaChip: { minHeight: 36, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, justifyContent: 'center' },
  categoriaTexto: { ...type.label, fontFamily: font.semibold, fontSize: 13 },
  resumen: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumenLabel: { ...type.caption },
  resumenValor: { ...type.mono, fontFamily: font.semibold },
  importe: { fontFamily: font.bold, fontSize: 20, fontVariant: ['tabular-nums'] },
});
