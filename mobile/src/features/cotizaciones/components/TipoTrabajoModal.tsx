import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { IconCheck } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalFooter, ModalHeader, ModalPrimaryButton } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ServicioOpcion } from '@/types/cotizacion';

interface Props {
  visible: boolean;
  servicios: ServicioOpcion[];
  seleccion: number[];
  onCerrar: () => void;
  onListo: (ids: number[]) => void;
}

/**
 * Tipo de trabajo como lista con casillas y buscador, a pantalla completa:
 * con muchos servicios, los chips amontonados en el formulario no se leían.
 * Los elegidos se muestran primero; «Listo» aplica la selección.
 */
export function TipoTrabajoModal({ visible, servicios, seleccion, onCerrar, onListo }: Props) {
  const { colors } = useTheme();
  const [elegidos, setElegidos] = useState<number[]>(seleccion);
  const [termino, setTermino] = useState('');

  useEffect(() => {
    if (!visible) return;
    setElegidos(seleccion);
    setTermino('');
  }, [visible, seleccion]);

  // Orden fijo al abrir (elegidos arriba) para que la lista no salte al marcar.
  const ordenados = useMemo(
    () => [...servicios].sort((a, b) => Number(seleccion.includes(b.id)) - Number(seleccion.includes(a.id))),
    [servicios, seleccion],
  );
  const visibles = useMemo(() => {
    const t = termino.trim().toLowerCase();
    return t ? ordenados.filter((s) => s.nombre.toLowerCase().includes(t)) : ordenados;
  }, [ordenados, termino]);

  const alternar = (id: number) =>
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader
          eyebrow="Clasificación"
          titulo="Tipo de trabajo"
          onCerrar={onCerrar}
          accion={elegidos.length ? { icon: null, label: 'Limpiar', onPress: () => setElegidos([]) } : undefined}
        />
        <View style={styles.buscador}>
          <TextField
            label="Buscar servicio"
            value={termino}
            onChangeText={setTermino}
            placeholder="CCTV, alarmas, redes…"
            autoCorrect={false}
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
        </View>
        <FlatList
          data={visibles}
          keyExtractor={(s) => String(s.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          initialNumToRender={20}
          ListEmptyComponent={
            <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Ningún servicio coincide con «{termino}».</Text>
          }
          renderItem={({ item, index }) => {
            const activo = elegidos.includes(item.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activo }}
                accessibilityLabel={item.nombre}
                onPress={() => alternar(item.id)}
                style={({ pressed }) => [
                  styles.fila,
                  index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
                  pressed ? { backgroundColor: colors.surfaceSunken } : null,
                ]}
              >
                <View
                  style={[
                    styles.caja,
                    { borderColor: activo ? colors.primary : colors.lineStrong, backgroundColor: activo ? colors.primary : 'transparent' },
                  ]}
                >
                  {activo ? <IconCheck color={colors.onPrimary} size={13} /> : null}
                </View>
                <Text style={[styles.nombre, { color: colors.ink }, activo ? { fontFamily: font.semibold } : null]} numberOfLines={2}>
                  {item.nombre}
                </Text>
              </Pressable>
            );
          }}
        />
        <ModalFooter>
          <ModalPrimaryButton
            label={elegidos.length ? `Listo · ${elegidos.length} ${elegidos.length === 1 ? 'servicio' : 'servicios'}` : 'Listo'}
            onPress={() => onListo(elegidos)}
          />
        </ModalFooter>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buscador: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_TARGET + 6, paddingVertical: spacing.sm },
  caja: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  nombre: { ...type.body, fontSize: 15, flex: 1 },
  vacio: { ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});

