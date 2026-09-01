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
