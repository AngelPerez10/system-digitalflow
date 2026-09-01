import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { portalAcceso } from '@/auth/portalAcceso';
import { useSession } from '@/auth/SessionProvider';
import { AuthHero } from '@/components/AuthHero';
import { BrandMark } from '@/components/Brand';
import { RolSelectorCard } from '@/components/RolSelectorCard';
import { LoadingState } from '@/components/StateViews';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconBuilding, IconWrench } from '@/features/orders/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, spacing, type } from '@/theme/tokens';
import { useReducedMotion } from '@/utils/useReducedMotion';

/**
 * Primera pantalla sin sesión: el usuario elige si entra como técnico o
 * cliente antes de ver el formulario de acceso correspondiente. La elección se
 * guarda al instante para que el próximo arranque salte directo a ese acceso.
 *
 * Cabecera marina de borde recto + hoja blanca redondeada que se solapa encima,
 * con encabezado propio (misma anatomía que el login).
 */
const BLOQUES = 2;

export default function BienvenidaScreen() {
  const router = useRouter();
  const { status } = useSession();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  const entrada = useRef(Array.from({ length: BLOQUES }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduced) {
      entrada.forEach((v) => v.setValue(1));
      return;
    }
    const secuencia = Animated.stagger(
      110,
      entrada.map((v) =>
        Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
      ),
    );
    secuencia.start();
    return () => secuencia.stop();
  }, [reduced, entrada]);

  if (status === 'loading') return <LoadingState label="Restaurando sesión…" />;
  if (status === 'signedIn') return <Redirect href="/" />;

  const elegido = portalAcceso.get();

  const elegir = async (portal: 'tecnico' | 'cliente') => {
    await portalAcceso.set(portal);
    router.replace(portal === 'cliente' ? '/login-cliente' : '/login');
  };

  const bloque = (i: number) => {
    const v = entrada[i] ?? entrada[0]!;
    return {
      opacity: v,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    };
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['bottom']}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <AuthHero topRight={<ThemeToggle onDark />} roundBottom={false}>
          <BrandMark size={60} animated background={colors.gold} foreground={colors.navy} />
          <Text style={[styles.nombre, { color: colors.onNavy }]} accessibilityRole="header">
            SertelPro
          </Text>
          <Text style={[styles.lema, { color: colors.onNavyMuted }]}>
            El mismo sistema de siempre, en tu bolsillo.
          </Text>
        </AuthHero>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              ...elevationFor(colors, 'card'),
              shadowOffset: { width: 0, height: -10 },
              shadowRadius: 24,
              shadowOpacity: scheme === 'dark' ? 0.5 : 0.12,
            },
          ]}
        >
          <Animated.View style={[styles.sheetHead, bloque(0)]}>
            <Text style={[styles.sheetTitulo, { color: colors.ink }]} accessibilityRole="header">
              ¿Cómo entras hoy?
            </Text>
            <Text style={[styles.sheetAyuda, { color: colors.inkSubtle }]}>
              Elige tu perfil para ir al acceso correcto.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.opciones, bloque(1)]}>
            <RolSelectorCard
              titulo="Soy técnico"
              descripcion="Órdenes y evidencias en sitio."
              tono="primary"
              destacada={elegido === 'tecnico'}
              icono={<IconWrench color={colors.onNavy} size={24} />}
              onPress={() => void elegir('tecnico')}
              accessibilityHint="Abre el acceso para técnicos de campo"
            />
            <RolSelectorCard
              titulo="Soy cliente"
              descripcion="Seguimiento de tus servicios."
              tono="neutral"
              destacada={elegido === 'cliente'}
              icono={<IconBuilding color={colors.ink} size={24} />}
              onPress={() => void elegir('cliente')}
              accessibilityHint="Abre el acceso para clientes"
            />
          </Animated.View>

          <Text style={[styles.pie, { color: colors.inkSubtle }]}>SertelPro · Campo y clientes</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  nombre: {
    fontFamily: font.bold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.2,
    marginTop: spacing.sm,
  },
  lema: { ...type.body, textAlign: 'center', maxWidth: 320, marginTop: 2 },
  panel: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  sheetHead: { marginBottom: spacing.xl },
  sheetTitulo: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  sheetAyuda: { ...type.caption, marginTop: 4, lineHeight: 18 },
  opciones: { gap: spacing.md },
  pie: {
    ...type.caption,
    fontSize: 10,
    fontFamily: font.semibold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
