import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { buscarClientes } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconChevron } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalHeader } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ClienteOpcion } from '@/types/cotizacion';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (cliente: ClienteOpcion) => void;
}

const ESPERA_MS = 300;

/**
 * Buscador de clientes a pantalla completa. Busca en el servidor mientras se
 * escribe (con una pausa corta para no disparar una petición por tecla). Como
 * en la web, la cotización siempre va a un cliente del catálogo (los
 * prospectos también viven ahí).
 */
export function ClientePickerModal({ visible, onCerrar, onElegir }: Props) {
  const { colors } = useTheme();
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ClienteOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const control = new AbortController();
    const temporizador = setTimeout(() => {
      setBuscando(true);
      setError(null);
      buscarClientes(termino, control.signal)
        .then(setResultados)
        .catch((e) => {
          if (!control.signal.aborted) setError(toUserMessage(e));
        })
        .finally(() => {
          if (!control.signal.aborted) setBuscando(false);
        });
    }, termino ? ESPERA_MS : 0);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [termino, visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow="Cotización" titulo="Elegir cliente" onCerrar={onCerrar} />
        <View style={styles.buscador}>
          <TextField
            label="Buscar cliente"
            value={termino}
            onChangeText={setTermino}
            placeholder="Nombre, RFC o teléfono"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
        </View>
        <FlatList
          data={resultados}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            buscando ? (
              <ActivityIndicator color={colors.primary} style={styles.cargando} />
            ) : (
              <Text style={[styles.vacio, { color: error ? colors.danger : colors.inkSubtle }]}>
                {error ?? (termino ? 'Sin clientes con ese nombre.' : 'Escribe para buscar un cliente.')}
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}${item.es_prospecto ? ', prospecto' : ''}`}
              onPress={() => onElegir(item)}
              style={({ pressed }) => [
                styles.fila,
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
                pressed ? { backgroundColor: colors.surfaceSunken } : null,
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
                <Text style={[styles.iniciales, { color: colors.onNavy }]}>{inicialesUsuarioDisplay(item.nombre, '?')}</Text>
              </View>
              <View style={styles.textos}>
                <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={[styles.detalle, { color: colors.inkSubtle }]} numberOfLines={1}>
                  {[item.es_prospecto ? 'Prospecto' : null, item.contacto_principal || null, item.telefono || null]
                    .filter(Boolean)
                    .join(' · ') || 'Sin datos de contacto'}
                </Text>
              </View>
              <IconChevron direction="right" color={colors.inkSubtle} size={14} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buscador: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_TARGET + 12, paddingVertical: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  iniciales: { fontFamily: font.semibold, fontSize: 13 },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  nombre: { fontFamily: font.semibold, fontSize: 15 },
  detalle: { ...type.caption, fontSize: 12 },
  cargando: { marginTop: spacing.xl },
  vacio: { ...type.caption, textAlign: 'center', marginTop: spacing.xl },
});
