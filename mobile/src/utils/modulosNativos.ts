import { Platform, TurboModuleRegistry } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Módulos nativos que llegaron después del APK 1.0.0 (mapa con WebView y
 * GPS). Una actualización OTA solo cambia el JS: en un binario viejo esos
 * módulos no existen y sus paquetes truenan al importarse. Por eso se detectan
 * aquí sin importarlos, y las pantallas los cargan con `require` solo si están.
 */

let mapa: boolean | null = null;
let ubicacion: boolean | null = null;

/** ¿El binario trae `react-native-webview`? (el mapa de ubicación lo necesita). */
export function mapaDisponible(): boolean {
  if (mapa === null) {
    try {
      mapa = TurboModuleRegistry.get('RNCWebViewModule') != null;
    } catch {
      mapa = false;
    }
  }
  return mapa;
}

/** ¿El binario trae `expo-location`? (el botón «mi ubicación» lo necesita). */
export function ubicacionDisponible(): boolean {
  if (ubicacion === null) {
    try {
      ubicacion = requireOptionalNativeModule('ExpoLocation') != null;
    } catch {
      ubicacion = false;
    }
  }
  return ubicacion;
}

let archivos: boolean | null = null;

/**
 * ¿El binario trae el sistema de archivos de Expo? Llega como dependencia de
 * `expo`, así que el APK 1.0.0 ya lo incluye; se verifica igual antes de usarlo
 * para guardar PDFs en el teléfono.
 */
export function archivosDisponibles(): boolean {
  if (archivos === null) {
    try {
      archivos = Platform.OS === 'android' && requireOptionalNativeModule('ExponentFileSystem') != null;
    } catch {
      archivos = false;
    }
  }
  return archivos;
}
