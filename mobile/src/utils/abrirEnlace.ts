import { Alert, Linking } from 'react-native';

/**
 * Abre un enlace externo (mapa, teléfono) y avisa en lenguaje llano si el
 * teléfono no puede hacerlo — sin este atrapado, `Linking.openURL` rechazaba
 * sin capturar y React Native mostraba su overlay de error crudo («Unable to
 * open URL…»), algo que un técnico de campo no sabe interpretar ni resolver.
 */
export async function abrirEnlace(
  url: string,
  mensajeError = 'No se pudo abrir el enlace. Verifica tu conexión e inténtalo de nuevo.',
): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir', mensajeError);
  }
}

/**
 * Algunas direcciones traen en realidad un enlace de Google Maps en vez de
 * una dirección legible (dato así capturado desde el web). Mostrar la URL
 * cruda se ve roto en la tarjeta; esto detecta el caso para renderizarlo
 * como acción tocable en vez de texto.
 */
export function esEnlaceUbicacion(direccion: string): boolean {
  return /^https?:\/\//i.test(direccion.trim());
}
