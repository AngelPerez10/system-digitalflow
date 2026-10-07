import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { PickerFechaHora } from '@/components/DateTimeField';
import { IconCalendar, IconCheck, IconClock, IconPerson } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { useTheme } from '@/theme/ThemeProvider';
import { font, lightColors, radius, spacing, type } from '@/theme/tokens';
import type { PrioridadPool, TecnicoOpcion } from '@/types/orden';
import { formatHora } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { describirFecha, diasProximos, primerNombre } from '../agendaFechas';
import { ChipSeleccion, Desliza, Llegada, Rotulo, useActivo, useLatido, useLlegada, useRebote } from './movimientoNuevaOrden';
import { Aparece, Presionable, rellenoCampo } from './nuevaOrdenUi';
import { ReglaHora } from './ReglaHora';

/**
 * Cuerpos de las tarjetas «Asignación» y «Agenda» de Nueva orden.
 *
 * Todo se elige con un toque, sin modales para el caso común: un carrusel de
 * técnicos y una pista de prioridad; una tira de días y horarios sugeridos.
 * El movimiento es solo `opacity`/`transform` en el hilo nativo y cada pieza
 * respeta «reducir movimiento» (salta al estado final).
 */

/* ------------------------------------------------------------------ */
/* Asignación                                                          */
/* ------------------------------------------------------------------ */

const MAX_RIEL = 8;
const AVATAR = 50;
const ANILLO = AVATAR + 10;

type PersonaRiel =
  | { tipo: 'tecnico'; tecnico: TecnicoOpcion; esYo: boolean }
  | { tipo: 'nadie' }
  | { tipo: 'buscar' };

export function SeccionAsignacion({
  tecnicos,
  errorTecnicos,
  seleccion,
  yo,
  esAdmin,
  prioridad,
  errorPrioridad,
  disabled,
  onTecnico,
  onBuscar,
  onPrioridad,
}: {
  /** `null` mientras carga. */
  tecnicos: TecnicoOpcion[] | null;
  errorTecnicos: string | null;
  seleccion: number | null;
  yo: TecnicoOpcion | null;
  esAdmin: boolean;
  prioridad: PrioridadPool | '';
  errorPrioridad?: string;
  disabled: boolean;
  onTecnico: (id: number | null) => void;
  onBuscar: () => void;
  onPrioridad: (p: PrioridadPool) => void;
}) {
  const { colors } = useTheme();

  const riel = useMemo<PersonaRiel[]>(() => {
    const otros = (tecnicos ?? []).filter((t) => t.id !== yo?.id);
    let lista = otros.slice(0, MAX_RIEL);
    // Si se eligió a alguien desde «Buscar» que no cabe en el carrusel, va al frente.
    if (seleccion !== null && seleccion !== yo?.id && !lista.some((t) => t.id === seleccion)) {
      const elegido = otros.find((t) => t.id === seleccion) ?? { id: seleccion, nombre: 'Técnico', avatarUrl: null };
      lista = [elegido, ...lista.slice(0, MAX_RIEL - 1)];
    }
    return [
      ...(yo ? [{ tipo: 'tecnico' as const, tecnico: yo, esYo: true }] : []),
      ...lista.map((t) => ({ tipo: 'tecnico' as const, tecnico: t, esYo: false })),
      { tipo: 'nadie' as const },
      { tipo: 'buscar' as const },
    ];
  }, [tecnicos, yo, seleccion]);

  const elegido = riel.find((p) => p.tipo === 'tecnico' && p.tecnico.id === seleccion);
  const resumen =
    seleccion === null
      ? 'Sin técnico: se asigna después desde la web.'
      : elegido?.tipo === 'tecnico' && elegido.esYo
        ? 'Te la asignas: aparecerá en tus pendientes.'
        : `${primerNombre(elegido?.tipo === 'tecnico' ? elegido.tecnico.nombre : 'El técnico')} recibirá un aviso al crearla.`;

  return (
    <View style={g.seccion}>
      <View style={g.grupo}>
        <Rotulo texto="Quién la atiende" derecha={tecnicos ? `${tecnicos.length} técnicos` : undefined} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={g.sangrado}
          contentContainerStyle={g.rielContenido}
          accessibilityRole="radiogroup"
          accessibilityLabel="Técnico asignado"
        >
          {tecnicos === null
            ? Array.from({ length: 5 }, (_, i) => <PersonaFantasma key={i} />)
            : riel.map((p, i) => {
                if (p.tipo === 'buscar') {
                  return (
                    <Persona
                      key="buscar"
                      indice={i}
                      etiqueta="Buscar"
                      activo={false}
                      disabled={disabled}
                      accessibilityLabel="Buscar otro técnico"
                      onPress={onBuscar}
                      circulo={
                        <View style={[a.circulo, { borderColor: colors.lineStrong, borderStyle: 'solid' }]}>
                          <Lupa color={colors.primary} />
                        </View>
                      }
                    />
                  );
                }
                if (p.tipo === 'nadie') {
                  return (
                    <Persona
                      key="nadie"
                      indice={i}
                      etiqueta="Sin asignar"
                      activo={seleccion === null}
                      disabled={disabled}
                      accessibilityLabel="Dejar sin asignar"
                      onPress={() => onTecnico(null)}
                      circulo={
                        <View style={[a.circulo, { borderColor: colors.lineStrong, borderStyle: 'dashed' }]}>
                          <IconPerson color={colors.inkSubtle} size={18} />
                        </View>
                      }
                    />
                  );
                }
                const t = p.tecnico;
                return (
                  <Persona
                    key={t.id}
                    indice={i}
                    etiqueta={p.esYo ? 'Yo' : primerNombre(t.nombre)}
                    activo={seleccion === t.id}
                    disabled={disabled}
                    accessibilityLabel={p.esYo ? `Asignármela (${t.nombre})` : t.nombre}
                    onPress={() => onTecnico(t.id)}
                    circulo={
                      <Avatar
                        uri={t.avatarUrl}
                        iniciales={inicialesUsuarioDisplay(t.nombre, '?')}
                        size={AVATAR}
                        fondo={p.esYo ? colors.goldSoftBg : colors.primaryRing}
                        color={p.esYo ? colors.goldSoftText : colors.primary}
                      />
                    }
                  />
                );
              })}
        </ScrollView>
        {errorTecnicos ? (
          <Text style={[g.error, { color: colors.danger }]}>{errorTecnicos}</Text>
        ) : (
          <Aparece clave={resumen}>
            <Text style={[g.ayuda, { color: colors.inkSubtle }]} accessibilityLiveRegion="polite">
              {resumen}
            </Text>
          </Aparece>
        )}
      </View>

      {esAdmin ? (
        <View style={g.grupo}>
          <View style={[g.divisor, { backgroundColor: colors.line }]} />
          <Rotulo texto="Prioridad" requerido error={Boolean(errorPrioridad && !prioridad)} />
          <PistaPrioridad valor={prioridad} disabled={disabled} error={Boolean(errorPrioridad)} onChange={onPrioridad} />
          <DetallePrioridad valor={prioridad} error={errorPrioridad} />
        </View>
      ) : null}
    </View>
  );
}

/** Persona del carrusel: anillo azul y palomita verde al elegirla. */
export function Persona({
  indice,
  etiqueta,
  activo,
  disabled,
  accessibilityLabel,
  circulo,
  onPress,
}: {
  indice: number;
  etiqueta: string;
  activo: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  circulo: React.ReactNode;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const llegada = useLlegada(indice);
  const sel = useActivo(activo, 220);
  const check = useRebote(activo);

  return (
    <Animated.View style={llegada}>
      <Presionable
        accessibilityRole="radio"
        accessibilityState={{ checked: activo, disabled }}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        escala={0.92}
        style={a.persona}
      >
        <View style={a.anilloCaja}>
          <Animated.View
            style={[
              a.anillo,
              {
                borderColor: colors.primary,
                opacity: sel,
                transform: [{ scale: sel.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: sel.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
            {circulo}
          </Animated.View>
          <Animated.View
            style={[
              a.check,
              { backgroundColor: colors.success, borderColor: colors.surface, opacity: check, transform: [{ scale: check }] },
            ]}
          >
            <IconCheck color={colors.onPrimary} size={10} />
          </Animated.View>
        </View>
        <Text
          style={[a.nombre, { color: activo ? colors.ink : colors.inkMuted }, activo ? { fontFamily: font.semibold } : null]}
          numberOfLines={1}
        >
          {etiqueta}
        </Text>
      </Presionable>
    </Animated.View>
  );
}

/** Lugar de una persona mientras carga la lista: late suave. */
export function PersonaFantasma() {
  const { colors } = useTheme();
  const v = useLatido();
  return (
    <Animated.View style={[a.persona, { opacity: v }]} importantForAccessibility="no-hide-descendants">
      <View style={a.anilloCaja}>
        <View style={[a.fantasmaCirculo, { backgroundColor: colors.line }]} />
      </View>
      <View style={[a.fantasmaTexto, { backgroundColor: colors.line }]} />
    </Animated.View>
  );
}

const PRIORIDADES: { key: PrioridadPool; label: string; plazo: string; detalle: string; solido: string }[] = [
  {
    key: 'alta',
    label: 'Alta',
    plazo: 'Hoy',
    detalle: 'Atender hoy. Aparece primero en la bolsa de órdenes.',
    solido: lightColors.danger,
  },
  {
    key: 'media',
    label: 'Media',
    plazo: 'Esta semana',
    detalle: 'Atender en los próximos días.',
    solido: lightColors.statusPendienteText,
  },
  {
    key: 'baja',
    label: 'Baja',
    plazo: 'Sin prisa',
    detalle: 'Atender cuando haya espacio en la agenda.',
    solido: lightColors.statusResueltoText,
  },
];

/** Color de punto por prioridad en el tema actual (los sólidos son del claro: llevan texto blanco). */
function puntoPrioridad(colors: ReturnType<typeof useTheme>['colors'], key: PrioridadPool): string {
  return key === 'alta' ? colors.danger : key === 'media' ? colors.statusPendienteText : colors.statusResueltoText;
}

const PAD = 4;

/**
 * Pista de tres niveles. El indicador se desliza con resorte y su color se
 * funde de un nivel al siguiente en el camino; el texto en blanco va
 * «enmascarado» dentro del indicador, así cambia de color justo donde pasa.
 */
function PistaPrioridad({
  valor,
  disabled,
  error,
  onChange,
}: {
  valor: PrioridadPool | '';
  disabled: boolean;
  error: boolean;
  onChange: (p: PrioridadPool) => void;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const indice = PRIORIDADES.findIndex((p) => p.key === valor);
  const pos = useRef(new Animated.Value(Math.max(indice, 0))).current;
  const visible = useRef(new Animated.Value(indice >= 0 ? 1 : 0)).current;
  const indicePrevio = useRef(indice);
  const celda = ancho > 0 ? (ancho - PAD * 2) / PRIORIDADES.length : 0;
  const tx = useMemo(() => Animated.multiply(pos, celda), [pos, celda]);
  const txInverso = useMemo(() => Animated.multiply(pos, -celda), [pos, celda]);

  useEffect(() => {
    const venia = indicePrevio.current;
    indicePrevio.current = indice;
    if (indice < 0) {
      visible.setValue(0);
      return;
    }
    // Primera elección: aparece en su lugar, no viaja desde «Alta».
    if (reduced || venia < 0) {
      pos.setValue(indice);
      if (reduced) {
        visible.setValue(1);
        return;
      }
      const anim = Animated.spring(visible, { toValue: 1, friction: 7, tension: 160, useNativeDriver: true });
      anim.start();
      return () => anim.stop();
    }
    const anim = Animated.spring(pos, { toValue: indice, friction: 8.5, tension: 150, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [indice, pos, visible, reduced]);

  const contenido = (blanco: boolean) =>
    PRIORIDADES.map((p) => (
      <View key={p.key} style={[pr.celda, { width: celda }]}>
        <View style={pr.etiquetaFila}>
          <View style={[pr.punto, { backgroundColor: blanco ? colors.onPrimary : puntoPrioridad(colors, p.key) }]} />
          <Text style={[pr.label, { color: blanco ? colors.onPrimary : colors.ink }]} numberOfLines={1}>
            {p.label}
          </Text>
        </View>
        <Text
          style={[pr.plazo, { color: blanco ? 'rgba(255,255,255,0.85)' : colors.inkSubtle }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {p.plazo}
        </Text>
      </View>
    ));

  return (
    <View
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel="Prioridad"
      style={[pr.pista, { backgroundColor: rellenoCampo(scheme), borderColor: error && indice < 0 ? colors.danger : 'transparent' }]}
    >
      {/* Capa base: tinta y los objetivos táctiles reales. */}
      <View style={pr.fila}>
        <View style={pr.fila} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {celda > 0 ? contenido(false) : null}
        </View>
        <View style={StyleSheet.absoluteFill}>
          <View style={pr.fila}>
            {PRIORIDADES.map((p) => (
              <Presionable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: p.key === valor, disabled }}
                accessibilityLabel={`Prioridad ${p.label}: ${p.plazo}`}
                onPress={() => onChange(p.key)}
                disabled={disabled}
                escala={0.95}
                style={[pr.objetivo, { width: celda }]}
              >
                <View />
              </Presionable>
            ))}
          </View>
        </View>
      </View>

      {celda > 0 ? (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[
            pr.indicador,
            {
              width: celda,
              opacity: visible,
              transform: [
                { translateX: tx },
                { scale: visible.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
            },
          ]}
        >
          {PRIORIDADES.map((p, i) => (
            <Animated.View
              key={p.key}
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: p.solido,
                  opacity: pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                },
              ]}
            />
          ))}
          <Animated.View style={[pr.mascara, { width: celda * PRIORIDADES.length, transform: [{ translateX: txInverso }] }]}>
            {contenido(true)}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function DetallePrioridad({ valor, error }: { valor: PrioridadPool | ''; error?: string }) {
  const { colors } = useTheme();
  const p = PRIORIDADES.find((x) => x.key === valor);
  const texto = p ? p.detalle : (error ?? 'Ordena la bolsa de órdenes disponibles.');
  const color = p ? puntoPrioridad(colors, p.key) : error ? colors.danger : colors.lineStrong;
  return (
    <Aparece clave={valor || (error ? 'error' : 'vacio')} desde={6}>
      <View style={pr.detalle}>
        <View style={[pr.detalleBarra, { backgroundColor: color }]} />
        <Text
          style={[g.ayuda, pr.detalleTexto, { color: !p && error ? colors.danger : colors.inkMuted }]}
          accessibilityRole={!p && error ? 'alert' : undefined}
        >
          {texto}
        </Text>
      </View>
    </Aparece>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda                                                              */
/* ------------------------------------------------------------------ */

const DIAS_TIRA = 14;
const ANCHO_DIA = 58;
const GAP_DIA = spacing.sm;

export function SeccionAgenda({
  fecha,
  hora,
  errorFecha,
  errorHora,
  disabled,
  onFecha,
  onHora,
}: {
  fecha: string;
  hora: string;
  errorFecha?: string;
  errorHora?: string;
  disabled: boolean;
  onFecha: (iso: string) => void;
  onHora: (hhmm: string) => void;
}) {
  const { colors } = useTheme();
  const [picker, setPicker] = useState<'date' | null>(null);
  // El «hoy» de la pantalla: fijo mientras está abierta.
  const hoy = useMemo(() => new Date(), []);
  const dias = useMemo(() => diasProximos(DIAS_TIRA, hoy), [hoy]);
  const info = describirFecha(fecha, hoy);
  const indiceDia = dias.findIndex((d) => d.iso === fecha);
  const fueraDeTira = indiceDia < 0 && info !== null;

  // Dirección del deslizamiento del resumen: hacia adelante o atrás en el tiempo.
  const fechaPrevia = useRef(fecha);
  const direccion = fecha >= fechaPrevia.current ? 1 : -1;
  useEffect(() => {
    fechaPrevia.current = fecha;
  }, [fecha]);

  // La tira sigue a la fecha elegida; la primera vez, sin animar.
  const tiraRef = useRef<ScrollView>(null);
  const primera = useRef(true);
  useEffect(() => {
    const destino = indiceDia < 0 ? (fueraDeTira ? DIAS_TIRA : 0) : indiceDia;
    const x = Math.max(destino * (ANCHO_DIA + GAP_DIA) - (ANCHO_DIA + GAP_DIA), 0);
    tiraRef.current?.scrollTo({ x, animated: !primera.current });
    primera.current = false;
  }, [indiceDia, fueraDeTira]);

  return (
    <View style={g.seccion}>
      <ResumenAgenda clave={fecha} direccion={direccion} info={info} hora={hora} />

      <View style={g.grupo}>
        <Rotulo texto="Día de inicio" requerido error={Boolean(errorFecha)} />
        <ScrollView
          ref={tiraRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={g.sangrado}
          contentContainerStyle={[g.rielContenido, { gap: GAP_DIA }]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Día de inicio"
        >
          {dias.map((d, i) => (
            <Llegada key={d.iso} indice={i}>
              <ChipSeleccion
                activo={d.iso === fecha}
                disabled={disabled}
                style={dd.dia}
                contenidoStyle={dd.diaContenido}
                accessibilityLabel={`${d.esHoy ? 'Hoy, ' : ''}${d.dia} de ${d.mesCorto}`}
                onPress={() => onFecha(d.iso)}
              >
                {(t) => (
                  <>
                    <Text style={[dd.diaSemana, { color: d.esHoy ? t.acento : t.suave }]}>{d.etiqueta}</Text>
                    <Text style={[dd.diaNumero, { color: t.fuerte }]}>{d.dia}</Text>
                    <Text style={[dd.diaMes, { color: t.suave }]}>{d.mesCorto}</Text>
                  </>
                )}
              </ChipSeleccion>
            </Llegada>
          ))}
          <Llegada indice={DIAS_TIRA}>
            <ChipSeleccion
              activo={fueraDeTira}
              disabled={disabled}
              punteado
              style={dd.dia}
              contenidoStyle={dd.diaContenido}
              accessibilityLabel={fueraDeTira && info ? `Otra fecha: ${info.fecha}. Cambiar` : 'Elegir otra fecha'}
              onPress={() => setPicker('date')}
            >
              {(t) =>
                fueraDeTira && info ? (
                  <>
                    <Text style={[dd.diaSemana, { color: t.suave }]}>Otra</Text>
                    <Text style={[dd.diaNumero, { color: t.fuerte }]}>{info.dia}</Text>
                    <Text style={[dd.diaMes, { color: t.suave }]}>{info.mesCorto}</Text>
                  </>
                ) : (
                  <>
                    <IconCalendar color={t.acento} size={18} />
                    <Text style={[dd.diaMes, dd.otraTexto, { color: t.fuerte }]}>Otra</Text>
                  </>
                )
              }
            </ChipSeleccion>
          </Llegada>
        </ScrollView>
        {errorFecha ? (
          <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
            {errorFecha}
          </Text>
        ) : null}
      </View>

      <ReglaHora hora={hora} error={errorHora} disabled={disabled} onHora={onHora} />

      <PickerFechaHora
        visible={picker === 'date'}
        mode="date"
        value={fecha}
        titulo="Fecha de inicio"
        onChange={onFecha}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

/**
 * Hoja de calendario que se voltea al cambiar de día, y el resumen a su lado
 * deslizándose hacia adelante o atrás según el cambio.
 */
function ResumenAgenda({
  clave,
  direccion,
  info,
  hora,
}: {
  clave: string;
  direccion: number;
  info: ReturnType<typeof describirFecha>;
  hora: string;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const giro = useRef(new Animated.Value(1)).current;
  const previa = useRef(clave);

  useEffect(() => {
    if (previa.current === clave) return;
    previa.current = clave;
    if (reduced) return;
    giro.setValue(0);
    const anim = Animated.spring(giro, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clave, giro, reduced]);

  const horaTexto = hora.trim() ? formatHora(hora) : null;
  const accesible = info
    ? `Inicia ${info.relativo.toLowerCase()}, ${info.diaSemana} ${info.fecha}${horaTexto ? `, a las ${horaTexto}` : ', sin hora fija'}`
    : 'Sin fecha elegida';

  return (
    <View style={[r.caja, { backgroundColor: rellenoCampo(scheme) }]} accessible accessibilityLabel={accesible}>
      <Animated.View
        style={[
          r.hoja,
          { backgroundColor: colors.surface, borderColor: colors.line },
          {
            opacity: giro.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [
              { perspective: 600 },
              { rotateX: giro.interpolate({ inputRange: [0, 1], outputRange: ['-80deg', '0deg'] }) },
            ],
          },
        ]}
      >
        <View style={[r.hojaMes, { backgroundColor: colors.navy }]}>
          <Text style={[r.hojaMesTexto, { color: colors.onNavy }]}>{info?.mesCorto ?? '—'}</Text>
        </View>
        <Text style={[r.hojaDia, { color: colors.ink }]}>{info?.dia ?? '–'}</Text>
      </Animated.View>

      <View style={r.textos}>
        <Desliza clave={clave} direccion={direccion}>
          <Text style={[r.diaSemana, { color: colors.ink }]} numberOfLines={1}>
            {info?.diaSemana ?? 'Elige un día'}
          </Text>
          <Text style={[r.fecha, { color: colors.inkMuted }]} numberOfLines={1}>
            {info?.fecha ?? 'Toca un día de la tira'}
          </Text>
        </Desliza>
        <View style={r.pildoras}>
          {info ? (
            <Aparece clave={info.relativo}>
              <View style={[r.pildora, { backgroundColor: colors.primaryRing }]}>
                <Text style={[r.pildoraTexto, { color: colors.primary }]}>{info.relativo}</Text>
              </View>
            </Aparece>
          ) : null}
          <Aparece clave={horaTexto ?? 'sin'}>
            <View style={[r.pildora, { backgroundColor: horaTexto ? colors.goldSoftBg : colors.surface }]}>
              <IconClock color={horaTexto ? colors.goldSoftText : colors.inkSubtle} size={11} />
              <Text style={[r.pildoraTexto, { color: horaTexto ? colors.goldSoftText : colors.inkSubtle }]}>
                {horaTexto ?? 'Sin hora fija'}
              </Text>
            </View>
          </Aparece>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const g = StyleSheet.create({
  seccion: { gap: spacing.lg },
  grupo: { gap: spacing.sm },
  // El carrusel llega hasta el borde de la tarjeta; el contenido conserva el margen.
  sangrado: { marginHorizontal: -spacing.lg },
  rielContenido: { paddingHorizontal: spacing.lg, paddingVertical: 2, gap: spacing.xs },
  ayuda: { ...type.caption, fontSize: 12.5, lineHeight: 17 },
  error: { ...type.caption, fontSize: 12, paddingHorizontal: spacing.xs },
  divisor: { height: StyleSheet.hairlineWidth, marginBottom: spacing.sm },
});

const a = StyleSheet.create({
  persona: { width: 70, alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  anilloCaja: { width: ANILLO, height: ANILLO, alignItems: 'center', justifyContent: 'center' },
  anillo: { position: 'absolute', width: ANILLO, height: ANILLO, borderRadius: ANILLO / 2, borderWidth: 2.5 },
  circulo: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { fontFamily: font.medium, fontSize: 12, maxWidth: 68 },
  fantasmaCirculo: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  fantasmaTexto: { width: 40, height: 10, borderRadius: 5 },
});

const pr = StyleSheet.create({
  pista: { borderWidth: 1, borderRadius: radius.md + 4, padding: PAD, minHeight: 60 },
  fila: { flexDirection: 'row', flex: 1 },
  celda: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, gap: 1 },
  objetivo: { alignSelf: 'stretch', minHeight: 52 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: font.semibold, fontSize: 14.5, letterSpacing: -0.2 },
  plazo: { ...type.caption, fontSize: 11.5 },
  indicador: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.md + 1, overflow: 'hidden' },
  mascara: { position: 'absolute', top: 0, bottom: 0, left: 0, flexDirection: 'row' },
  detalle: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  detalleBarra: { width: 3, borderRadius: 2 },
  detalleTexto: { flex: 1, paddingVertical: 1 },
});

const dd = StyleSheet.create({
  dia: { width: ANCHO_DIA, height: 74, borderRadius: radius.lg },
  diaContenido: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: radius.lg },
  diaSemana: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.3 },
  diaNumero: { fontFamily: font.bold, fontSize: 21, lineHeight: 25, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  diaMes: { fontFamily: font.medium, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  otraTexto: { marginTop: 4 },
});

const r = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md },
  hoja: { width: 62, borderWidth: 1, borderRadius: radius.md + 2, overflow: 'hidden', alignItems: 'center' },
  hojaMes: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 3 },
  hojaMesTexto: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  hojaDia: { fontFamily: font.bold, fontSize: 26, lineHeight: 34, letterSpacing: -0.8, paddingVertical: 4, fontVariant: ['tabular-nums'] },
  textos: { flex: 1, minWidth: 0, gap: spacing.xs },
  diaSemana: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4 },
  fecha: { ...type.caption, fontSize: 13 },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
  },
  pildoraTexto: { fontFamily: font.semibold, fontSize: 11.5 },
});
