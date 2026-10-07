import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { Avatar } from '@/components/Avatar';
import { PickerFechaHora } from '@/components/DateTimeField';
import { IconCalendar, IconCheck, IconPerson } from '@/components/icons';
import { Lupa } from '@/components/ListadoChrome';
import { describirFecha, diasProximos, primerNombre } from '@/features/orders/agendaFechas';
import {
  ChipSeleccion,
  Llegada,
  Rotulo,
  useActivo,
} from '@/features/orders/components/movimientoNuevaOrden';
import { Aparece, CampoTexto, Presionable, rellenoCampo } from '@/features/orders/components/nuevaOrdenUi';
import { ReglaHora } from '@/features/orders/components/ReglaHora';
import { BuscadorCliente, IdentidadCliente, SeccionServicio } from '@/features/orders/components/seccionesCaptura';
import { Persona, PersonaFantasma } from '@/features/orders/components/seccionesNuevaOrden';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius, spacing, type } from '@/theme/tokens';
import type { ServicioOpcion } from '@/types/cotizacion';
import type { TecnicoOpcion } from '@/types/orden';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { expandirRango, QUIEN_AUTORIZO_MAX, TEXTO_LIBRE_MAX, type ClienteProyecto } from '../crearProyectoForm';

/**
 * Cuerpos de las tarjetas de «Nuevo proyecto». Mismo lenguaje que Nueva orden
 * (campos rellenos, carruseles, chips con relleno marino) y dos piezas propias:
 * una tira de días donde se elige un rango (el primero y el último se pintan
 * en marino; los de en medio se iluminan uno tras otro) y un campo de fecha
 * con resumen legible.
 */

/* ------------------------------------------------------------------ */
/* Cliente                                                             */
/* ------------------------------------------------------------------ */

export function SeccionClienteProyecto({
  cliente,
  quienAutorizo,
  errorCliente,
  disabled,
  onBuscar,
  onQuienAutorizo,
}: {
  cliente: ClienteProyecto | null;
  quienAutorizo: string;
  errorCliente?: string;
  disabled: boolean;
  onBuscar: () => void;
  onQuienAutorizo: (v: string) => void;
}) {
  return (
    <View style={g.seccion}>
      {cliente ? (
        <IdentidadCliente key={cliente.id} cliente={cliente} disabled={disabled} onCambiar={onBuscar} />
      ) : (
        <BuscadorCliente error={errorCliente} disabled={disabled} onPress={onBuscar} />
      )}
      <CampoTexto
        label="Quién autorizó"
        value={quienAutorizo}
        onChangeText={onQuienAutorizo}
        placeholder="Nombre de quien dio el visto bueno (opcional)"
        autoCapitalize="words"
        maxLength={QUIEN_AUTORIZO_MAX}
        editable={!disabled}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Alcance                                                             */
/* ------------------------------------------------------------------ */

export function SeccionAlcance({
  servicios,
  seleccion,
  errorTipos,
  conMonitoreo,
  monitoreo,
  errorMonitoreo,
  disabled,
  onQuitar,
  onCatalogo,
  onMonitoreo,
}: {
  servicios: ServicioOpcion[] | null;
  seleccion: number[];
  errorTipos?: string;
  /** Algún tipo es «Alarmas»: aparece la pregunta de monitoreo. */
  conMonitoreo: boolean;
  monitoreo: boolean | null;
  errorMonitoreo?: string;
  disabled: boolean;
  onQuitar: (id: number) => void;
  onCatalogo: () => void;
  onMonitoreo: (v: boolean) => void;
}) {
  return (
    <SeccionServicio
      servicios={servicios}
      seleccion={seleccion}
      error={errorTipos}
      disabled={disabled}
      onQuitar={onQuitar}
      onCatalogo={onCatalogo}
      rotulo="Tipos de trabajo"
    >
      {conMonitoreo ? (
        <Aparece clave="monitoreo" desde={10}>
          <PreguntaMonitoreo valor={monitoreo} error={errorMonitoreo} disabled={disabled} onChange={onMonitoreo} />
        </Aparece>
      ) : null}
    </SeccionServicio>
  );
}

/** «¿Cuenta con monitoreo?» — sin respuesta por defecto, como en la web. */
function PreguntaMonitoreo({
  valor,
  error,
  disabled,
  onChange,
}: {
  valor: boolean | null;
  error?: string;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const opciones: { v: boolean; label: string; ayuda: string }[] = [
    { v: true, label: 'Sí', ayuda: 'Central de monitoreo' },
    { v: false, label: 'No', ayuda: 'Solo local' },
  ];
  return (
    <View style={g.grupo}>
      <Rotulo texto="¿Cuenta con monitoreo?" requerido error={Boolean(error)} />
      <View style={m.fila} accessibilityRole="radiogroup" accessibilityLabel="Cuenta con monitoreo">
        {opciones.map((o) => (
          <ChipSeleccion
            key={o.label}
            activo={valor === o.v}
            disabled={disabled}
            punteado={Boolean(error) && valor === null}
            style={m.opcion}
            contenidoStyle={m.opcionContenido}
            accessibilityLabel={`${o.label}, ${o.ayuda}`}
            onPress={() => onChange(o.v)}
          >
            {(t) => (
              <>
                <View style={m.opcionFila}>
                  {t.relleno ? <IconCheck color={t.acento} size={13} /> : null}
                  <Text style={[m.opcionLabel, { color: t.fuerte }]}>{o.label}</Text>
                </View>
                <Text style={[m.opcionAyuda, { color: t.suave }]}>{o.ayuda}</Text>
              </>
            )}
          </ChipSeleccion>
        ))}
      </View>
      {error && valor === null ? (
        <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Equipo                                                              */
/* ------------------------------------------------------------------ */

const MAX_RIEL = 8;

export function SeccionEquipo({
  tecnicos,
  errorTecnicos,
  yo,
  responsable,
  auxiliares,
  errorAuxiliares,
  vehiculo,
  herramientas,
  disabled,
  onResponsable,
  onAuxiliar,
  onBuscar,
  onVehiculo,
  onHerramientas,
}: {
  tecnicos: TecnicoOpcion[] | null;
  errorTecnicos: string | null;
  yo: TecnicoOpcion | null;
  responsable: number | null;
  auxiliares: number[];
  errorAuxiliares?: string;
  vehiculo: string;
  herramientas: string;
  disabled: boolean;
  onResponsable: (id: number | null) => void;
  /** Agrega o quita un auxiliar. */
  onAuxiliar: (id: number) => void;
  onBuscar: (para: 'responsable' | 'auxiliar') => void;
  onVehiculo: (v: string) => void;
  onHerramientas: (v: string) => void;
}) {
  const { colors } = useTheme();
  const personas = useMemo(() => {
    const otros = (tecnicos ?? []).filter((t) => t.id !== yo?.id);
    return yo ? [yo, ...otros] : otros;
  }, [tecnicos, yo]);

  /** Lo que se ve en un carrusel: los primeros del catálogo y, al frente, los elegidos que no cabrían. */
  const visibles = (elegidos: number[], excluir: number | null) => {
    const base = personas.filter((p) => p.id !== excluir);
    const top = base.slice(0, MAX_RIEL);
    const extra = base.filter((p) => elegidos.includes(p.id) && !top.some((t) => t.id === p.id));
    return [...extra, ...top];
  };
  const rielResponsable = visibles(responsable !== null ? [responsable] : [], null);
  const rielAuxiliares = visibles(auxiliares, responsable);
  const nombre = (id: number | null) => personas.find((p) => p.id === id)?.nombre ?? 'Técnico';

  const resumen =
    responsable === null
      ? 'Sin responsable: se asigna después desde la web.'
      : `${responsable === yo?.id ? 'Tú quedas' : `${primerNombre(nombre(responsable))} queda`} como responsable${
          auxiliares.length ? ` con ${auxiliares.length} ${auxiliares.length === 1 ? 'auxiliar' : 'auxiliares'}` : ''
        }.`;

  return (
    <View style={g.seccion}>
      <View style={g.grupo}>
        <Rotulo texto="Técnico responsable" derecha={tecnicos ? `${tecnicos.length} técnicos` : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={g.sangrado} contentContainerStyle={g.riel}>
          {tecnicos === null
            ? Array.from({ length: 5 }, (_, i) => <PersonaFantasma key={i} />)
            : [
                ...rielResponsable.map((p, i) => (
                  <Persona
                    key={p.id}
                    indice={i}
                    etiqueta={p.id === yo?.id ? 'Yo' : primerNombre(p.nombre)}
                    activo={responsable === p.id}
                    disabled={disabled}
                    accessibilityLabel={p.id === yo?.id ? `Yo como responsable (${p.nombre})` : `${p.nombre} como responsable`}
                    onPress={() => onResponsable(p.id)}
                    circulo={<AvatarPersona persona={p} esYo={p.id === yo?.id} />}
                  />
                )),
                <Persona
                  key="nadie"
                  indice={rielResponsable.length}
                  etiqueta="Sin asignar"
                  activo={responsable === null}
                  disabled={disabled}
                  accessibilityLabel="Sin responsable"
                  onPress={() => onResponsable(null)}
                  circulo={
                    <View style={[e.circulo, { borderColor: colors.lineStrong, borderStyle: 'dashed' }]}>
                      <IconPerson color={colors.inkSubtle} size={18} />
                    </View>
                  }
                />,
                <Persona
                  key="buscar"
                  indice={rielResponsable.length + 1}
                  etiqueta="Buscar"
                  activo={false}
                  disabled={disabled}
                  accessibilityLabel="Buscar otro técnico como responsable"
                  onPress={() => onBuscar('responsable')}
                  circulo={
                    <View style={[e.circulo, { borderColor: colors.lineStrong }]}>
                      <Lupa color={colors.primary} />
                    </View>
                  }
                />,
              ]}
        </ScrollView>
      </View>

      <View style={g.grupo}>
        <Rotulo
          texto="Auxiliares"
          derecha={auxiliares.length ? `${auxiliares.length} ${auxiliares.length === 1 ? 'elegido' : 'elegidos'}` : 'Opcional'}
          error={Boolean(errorAuxiliares)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={g.sangrado} contentContainerStyle={g.riel}>
          {tecnicos === null
            ? Array.from({ length: 4 }, (_, i) => <PersonaFantasma key={i} />)
            : [
                ...rielAuxiliares.map((p, i) => (
                  <Persona
                    key={p.id}
                    indice={i}
                    etiqueta={p.id === yo?.id ? 'Yo' : primerNombre(p.nombre)}
                    activo={auxiliares.includes(p.id)}
                    disabled={disabled}
                    accessibilityLabel={`${auxiliares.includes(p.id) ? 'Quitar' : 'Agregar'} a ${p.nombre} como auxiliar`}
                    onPress={() => onAuxiliar(p.id)}
                    circulo={<AvatarPersona persona={p} esYo={p.id === yo?.id} />}
                  />
                )),
                <Persona
                  key="buscar"
                  indice={rielAuxiliares.length}
                  etiqueta="Buscar"
                  activo={false}
                  disabled={disabled}
                  accessibilityLabel="Buscar un auxiliar"
                  onPress={() => onBuscar('auxiliar')}
                  circulo={
                    <View style={[e.circulo, { borderColor: colors.lineStrong }]}>
                      <Lupa color={colors.primary} />
                    </View>
                  }
                />,
              ]}
        </ScrollView>
        {errorTecnicos ? (
          <Text style={[g.error, { color: colors.danger }]}>{errorTecnicos}</Text>
        ) : errorAuxiliares ? (
          <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
            {errorAuxiliares}
          </Text>
        ) : (
          <Aparece clave={resumen}>
            <Text style={[g.ayuda, { color: colors.inkSubtle }]} accessibilityLiveRegion="polite">
              {resumen}
            </Text>
          </Aparece>
        )}
      </View>

      <CampoTexto
        label="Vehículo asignado"
        value={vehiculo}
        onChangeText={onVehiculo}
        placeholder="Unidad o placas (opcional)"
        maxLength={TEXTO_LIBRE_MAX}
        editable={!disabled}
      />
      <CampoTexto
        label="Herramientas generales"
        value={herramientas}
        onChangeText={onHerramientas}
        placeholder="Escalera, taladro, cable… (opcional)"
        multiline
        maxLength={TEXTO_LIBRE_MAX}
        editable={!disabled}
        contador={`${herramientas.length}/${TEXTO_LIBRE_MAX}`}
      />
    </View>
  );
}

function AvatarPersona({ persona, esYo }: { persona: TecnicoOpcion; esYo: boolean }) {
  const { colors } = useTheme();
  return (
    <Avatar
      uri={persona.avatarUrl}
      iniciales={inicialesUsuarioDisplay(persona.nombre, '?')}
      size={50}
      fondo={esYo ? colors.goldSoftBg : colors.primaryRing}
      color={esYo ? colors.goldSoftText : colors.primary}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Calendario                                                          */
/* ------------------------------------------------------------------ */

const DIAS_TIRA = 21;
const ANCHO_DIA = 54;
const GAP_DIA = 6;

export function SeccionCalendario({
  autorizacion,
  desde,
  hasta,
  hora,
  errores,
  disabled,
  onAutorizacion,
  onRango,
  onHora,
}: {
  autorizacion: string;
  desde: string;
  hasta: string;
  hora: string;
  errores: { autorizacion?: string; desde?: string; hasta?: string; hora?: string };
  disabled: boolean;
  onAutorizacion: (iso: string) => void;
  onRango: (desde: string, hasta: string) => void;
  onHora: (hhmm: string) => void;
}) {
  const { colors } = useTheme();
  const [picker, setPicker] = useState<'autorizacion' | 'desde' | 'hasta' | null>(null);
  const hoy = useMemo(() => new Date(), []);
  const dias = useMemo(() => diasProximos(DIAS_TIRA, hoy), [hoy]);
  const rango = useMemo(() => expandirRango(desde, hasta), [desde, hasta]);
  const enRango = useMemo(() => new Set(rango), [rango]);
  const fin = hasta || desde;

  /** Primer toque fija el inicio; el segundo, el final (si va después); otro más, reinicia. */
  const tocarDia = (iso: string) => {
    if (!desde || (desde && hasta) || iso < desde) onRango(iso, '');
    else if (iso === desde) onRango(iso, '');
    else onRango(desde, iso);
  };

  const tiraRef = useRef<ScrollView>(null);
  const primera = useRef(true);
  const indiceInicio = dias.findIndex((d) => d.iso === desde);
  useEffect(() => {
    const destino = Math.max(indiceInicio, 0);
    tiraRef.current?.scrollTo({ x: Math.max(destino - 1, 0) * (ANCHO_DIA + GAP_DIA), animated: !primera.current });
    primera.current = false;
  }, [indiceInicio]);

  const totalDias = rango.length;
  const descDesde = describirFecha(desde, hoy);
  const descFin = describirFecha(fin, hoy);
  const resumenRango =
    totalDias <= 1
      ? descDesde
        ? `Un día · ${descDesde.diaSemana} ${descDesde.fecha}`
        : 'Elige el primer día'
      : `${totalDias} días · del ${descDesde?.fecha ?? '—'} al ${descFin?.fecha ?? '—'}`;

  return (
    <View style={g.seccion}>
      <CampoFecha
        label="Fecha de autorización"
        iso={autorizacion}
        hoy={hoy}
        error={errores.autorizacion}
        disabled={disabled}
        onPress={() => setPicker('autorizacion')}
      />

      <View style={g.grupo}>
        <Rotulo texto="Días de trabajo" requerido error={Boolean(errores.desde || errores.hasta)} />
        <Text style={[g.ayuda, { color: colors.inkSubtle }]}>Toca el primer día y luego el último.</Text>
        <ScrollView
          ref={tiraRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={g.sangrado}
          contentContainerStyle={[g.riel, { gap: GAP_DIA }]}
          accessibilityLabel="Días de trabajo"
        >
          {dias.map((d, i) => {
            const extremo = d.iso === desde || d.iso === fin;
            return (
              <Llegada key={d.iso} indice={i}>
                <DiaRango
                  etiqueta={d.etiqueta}
                  dia={d.dia}
                  mes={d.mesCorto}
                  esHoy={d.esHoy}
                  extremo={extremo}
                  enRango={enRango.has(d.iso) && !extremo}
                  retraso={Math.max(0, rango.indexOf(d.iso)) * 30}
                  disabled={disabled}
                  onPress={() => tocarDia(d.iso)}
                />
              </Llegada>
            );
          })}
        </ScrollView>
        <View style={c.extremos}>
          <MiniFecha label="Desde" iso={desde} error={Boolean(errores.desde)} disabled={disabled} onPress={() => setPicker('desde')} />
          <MiniFecha
            label="Hasta"
            iso={hasta}
            vacio="Mismo día"
            error={Boolean(errores.hasta)}
            disabled={disabled}
            onPress={() => setPicker('hasta')}
          />
        </View>
        <Aparece clave={resumenRango}>
          <View style={[c.resumen, { backgroundColor: colors.primaryRing }]}>
            <IconCalendar color={colors.primary} size={13} />
            <Text style={[c.resumenTexto, { color: colors.primary }]} numberOfLines={1}>
              {resumenRango}
            </Text>
          </View>
        </Aparece>
        {errores.desde || errores.hasta ? (
          <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
            {errores.desde ?? errores.hasta}
          </Text>
        ) : null}
      </View>

      <ReglaHora hora={hora} error={errores.hora} disabled={disabled} onHora={onHora} />

      <PickerFechaHora
        visible={picker === 'autorizacion'}
        mode="date"
        value={autorizacion}
        titulo="Fecha de autorización"
        onChange={onAutorizacion}
        onClose={() => setPicker(null)}
      />
      <PickerFechaHora
        visible={picker === 'desde'}
        mode="date"
        value={desde}
        titulo="Primer día"
        onChange={(v) => onRango(v, hasta && hasta >= v ? hasta : '')}
        onClose={() => setPicker(null)}
      />
      <PickerFechaHora
        visible={picker === 'hasta'}
        mode="date"
        value={hasta || desde}
        titulo="Último día"
        onChange={(v) => (v < desde ? onRango(v, desde) : onRango(desde, v === desde ? '' : v))}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

/**
 * Día de la tira de rango. Los extremos se rellenan de marino (con resorte);
 * los de en medio se iluminan en cascada, de izquierda a derecha.
 */
function DiaRango({
  etiqueta,
  dia,
  mes,
  esHoy,
  extremo,
  enRango,
  retraso,
  disabled,
  onPress,
}: {
  etiqueta: string;
  dia: number;
  mes: string;
  esHoy: boolean;
  extremo: boolean;
  enRango: boolean;
  retraso: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const marino = useActivo(extremo, 200);
  const tinte = useRef(new Animated.Value(enRango ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      tinte.setValue(enRango ? 1 : 0);
      return;
    }
    const anim = Animated.timing(tinte, {
      toValue: enRango ? 1 : 0,
      duration: enRango ? 220 : 120,
      delay: enRango ? retraso : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enRango, retraso, tinte, reduced]);

  const contenido = (fuerte: string, suave: string, acento: string) => (
    <>
      <Text style={[c.diaSemana, { color: esHoy ? acento : suave }]}>{etiqueta}</Text>
      <Text style={[c.diaNumero, { color: fuerte }]}>{dia}</Text>
      <Text style={[c.diaMes, { color: suave }]}>{mes}</Text>
    </>
  );

  return (
    <Presionable
      accessibilityRole="button"
      accessibilityState={{ selected: extremo || enRango, disabled }}
      accessibilityLabel={`${esHoy ? 'Hoy, ' : ''}${dia} de ${mes}${extremo ? ', extremo del rango' : enRango ? ', dentro del rango' : ''}`}
      onPress={onPress}
      disabled={disabled}
      escala={0.92}
      style={[c.dia, { backgroundColor: rellenoCampo(scheme) }]}
    >
      {/* Tinte a media intensidad: los extremos (marino) deben destacar sobre los días de en medio. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          c.diaCapa,
          { backgroundColor: colors.primaryRing, opacity: tinte.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) },
        ]}
      />
      <View style={c.diaContenido}>{contenido(colors.ink, colors.inkMuted, colors.primary)}</View>
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          c.diaCapa,
          c.diaContenido,
          {
            backgroundColor: colors.navy,
            opacity: marino,
            transform: [{ scale: marino.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          },
        ]}
      >
        {contenido(colors.onNavy, colors.onNavyMuted, colors.gold)}
      </Animated.View>
    </Presionable>
  );
}

/** Campo de fecha relleno: día de la semana y fecha legible, con «Hoy/Mañana…» al lado. */
function CampoFecha({
  label,
  iso,
  hoy,
  error,
  disabled,
  onPress,
}: {
  label: string;
  iso: string;
  hoy: Date;
  error?: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  const d = describirFecha(iso, hoy);
  return (
    <View style={g.grupoXs}>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${d ? `${d.diaSemana} ${d.fecha}` : 'sin fecha'}. Cambiar`}
        onPress={onPress}
        disabled={disabled}
        style={(pressed) => [
          c.campoFecha,
          {
            backgroundColor: error ? colors.dangerBg : pressed ? colors.primaryRing : rellenoCampo(scheme),
            borderColor: error ? colors.danger : 'transparent',
          },
        ]}
      >
        <View style={[c.campoFechaIcono, { backgroundColor: colors.primaryRing }]}>
          <IconCalendar color={colors.primary} size={17} />
        </View>
        <View style={g.flexMin}>
          <Text style={[c.campoFechaLabel, { color: error ? colors.danger : colors.inkMuted }]}>
            {label}
            <Text style={{ color: colors.danger }}> *</Text>
          </Text>
          <Aparece clave={iso}>
            <Text style={[c.campoFechaValor, { color: d ? colors.ink : colors.inkSubtle }]} numberOfLines={1}>
              {d ? `${d.diaSemana} ${d.fecha}` : 'Elegir fecha'}
            </Text>
          </Aparece>
        </View>
        {d ? (
          <View style={[c.pildora, { backgroundColor: colors.primaryRing }]}>
            <Text style={[c.pildoraTexto, { color: colors.primary }]}>{d.relativo}</Text>
          </View>
        ) : null}
      </Presionable>
      {error ? (
        <Text style={[g.error, { color: colors.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Extremo del rango, tocable para abrir el calendario del sistema. */
function MiniFecha({
  label,
  iso,
  vacio = 'Elegir',
  error,
  disabled,
  onPress,
}: {
  label: string;
  iso: string;
  vacio?: string;
  error: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  const d = describirFecha(iso);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${d ? d.fecha : vacio}. Cambiar`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        c.mini,
        {
          backgroundColor: pressed ? colors.primaryRing : rellenoCampo(scheme),
          borderColor: error ? colors.danger : 'transparent',
        },
      ]}
    >
      <Text style={[c.miniLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Aparece clave={iso || 'vacio'}>
        <Text style={[c.miniValor, { color: d ? colors.ink : colors.inkSubtle }]} numberOfLines={1}>
          {d ? `${d.dia} ${d.mesCorto}` : vacio}
        </Text>
      </Aparece>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */

const g = StyleSheet.create({
  seccion: { gap: spacing.md },
  grupo: { gap: spacing.sm },
  grupoXs: { gap: spacing.xs },
  flexMin: { flex: 1, minWidth: 0 },
  sangrado: { marginHorizontal: -spacing.lg },
  riel: { paddingHorizontal: spacing.lg, paddingVertical: 2, gap: spacing.xs },
  ayuda: { ...type.caption, fontSize: 12.5, lineHeight: 17 },
  error: { ...type.caption, fontSize: 12, paddingHorizontal: spacing.xs },
});

const m = StyleSheet.create({
  fila: { flexDirection: 'row', gap: spacing.sm },
  opcion: { flex: 1, borderRadius: radius.md + 2 },
  opcionContenido: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, gap: 2, borderRadius: radius.md + 2 },
  opcionFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  opcionLabel: { fontFamily: font.semibold, fontSize: 15 },
  opcionAyuda: { ...type.caption, fontSize: 12 },
});

const e = StyleSheet.create({
  circulo: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

const c = StyleSheet.create({
  dia: { width: ANCHO_DIA, height: 72, borderRadius: radius.lg, overflow: 'hidden' },
  diaCapa: { borderRadius: radius.lg },
  diaContenido: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  diaSemana: { fontFamily: font.semibold, fontSize: 11 },
  diaNumero: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  diaMes: { fontFamily: font.medium, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  extremos: { flexDirection: 'row', gap: spacing.sm },
  mini: { flex: 1, borderWidth: 1, borderRadius: radius.md + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 1 },
  miniLabel: { ...type.caption, fontSize: 12, fontFamily: font.medium },
  miniValor: { fontFamily: font.semibold, fontSize: 15.5 },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  resumenTexto: { fontFamily: font.semibold, fontSize: 12.5, flexShrink: 1 },
  campoFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  campoFechaIcono: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  campoFechaLabel: { ...type.caption, fontSize: 12.5, fontFamily: font.medium },
  campoFechaValor: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, marginTop: 1 },
  pildora: { borderRadius: radius.pill, paddingHorizontal: spacing.sm + 1, paddingVertical: 3 },
  pildoraTexto: { fontFamily: font.semibold, fontSize: 11.5 },
});
