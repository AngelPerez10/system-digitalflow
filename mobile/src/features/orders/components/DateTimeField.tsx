import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
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

/** Misma curva que el menú lateral: entrada suave, salida un poco más rápida. */
const MS_OPEN = 280;
const MS_CLOSE = 200;
const HOJA_SLIDE_Y = 28;

type Modo = 'date' | 'time';

interface Props {
  label: string;
  mode: Modo;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
  accessibilityLabel?: string;
}

function valorComoDate(mode: Modo, value: string): Date {
  return mode === 'date'
    ? (parseFechaToDate(value) ?? new Date())
    : (parseHoraToDate(value) ?? new Date());
}

/**
 * Celda de fecha/hora — valor grande tocable (instrumento), no fila de ajustes.
 *
 * Android: diálogo nativo (Aceptar / Cancelar del sistema).
 * iOS: hoja modal con rueda + Cancelar / Listo — el spinner inline no se puede
 * cerrar solo y quedaba atrapado sobre el formulario.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  error,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  /** Borrador solo en iOS: la rueda dispara onChange en cada giro. */
  const [borrador, setBorrador] = useState(() => valorComoDate(mode, value));

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

  const abrir = () => {
    setBorrador(valorComoDate(mode, value));
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const confirmarIos = () => {
    onChange(mode === 'date' ? dateToFechaISO(borrador) : dateToHoraISO(borrador));
    setAbierto(false);
  };

  const alCambiarAndroid = (event: DateTimePickerEvent, selected?: Date) => {
    // En Android el diálogo se cierra solo; hay que bajar el flag antes de leer.
    setAbierto(false);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    onChange(mode === 'date' ? dateToFechaISO(selected) : dateToHoraISO(selected));
  };

  const alCambiarIos = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setBorrador(selected);
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
        accessibilityState={{ selected: !vacio, expanded: abierto }}
        onPress={abrir}
        style={({ pressed }) => [
          styles.celdaHit,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.line,
          },
          error ? { backgroundColor: colors.dangerBg } : null,
          pressed ? { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong } : null,
        ]}
      >
        <Text style={[styles.celdaLabel, { color: colors.inkMuted }]}>{label}</Text>
        <Text
          style={[
            styles.celdaValor,
            { color: vacio ? colors.inkSubtle : error ? colors.danger : colors.ink },
            vacio ? styles.celdaValorVacio : null,
          ]}
          numberOfLines={1}
        >
          {mostrar}
        </Text>
      </Pressable>
      {error ? (
        <Text
          style={[styles.error, { color: colors.danger }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}

      {abierto && Platform.OS === 'android' ? (
        <DateTimePicker
          value={valorComoDate(mode, value)}
          mode={mode}
          display="default"
          is24Hour
          onChange={alCambiarAndroid}
          positiveButton={{ label: 'Aceptar' }}
          negativeButton={{ label: 'Cancelar' }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <IosPickerSheet
          visible={abierto}
          titulo={`Elegir ${nombre}`}
          mode={mode}
          borrador={borrador}
          onCambiar={alCambiarIos}
          onCancelar={cerrar}
          onListo={confirmarIos}
        />
      ) : null}
    </View>
  );
}

/**
 * Hoja iOS: el scrim hace fade en su sitio (no viaja con la hoja) y la tarjeta
 * sube con un desplazamiento corto. Misma curva de movimiento que el menú.
 */
function IosPickerSheet({
  visible,
  titulo,
  mode,
  borrador,
  onCambiar,
  onCancelar,
  onListo,
}: {
  visible: boolean;
  titulo: string;
  mode: Modo;
  borrador: Date;
  onCambiar: (event: DateTimePickerEvent, selected?: Date) => void;
  onCancelar: () => void;
  onListo: () => void;
}) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [montado, setMontado] = useState(false);
  const progreso = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) setMontado(true);
  }, [visible]);

  useEffect(() => {
    if (!montado) return;

    animRef.current?.stop();

    if (reduced) {
      progreso.setValue(visible ? 1 : 0);
      if (!visible) setMontado(false);
      return;
    }

    if (visible) {
      progreso.setValue(0);
    }

    const anim = Animated.timing(progreso, {
      toValue: visible ? 1 : 0,
      duration: visible ? MS_OPEN : MS_CLOSE,
      easing: visible
        ? Easing.bezier(0.16, 1, 0.3, 1)
        : Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !visible) setMontado(false);
    });

    return () => {
      anim.stop();
    };
  }, [visible, montado, progreso, reduced]);

  const backdropOpacity = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const hojaTranslateY = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [HOJA_SLIDE_Y, 0],
  });
  const hojaOpacity = progreso.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.95, 1],
  });

  // Scrim navy suave (marca), no negro plano: se lee como velo, no como pantalla apagada.
  const backdropColor =
    scheme === 'dark' ? 'rgba(8, 12, 28, 0.55)' : 'rgba(23, 35, 91, 0.28)';

  const pedirCierre = useCallback(() => {
    onCancelar();
  }, [onCancelar]);

  if (!montado) return null;

  return (
    <Modal
      visible={montado}
      transparent
      animationType="none"
      onRequestClose={pedirCierre}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[styles.modalBackdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector"
            onPress={pedirCierre}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalHoja,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              borderColor: colors.line,
              opacity: hojaOpacity,
              transform: [{ translateY: hojaTranslateY }],
            },
          ]}
        >
          <View
            style={styles.modalAsa}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <View style={[styles.modalAsaBarra, { backgroundColor: colors.lineStrong }]} />
          </View>

          <View style={[styles.modalChrome, { borderBottomColor: colors.line }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={pedirCierre}
              style={({ pressed }) => [styles.modalBoton, pressed ? { opacity: 0.6 } : null]}
            >
              <Text style={[styles.modalBotonTexto, { color: colors.inkMuted }]}>Cancelar</Text>
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[styles.modalTitulo, { color: colors.ink }]}
              numberOfLines={1}
            >
              {titulo}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Listo"
              onPress={onListo}
              style={({ pressed }) => [styles.modalBoton, pressed ? { opacity: 0.6 } : null]}
            >
              <Text style={[styles.modalBotonTexto, { color: colors.primary }]}>Listo</Text>
            </Pressable>
          </View>

          <DateTimePicker
            value={borrador}
            mode={mode}
            display="spinner"
            is24Hour
            onChange={onCambiar}
            themeVariant={scheme}
            textColor={colors.ink}
            style={styles.iosPicker}
          />
        </Animated.View>
      </View>
    </Modal>
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
  const { colors } = useTheme();
  const hayValor = Boolean(fecha.trim() || hora.trim());

  return (
    <View style={styles.bloque} accessibilityRole="summary">
      <Text accessibilityRole="header" style={[styles.bloqueTitulo, { color: colors.ink }]}>
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
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: colors.line,
          backgroundColor: pressed ? colors.line : colors.surfaceSunken,
        },
      ]}
    >
      <Text
        style={[
          styles.chipTexto,
          { color: tono === 'muted' ? colors.inkMuted : colors.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  celda: { flex: 1, minWidth: 0 },
  celdaHit: {
    minHeight: TOUCH_TARGET + 12,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    justifyContent: 'center',
  },
  celdaLabel: {
    ...type.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  celdaValor: {
    fontFamily: type.display.fontFamily,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  celdaValorVacio: { ...type.body, fontFamily: type.body.fontFamily },
  error: { ...type.caption, marginTop: spacing.xs },
  bloque: { gap: spacing.sm },
  bloqueTitulo: { ...type.bodyMedium },
  filaCeldas: { flexDirection: 'row', gap: spacing.sm },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: { ...type.label, fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  modalHoja: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  modalAsa: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  modalAsaBarra: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
  },
  modalChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  modalTitulo: {
    ...type.bodyMedium,
    flex: 1,
    textAlign: 'center',
  },
  modalBoton: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBotonTexto: { ...type.label, fontSize: 16 },
  iosPicker: { alignSelf: 'stretch', height: 216 },
});
