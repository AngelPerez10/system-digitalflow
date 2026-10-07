import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { IconCheck, IconPerson } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalHeader } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, type } from '@/theme/tokens';
import type { TecnicoOpcion } from '@/types/orden';

interface Props {
  visible: boolean;
  /** `null` mientras carga. */
  tecnicos: TecnicoOpcion[] | null;
  error: string | null;
  seleccion: number | null;
  /** Usuario de la sesión: se marca con «Tú». */
  yoId: number | null;
  onCerrar: () => void;
  onElegir: (id: number | null) => void;
}

/** Altura fija de fila: permite `getItemLayout` (sin medir al desplazar). */
const ALTO_FILA = 64;

/** Marcas combinantes (U+0300–U+036F) que deja `normalize('NFD')`; así «José» se encuentra con «jose». */
const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase();
}

/**
 * Selector de técnico a pantalla completa, mismo corte que el de clientes. La
 * lista ya viene cargada desde el formulario; aquí solo se filtra en local.
 */
export function TecnicoPickerModal({ visible, tecnicos, error, seleccion, yoId, onCerrar, onElegir }: Props) {
  const { colors } = useTheme();
  const [termino, setTermino] = useState('');

  const filtrados = useMemo(() => {
    const lista = tecnicos ?? [];
    // Quien crea la orden va primero: es la elección más común.
    const ordenada = yoId === null ? lista : [...lista].sort((a, b) => Number(b.id === yoId) - Number(a.id === yoId));
    const t = normalizar(termino.trim());
    return t ? ordenada.filter((x) => normalizar(x.nombre).includes(t)) : ordenada;
  }, [tecnicos, termino, yoId]);

  const cerrar = useCallback(() => {
    setTermino('');
    onCerrar();
  }, [onCerrar]);

  const elegir = useCallback(
    (id: number | null) => {
      setTermino('');
      onElegir(id);
    },
    [onElegir],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={cerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow="Nueva orden" titulo="Asignar técnico" onCerrar={cerrar} />
        <View style={styles.buscador}>
          <TextField
            label="Buscar técnico"
            value={termino}
            onChangeText={setTermino}
            placeholder="Nombre"
            autoCapitalize="none"
            autoCorrect={false}
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(t) => String(t.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          initialNumToRender={12}
          windowSize={5}
          getItemLayout={(_, index) => ({ length: ALTO_FILA, offset: ALTO_FILA * index, index })}
          ListHeaderComponent={
            termino.trim() ? null : (
              <FilaSinAsignar activa={seleccion === null} onPress={() => elegir(null)} />
            )
          }
          ListEmptyComponent={
            tecnicos === null && !error ? (
              <ActivityIndicator color={colors.primary} style={styles.cargando} />
            ) : (
              <Text style={[styles.vacio, { color: error ? colors.danger : colors.inkSubtle }]}>
                {error ?? 'Sin técnicos con ese nombre.'}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <FilaTecnico tecnico={item} activa={item.id === seleccion} esYo={item.id === yoId} onElegir={elegir} />
          )}
        />
      </View>
    </Modal>
  );
}

const FilaTecnico = memo(function FilaTecnico({
  tecnico,
  activa,
  esYo,
  onElegir,
}: {
  tecnico: TecnicoOpcion;
  activa: boolean;
  esYo: boolean;
  onElegir: (id: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activa }}
      accessibilityLabel={`${tecnico.nombre}${esYo ? ', tú' : ''}`}
      onPress={() => onElegir(tecnico.id)}
      style={({ pressed }) => [
        styles.fila,
        { borderTopColor: colors.line },
        pressed ? { backgroundColor: colors.surfaceSunken } : null,
      ]}
    >
      <Avatar
        uri={tecnico.avatarUrl}
        iniciales={inicialesUsuarioDisplay(tecnico.nombre, '?')}
        size={40}
        fondo={activa ? colors.primary : colors.primaryRing}
        color={activa ? colors.onPrimary : colors.primary}
      />
      <View style={styles.textos}>
        <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={1}>
          {tecnico.nombre}
        </Text>
        {esYo ? <Text style={[styles.detalle, { color: colors.primary }]}>Tú</Text> : null}
      </View>
      <Marca activa={activa} />
    </Pressable>
  );
});

function FilaSinAsignar({ activa, onPress }: { activa: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activa }}
      accessibilityLabel="Sin asignar"
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      <View style={[styles.sinAsignar, { borderColor: colors.lineStrong }]}>
        <IconPerson color={colors.inkSubtle} size={18} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.nombre, { color: colors.ink }]}>Sin asignar</Text>
        <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
          Se asigna después desde la web
        </Text>
      </View>
      <Marca activa={activa} />
    </Pressable>
  );
}

function Marca({ activa }: { activa: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.marca,
        activa ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.lineStrong },
      ]}
    >
      {activa ? <IconCheck color={colors.onPrimary} size={12} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buscador: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: ALTO_FILA,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  sinAsignar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  nombre: { fontFamily: font.semibold, fontSize: 15 },
  detalle: { ...type.caption, fontSize: 12 },
  marca: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cargando: { marginTop: spacing.xl },
  vacio: { ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});
