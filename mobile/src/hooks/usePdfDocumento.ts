import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { toUserMessage } from '@/api/errors';
import { obtenerEnlacePdf } from '@/api/pdfApi';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { guardarPdfEnTelefono, puedeGuardarPdf } from '@/utils/guardarPdf';
import { enlacesWhatsApp, mensajePdf, telefonoWhatsApp } from '@/utils/whatsapp';

export type AccionPdf = 'descargar' | 'whatsapp';

/**
 * Descargar el PDF de un documento o mandarlo por WhatsApp, con el enlace
 * firmado del servidor (`pdf-enlace`, válido 7 días). `base` es la ruta del
 * documento sin slash final (`/proyectos/7`, `/reportes-mantenimiento/3`). Lo
 * comparten la tarjeta `DocumentoPdf` y las hojas de acciones de los detalles.
 */
export function usePdfDocumento(base: string, nombreArchivo: string, documento: string, telefono?: string | null) {
  const [ocupado, setOcupado] = useState<AccionPdf | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const descargar = useCallback(async () => {
    setOcupado('descargar');
    setAviso(null);
    try {
      const { url } = await obtenerEnlacePdf(base);
      if (puedeGuardarPdf()) {
        // Directo a la carpeta que elija el técnico, sin abrir el navegador.
        const resultado = await guardarPdfEnTelefono(url, nombreArchivo);
        if (resultado.estado === 'guardado') setAviso(`Guardado en ${resultado.carpeta}.`);
      } else {
        await abrirEnlace(`${url}?descargar=1`, 'No se pudo descargar el PDF. Verifica que tengas un navegador instalado.');
      }
    } catch (e) {
      Alert.alert('No se pudo descargar el PDF', toUserMessage(e));
    } finally {
      setOcupado(null);
    }
  }, [base, nombreArchivo]);

  const whatsapp = useCallback(async () => {
    setOcupado('whatsapp');
    setAviso(null);
    try {
      const { url } = await obtenerEnlacePdf(base);
      // Con teléfono abre el chat del cliente; sin él, WhatsApp deja elegir el chat.
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
  }, [base, documento, telefono]);

  return { ocupado, aviso, descargar, whatsapp };
}
