import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import {
  dateToFechaISO,
  dateToHoraISO,
  formatFecha,
  formatHora,
  horaActual,
  hoyISO,
  parseFechaToDate,
  parseHoraToDate,
} from '@/utils/fecha';

type Modo = 'date' | 'time';

interface Props {
  label: string;
  mode: Modo;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
  accessibilityLabel?: string;
}

/**
 * Celda de fecha/hora — valor grande tocable (instrumento), no fila de ajustes.
 * Abre el selector nativo al tocar.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  error,
  accessibilityLabel,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  const valorDate =
    mode === 'date'
      ? (parseFechaToDate(value) ?? new Date())
      : (parseHoraToDate(value) ?? new Date());

  const vacio = !value.trim();
  const mostrar =
    mode === 'date'
      ? vacio
        ? 'Elegir'
        : formatFecha(value)
      : vacio
        ? 'Elegir'
        : formatHora(value);

  const nombre = accessibilityLabel ?? label;

  const alCambiar = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setAbierto(false);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    onChange(mode === 'date' ? dateToFechaISO(selected) : dateToHoraISO(selected));
    if (Platform.OS === 'ios') setAbierto(false);
  };

  return (
    <View style={styles.celda}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nombre}
        accessibilityValue={{ text: vacio ? 'Sin valor' : mostrar }}
        accessibilityHint={
          mode === 'date' ? 'Abre el calendario del sistema' : 'Abre el reloj del sistema'
        }
        accessibilityState={{ selected: !vacio }}
        onPress={() => setAbierto(true)}
        style={({ pressed }) => [
          styles.celdaHit,
          pressed ? styles.celdaPressed : null,
          error ? styles.celdaError : null,
        ]}
      >
        <Text style={styles.celdaLabel}>{label}</Text>
        <Text
          style={[
            styles.celdaValor,
            vacio ? styles.celdaValorVacio : null,
            error ? styles.celdaValorError : null,
          ]}
          numberOfLines={1}
        >
          {mostrar}
        </Text>
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {abierto ? (
        <DateTimePicker
          value={valorDate}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour
          onChange={alCambiar}
          positiveButton={{ label: 'Aceptar' }}
          negativeButton={{ label: 'Cancelar' }}
        />
      ) : null}
    </View>
  );
}

interface FechaHoraBloqueProps {
  titulo: string;
  fecha: string;
  hora: string;
  errorFecha?: string;
  errorHora?: string;
  onFecha: (valor: string) => void;
  onHora: (valor: string) => void;
}

/**
 * Bloque Inicio / Finalización: dos celdas (fecha · hora) + atajos en chips.
 */
export function FechaHoraBloque({
  titulo,
  fecha,
  hora,
  errorFecha,
  errorHora,
  onFecha,
  onHora,
}: FechaHoraBloqueProps) {
  const hayValor = Boolean(fecha.trim() || hora.trim());

  return (
    <View style={styles.bloque} accessibilityRole="summary">
      <Text accessibilityRole="header" style={styles.bloqueTitulo}>
        {titulo}
      </Text>
      <View style={styles.filaCeldas}>
        <DateTimeField
          label="Fecha"
          mode="date"
          value={fecha}
          onChange={onFecha}
          error={errorFecha}
          accessibilityLabel={`Fecha de ${titulo.toLowerCase()}`}
        />
        <DateTimeField
          label="Hora"
          mode="time"
          value={hora}
          onChange={onHora}
          error={errorHora}
          accessibilityLabel={`Hora de ${titulo.toLowerCase()}`}
        />
      </View>
      <View style={styles.atajos}>
        <AtajoChip
          label="Hoy"
          accessibilityLabel={`Usar la fecha de hoy en ${titulo}`}
          onPress={() => onFecha(hoyISO())}
        />
        <AtajoChip
          label="Ahora"
          accessibilityLabel={`Usar la hora actual en ${titulo}`}
          onPress={() => onHora(horaActual())}
        />
        {hayValor ? (
          <AtajoChip
            label="Limpiar"
            accessibilityLabel={`Quitar fecha y hora de ${titulo}`}
            onPress={() => {
              onFecha('');
              onHora('');
            }}
            tono="muted"
          />
        ) : null}
      </View>
    </View>
  );
}

function AtajoChip({
  label,
  accessibilityLabel,
  onPress,
  tono = 'primary',
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  tono?: 'primary' | 'muted';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
    >
      <Text style={[styles.chipTexto, tono === 'muted' ? styles.chipMuted : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  celda: { flex: 1, minWidth: 0 },
  celdaHit: {
    minHeight: TOUCH_TARGET + 12,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    justifyContent: 'center',
  },
  celdaPressed: { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong },
  celdaError: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  celdaLabel: {
    ...type.caption,
    fontSize: 10,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  celdaValor: {
    fontFamily: type.display.fontFamily,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  celdaValorVacio: { ...type.body, color: colors.inkSubtle, fontFamily: type.body.fontFamily },
  celdaValorError: { color: colors.danger },
  error: { ...type.caption, color: colors.danger, marginTop: spacing.xs },
  bloque: { gap: spacing.sm },
  bloqueTitulo: { ...type.bodyMedium, color: colors.ink },
  filaCeldas: { flexDirection: 'row', gap: spacing.sm },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: { backgroundColor: colors.line },
  chipTexto: { ...type.label, fontSize: 12, color: colors.primary },
  chipMuted: { color: colors.inkMuted },
});
