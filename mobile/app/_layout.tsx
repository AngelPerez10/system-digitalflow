import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Geist_400Regular from '@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf';
import Geist_500Medium from '@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf';
import Geist_600SemiBold from '@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf';
import Geist_700Bold from '@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Appearance, View } from 'react-native';
import { SessionProvider } from '@/auth/SessionProvider';
import { animationDurationMs, fadeAnimation } from '@/navigation/navMotion';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { darkColors, lightColors, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

void SplashScreen.preventAutoHideAsync();

/**
 * Color de arranque, resuelto **sincrónicamente** antes de que monte el árbol
 * de React. Cubre el hueco en el que aún no hay `ThemeProvider` (recarga de
 * Fast Refresh, fuentes cargando, hidratación de `SecureStore`): sin esto el
 * fondo nativo de la ventana es blanco y en modo oscuro se ve un flash.
 */
const BOOT_BG =
  Appearance.getColorScheme() === 'dark' ? darkColors.canvas : lightColors.canvas;

function ThemedChrome({ fontsReady }: { fontsReady: boolean }) {
  const { colors, scheme, hydrated } = useTheme();
  const reduced = useReducedMotion();
  const fade = fadeAnimation(reduced);

  // El splash nativo se sostiene hasta que hay fuentes **y** el tema quedó
  // hidratado. Así el parpadeo claro→oscuro de la hidratación ocurre detrás
  // del splash y nunca llega a verse.
  useEffect(() => {
    if (fontsReady && hydrated) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, hydrated]);

  // Acceso: crossfade un poco más largo. Las tres pantallas comparten la
  // cabecera marina, así que el fundido se lee como continuidad (la hoja
  // blanca cambia, la marca no).
  const acceso = {
    headerShown: false,
    animation: 'fade' as const,
    animationDuration: reduced ? 0 : 260,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: type.bodyMedium,
          // `contentStyle` es también el fondo del contenedor nativo del stack
          // durante la animación de push: fijarlo al canvas evita que asome el
          // fondo por defecto (claro) en la transición.
          contentStyle: { backgroundColor: colors.canvas },
          animation: fade,
          animationDuration: animationDurationMs('fade', reduced),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="bienvenida" options={acceso} />
        <Stack.Screen name="login" options={acceso} />
        <Stack.Screen name="login-cliente" options={acceso} />
        <Stack.Screen name="registro-cliente" options={acceso} />
        <Stack.Screen
          name="cliente"
          options={{ headerShown: false, animation: 'fade', animationDuration: 180 }}
        />
        <Stack.Screen
          name="(app)"
          options={{ headerShown: false, animation: 'fade', animationDuration: 180 }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  useEffect(() => {
    if (fontError) console.warn('[fonts] Geist no se pudo cargar:', fontError.message);
  }, [fontError]);

  // Antes: `if (!fontsLoaded && !fontError) return null;` — ese `null` dejaba
  // ver el fondo nativo (blanco) en cada recarga; en modo oscuro era el flash.
  // Ahora siempre montamos el árbol sobre `BOOT_BG` y el splash tapa el resto.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: BOOT_BG }}>
        <ThemeProvider>
          <SessionProvider>
            <ThemedChrome fontsReady={fontsReady} />
          </SessionProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}
