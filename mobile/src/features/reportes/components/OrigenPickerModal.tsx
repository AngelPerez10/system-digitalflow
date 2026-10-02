import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { IconBox, IconCheck } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { ModalHeader } from '@/components/ModalChrome';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { formatFecha } from '@/utils/fecha';
import type { OrigenElegido } from '../editarReporteForm';
import { filtrarOpciones, useOrigenesReporte, type OpcionOrigen } from '../useOrigenesReporte';
import { usePermisosReportes } from '../usePermisosReportes';

interface Props {
  visible: boolean;
  actual: OrigenElegido | null;
  /** Al editar: su propio proyecto no cuenta como «ocupado». */
  reporteId: number | null;
  onCerrar: () => void;
  onElegir: (origen: OrigenElegido) => void;
}

/**
 * Selector a pantalla completa del proyecto al que se liga el reporte, con
 * búsqueda local. Los proyectos que ya tienen reporte se ven pero no se
 * pueden elegir (el servidor admite uno por proyecto).
 */
export function OrigenPickerModal({ visible, actual, reporteId, onCerrar, onElegir }: Props) {
  const { colors } = useTheme();
  const { origenProyectos } = usePermisosReportes();
  const [termino, setTermino] = useState('');
  const { proyectos, cargando, error } = useOrigenesReporte(visible, reporteId, origenProyectos);
  const opciones = filtrarOpciones(proyectos, termino);

  const renderItem = ({ item, index }: { item: OpcionOrigen; index: number }) => {
    const elegido = actual?.tipo === 'proyecto' && actual.id === item.id;
    const bloqueado = Boolean(item.ocupadoPor) && !elegido;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: elegido, disabled: bloqueado }}
        accessibilityLabel={`${item.folio}, ${item.cliente}${bloqueado ? `, ya tiene el reporte ${item.ocupadoPor}` : ''}`}
        disabled={bloqueado}
        onPress={() => onElegir({ tipo: 'proyecto', id: item.id, folio: item.folio, cliente: item.cliente })}
        style={({ pressed }) => [
          styles.fila,
          index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : null,
          pressed ? { backgroundColor: colors.surfaceSunken } : null,
          bloqueado ? styles.bloqueada : null,
        ]}
      >
        <View style={[styles.placa, { backgroundColor: elegido ? colors.navy : colors.surfaceSunken }]}>
          <IconBox color={elegido ? colors.onNavy : colors.inkMuted} size={16} />
        </View>
        <View style={styles.textos}>
          <View style={styles.meta}>
            <Text style={[styles.folio, { color: colors.inkMuted }]}>{item.folio}</Text>
            {item.fecha ? <Text style={[styles.fecha, { color: colors.inkSubtle }]}>{formatFecha(item.fecha)}</Text> : null}
          </View>
          <Text style={[styles.cliente, { color: colors.ink }]} numberOfLines={1}>
            {item.cliente}
          </Text>
          {bloqueado ? (
            <Text style={[styles.ocupado, { color: colors.statusPendienteText }]}>Ya tiene el reporte {item.ocupadoPor}</Text>
          ) : null}
        </View>
        {elegido ? (
          <View style={[styles.check, { backgroundColor: colors.primary }]}>
            <IconCheck color={colors.onPrimary} size={12} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
        <ModalHeader eyebrow="Reporte de mantenimiento" titulo="Elige el proyecto" onCerrar={onCerrar} />
        <View style={styles.controles}>
          <TextField
            label="Buscar proyecto"
            value={termino}
            onChangeText={setTermino}
            placeholder="Folio o cliente"
            autoCapitalize="none"
            autoCorrect={false}
            leadingIcon={<Lupa color={colors.inkSubtle} />}
          />
        </View>
        <FlatList
          data={opciones}
          keyExtractor={(o) => String(o.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          initialNumToRender={12}
          renderItem={renderItem}
          ListEmptyComponent={
            cargando ? (
              <ActivityIndicator color={colors.primary} style={styles.cargando} />
            ) : (
              <Text style={[styles.vacio, { color: error ? colors.danger : colors.inkSubtle }]}>
                {!origenProyectos
                  ? 'Tu cuenta no puede ver proyectos para ligarlos a un reporte. Solicítalo a un administrador.'
                  : (error ?? (termino ? 'Ningún proyecto coincide con esa búsqueda.' : 'No tienes proyectos asignados.'))}
              </Text>
            )
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controles: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH_TARGET + 16, paddingVertical: spacing.sm },
  bloqueada: { opacity: 0.55 },
  placa: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  folio: { ...type.mono, fontSize: 12 },
  fecha: { ...type.caption, fontSize: 11 },
  cliente: { fontFamily: font.semibold, fontSize: 15, flexShrink: 1 },
  ocupado: { ...type.caption, fontSize: 11, fontFamily: font.medium },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cargando: { marginTop: spacing.xl },
  vacio: { ...type.caption, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
