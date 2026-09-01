import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Geist_400Regular from '@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf';
import Geist_500Medium from '@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf';
import Geist_600SemiBold from '@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf';
import Geist_700Bold from '@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { SessionProvider } from '@/auth/SessionProvider';
import { animationDurationMs, fadeAnimation } from '@/navigation/navMotion';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

void SplashScreen.preventAutoHideAsync();

function ThemedChrome() {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const fade = fadeAnimation(reduced);

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

  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) console.warn('[fonts] Geist no se pudo cargar:', fontError.message);
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <ThemeProvider>
          <SessionProvider>
            <ThemedChrome />
          </SessionProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}
