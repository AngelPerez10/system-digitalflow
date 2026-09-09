import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * En Expo Go Android (SDK 53+) el paquete `expo-notifications` tira al
 * evaluarse: ya no trae FCM. Importarlo en el arranque deja a Expo Router
 * sin `default` en todas las rutas. El push remoto solo vive en un
 * development build o en el APK de preview/producción.
 */
export function pushRemotoDisponible(): boolean {
  return !(isRunningInExpoGo() && Platform.OS === 'android');
}
