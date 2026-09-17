import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { toUserMessage } from '@/api/errors';
import { calificarOrdenCliente } from '@/api/portalClienteApi';
import { InlineError } from '@/components/StateViews';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { OrdenCalificacion } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { IconEstrella } from './icons';

const ESTRELLAS = [1, 2, 3, 4, 5] as const;

function IconEditar({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 7.5 16.5 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** El adjetivo que acompaña a cada nota: convierte el número en una respuesta. */
const LEYENDA: Record<number, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Regular',
  4: 'Bien',
  5: 'Excelente',
};

interface Props {
  ordenId: number;
  tecnico: string | null;
  calificacion: OrdenCalificacion | null;
  puedeCalificar: boolean;
  onCalificada: (calificacion: OrdenCalificacion) => void;
  /** El contenedor la usa para subir la tarjeta por encima del teclado. */
  onComentarioFocus?: () => void;
}

/**
 * Calificación del técnico al cierre del servicio — como al terminar un viaje:
 * cinco estrellas y un comentario opcional. El cliente puede cambiarla
 * después: «Editar calificación» reabre el mismo formulario, precargado, y
 * el backend sobrescribe el registro (no acumula calificaciones por orden).
 * Tres estados: ya calificada (resumen o edición), calificable (formulario
 * de primera vez) o todavía no (aviso).
 */
export function CalificacionTecnico({
  ordenId,
  tecnico,
  calificacion,
  puedeCalificar,
  onCalificada,
  onComentarioFocus,
}: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [editando, setEditando] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const enviando = fase !== 'idle';

  const iniciarEdicion = () => {
    setEstrellas(calificacion?.estrellas ?? 0);
    setComentario(calificacion?.comentario ?? '');
    setError(null);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setError(null);
    setEditando(false);
  };

  const onSubmit = async () => {
    if (estrellas < 1 || enviando) return;
    setError(null);
    setFase('sending');
    try {
      const guardada = await calificarOrdenCliente(ordenId, estrellas, comentario);
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      setEditando(false);
      onCalificada(guardada);
    } catch (err) {
      setError(toUserMessage(err));
      setFase('idle');
    }
  };

  // 1) Ya calificada y no está editando: se muestra lo que dejó el cliente,
  //    con la opción de cambiarla.
  if (calificacion && !editando) {
    return (
      <Bloque titulo="Tu calificación">
        <View style={[styles.tarjeta, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
          <View style={styles.filaEstrellas}>
            {ESTRELLAS.map((n) => (
              <IconEstrella
                key={n}
                size={22}
                color={n <= calificacion.estrellas ? colors.gold : colors.lineStrong}
                relleno={n <= calificacion.estrellas}
              />
            ))}
            <Text style={[styles.leyenda, { color: colors.inkMuted }]}>
              {LEYENDA[calificacion.estrellas]}
            </Text>
          </View>
          {calificacion.comentario ? (
            <Text style={[styles.comentario, { color: colors.inkMuted }]}>
              «{calificacion.comentario}»
            </Text>
          ) : null}
          <Text style={[styles.gracias, { color: colors.inkSubtle }]}>
            Gracias por calificar. Tu opinión llega al equipo de Sertel.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar tu calificación"
            onPress={iniciarEdicion}
            style={({ pressed }) => [styles.editarBoton, pressed ? { opacity: 0.6 } : null]}
            hitSlop={6}
          >
            <IconEditar color={colors.navyText} size={13} />
            <Text style={[styles.editarTexto, { color: colors.navyText }]}>Editar calificación</Text>
          </Pressable>
        </View>
      </Bloque>
    );
  }

  // 2) Todavía no se puede: se anuncia, no se esconde.
  if (!calificacion && !puedeCalificar) {
    return (
      <Bloque titulo="Calificar al técnico">
        <View style={[styles.tarjeta, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
          <Text style={[styles.aviso, { color: colors.inkMuted }]}>
            Podrás calificar el servicio cuando quede resuelto.
          </Text>
        </View>
      </Bloque>
    );
  }

  // 3) Formulario — de primera vez, o editando una calificación existente.
  return (
    <Bloque titulo={calificacion ? 'Editar tu calificación' : 'Calificar al técnico'}>
      <View style={[styles.tarjeta, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <Text style={[styles.pregunta, { color: colors.ink }]}>
          {tecnico ? `¿Cómo te atendió ${tecnico}?` : '¿Cómo te atendieron?'}
        </Text>

        <View
          style={styles.selector}
          accessibilityRole="radiogroup"
          accessibilityLabel="Calificación en estrellas"
        >
          {ESTRELLAS.map((n) => (
            <Estrella
              key={n}
              valor={n}
              activa={n <= estrellas}
              deshabilitada={enviando}
              onPress={() => setEstrellas(n)}
            />
          ))}
        </View>

        <Text
          style={[styles.leyendaGrande, { color: estrellas ? colors.ink : colors.inkSubtle }]}
          accessibilityLiveRegion="polite"
        >
          {estrellas ? LEYENDA[estrellas] : 'Toca una estrella'}
        </Text>

        <TextField
          label="Comentario (opcional)"
          placeholder="¿Qué tal estuvo el servicio?"
          value={comentario}
          onChangeText={setComentario}
          onFocus={onComentarioFocus}
          multiline
          maxLength={1000}
          editable={!enviando}
        />

        {error ? <InlineError message={error} /> : null}

        <SubmitButton
          label={calificacion ? 'Guardar cambios' : 'Enviar calificación'}
          phase={fase}
          disabled={estrellas < 1 && !enviando}
          onPress={() => void onSubmit()}
          accessibilityHint="Envía tu calificación del servicio"
          tint={colors.navy}
          tintPressed={colors.navyDeep}
          tintDisabled={colors.navyDisabled}
        />

        {calificacion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar edición"
            disabled={enviando}
            onPress={cancelarEdicion}
            style={({ pressed }) => [
              styles.cancelarBoton,
              pressed && !enviando ? { opacity: 0.6 } : null,
              enviando ? { opacity: 0.4 } : null,
            ]}
          >
            <Text style={[styles.cancelarTexto, { color: colors.inkMuted }]}>Cancelar</Text>
          </Pressable>
        ) : null}
      </View>
    </Bloque>
  );
}

function Estrella({
  valor,
  activa,
  deshabilitada,
  onPress,
}: {
  valor: number;
  activa: boolean;
  deshabilitada: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;

  const rebotar = () => {
    if (reduced) return;
    Animated.sequence([
      Animated.timing(escala, { toValue: 1.22, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activa, disabled: deshabilitada }}
      accessibilityLabel={`${valor} ${valor === 1 ? 'estrella' : 'estrellas'} — ${LEYENDA[valor]}`}
      disabled={deshabilitada}
      onPress={() => {
        rebotar();
        onPress();
      }}
      style={styles.estrellaHit}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <IconEstrella size={32} color={activa ? colors.gold : colors.lineStrong} relleno={activa} />
      </Animated.View>
    </Pressable>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bloque}>
      <Text style={[styles.bloqueTitulo, { color: colors.inkSubtle }]}>{titulo}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: spacing.sm },
  bloqueTitulo: {
    ...type.caption,
    fontSize: 11,
    fontFamily: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pregunta: { ...type.bodyMedium, fontSize: 16, textAlign: 'center' },
  selector: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  estrellaHit: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leyendaGrande: {
    ...type.bodyMedium,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  filaEstrellas: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  leyenda: { ...type.bodyMedium, marginLeft: spacing.sm },
  comentario: { ...type.body, fontStyle: 'italic', lineHeight: 21 },
  gracias: { ...type.caption, lineHeight: 18 },
  aviso: { ...type.caption, lineHeight: 18 },
  editarBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: TOUCH_TARGET - 12,
    marginTop: -spacing.xs,
  },
  editarTexto: { ...type.label, fontSize: 13 },
  cancelarBoton: { alignItems: 'center', minHeight: TOUCH_TARGET - 12, justifyContent: 'center' },
  cancelarTexto: { ...type.label, fontSize: 13 },
});
