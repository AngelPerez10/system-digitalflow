import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconCheck, IconChevron, IconClose, IconMas, IconPin, IconWrench } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ServicioOpcion } from '@/types/cotizacion';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  formatearTelefono,
  limpiarTelefono,
  PROBLEMATICA_MAX,
  TELEFONO_MAX,
  type ClienteOrden,
} from '../crearOrdenForm';
import {
  Rotulo,
  useActivo,
  useOndas,
  useRebote,
  useSacudida,
} from './movimientoNuevaOrden';
import { Aparece, Atajo, CajaCampo, CampoTexto, Presionable, rellenoCampo } from './nuevaOrdenUi';

/**
 * Cuerpos de las tarjetas «Cliente» y «Servicio» de Nueva orden.
 *
 * Cada estado tiene su propio gesto de movimiento, con significado:
 * - El buscador «late» con ondas de radar mientras falta el cliente (primer paso).
 * - Al elegir cliente, la tarjeta de identidad marina entra con resorte, el
 *   avatar gira a su sitio y un brillo la cruza una vez.
 * - El teléfono llena diez segmentos dígito a dígito; completo, una ola verde.
 * - El pin del mapa cae con rebote y emite ondas.
 * - Los servicios elegidos entran subiendo y salen deslizándose; el
 *   contador salta al cambiar.
 * - Un error sacude su campo.
 */

/* ------------------------------------------------------------------ */
/* Cliente                                                             */
/* ------------------------------------------------------------------ */

export function SeccionCliente({
  cliente,
  telefono,
  recibe,
  direccion,
  esMapa,
  conMapa,
  errorCliente,
  errorTelefono,
  disabled,
  onBuscar,
  onTelefono,
  onRecibe,
  onDireccion,
  onMapa,
  onVerMapa,
  onQuitarMapa,
}: {
  cliente: ClienteOrden | null;
  telefono: string;
  recibe: string;
  direccion: string;
  /** `direccion` es un enlace de Google Maps (punto marcado). */
  esMapa: boolean;
  /** El mapa nativo está disponible en este build. */
  conMapa: boolean;
  errorCliente?: string;
  errorTelefono?: string;
  disabled: boolean;
  onBuscar: () => void;
  onTelefono: (digitos: string) => void;
  onRecibe: (v: string) => void;
  onDireccion: (v: string) => void;
  onMapa: () => void;
  onVerMapa: () => void;
  onQuitarMapa: () => void;
}) {
  return (
    <View style={g.seccion}>
      {cliente ? (
        <IdentidadCliente key={cliente.id} cliente={cliente} disabled={disabled} onCambiar={onBuscar} />
      ) : (
        <BuscadorCliente error={errorCliente} disabled={disabled} onPress={onBuscar} />
      )}

      <CampoTelefono value={telefono} error={errorTelefono} disabled={disabled} onChange={onTelefono} />

      <CampoTexto
        label="Recibe en sitio"
        value={recibe}
        onChangeText={onRecibe}
        placeholder="Quién atiende al técnico (opcional)"
        autoCapitalize="words"
        maxLength={100}
        editable={!disabled}
      />

      <Aparece clave={esMapa ? 'mapa' : 'texto'} desde={10}>
        {esMapa ? (
          <MapaMarcado disabled={disabled} conMapa={conMapa} onVer={onVerMapa} onCambiar={onMapa} onQuitar={onQuitarMapa} />
        ) : (
          <View style={g.grupo}>
            <CampoTexto
              label="Ubicación"
              value={direccion}
              onChangeText={onDireccion}
              placeholder="Calle, número, colonia o referencia"
              editable={!disabled}
            />
            {conMapa ? <BotonMapa disabled={disabled} onPress={onMapa} /> : null}
          </View>
        )}
      </Aparece>
    </View>
  );
}

/** Estado vacío: el primer paso de la orden. Late con ondas de radar. */
export function BuscadorCliente({ error, disabled, onPress }: { error?: string; disabled: boolean; onPress: () => void }) {
  const { colors, scheme } = useTheme();
  const ondas = useOndas(!disabled, 2, 2000);
  const sacudida = useSacudida(error);

  return (
    <View style={g.grupoXs}>
      <Animated.View style={{ transform: [{ translateX: sacudida }] }}>
        <Presionable
          accessibilityRole="button"
          accessibilityLabel="Buscar cliente, obligatorio"
          accessibilityHint="Abre el buscador del catálogo"
          onPress={onPress}
          disabled={disabled}
          style={(pressed) => [
            c.buscador,
            {
              borderColor: error ? colors.danger : 'transparent',
              backgroundColor: error ? colors.dangerBg : pressed ? colors.primaryRing : rellenoCampo(scheme),
            },
          ]}
        >
          <View style={c.radar}>
            {ondas.map((v, i) => (
              <Animated.View
                key={i}
                style={[
                  c.onda,
                  {
                    borderColor: error ? colors.danger : colors.primary,
                    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.85] }) }],
                  },
                ]}
              />
            ))}
            <View style={[c.radarCentro, { backgroundColor: error ? colors.danger : colors.primary }]}>
              <Lupa color={colors.onPrimary} />
            </View>
          </View>
          <View style={g.flexMin}>
            <Text style={[c.buscadorTitulo, { color: colors.ink }]}>
              Buscar cliente<Text style={{ color: colors.danger }}> *</Text>
            </Text>
            <Text style={[c.buscadorAyuda, { color: colors.inkSubtle }]} numberOfLines={1}>
              Nombre, RFC o teléfono del catálogo
            </Text>
          </View>
          <IconChevron direction="right" color={colors.inkSubtle} size={14} />
        </Presionable>
      </Animated.View>
      {error ? (
        <Aparece clave={error}>
          <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        </Aparece>
      ) : null}
    </View>
  );
}

/**
 * Tarjeta de identidad marina. Se monta de nuevo con cada cliente (`key`),
 * así cada cambio repite la coreografía: la tarjeta entra con resorte, el
 * avatar gira a su sitio, el texto sube y un brillo diagonal la cruza.
 */
export function IdentidadCliente({
  cliente,
  disabled,
  onCambiar,
}: {
  cliente: ClienteOrden;
  disabled: boolean;
  onCambiar: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const tarjeta = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const avatar = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const texto = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const brillo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.parallel([
      Animated.spring(tarjeta, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(90),
        Animated.spring(avatar, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(texto, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.timing(brillo, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduced, tarjeta, avatar, texto, brillo]);

  const subir = (v: Animated.Value, px: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [px, 0] }) }],
  });

  return (
    <Animated.View
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={[
        c.identidad,
        { backgroundColor: colors.navy },
        {
          opacity: tarjeta.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: tarjeta.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        },
      ]}
      accessible
      accessibilityLabel={`Cliente: ${cliente.nombre}, ${cliente.prospecto ? 'prospecto' : 'cliente del catálogo'}`}
    >
      {ancho > 0 && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            c.brillo,
            {
              opacity: brillo.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-120, ancho + 40] }) },
                { skewX: '-20deg' },
              ],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          c.avatar,
          {
            opacity: avatar,
            transform: [
              { scale: avatar.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: avatar.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
            ],
          },
        ]}
      >
        <Text style={[c.avatarTexto, { color: colors.onNavy }]}>{inicialesUsuarioDisplay(cliente.nombre, '?')}</Text>
      </Animated.View>

      <Animated.View style={[g.flexMin, subir(texto, 10)]}>
        <Text style={[c.nombre, { color: colors.onNavy }]} numberOfLines={2}>
          {cliente.nombre}
        </Text>
        <View style={[c.insignia, { backgroundColor: cliente.prospecto ? colors.gold : 'rgba(255,255,255,0.14)' }]}>
          <Text style={[c.insigniaTexto, { color: cliente.prospecto ? colors.navy : colors.onNavy }]}>
            {cliente.prospecto ? 'Prospecto' : 'Cliente del catálogo'}
          </Text>
        </View>
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cambiar cliente. Actual: ${cliente.nombre}`}
        onPress={onCambiar}
        disabled={disabled}
        hitSlop={6}
        style={({ pressed }) => [c.cambiar, { backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.14)' }]}
      >
        <Text style={[c.cambiarTexto, { color: colors.onNavy }]}>Cambiar</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Teléfono a 10 dígitos, agrupado para leerlo (314 123 4567). Diez segmentos
 * se llenan dígito a dígito; completo, una ola verde los recorre y entra la
 * palomita.
 */
function CampoTelefono({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (digitos: string) => void;
}) {
  const { colors } = useTheme();
  const ref = useRef<TextInput>(null);
  const [foco, setFoco] = useState(false);
  const sacudida = useSacudida(error);
  const completo = value.length === TELEFONO_MAX;
  const check = useRebote(completo);
  const enUso = useActivo(foco || value.length > 0, 200);

  return (
    <Animated.View style={{ transform: [{ translateX: sacudida }] }}>
      <Pressable onPress={() => ref.current?.focus()} accessible={false}>
        <CajaCampo label="Teléfono de contacto" requerido error={error} activo={foco}>
          <View style={c.telefonoFila}>
            <TextInput
              ref={ref}
              value={formatearTelefono(value)}
              // Sin `maxLength` nativo: cortaría un número pegado con lada
              // (+1 415…) antes de que `limpiarTelefono` la quite.
              onChangeText={(v) => onChange(limpiarTelefono(v))}
              placeholder="314 123 4567"
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!disabled}
              accessibilityLabel="Teléfono de contacto, obligatorio, 10 dígitos"
              accessibilityValue={{ text: `${value.length} de ${TELEFONO_MAX} dígitos` }}
              placeholderTextColor={colors.inkSubtle}
              selectionColor={colors.primary}
              onFocus={() => setFoco(true)}
              onBlur={() => setFoco(false)}
              style={[c.telefonoInput, !value ? c.telefonoVacio : null, { color: colors.ink }]}
            />
            <Animated.View
              style={[
                c.telefonoCheck,
                { backgroundColor: colors.success, opacity: check, transform: [{ scale: check }] },
              ]}
              importantForAccessibility="no-hide-descendants"
            >
              <IconCheck color={colors.onPrimary} size={12} />
            </Animated.View>
          </View>
          <Animated.View style={{ opacity: enUso }}>
            <MedidorDigitos n={value.length} completo={completo} />
          </Animated.View>
          <Text style={[c.telefonoAyuda, { color: colors.inkSubtle }]}>
            10 dígitos, sin lada · México, EE. UU. o Canadá
          </Text>
        </CajaCampo>
      </Pressable>
    </Animated.View>
  );
}

function MedidorDigitos({ n, completo }: { n: number; completo: boolean }) {
  return (
    <View style={c.medidor} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: TELEFONO_MAX }, (_, i) => (
        <SegmentoDigito key={i} lleno={i < n} completo={completo} indice={i} />
      ))}
    </View>
  );
}

function SegmentoDigito({ lleno, completo, indice }: { lleno: boolean; completo: boolean; indice: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const relleno = useActivo(lleno, 160);
  const ola = useRef(new Animated.Value(completo ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      ola.setValue(completo ? 1 : 0);
      return;
    }
    const anim = Animated.timing(ola, {
      toValue: completo ? 1 : 0,
      duration: completo ? 260 : 120,
      delay: completo ? indice * 35 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [completo, indice, ola, reduced]);

  return (
    <View style={[c.segmento, { backgroundColor: colors.line }]}>
      <Animated.View style={[c.segmentoLleno, { backgroundColor: colors.primary, transform: [{ scaleX: relleno }] }]} />
      <Animated.View
        style={[
          c.segmentoLleno,
          {
            backgroundColor: colors.success,
            opacity: ola,
            transform: [{ scaleY: ola.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.8, 1] }) }],
          },
        ]}
      />
    </View>
  );
}

/** Acceso al mapa cuando la ubicación aún es texto. */
function BotonMapa({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const { colors, scheme } = useTheme();
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel="Marcar ubicación en el mapa"
      onPress={onPress}
      disabled={disabled}
      style={(pressed) => [
        c.botonMapa,
        { backgroundColor: pressed ? colors.primaryRing : rellenoCampo(scheme) },
      ]}
    >
      <View style={[c.botonMapaIcono, { backgroundColor: colors.primaryRing }]}>
        <IconPin color={colors.primary} size={15} />
      </View>
      <View style={g.flexMin}>
        <Text style={[c.botonMapaTitulo, { color: colors.ink }]}>Marcar en el mapa</Text>
        <Text style={[c.botonMapaAyuda, { color: colors.inkSubtle }]} numberOfLines={1}>
          Más preciso para el técnico
        </Text>
      </View>
      <IconChevron direction="right" color={colors.inkSubtle} size={13} />
    </Presionable>
  );
}

/**
 * Punto marcado: un mapa dibujado (calles, avenida) con el pin que cae con
 * rebote, su sombra que crece al tocar el suelo y ondas que salen de él.
 */
function MapaMarcado({
  disabled,
  conMapa,
  onVer,
  onCambiar,
  onQuitar,
}: {
  disabled: boolean;
  conMapa: boolean;
  onVer: () => void;
  onCambiar: () => void;
  onQuitar: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const caida = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [aterrizo, setAterrizo] = useState(reduced);
  const ondas = useOndas(aterrizo, 2, 2200);

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.sequence([
      Animated.delay(140),
      Animated.spring(caida, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setAterrizo(true);
    });
    return () => anim.stop();
  }, [caida, reduced]);

  return (
    <View style={[c.mapa, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <View
        style={[c.lienzo, { backgroundColor: colors.statusPausadoBg }]}
        accessible
        accessibilityLabel="Ubicación marcada en el mapa"
      >
        {/* Calles dibujadas: decoración, no un mapa real. */}
        <View style={[c.calleH, { top: '24%', backgroundColor: colors.surface }]} />
        <View style={[c.calleH, { top: '72%', backgroundColor: colors.surface }]} />
        <View style={[c.calleV, { left: '18%', backgroundColor: colors.surface }]} />
        <View style={[c.calleV, { left: '70%', backgroundColor: colors.surface }]} />
        <View style={[c.avenida, { backgroundColor: colors.goldSoftBg }]} />

        <View style={c.centro}>
          {ondas.map((v, i) => (
            <Animated.View
              key={i}
              style={[
                c.ondaPin,
                {
                  borderColor: colors.primary,
                  opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }, { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }],
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              c.sombra,
              {
                backgroundColor: colors.ink,
                opacity: caida.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
                transform: [{ scaleX: caida.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
              },
            ]}
          />
          <Animated.View
            style={[
              c.pin,
              {
                opacity: caida.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                transform: [{ translateY: caida.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }],
              },
            ]}
          >
            <View style={[c.pinCabeza, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <IconPin color={colors.onPrimary} size={16} />
            </View>
            <View style={[c.pinPunta, { backgroundColor: colors.primary }]} />
          </Animated.View>
        </View>
      </View>

      <View style={c.mapaPie}>
        <View style={g.flexMin}>
          <Text style={[c.mapaTitulo, { color: colors.ink }]}>Punto marcado en el mapa</Text>
          <Text style={[c.mapaAyuda, { color: colors.inkSubtle }]}>El técnico llegará con la ruta exacta.</Text>
        </View>
      </View>
      <View style={c.mapaAcciones}>
        <Atajo label="Ver en Maps" onPress={onVer} />
        {conMapa ? <Atajo label="Mover" disabled={disabled} onPress={onCambiar} /> : null}
        <Atajo label="Quitar" disabled={disabled} onPress={onQuitar} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Servicio                                                            */
/* ------------------------------------------------------------------ */

export function SeccionServicio({
  servicios,
  seleccion,
  problematica = '',
  error,
  disabled,
  onQuitar,
  onCatalogo,
  onProblematica,
  rotulo = 'Servicios a realizar',
  children,
}: {
  /** `null` mientras carga el catálogo. */
  servicios: ServicioOpcion[] | null;
  /** Ids en el orden en que se agregaron. */
  seleccion: number[];
  problematica?: string;
  error?: string;
  disabled: boolean;
  onQuitar: (id: number) => void;
  onCatalogo: () => void;
  /** Sin él no se muestra el campo de problemática (p. ej. en proyectos). */
  onProblematica?: (v: string) => void;
  rotulo?: string;
  /** Contenido extra bajo la lista (p. ej. la pregunta de monitoreo). */
  children?: React.ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const sacudida = useSacudida(error);
  const nombres = useMemo(() => new Map((servicios ?? []).map((sv) => [sv.id, sv.nombre])), [servicios]);
  const elegidos = seleccion.map((id) => ({ id, nombre: nombres.get(id) ?? 'Servicio' }));
  const cargando = servicios === null;

  return (
    <View style={g.seccion}>
      <View style={g.grupo}>
        <View style={s.cabeza}>
          <Rotulo texto={rotulo} requerido error={Boolean(error)} />
          <Contador n={seleccion.length} />
        </View>

        <Animated.View style={[g.grupo, { transform: [{ translateX: sacudida }] }]}>
          {elegidos.length === 0 ? (
            <SinServicios error={Boolean(error)} cargando={cargando} disabled={disabled} onAgregar={onCatalogo} />
          ) : (
            <>
              <View style={[s.lista, { borderColor: colors.line, backgroundColor: colors.surface }]}>
                {elegidos.map((sv, i) => (
                  <FilaServicio
                    key={sv.id}
                    numero={i + 1}
                    nombre={sv.nombre}
                    ultima={i === elegidos.length - 1}
                    disabled={disabled}
                    onQuitar={() => onQuitar(sv.id)}
                  />
                ))}
              </View>
              <Presionable
                accessibilityRole="button"
                accessibilityLabel="Agregar otro servicio del catálogo"
                onPress={onCatalogo}
                disabled={disabled || cargando}
                style={(pressed) => [
                  s.agregarOtro,
                  { backgroundColor: pressed ? colors.primaryRing : rellenoCampo(scheme) },
                ]}
              >
                <IconMas color={colors.primary} size={13} />
                <Text style={[s.agregarOtroTexto, { color: colors.primary }]}>Agregar otro servicio</Text>
              </Presionable>
            </>
          )}
        </Animated.View>

        {error ? (
          <Aparece clave={error}>
            <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
              {error}
            </Text>
          </Aparece>
        ) : null}
      </View>

      {children}

      {onProblematica ? <CampoProblematica value={problematica} disabled={disabled} onChange={onProblematica} /> : null}
    </View>
  );
}

/** Estado vacío: la llave «flota» y un botón azul lleva al catálogo. */
function SinServicios({
  error,
  cargando,
  disabled,
  onAgregar,
}: {
  error: boolean;
  cargando: boolean;
  disabled: boolean;
  onAgregar: () => void;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const flota = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flota, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [flota, reduced]);

  return (
    <View
      style={[
        s.vacio,
        { borderColor: error ? colors.danger : 'transparent', backgroundColor: error ? colors.dangerBg : rellenoCampo(scheme) },
      ]}
    >
      <View style={s.vacioFila}>
      <Animated.View
        style={[
          s.vacioIcono,
          {
            backgroundColor: error ? colors.surface : colors.primaryRing,
            transform: [
              { translateY: flota.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) },
              { rotate: flota.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
            ],
          },
        ]}
        importantForAccessibility="no-hide-descendants"
      >
        <IconWrench color={error ? colors.danger : colors.primary} size={18} />
      </Animated.View>
      <View style={s.vacioTextos}>
        <Text style={[s.vacioTitulo, { color: colors.ink }]}>Aún no hay servicios</Text>
        <Text style={[s.vacioAyuda, { color: colors.inkSubtle }]}>Elige del catálogo lo que se hará en sitio.</Text>
      </View>
      </View>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel="Agregar servicio del catálogo, obligatorio"
        onPress={onAgregar}
        disabled={disabled || cargando}
        escala={0.96}
        style={(pressed) => [
          s.agregar,
          { backgroundColor: cargando ? colors.lineStrong : pressed ? colors.navy : colors.primary },
        ]}
      >
        {cargando ? null : <IconMas color={colors.onPrimary} size={13} />}
        <Text style={[s.agregarTexto, { color: colors.onPrimary }]}>{cargando ? 'Cargando catálogo…' : 'Agregar servicio'}</Text>
      </Presionable>
    </View>
  );
}

/**
 * Servicio elegido: entra subiendo con resorte; al quitarlo se desliza a la
 * derecha y se desvanece antes de salir de la lista.
 */
function FilaServicio({
  numero,
  nombre,
  ultima,
  disabled,
  onQuitar,
}: {
  numero: number;
  nombre: string;
  ultima: boolean;
  disabled: boolean;
  onQuitar: () => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.spring(v, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);

  const quitar = () => {
    if (saliendo) return;
    if (reduced) {
      onQuitar();
      return;
    }
    setSaliendo(true);
    Animated.timing(v, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
      onQuitar(),
    );
  };

  return (
    <Animated.View
      style={[
        s.fila,
        !ultima ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line } : null,
        {
          opacity: v,
          transform: saliendo
            ? [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }]
            : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <Aparece clave={numero}>
        <View style={[s.numero, { backgroundColor: colors.navy }]}>
          <Text style={[s.numeroTexto, { color: colors.onNavy }]}>{numero}</Text>
        </View>
      </Aparece>
      <Text style={[s.nombre, { color: colors.ink }]} numberOfLines={2}>
        {nombre}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${nombre}`}
        onPress={quitar}
        disabled={disabled || saliendo}
        hitSlop={8}
        style={({ pressed }) => [s.quitar, { backgroundColor: pressed ? colors.dangerBg : colors.surfaceSunken }]}
      >
        <IconClose color={colors.inkMuted} size={12} />
      </Pressable>
    </Animated.View>
  );
}

/** Pastilla con el número de elegidos: salta cada vez que cambia. */
function Contador({ n }: { n: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const salto = useRef(new Animated.Value(1)).current;
  const previo = useRef(n);

  useEffect(() => {
    if (previo.current === n) return;
    previo.current = n;
    if (reduced) return;
    salto.setValue(0.7);
    const anim = Animated.spring(salto, { toValue: 1, friction: 4, tension: 260, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [n, salto, reduced]);

  return (
    <Animated.View
      style={[
        s.contador,
        { backgroundColor: n > 0 ? colors.navy : colors.surfaceSunken, borderColor: n > 0 ? colors.navy : colors.line },
        { transform: [{ scale: salto }] },
      ]}
      accessible
      accessibilityLabel={`${n} ${n === 1 ? 'servicio elegido' : 'servicios elegidos'}`}
      accessibilityLiveRegion="polite"
    >
      <Text style={[s.contadorTexto, { color: n > 0 ? colors.onNavy : colors.inkSubtle }]}>
        {n === 0 ? 'Ninguno' : `${n} ${n === 1 ? 'elegido' : 'elegidos'}`}
      </Text>
    </Animated.View>
  );
}

/**
 * Problemática con barra de capacidad: crece con lo escrito y cambia de color
 * al acercarse al límite.
 */
function CampoProblematica({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const ref = useRef<TextInput>(null);
  const [foco, setFoco] = useState(false);
  const proporcion = value.length / PROBLEMATICA_MAX;
  const avance = useRef(new Animated.Value(proporcion)).current;
  const visible = useActivo(foco || value.length > 0, 200);

  useEffect(() => {
    if (reduced) {
      avance.setValue(proporcion);
      return;
    }
    const anim = Animated.timing(avance, { toValue: proporcion, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [proporcion, avance, reduced]);

  const color = proporcion > 0.95 ? colors.danger : proporcion > 0.8 ? colors.gold : colors.primary;

  return (
    <Pressable onPress={() => ref.current?.focus()} accessible={false}>
      <CajaCampo
        label="Problemática"
        activo={foco}
        contador={foco || value.length > 0 ? `${value.length}/${PROBLEMATICA_MAX}` : undefined}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          placeholder="Falla reportada, síntomas o indicaciones (opcional)"
          multiline
          maxLength={PROBLEMATICA_MAX}
          editable={!disabled}
          accessibilityLabel="Problemática, opcional"
          placeholderTextColor={colors.inkSubtle}
          selectionColor={colors.primary}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          style={[s.problematica, { color: colors.ink }]}
        />
        <Animated.View style={[s.capacidad, { backgroundColor: colors.line, opacity: visible }]} importantForAccessibility="no-hide-descendants">
          <Animated.View style={[s.capacidadLlena, { backgroundColor: color, transform: [{ scaleX: avance }] }]} />
        </Animated.View>
      </CajaCampo>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */

const g = StyleSheet.create({
  seccion: { gap: spacing.md },
  grupo: { gap: spacing.sm },
  grupoXs: { gap: spacing.xs },
  flexMin: { flex: 1, minWidth: 0 },
  ayuda: { ...type.caption, fontSize: 12.5, lineHeight: 17 },
  error: { ...type.caption, fontSize: 12, paddingHorizontal: spacing.xs },
});

const RADAR = 42;
const PIN = 34;

const c = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    minHeight: TOUCH_TARGET + 24,
  },
  radar: { width: RADAR, height: RADAR, alignItems: 'center', justifyContent: 'center' },
  onda: { position: 'absolute', width: RADAR, height: RADAR, borderRadius: RADAR / 2, borderWidth: 2 },
  radarCentro: { width: RADAR, height: RADAR, borderRadius: RADAR / 2, alignItems: 'center', justifyContent: 'center' },
  buscadorTitulo: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.25 },
  buscadorAyuda: { ...type.caption, fontSize: 12.5, marginTop: 1 },

  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  brillo: { position: 'absolute', top: -20, bottom: -20, left: 0, width: 70, backgroundColor: 'rgba(255,255,255,0.13)' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontFamily: font.bold, fontSize: 18, letterSpacing: -0.3 },
  nombre: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.35 },
  insignia: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 6 },
  insigniaTexto: { fontFamily: font.semibold, fontSize: 11 },
  cambiar: { borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center' },
  cambiarTexto: { fontFamily: font.semibold, fontSize: 13 },

  telefonoFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  telefonoInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semibold,
    fontSize: 19,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: 28,
  },
  telefonoVacio: { fontFamily: font.regular, fontSize: 16, letterSpacing: 0 },
  telefonoCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  medidor: { flexDirection: 'row', gap: 3, marginTop: spacing.xs },
  segmento: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  segmentoLleno: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, transformOrigin: 'left center' },
  telefonoAyuda: { ...type.caption, fontSize: 11.5, marginTop: 2 },

  botonMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: TOUCH_TARGET + 6,
  },
  botonMapaIcono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  botonMapaTitulo: { fontFamily: font.semibold, fontSize: 14.5 },
  botonMapaAyuda: { ...type.caption, fontSize: 12 },

  mapa: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  lienzo: { height: 132, overflow: 'hidden' },
  calleH: { position: 'absolute', left: 0, right: 0, height: 7 },
  calleV: { position: 'absolute', top: 0, bottom: 0, width: 7 },
  avenida: { position: 'absolute', left: '-20%', width: '140%', top: '46%', height: 12, transform: [{ rotate: '-14deg' }] },
  centro: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ondaPin: { position: 'absolute', top: '50%', marginTop: 6, width: PIN, height: PIN / 2.6, borderRadius: PIN, borderWidth: 2 },
  sombra: { position: 'absolute', top: '50%', marginTop: 12, width: 20, height: 6, borderRadius: 10 },
  pin: { alignItems: 'center', marginTop: -PIN + 6 },
  pinCabeza: { width: PIN, height: PIN, borderRadius: PIN / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  pinPunta: { width: 10, height: 10, marginTop: -6, transform: [{ rotate: '45deg' }] },
  mapaPie: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  mapaTitulo: { fontFamily: font.semibold, fontSize: 14.5 },
  mapaAyuda: { ...type.caption, fontSize: 12 },
  mapaAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md },
});

const s = StyleSheet.create({
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  lista: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: TOUCH_TARGET + 4 },
  numero: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: font.semibold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  nombre: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  quitar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  agregarOtro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md + 2,
    minHeight: TOUCH_TARGET - 4,
  },
  agregarOtroTexto: { fontFamily: font.semibold, fontSize: 14 },
  vacio: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  vacioFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vacioTextos: { flex: 1, minWidth: 0, gap: 1 },
  vacioIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.2 },
  vacioAyuda: { ...type.caption, fontSize: 12.5 },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md + 2,
    minHeight: TOUCH_TARGET - 4,
  },
  agregarTexto: { fontFamily: font.semibold, fontSize: 14.5 },
  contador: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
  contadorTexto: { fontFamily: font.semibold, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  problematica: {
    minHeight: 84,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: 15.5,
    lineHeight: 21,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  capacidad: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: spacing.xs },
  capacidadLlena: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 2, transformOrigin: 'left center' },
});
