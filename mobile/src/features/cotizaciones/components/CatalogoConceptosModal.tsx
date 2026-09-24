import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { listConceptosCatalogo } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { IconWrench } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalFooter, ModalHeader, ModalPrimaryButton } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ConceptoCatalogo } from '@/types/cotizacion';
import { formatMoneda, IVA_MX } from '../cotizacionFormat';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (concepto: ConceptoCatalogo) => void;
  /** Concepto en blanco para capturar a mano. */
  onLibre: () => void;
}

/** Catálogo de conceptos (servicios con precio) para agregar a la cotización, o uno libre. */
export function CatalogoConceptosModal({ visible, onCerrar, onElegir, onLibre }: Props) {
  const { colors } = useTheme();
  const [conceptos, setConceptos] = useState<ConceptoCatalogo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [termino, setTermino] = useState('');

  useEffect(() => {
    if (!visible || conceptos) return;
    const control = new AbortController();
    setError(null);
    listConceptosCatalogo(control.signal)
      .then(setConceptos)
      .catch((e) => {
        if (!control.signal.aborted) setError(toUserMessage(e));
      });
    return () => control.abort();
  }, [visible, conceptos]);

  const filtrados = useMemo(() => {
    const t = termino.trim().toLowerCase();
    const lista = conceptos ?? [];
    return t ? lista.filter((c) => `${c.folio} ${c.concepto} ${c.descripcion}`.toLowerCase().includes(t)) : lista;
  }, [conceptos, termino]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow="Agregar concepto" titulo="Catálogo" onCerrar={onCerrar} />
        <View style={styles.buscador}>
          <TextField
            label="Buscar en el catálogo"
            value={termino}
            onChangeText={setTermino}
            placeholder="Instalación, cableado, mantenimiento…"
            autoCorrect={false}
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          initialNumToRender={12}
          ListEmptyComponent={
            !conceptos && !error ? (
              <ActivityIndicator color={colors.primary} style={styles.cargando} />
            ) : (
              <Text style={[styles.vacio, { color: error ? colors.danger : colors.inkSubtle }]}>
                {error ?? 'Nada en el catálogo con ese texto. Agrega un concepto libre.'}
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${item.concepto}, ${formatMoneda(item.precio * IVA_MX)} con IVA`}
              onPress={() => onElegir(item)}
              style={({ pressed }) => [
                styles.fila,
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
                pressed ? { backgroundColor: colors.surfaceSunken } : null,
              ]}
            >
              <View style={[styles.icono, { backgroundColor: colors.goldSoftBg }]}>
                <IconWrench color={colors.goldSoftText} size={16} />
              </View>
              <View style={styles.textos}>
                <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={2}>
                  {item.concepto}
                </Text>
                {item.descripcion ? (
                  <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                    {item.descripcion}
                  </Text>
                ) : null}
              </View>
              <View style={styles.precio}>
                <Text style={[styles.precioValor, { color: colors.ink }]}>{formatMoneda(item.precio * IVA_MX)}</Text>
                <Text style={[styles.detalle, { color: colors.inkSubtle }]}>con IVA</Text>
              </View>
            </Pressable>
          )}
        />
        <ModalFooter>
          <ModalPrimaryButton label="Agregar concepto libre" onPress={onLibre} />
        </ModalFooter>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buscador: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_TARGET + 12, paddingVertical: spacing.sm },
  icono: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  nombre: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
  detalle: { ...type.caption, fontSize: 11 },
  precio: { alignItems: 'flex-end' },
  precioValor: { fontFamily: font.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  cargando: { marginTop: spacing.xl },
  vacio: { ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});
