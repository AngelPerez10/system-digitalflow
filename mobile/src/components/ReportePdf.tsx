import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { correoSugerido, enviarPdfPorCorreo, obtenerEnlacePdf } from '@/api/pdfApi';
import { toUserMessage } from '@/api/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { enlacesWhatsApp, mensajePdf, telefonoWhatsApp } from '@/utils/whatsapp';
import { EnviarPdfCorreoModal } from './EnviarPdfCorreoModal';
import { IconArchivoPdf, IconCheck, IconCorreo, IconDescarga, IconWhatsApp } from './icons';

type Accion = 'descargar' | 'whatsapp';

interface Props {
  /** Ruta del documento en la API, sin slash final (`/ordenes/12`, `/proyectos/7`). */
  base: string;
  /** Nombre que se muestra en la ficha (`Orden_ODT-12.pdf`). */
  nombreArchivo: string;
  /** Segunda línea de la ficha («Reporte de servicio · Listo para enviar»). */
  meta: string;
  /** Cómo se nombra el documento en el mensaje de WhatsApp («el reporte de servicio ODT-12»). */
  documento: string;
  /** Teléfono del cliente para abrir su chat directo; sin él, WhatsApp deja elegir el chat. */
  telefono?: string | null;
  /** `false` deshabilita WhatsApp y correo (p. ej. orden aún no resuelta). */
  puedeEnviar?: boolean;
  /** Nota cuando no se puede enviar todavía. */
  notaSinEnvio?: string;
}

/**
 * Reporte PDF de un documento: la ficha del archivo, «Descargar» como acción
 * principal (se abre en el navegador del teléfono) y, debajo, enviarlo al
 * cliente por WhatsApp (enlace seguro, válido 7 días) o por correo (el
 * servidor lo manda adjunto). Todos los botones miden 48 px de alto.
 */
export function ReportePdf({
  base,
  nombreArchivo,
  meta,
  documento,
  telefono,
  puedeEnviar = true,
  notaSinEnvio = 'Todavía no se puede enviar al cliente.',
}: Props) {
  const { colors } = useTheme();
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  const [correoAbierto, setCorreoAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const enviarDeshabilitado = !puedeEnviar || ocupado !== null;

  const descargar = async () => {
    setOcupado('descargar');
    try {
      const { url } = await obtenerEnlacePdf(base);
      await abrirEnlace(url, 'No se pudo abrir el PDF. Verifica que tengas un navegador instalado.');
    } catch (e) {
      Alert.alert('No se pudo generar el PDF', toUserMessage(e));
    } finally {
      setOcupado(null);
    }
  };

  const whatsapp = async () => {
    setOcupado('whatsapp');
    try {
      const { url } = await obtenerEnlacePdf(base);
      const { app, web } = enlacesWhatsApp(telefonoWhatsApp(telefono), mensajePdf(documento, url));
      try {
        await Linking.openURL(app);
      } catch {
        // Sin la app instalada: el enlace web abre WhatsApp Web o la tienda.
        await abrirEnlace(web, 'No se pudo abrir WhatsApp.');
      }
    } catch (e) {
      Alert.alert('No se pudo preparar el envío', toUserMessage(e));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {/* Ficha del archivo: qué se va a descargar o enviar. */}
      <View style={[styles.archivo, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <IconArchivoPdf hoja={colors.surface} borde={colors.dangerLine} banda={colors.danger} texto={colors.onPrimary} size={46} />
        </View>
        <View style={styles.archivoTextos}>
          <Text style={[styles.archivoNombre, { color: colors.ink }]} numberOfLines={1}>
            {nombreArchivo}
          </Text>
          <Text style={[styles.archivoMeta, { color: colors.inkSubtle }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>

      <Boton
        variante="primario"
        etiqueta="Descargar PDF"
        icon={(c) => <IconDescarga color={c} size={18} />}
        cargando={ocupado === 'descargar'}
        disabled={ocupado !== null}
        onPress={() => void descargar()}
        accessibilityHint="Abre el PDF en el navegador para verlo o guardarlo"
      />

      <View style={styles.enviar}>
        <Text style={[styles.enviarTitulo, { color: colors.inkSubtle }]}>Enviar al cliente</Text>
        <View style={styles.fila}>
          <Boton
            variante="secundario"
            etiqueta="WhatsApp"
            icon={() => <IconWhatsApp size={19} />}
            cargando={ocupado === 'whatsapp'}
            disabled={enviarDeshabilitado}
            onPress={() => void whatsapp()}
            accessibilityHint="Abre WhatsApp con un mensaje y el enlace al PDF"
          />
          <Boton
            variante="secundario"
            etiqueta="Correo"
            icon={(c) => <IconCorreo color={c} size={18} />}
            tintaIcono={colors.statusPausadoText}
            cargando={false}
            disabled={enviarDeshabilitado}
            onPress={() => {
              setAviso(null);
              setCorreoAbierto(true);
            }}
            accessibilityHint="Envía el PDF adjunto por correo"
          />
        </View>
      </View>

      {aviso ? (
        <View style={[styles.aviso, { backgroundColor: colors.statusResueltoBg }]} accessibilityLiveRegion="polite">
          <IconCheck color={colors.statusResueltoText} size={13} />
          <Text style={[styles.avisoTexto, { color: colors.statusResueltoText }]}>{aviso}</Text>
        </View>
      ) : (
        <Text style={[styles.nota, { color: colors.inkSubtle }]}>
          {puedeEnviar
            ? 'WhatsApp envía un enlace seguro al PDF, válido por 7 días. El correo lo manda adjunto.'
            : notaSinEnvio}
        </Text>
      )}

      <EnviarPdfCorreoModal
        visible={correoAbierto}
        descripcion={`${nombreArchivo} llega como archivo adjunto desde tu cuenta de correo.`}
        obtenerSugerido={(signal) => correoSugerido(base, signal)}
        enviar={(correo) => enviarPdfPorCorreo(base, correo)}
        onCerrar={() => setCorreoAbierto(false)}
        onEnviado={(mensaje) => {
          setCorreoAbierto(false);
          setAviso(mensaje);
        }}
      />
    </View>
  );
}

/**
 * Botón con icono de altura fija (48 px): todos miden lo mismo sin importar
 * el texto. El primario va relleno; los secundarios con borde y el icono en
 * el color de su canal.
 */
function Boton({
  variante,
  etiqueta,
  icon,
  tintaIcono,
  cargando,
  disabled,
  onPress,
  accessibilityHint,
}: {
  variante: 'primario' | 'secundario';
  etiqueta: string;
  icon: (color: string) => React.ReactNode;
  tintaIcono?: string;
  cargando: boolean;
  disabled: boolean;
  onPress: () => void;
  accessibilityHint: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const presionar = (destino: number) => {
    if (reduced) return;
    Animated.spring(escala, { toValue: destino, friction: 10, tension: 300, useNativeDriver: true }).start();
  };
  const primario = variante === 'primario';
  const tintaTexto = primario ? colors.onPrimary : colors.ink;
  const tintaGlifo = primario ? colors.onPrimary : (tintaIcono ?? colors.ink);
  // Mientras otra acción carga, este botón se atenúa; el que carga no.
  const atenuado = disabled && !cargando;

  return (
    <Animated.View style={[primario ? null : styles.celda, { transform: [{ scale: escala }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, busy: cargando }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => presionar(0.97)}
        onPressOut={() => presionar(1)}
        style={({ pressed }) => [
          styles.boton,
          primario
            ? { backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderColor: 'transparent' }
            : { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.lineStrong },
          atenuado ? styles.atenuado : null,
        ]}
      >
        <View style={styles.botonIcono}>
          {cargando ? <ActivityIndicator size="small" color={tintaGlifo} /> : icon(tintaGlifo)}
        </View>
        <Text style={[styles.botonTexto, { color: tintaTexto }]} numberOfLines={1}>
          {cargando ? 'Preparando…' : etiqueta}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  archivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  archivoTextos: { flex: 1, minWidth: 0, gap: 2 },
  archivoNombre: { ...type.mono, fontSize: 14, fontFamily: font.semibold },
  archivoMeta: { ...type.caption, fontSize: 12 },
  enviar: { gap: spacing.sm, marginTop: spacing.xs },
  enviarTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', gap: spacing.sm },
  celda: { flex: 1 },
  boton: {
    height: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  atenuado: { opacity: 0.45 },
  botonIcono: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { ...type.button, fontFamily: font.semibold },
  nota: { ...type.caption, fontSize: 12, lineHeight: 17 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avisoTexto: { ...type.label, flex: 1 },
});
