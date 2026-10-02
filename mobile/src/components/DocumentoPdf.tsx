import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { correoSugerido, enviarPdfPorCorreo } from '@/api/pdfApi';
import type { usePdfDocumento } from '@/hooks/usePdfDocumento';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { BotonAccion } from './BotonAccion';
import { EnviarPdfCorreoModal } from './EnviarPdfCorreoModal';
import { IconArchivoPdf, IconCheck, IconCorreo, IconDescarga, IconWhatsApp } from './icons';

interface Props {
  /** Estado y acciones del PDF (lo crea la pantalla para compartirlo con su hoja «⋯»). */
  pdf: ReturnType<typeof usePdfDocumento>;
  /** Ruta del documento en la API, sin slash final (para el correo). */
  base: string;
  nombreArchivo: string;
  /** Qué incluye («3 jornadas · 12 equipos»). */
  incluye: string;
  /** Botón «Correo»: requiere `correo-sugerido` y `enviar-pdf` en el documento. */
  conCorreo?: boolean;
  /** `false` deshabilita el envío (p. ej. documento aún no listo); descargar sigue disponible. */
  puedeEnviar?: boolean;
  notaSinEnvio?: string;
}

/**
 * Tarjeta del documento PDF: la ficha (nombre, qué incluye, validez del
 * enlace) y las acciones, todas del mismo tamaño — Descargar arriba y los
 * envíos (WhatsApp, Correo) debajo. Las confirmaciones entran con un fundido.
 */
export function DocumentoPdf({
  pdf,
  base,
  nombreArchivo,
  incluye,
  conCorreo = false,
  puedeEnviar = true,
  notaSinEnvio = 'Todavía no se puede enviar al cliente.',
}: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [correoAbierto, setCorreoAbierto] = useState(false);
  const [avisoCorreo, setAvisoCorreo] = useState<string | null>(null);
  const aviso = avisoCorreo ?? pdf.aviso;
  const avisoV = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aviso) {
      avisoV.setValue(0);
      return;
    }
    if (reduced) {
      avisoV.setValue(1);
      return;
    }
    avisoV.setValue(0);
    const anim = Animated.timing(avisoV, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [aviso, reduced, avisoV]);

  const enviando = pdf.ocupado !== null;
  const whatsapp = (
    <BotonAccion
      label="WhatsApp"
      variante="secundario"
      icon={() => <IconWhatsApp size={18} />}
      cargando={pdf.ocupado === 'whatsapp'}
      disabled={enviando || !puedeEnviar}
      onPress={() => {
        setAvisoCorreo(null);
        void pdf.whatsapp();
      }}
      accessibilityHint="Abre WhatsApp con el enlace al PDF"
    />
  );

  return (
    <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line, ...elevationFor(colors, 'panel') }]}>
      <View style={[styles.ficha, { backgroundColor: colors.surfaceSunken, borderBottomColor: colors.line }]}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <IconArchivoPdf hoja={colors.surface} borde={colors.dangerLine} banda={colors.danger} texto={colors.onPrimary} size={48} />
        </View>
        <View style={styles.fichaTextos}>
          <Text style={[styles.nombre, { color: colors.ink }]} numberOfLines={1}>
            {nombreArchivo}
          </Text>
          <Text style={[styles.incluye, { color: colors.inkMuted }]} numberOfLines={1}>
            {incluye}
          </Text>
          <View style={styles.estado}>
            <View style={[styles.estadoPunto, { backgroundColor: puedeEnviar ? colors.success : colors.gold }]} />
            <Text style={[styles.estadoTexto, { color: colors.inkSubtle }]} numberOfLines={2}>
              {puedeEnviar ? 'Enlace seguro, válido 7 días' : notaSinEnvio}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.acciones}>
        {conCorreo ? (
          <>
            <View style={styles.fila}>
              <BotonAccion
                label="Descargar PDF"
                icon={(c) => <IconDescarga color={c} size={17} />}
                cargando={pdf.ocupado === 'descargar'}
                disabled={enviando}
                onPress={() => {
                  setAvisoCorreo(null);
                  void pdf.descargar();
                }}
                accessibilityHint="Guarda el PDF en el teléfono"
              />
            </View>
            <View style={styles.fila}>
              {whatsapp}
              <BotonAccion
                label="Correo"
                variante="secundario"
                icon={(c) => <IconCorreo color={c} size={17} />}
                disabled={enviando || !puedeEnviar}
                onPress={() => {
                  setAvisoCorreo(null);
                  setCorreoAbierto(true);
                }}
                accessibilityHint="Envía el PDF adjunto por correo"
              />
            </View>
          </>
        ) : (
          <View style={styles.fila}>
            <BotonAccion
              label="Descargar"
              icon={(c) => <IconDescarga color={c} size={17} />}
              cargando={pdf.ocupado === 'descargar'}
              disabled={enviando}
              onPress={() => void pdf.descargar()}
              accessibilityHint="Guarda el PDF en el teléfono"
            />
            {whatsapp}
          </View>
        )}
      </View>

      {aviso ? (
        <Animated.View
          style={[
            styles.aviso,
            { backgroundColor: colors.statusResueltoBg },
            { opacity: avisoV, transform: [{ translateY: avisoV.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) }] },
          ]}
          accessibilityLiveRegion="polite"
        >
          <IconCheck color={colors.statusResueltoText} size={13} />
          <Text style={[styles.avisoTexto, { color: colors.statusResueltoText }]}>{aviso}</Text>
        </Animated.View>
      ) : null}

      {conCorreo ? (
        <EnviarPdfCorreoModal
          visible={correoAbierto}
          descripcion={`${nombreArchivo} llega como archivo adjunto desde tu cuenta de correo.`}
          obtenerSugerido={(signal) => correoSugerido(base, signal)}
          enviar={(correo) => enviarPdfPorCorreo(base, correo)}
          onCerrar={() => setCorreoAbierto(false)}
          onEnviado={(mensaje) => {
            setCorreoAbierto(false);
            setAvisoCorreo(mensaje);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  ficha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  fichaTextos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { ...type.mono, fontSize: 14, fontFamily: font.semibold },
  incluye: { ...type.caption, fontSize: 13 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  estadoPunto: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { ...type.caption, fontSize: 12, flexShrink: 1 },
  acciones: { padding: spacing.md, gap: spacing.sm },
  fila: { flexDirection: 'row', gap: spacing.sm },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avisoTexto: { ...type.label, flex: 1 },
});
