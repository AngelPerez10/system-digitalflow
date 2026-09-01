import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * cinco estrellas y un comentario opcional, una sola vez. Tres estados:
 * ya calificada (resumen), calificable (formulario) o todavía no (aviso).
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
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const enviando = fase !== 'idle';

  const onSubmit = async () => {
    if (estrellas < 1 || enviando) return;
    setError(null);
    setFase('sending');
    try {
      const guardada = await calificarOrdenCliente(ordenId, estrellas, comentario);
      setFase('success');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
      onCalificada(guardada);
    } catch (err) {
      setError(toUserMessage(err));
      setFase('idle');
    }
  };

  // 1) Ya calificada: se muestra lo que dejó el cliente, sin volver a pedirlo.
  if (calificacion) {
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
        </View>
      </Bloque>
    );
  }

  // 2) Todavía no se puede: se anuncia, no se esconde.
  if (!puedeCalificar) {
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

  // 3) Formulario.
  return (
    <Bloque titulo="Calificar al técnico">
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
          label="Enviar calificación"
          phase={fase}
          disabled={estrellas < 1 && !enviando}
          onPress={() => void onSubmit()}
          accessibilityHint="Envía tu calificación del servicio"
          tint={colors.navy}
          tintPressed={colors.navyDeep}
          tintDisabled={colors.navyDisabled}
        />
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
});
