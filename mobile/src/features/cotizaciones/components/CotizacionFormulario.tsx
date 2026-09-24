import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listServicios } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { IconCotizaciones } from '@/components/AppNavbar';
import { BarraCarga } from '@/components/BarraCarga';
import { EditarHeader } from '@/components/EditarHeader';
import {
  IconAlerta,
  IconBox,
  IconCheck,
  IconChevron,
  IconDocumento,
  IconClipboard,
  IconComment,
  IconEtiqueta,
  IconPerson,
  IconPhone,
  IconWrench,
} from '@/components/icons';
import { SubmitButton, type SubmitPhase } from '@/components/SubmitButton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, MOTION, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import {
  COTIZACION_STATUSES,
  type CategoriaPartidas,
  type ConceptoCatalogo,
  type CotizacionItem,
  type CotizacionPayload,
  type PdfOpciones,
  type ServicioOpcion,
} from '@/types/cotizacion';
import { useEntrance } from '@/utils/useEntrance';
import { useReducedMotion } from '@/utils/useReducedMotion';
import {
  agruparPorCategoria,
  ANTICIPO_MIN,
  calcularTotales,
  formatCantidad,
  formatMoneda,
  medioLabel,
  statusLabel,
  statusTone,
} from '../cotizacionFormat';
import {
  aplicarCliente,
  aplicarOpcionPdf,
  construirPayload,
  hayCambios,
  hayErrores,
  lineaDesdeConcepto,
  lineaDesdeProducto,
  lineaVacia,
  primeraSeccionConError,
  requisitosPendientes,
  seccionesCompletas,
  validarForm,
  type CotizacionFormErrors,
  type CotizacionFormState,
  type OpcionPdf,
  type SeccionCotizacion,
} from '../cotizacionForm';
import { CatalogoConceptosModal } from './CatalogoConceptosModal';
import { ClientePickerModal } from './ClientePickerModal';
import { ConceptoEditorModal } from './ConceptoEditorModal';
import { grupoDeMedio, MedioContactoIcon, tonoMedio } from './MedioContactoIcon';
import { MedioContactoModal } from './MedioContactoModal';
import { CotizacionStatusIcon } from './CotizacionStatusIcon';
import { PartidaTarjeta } from './PartidaTarjeta';
import { ProductoBuscadorModal } from './ProductoBuscadorModal';
import { TipoTrabajoModal } from './TipoTrabajoModal';

interface Props {
  modo: 'nueva' | 'editar';
  folio: string;
  inicial: CotizacionFormState;
  esAdmin: boolean;
  /** Categorías de partidas de la cotización (se definen en la web). */
  categorias?: CategoriaPartidas[];
  /** Guarda en el servidor; al resolver, el formulario sale con la animación de éxito. */
  onGuardar: (payload: CotizacionPayload) => Promise<void>;
  onSalir: () => void;
}

const PRESETS_ANTICIPO = [40, 50, 60, 100];

/** Opciones de exportación con los mismos textos que la web (`CotizacionPdfOptionsPanel`). */
const OPCIONES_PDF: { key: Exclude<OpcionPdf, 'es_garantia'>; label: string; hint: string }[] = [
  {
    key: 'ocultar_precios_linea',
    label: 'Ocultar precios por línea',
    hint: 'No muestra P. UNIT., DESC (si aplica) ni IMPORTE por producto en el PDF.',
  },
  { key: 'ocultar_totales', label: 'Ocultar totales', hint: 'Oculta subtotal, IVA, total, anticipo y saldo en el PDF.' },
  {
    key: 'ocultar_detalle',
    label: 'Ocultar detalle',
    hint: 'No muestra la descripción o detalle del producto en el PDF ni en Excel.',
  },
  {
    key: 'simplificar_descripcion',
    label: 'Simplificar descripción',
    hint: 'Reemplaza el texto del producto en PDF y Excel por la descripción corta. Desactiva «Ocultar detalle» automáticamente.',
  },
];

function opcionActiva(opciones: PdfOpciones, key: OpcionPdf): boolean {
  if (key === 'ocultar_precios_linea') return opciones.ocultar_precios_unitarios && opciones.ocultar_importes_linea;
  return opciones[key];
}

function vistaPrevia(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return 'Sin descripción';
  return limpio.length > 140 ? `${limpio.slice(0, 140)}…` : limpio;
}

function aNumero(texto: string): number {
  const n = Number(texto.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formulario de cotización con los mismos campos y orden que la web: 1) Cliente
 * y seguimiento, 2) Condiciones comerciales y 3) Partidas (productos del
 * catálogo manual, SYSCOM o TVC, y conceptos) y 4) Opciones de exportación. Arriba, lo que falta para poder
 * guardar; abajo, un resumen tipo recibo y la barra fija con el total en vivo.
 */
export function CotizacionFormulario({
  modo,
  folio,
  inicial,
  esAdmin,
  categorias = [],
  onGuardar,
  onSalir,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const entrance = useEntrance(6);
  const [form, setForm] = useState<CotizacionFormState>(inicial);
  const [errores, setErrores] = useState<CotizacionFormErrors>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [fase, setFase] = useState<SubmitPhase>('idle');
  const [servicios, setServicios] = useState<ServicioOpcion[] | null>(null);
  const [clienteAbierto, setClienteAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false);
  const [editando, setEditando] = useState<CotizacionItem | null>(null);
  const [tipoAbierto, setTipoAbierto] = useState(false);
  const [medioAbierto, setMedioAbierto] = useState(false);
  const [productoAbierto, setProductoAbierto] = useState(false);
  const [anticipoTexto, setAnticipoTexto] = useState(String(inicial.anticipo_pct));
  const [descuentoTexto, setDescuentoTexto] = useState(String(inicial.descuento_cliente_pct));
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<SeccionCotizacion, number>>>({});
  /** Partidas agregadas en esta sesión: entran con una animación más notoria. */
  const recientes = useRef(new Set<string>());
  const saliendo = useRef(false);

  const guardando = fase !== 'idle';
  const dirty = modo === 'nueva' ? form.items.length > 0 || Boolean(form.cliente) : hayCambios(inicial, form);
  const completas = seccionesCompletas(form);
  const pendientes = requisitosPendientes(form);
  const totales = useMemo(
    () => calcularTotales(form.items, form.descuento_cliente_pct, form.anticipo_pct),
    [form.items, form.descuento_cliente_pct, form.anticipo_pct],
  );
  const monto = (n: number) => formatMoneda(esGarantia ? 0 : n);
  const piezas = form.items.reduce((acc, i) => acc + Math.max(0, i.cantidad), 0);
  const productos = form.items.filter((i) => i.producto_externo_id.trim()).length;
  const grupos = agruparPorCategoria(form.items, categorias);
  const tiposElegidos = (servicios ?? []).filter((sv) => form.tipo_trabajo.includes(sv.id));
  // En garantía todo se muestra en $0, como en la web y el PDF; sigue a la casilla en vivo.
  const esGarantia = form.pdf_opciones.es_garantia;
  // Como en la web: la casilla de garantía solo al crear, o si la cotización ya lo es.
  const mostrarGarantia = modo === 'nueva' || inicial.pdf_opciones.es_garantia;
  const opcionesActivas = OPCIONES_PDF.filter((o) => opcionActiva(form.pdf_opciones, o.key)).length + (esGarantia ? 1 : 0);

  useEffect(() => {
    const control = new AbortController();
    listServicios(control.signal)
      .then(setServicios)
      .catch(() => {
        if (!control.signal.aborted) setServicios([]);
      });
    return () => control.abort();
  }, []);

  const pedirSalida = useCallback(() => {
    if (!dirty || guardando || saliendo.current) {
      onSalir();
      return;
    }
    Alert.alert('¿Descartar cambios?', 'Si sales ahora se perderá lo que capturaste.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          saliendo.current = true;
          onSalir();
        },
      },
    ]);
  }, [dirty, guardando, onSalir]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty || saliendo.current) return false;
      pedirSalida();
      return true;
    });
    return () => sub.remove();
  }, [dirty, pedirSalida]);

  const actualizar = <K extends keyof CotizacionFormState>(campo: K, valor: CotizacionFormState[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGuardado(null);
  };

  const irASeccion = (seccion: SeccionCotizacion) => {
    const y = posiciones.current[seccion] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - spacing.md, 0), animated: !reduced });
  };

  const guardar = async () => {
    const validacion = validarForm(form);
    setErrores(validacion);
    if (hayErrores(validacion)) {
      setErrorGuardado('Revisa los campos marcados en rojo.');
      const seccion = primeraSeccionConError(validacion);
      if (seccion) irASeccion(seccion);
      return;
    }
    if (!dirty) {
      setErrorGuardado('No hay cambios por guardar.');
      return;
    }
    setErrorGuardado(null);
    setFase('sending');
    try {
      await onGuardar(construirPayload(form, modo));
      setFase('success');
      saliendo.current = true;
      await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : MOTION.success));
    } catch (e) {
      setErrorGuardado(toUserMessage(e));
      setFase('idle');
    }
  };

  const cambiarCantidad = (item: CotizacionItem, cantidad: number) => {
    actualizar('items', form.items.map((i) => (i.claveLocal === item.claveLocal ? { ...i, cantidad } : i)));
  };

  const guardarLinea = (item: CotizacionItem) => {
    const existe = form.items.some((i) => i.claveLocal === item.claveLocal);
    if (!existe) recientes.current.add(item.claveLocal);
    actualizar('items', existe ? form.items.map((i) => (i.claveLocal === item.claveLocal ? item : i)) : [...form.items, item]);
    setEditando(null);
  };

  const quitarLinea = (item: CotizacionItem) => {
    actualizar('items', form.items.filter((i) => i.claveLocal !== item.claveLocal));
    setEditando(null);
  };

  const cambiarOpcionPdf = (opcion: OpcionPdf, valor: boolean) => {
    actualizar('pdf_opciones', aplicarOpcionPdf(form.pdf_opciones, opcion, valor));
  };

  const cambiarDescripcionCorta = (item: CotizacionItem, texto: string) => {
    actualizar(
      'items',
      form.items.map((i) => (i.claveLocal === item.claveLocal ? { ...i, pdf_descripcion_corta: texto.slice(0, 500) } : i)),
    );
  };

  const agregarDesdeCatalogo = (concepto: ConceptoCatalogo) => {
    setCatalogoAbierto(false);
    setEditando(lineaDesdeConcepto(concepto));
  };

  const bloque = (clave: SeccionCotizacion | 'requisitos' | 'resumen' | 'exportacion', indice: number, contenido: React.ReactNode) => (
    <Animated.View
      key={clave}
      style={entrance(indice)}
      onLayout={(e) => {
        if (clave !== 'requisitos' && clave !== 'resumen' && clave !== 'exportacion') posiciones.current[clave] = e.nativeEvent.layout.y;
      }}
    >
      {contenido}
    </Animated.View>
  );

  const cliente = form.cliente;

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <StatusBar style="light" />
      <EditarHeader
        eyebrow={modo === 'nueva' ? 'Nueva cotización' : 'Editar cotización'}
        folio={folio}
        cliente={cliente?.nombre || 'Sin cliente todavía'}
        volverLabel={modo === 'nueva' ? 'Cancelar cotización nueva' : 'Volver al detalle de la cotización'}
        dirty={dirty && modo === 'editar'}
        completadas={0}
        total={0}
        siguiente={null}
        onVolver={pedirSalida}
        onIrSiguiente={() => undefined}
        mostrarProgreso={false}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <BarraCarga visible={fase === 'sending'} />
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {pendientes.length > 0
              ? bloque(
                  'requisitos',
                  0,
                  <View style={[styles.requisitos, { backgroundColor: colors.statusPendienteBg }]}>
                    <Text style={[styles.requisitosTitulo, { color: colors.statusPendienteText }]}>
                      Para guardar falta {pendientes.length === 1 ? '1 paso' : `${pendientes.length} pasos`}
                    </Text>
                    {pendientes.map((r) => (
                      <Pressable
                        key={r.texto}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.texto}. Ir a la sección`}
                        onPress={() => irASeccion(r.clave)}
                        style={styles.requisito}
                        hitSlop={4}
                      >
                        <View style={[styles.requisitoPunto, { borderColor: colors.statusPendienteText }]} />
                        <Text style={[styles.requisitoTexto, { color: colors.ink }]}>{r.texto}</Text>
                        <IconChevron direction="right" color={colors.statusPendienteText} size={13} />
                      </Pressable>
                    ))}
                  </View>,
                )
              : null}

            {bloque(
              'cliente',
              1,
              <Seccion
                numero={1}
                titulo="Cliente y seguimiento"
                icon={(c) => <IconPerson color={c} size={14} />}
                descripcion="A quién va dirigida la cotización y cómo se dio el contacto."
                completa={completas.cliente}
                sinTarjeta
              >
                <Grupo titulo="Cliente" requerido>
                  {cliente ? (
                    <View style={styles.clienteFila}>
                      <View style={[styles.clienteAvatar, { backgroundColor: colors.navy }]}>
                        <Text style={[styles.clienteIniciales, { color: colors.onNavy }]}>
                          {inicialesUsuarioDisplay(cliente.nombre, '?')}
                        </Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.clienteNombre, { color: colors.ink }]} numberOfLines={2}>
                          {cliente.nombre}
                        </Text>
                        <View
                          style={[
                            styles.clienteTipo,
                            { backgroundColor: cliente.prospecto ? colors.goldSoftBg : colors.statusResueltoBg },
                          ]}
                        >
                          <View
                            style={[
                              styles.clienteTipoPunto,
                              { backgroundColor: cliente.prospecto ? colors.goldSoftText : colors.statusResueltoText },
                            ]}
                          />
                          <Text
                            style={[
                              styles.clienteTipoTexto,
                              { color: cliente.prospecto ? colors.goldSoftText : colors.statusResueltoText },
                            ]}
                          >
                            {cliente.prospecto ? 'Prospecto' : 'Cliente del catálogo'}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Cambiar cliente. Actual: ${cliente.nombre}`}
                        onPress={() => setClienteAbierto(true)}
                        disabled={guardando}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.cambiar,
                          { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
                        ]}
                      >
                        <Text style={[styles.cambiarTexto, { color: colors.primary }]}>Cambiar</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar cliente"
                      accessibilityHint="Busca por nombre, RFC o teléfono"
                      onPress={() => setClienteAbierto(true)}
                      disabled={guardando}
                      style={({ pressed }) => [
                        styles.clienteVacio,
                        {
                          borderColor: errores.cliente ? colors.danger : colors.primary,
                          backgroundColor: pressed ? colors.primaryRing : colors.surface,
                        },
                      ]}
                    >
                      <View style={[styles.clienteAvatar, { backgroundColor: colors.primaryRing }]}>
                        <IconPerson color={colors.primary} size={18} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.clienteNombre, { color: colors.primary }]}>Seleccionar cliente</Text>
                        <Text style={[styles.clienteAyuda, { color: colors.inkSubtle }]}>Busca por nombre, RFC o teléfono</Text>
                      </View>
                      <IconChevron direction="right" color={colors.primary} size={15} />
                    </Pressable>
                  )}
                  {errores.cliente ? (
                    <View style={styles.grupoError}>
                      <TextoError texto={errores.cliente} />
                    </View>
                  ) : null}
                </Grupo>

                <Grupo titulo="Contacto" meta={cliente ? 'Precargado del cliente' : undefined}>
                  <FilaCampo
                    icon={(c) => <IconPerson color={c} size={15} />}
                    label="Nombre del contacto"
                    value={form.contacto}
                    onChangeText={(v) => actualizar('contacto', v)}
                    placeholder="Persona que solicita"
                    maxLength={200}
                    autoCapitalize="words"
                    editable={!guardando}
                  />
                  <FilaCampo
                    icon={(c) => <IconPhone color={c} size={15} />}
                    label="Teléfono"
                    value={form.contacto_telefono}
                    onChangeText={(v) => actualizar('contacto_telefono', v)}
                    placeholder="Ej. 314 123 4567"
                    keyboardType="phone-pad"
                    maxLength={30}
                    editable={!guardando}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      form.medio_contacto
                        ? `Medio de contacto: ${medioLabel(form.medio_contacto)}. Cambiar`
                        : 'Elegir medio de contacto'
                    }
                    onPress={() => setMedioAbierto(true)}
                    disabled={guardando}
                    style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? colors.surfaceSunken : 'transparent' }]}
                  >
                    <View
                      style={[
                        styles.filaIcono,
                        { backgroundColor: form.medio_contacto ? tonoMedio(form.medio_contacto, colors).bg : colors.surfaceSunken },
                      ]}
                    >
                      {form.medio_contacto ? (
                        <MedioContactoIcon
                          medio={form.medio_contacto}
                          color={tonoMedio(form.medio_contacto, colors).fg}
                          size={16}
                        />
                      ) : (
                        <IconComment color={errores.medio_contacto ? colors.danger : colors.inkMuted} size={15} />
                      )}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.filaLabel, { color: errores.medio_contacto ? colors.danger : colors.inkMuted }]}>
                        Medio de contacto
                        {form.contacto.trim() ? <Text style={{ color: colors.danger }}> *</Text> : null}
                      </Text>
                      <Text
                        style={[styles.filaValor, { color: form.medio_contacto ? colors.ink : colors.inkSubtle }]}
                        numberOfLines={1}
                      >
                        {form.medio_contacto ? medioLabel(form.medio_contacto) : '¿Cómo llegó el cliente?'}
                      </Text>
                    </View>
                    {form.medio_contacto ? (
                      <View style={[styles.canal, { backgroundColor: colors.surfaceSunken }]}>
                        <Text style={[styles.canalTexto, { color: colors.inkMuted }]}>{grupoDeMedio(form.medio_contacto)}</Text>
                      </View>
                    ) : null}
                    <IconChevron direction="right" color={colors.inkSubtle} size={15} />
                  </Pressable>
                  {errores.medio_contacto ? (
                    <View style={styles.grupoError}>
                      <TextoError texto={errores.medio_contacto} />
                    </View>
                  ) : null}
                </Grupo>

                <Grupo titulo="Clasificación">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      tiposElegidos.length
                        ? `Tipo de trabajo: ${tiposElegidos.map((t) => t.nombre).join(', ')}. Cambiar`
                        : 'Elegir tipo de trabajo'
                    }
                    onPress={() => setTipoAbierto(true)}
                    disabled={guardando || servicios === null}
                    style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? colors.surfaceSunken : 'transparent' }]}
                  >
                    <View style={[styles.filaIcono, { backgroundColor: colors.surfaceSunken }]}>
                      <IconWrench color={errores.tipo_trabajo ? colors.danger : colors.inkMuted} size={15} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.filaLabel, { color: errores.tipo_trabajo ? colors.danger : colors.inkMuted }]}>
                        Tipo de trabajo<Text style={{ color: colors.danger }}> *</Text>
                      </Text>
                      <Text
                        style={[styles.filaValor, { color: tiposElegidos.length ? colors.ink : colors.inkSubtle }]}
                        numberOfLines={1}
                      >
                        {servicios === null
                          ? 'Cargando servicios…'
                          : tiposElegidos.length
                            ? `${tiposElegidos.length} ${tiposElegidos.length === 1 ? 'servicio' : 'servicios'}`
                            : 'Elegir servicios'}
                      </Text>
                    </View>
                    <IconChevron direction="right" color={colors.inkSubtle} size={15} />
                  </Pressable>
                  {tiposElegidos.length || errores.tipo_trabajo ? (
                    <View style={styles.tiposCaja}>
                      {tiposElegidos.length ? (
                        <View style={styles.chips}>
                          {tiposElegidos.map((t) => (
                            <Pressable
                              key={t.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Quitar ${t.nombre}`}
                              onPress={() => actualizar('tipo_trabajo', form.tipo_trabajo.filter((x) => x !== t.id))}
                              disabled={guardando}
                              hitSlop={4}
                              style={[styles.tipoChip, { backgroundColor: colors.primaryRing }]}
                            >
                              <Text style={[styles.tipoChipTexto, { color: colors.primary }]} numberOfLines={1}>
                                {t.nombre}
                              </Text>
                              <Text style={[styles.tipoChipQuitar, { color: colors.primary }]}>×</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                      {errores.tipo_trabajo ? <TextoError texto={errores.tipo_trabajo} /> : null}
                    </View>
                  ) : null}
                  <View style={[styles.filaBloque, { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <View style={styles.filaBloqueCabeza}>
                      <View style={[styles.filaIcono, { backgroundColor: colors.surfaceSunken }]}>
                        <CotizacionStatusIcon status={form.status} color={colors.inkMuted} size={14} />
                      </View>
                      <Text style={[styles.filaLabel, { color: colors.inkMuted }]}>Status</Text>
                    </View>
                    <StatusSelector valor={form.status} onChange={(s) => actualizar('status', s)} disabled={guardando} />
                  </View>
                </Grupo>
              </Seccion>,
            )}

            {bloque(
              'condiciones',
              2,
              <Seccion
                numero={2}
                titulo="Condiciones comerciales"
                icon={(c) => <IconCotizaciones color={c} size={15} />}
                descripcion="Descuento de cliente y anticipo para iniciar trabajos."
                completa={completas.condiciones}
              >
                <View style={styles.filaCeldas}>
                  <View style={styles.flex}>
                    <TextField
                      label="Descuento de cliente %"
                      value={descuentoTexto}
                      onChangeText={(v) => {
                        setDescuentoTexto(v);
                        actualizar('descuento_cliente_pct', Math.min(100, aNumero(v)));
                      }}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      editable={!guardando}
                      error={errores.descuento_cliente_pct}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      label="Anticipo %"
                      value={anticipoTexto}
                      onChangeText={(v) => {
                        setAnticipoTexto(v);
                        actualizar('anticipo_pct', aNumero(v));
                      }}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      editable={!guardando}
                      error={errores.anticipo_pct}
                    />
                  </View>
                </View>
                <View style={[styles.segmento, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}>
                  {PRESETS_ANTICIPO.map((p) => {
                    const activo = form.anticipo_pct === p;
                    return (
                      <Pressable
                        key={p}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: activo }}
                        accessibilityLabel={`Anticipo ${p} por ciento`}
                        onPress={() => {
                          setAnticipoTexto(String(p));
                          actualizar('anticipo_pct', p);
                        }}
                        disabled={guardando}
                        style={[styles.segmentoOpcion, activo ? [{ backgroundColor: colors.surface }, elevationFor(colors, 'card')] : null]}
                      >
                        <Text style={[styles.segmentoTexto, { color: activo ? colors.ink : colors.inkMuted }]}>{p}%</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.ayuda, { color: colors.inkSubtle }]}>
                  Anticipo mínimo {ANTICIPO_MIN}%. El resto se paga al terminar.
                </Text>
              </Seccion>,
            )}

            {bloque(
              'partidas',
              3,
              <Seccion
                numero={3}
                titulo="Partidas"
                icon={(c) => <IconClipboard color={c} size={14} />}
                descripcion="Productos y conceptos que incluye la cotización."
                completa={completas.partidas}
                sinTarjeta
              >
                {form.items.length > 0 ? (
                  <View style={[styles.resumenPartidas, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                    <Metrica icon={(c) => <IconClipboard color={c} size={14} />} valor={String(form.items.length)} label="Partidas" />
                    <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
                    <Metrica icon={(c) => <IconBox color={c} size={14} />} valor={String(productos)} label="Productos" />
                    <View style={[styles.metricaDivisor, { backgroundColor: colors.line }]} />
                    <Metrica icon={(c) => <IconEtiqueta color={c} size={13} />} valor={formatCantidad(piezas)} label="Piezas" />
                  </View>
                ) : (
                  <View style={[styles.vacio, { backgroundColor: colors.surface, borderColor: errores.items ? colors.danger : colors.line }]}>
                    <View style={[styles.vacioIcono, { backgroundColor: colors.goldSoftBg }]}>
                      <IconCotizaciones color={colors.goldSoftText} size={24} />
                    </View>
                    <Text style={[styles.vacioTitulo, { color: colors.ink }]}>Aún no hay partidas</Text>
                    <Text style={[styles.vacioTexto, { color: colors.inkMuted }]}>
                      Agrega productos del catálogo manual, SYSCOM o TVC, o conceptos de servicio.
                    </Text>
                  </View>
                )}

                {grupos.map((g) => (
                  <View key={g.clave} style={styles.grupoPartidas}>
                    {g.nombre ? (
                      <View style={styles.categoria}>
                        <View style={[styles.categoriaIcono, { backgroundColor: colors.statusPausadoBg }]}>
                          <IconEtiqueta color={colors.statusPausadoText} size={11} />
                        </View>
                        <Text style={[styles.categoriaTexto, { color: colors.inkMuted }]}>{g.nombre}</Text>
                        <View style={[styles.categoriaLinea, { backgroundColor: colors.line }]} />
                        <Text style={[styles.categoriaConteo, { color: colors.inkSubtle }]}>{g.items.length}</Text>
                      </View>
                    ) : null}
                    {g.items.map((item) => (
                      <PartidaTarjeta
                        key={item.claveLocal}
                        item={item}
                        enCeros={esGarantia}
                        disabled={guardando}
                        nueva={recientes.current.has(item.claveLocal)}
                        onEditar={setEditando}
                        onCantidad={cambiarCantidad}
                        onQuitar={quitarLinea}
                      />
                    ))}
                  </View>
                ))}

                <View style={styles.agregarFila}>
                  <BotonAgregar
                    etiqueta="Producto"
                    detalle="Manual, SYSCOM, TVC"
                    icon={(c) => <IconBox color={c} size={17} />}
                    error={Boolean(errores.items)}
                    disabled={guardando}
                    onPress={() => setProductoAbierto(true)}
                  />
                  <BotonAgregar
                    etiqueta="Concepto"
                    detalle="Servicio o libre"
                    icon={(c) => <IconWrench color={c} size={16} />}
                    error={Boolean(errores.items)}
                    disabled={guardando}
                    onPress={() => setCatalogoAbierto(true)}
                  />
                </View>
                {errores.items ? <TextoError texto={errores.items} /> : null}

                {form.items.length > 0 ? (
                  <View style={[styles.subtotal, { backgroundColor: colors.surfaceSunken }]}>
                    <Text style={[styles.subtotalLabel, { color: colors.inkMuted }]}>Suma de partidas</Text>
                    <Pulso valor={totales.subtotalLineas} style={[styles.subtotalValor, { color: colors.ink }]}>
                      {monto(totales.subtotalLineas)}
                    </Pulso>
                  </View>
                ) : null}
              </Seccion>,
            )}

            {bloque(
              'exportacion',
              4,
              <Seccion
                numero={4}
                titulo="Opciones de exportación"
                icon={(c) => <IconDocumento color={c} size={15} />}
                descripcion="Se guardan con la cotización y aplican al PDF y Excel generados."
                completa={opcionesActivas > 0}
                opcional
                sinRelleno
              >
                {mostrarGarantia ? (
                  <OpcionCasilla
                    label="Garantía"
                    hint="Reposición sin costo: en el PDF, precios e importes salen en $0 y se agrega una marca de agua «GARANTÍA»."
                    activa={esGarantia}
                    destacada
                    disabled={guardando}
                    onCambiar={(v) => cambiarOpcionPdf('es_garantia', v)}
                  />
                ) : null}
                {OPCIONES_PDF.map((o, idx) => (
                  <OpcionCasilla
                    key={o.key}
                    label={o.label}
                    hint={o.hint}
                    activa={opcionActiva(form.pdf_opciones, o.key)}
                    disabled={guardando}
                    ultima={idx === OPCIONES_PDF.length - 1 && !form.pdf_opciones.simplificar_descripcion}
                    onCambiar={(v) => cambiarOpcionPdf(o.key, v)}
                  />
                ))}
                {form.pdf_opciones.simplificar_descripcion ? (
                  <View style={[styles.cortas, { backgroundColor: colors.surfaceSunken, borderTopColor: colors.line }]}>
                    {form.items.length === 0 ? (
                      <Text style={[styles.ayuda, { color: colors.inkSubtle }]}>
                        Agrega conceptos para configurar descripciones cortas.
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.ayuda, { color: colors.inkSubtle }]}>
                          Este texto reemplaza el nombre del producto en el PDF y Excel (columna Descripción). El detalle
                          sigue mostrando la descripción completa. Si lo dejas en blanco, se usa un resumen automático en el
                          producto.
                        </Text>
                        {form.items.map((item) => (
                          <View
                            key={item.claveLocal}
                            style={[styles.corta, { backgroundColor: colors.surface, borderColor: colors.line }]}
                          >
                            <Text style={[styles.cortaNombre, { color: colors.ink }]} numberOfLines={2}>
                              {item.producto_nombre || 'Sin nombre'}
                            </Text>
                            <Text style={[styles.cortaPrevia, { color: colors.inkSubtle }]} numberOfLines={3}>
                              Descripción completa: {vistaPrevia(item.producto_descripcion)}
                            </Text>
                            <View style={styles.cortaCampo}>
                              <TextField
                                label="Texto del producto en PDF/Excel"
                                value={item.pdf_descripcion_corta}
                                onChangeText={(v) => cambiarDescripcionCorta(item, v)}
                                placeholder="Ej. Kit IP 4 cámaras de 4 megapixel"
                                maxLength={500}
                                multiline
                                editable={!guardando}
                                helper={`${item.pdf_descripcion_corta.length}/500`}
                              />
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ) : null}
              </Seccion>,
            )}

            {bloque(
              'resumen',
              5,
              <View style={[styles.recibo, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'card')]}>
                <View style={styles.reciboCabeza}>
                  <Text style={[styles.reciboTitulo, { color: colors.inkSubtle }]}>Resumen</Text>
                  {esGarantia ? (
                    <View style={[styles.garantia, { backgroundColor: colors.goldSoftBg }]}>
                      <Text style={[styles.garantiaTexto, { color: colors.goldSoftText }]}>Garantía · $0 en PDF</Text>
                    </View>
                  ) : null}
                </View>
                <LineaRecibo label={`Partidas (${form.items.length})`} valor={monto(totales.subtotalLineas)} />
                {totales.descuentoCliente > 0 && !esGarantia ? (
                  <LineaRecibo
                    label={`Descuento de cliente (${formatCantidad(form.descuento_cliente_pct)}%)`}
                    valor={`-${monto(totales.descuentoCliente)}`}
                    color={colors.statusResueltoText}
                  />
                ) : null}
                <View style={[styles.reciboCorte, { borderColor: colors.lineStrong }]} />
                <View style={styles.reciboTotal}>
                  <Text style={[styles.reciboTotalLabel, { color: colors.ink }]}>Total con IVA</Text>
                  <Text style={[styles.reciboTotalValor, { color: colors.ink }]}>{monto(totales.total)}</Text>
                </View>
                <LineaRecibo label={`Anticipo ${formatCantidad(form.anticipo_pct)}%`} valor={monto(totales.anticipo)} />
                <LineaRecibo label="Saldo" valor={monto(totales.saldo)} />
              </View>,
            )}
          </ScrollView>
        </View>

        <View
          style={[
            styles.barra,
            { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {errorGuardado ? (
            <View style={styles.barraEstado} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <IconAlerta color={colors.danger} size={14} />
              <Text style={[styles.barraError, { color: colors.danger }]} numberOfLines={2}>
                {errorGuardado}
              </Text>
            </View>
          ) : null}
          <View style={styles.barraFila}>
            <View style={styles.barraTotal} accessible accessibilityLabel={`Total ${monto(totales.total)}`}>
              <Text style={[styles.barraTotalLabel, { color: colors.inkSubtle }]}>Total con IVA</Text>
              <Pulso valor={totales.total} style={[styles.barraTotalValor, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                {monto(totales.total)}
              </Pulso>
            </View>
            <View style={styles.barraBoton}>
              <SubmitButton
                label={modo === 'nueva' ? 'Crear' : 'Guardar'}
                phase={fase}
                disabled={modo === 'editar' && !dirty}
                onPress={() => void guardar()}
                accessibilityHint={modo === 'nueva' ? 'Crea la cotización' : 'Guarda los cambios'}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ClientePickerModal
        visible={clienteAbierto}
        onCerrar={() => setClienteAbierto(false)}
        onElegir={(c) => {
          setForm((prev) => aplicarCliente(prev, c));
          setErrores((prev) => ({ ...prev, cliente: undefined }));
          setClienteAbierto(false);
        }}
      />
      <MedioContactoModal
        visible={medioAbierto}
        valor={form.medio_contacto}
        onCerrar={() => setMedioAbierto(false)}
        onElegir={(m) => {
          actualizar('medio_contacto', m);
          setMedioAbierto(false);
        }}
      />
      <TipoTrabajoModal
        visible={tipoAbierto}
        servicios={servicios ?? []}
        seleccion={form.tipo_trabajo}
        onCerrar={() => setTipoAbierto(false)}
        onListo={(ids) => {
          actualizar('tipo_trabajo', ids);
          setTipoAbierto(false);
        }}
      />
      <ProductoBuscadorModal
        visible={productoAbierto}
        onCerrar={() => setProductoAbierto(false)}
        onElegir={(producto) => {
          setProductoAbierto(false);
          setEditando(lineaDesdeProducto(producto));
        }}
      />
      <CatalogoConceptosModal
        visible={catalogoAbierto}
        onCerrar={() => setCatalogoAbierto(false)}
        onElegir={agregarDesdeCatalogo}
        onLibre={() => {
          setCatalogoAbierto(false);
          setEditando(lineaVacia());
        }}
      />
      <ConceptoEditorModal
        item={editando}
        esAdmin={esAdmin}
        categorias={categorias}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarLinea}
        onEliminar={quitarLinea}
      />
    </View>
  );
}

/**
 * Sección numerada como en la web: número en círculo (se vuelve palomita al
 * completarse), título y descripción arriba, y los campos en una tarjeta.
 */
function Seccion({
  numero,
  titulo,
  icon,
  descripcion,
  completa,
  opcional = false,
  sinRelleno = false,
  sinTarjeta = false,
  children,
}: {
  numero: number;
  titulo: string;
  icon?: (color: string) => React.ReactNode;
  descripcion: string;
  completa: boolean;
  opcional?: boolean;
  /** Sin padding en el cuerpo (listas a ras del borde). */
  sinRelleno?: boolean;
  /** El contenido va directo, sin la tarjeta que lo envuelve (p. ej. partidas en tarjetas propias). */
  sinTarjeta?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const check = useRef(new Animated.Value(completa ? 1 : 0)).current;

  useEffect(() => {
    const destino = completa ? 1 : 0;
    if (reduced) {
      check.setValue(destino);
      return;
    }
    const anim = Animated.spring(check, { toValue: destino, friction: 7, tension: 160, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [completa, check, reduced]);

  return (
    <View style={styles.seccion}>
      <View style={styles.seccionCabeza}>
        <View style={styles.numeroCaja} accessible accessibilityLabel={completa ? `Paso ${numero}, listo` : `Paso ${numero}`}>
          <View style={[styles.numero, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
            <Text style={[styles.numeroTexto, { color: colors.inkMuted }]}>{numero}</Text>
          </View>
          <Animated.View
            style={[
              styles.numero,
              styles.numeroListo,
              {
                backgroundColor: colors.success,
                borderColor: colors.success,
                opacity: check,
                transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              },
            ]}
          >
            <IconCheck color={colors.onPrimary} size={13} />
          </Animated.View>
        </View>
        <View style={styles.flex}>
          <View style={styles.tituloFila}>
            {icon ? icon(colors.inkMuted) : null}
            <Text style={[styles.seccionTitulo, { color: colors.ink }]} accessibilityRole="header">
              {titulo}
            </Text>
            {opcional ? (
              <View style={[styles.opcional, { backgroundColor: colors.surfaceSunken }]}>
                <Text style={[styles.opcionalTexto, { color: colors.inkSubtle }]}>Opcional</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.seccionDescripcion, { color: colors.inkSubtle }]}>{descripcion}</Text>
        </View>
      </View>
      {sinTarjeta ? (
        <View style={styles.sinTarjeta}>{children}</View>
      ) : (
        <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'panel')]}>
          <View style={sinRelleno ? null : styles.tarjetaCuerpo}>{children}</View>
        </View>
      )}
    </View>
  );
}

/** Bloque con título arriba y su tarjeta (estilo lista agrupada). */
function Grupo({
  titulo,
  meta,
  requerido = false,
  children,
}: {
  titulo: string;
  meta?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <View style={styles.grupoCabeza}>
        <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
          {titulo}
          {requerido ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
        {meta ? <Text style={[styles.grupoMeta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
      </View>
      <View style={[styles.grupoTarjeta, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'panel')]}>
        {React.Children.toArray(children)
          .filter(Boolean)
          .map((hijo, i) => (
            <View key={i} style={i > 0 ? { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth } : null}>
              {hijo}
            </View>
          ))}
      </View>
    </View>
  );
}

/**
 * Campo de texto en fila: icono, etiqueta pequeña y el valor editable debajo.
 * Toda la fila enfoca el campo; al enfocarse, el icono y la etiqueta toman el
 * color primario.
 */
function FilaCampo({
  icon,
  label,
  ...input
}: { icon: (color: string) => React.ReactNode; label: string } & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  const ref = useRef<TextInput>(null);
  const [enfocado, setEnfocado] = useState(false);
  const acento = enfocado ? colors.primary : colors.inkMuted;
  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      accessible={false}
      style={[styles.fila, enfocado ? { backgroundColor: colors.primaryRing } : null]}
    >
      <View style={[styles.filaIcono, { backgroundColor: enfocado ? colors.surface : colors.surfaceSunken }]}>{icon(acento)}</View>
      <View style={styles.flex}>
        <Text style={[styles.filaLabel, { color: acento }]}>{label}</Text>
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={colors.inkSubtle}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setEnfocado(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            input.onBlur?.(e);
          }}
          style={[styles.filaInput, { color: colors.ink }]}
        />
      </View>
    </Pressable>
  );
}

/** Métrica del resumen de partidas: icono, número y etiqueta. */
function Metrica({ icon, valor, label }: { icon: (color: string) => React.ReactNode; valor: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metrica} accessible accessibilityLabel={`${valor} ${label.toLowerCase()}`}>
      <View style={styles.metricaCabeza}>
        {icon(colors.inkSubtle)}
        <Pulso valor={valor} style={[styles.metricaValor, { color: colors.ink }]}>
          {valor}
        </Pulso>
      </View>
      <Text style={[styles.metricaLabel, { color: colors.inkSubtle }]}>{label}</Text>
    </View>
  );
}

/** Texto que «late» (un rebote corto de escala) cada vez que cambia su valor. */
function Pulso({
  valor,
  style,
  children,
  ...rest
}: { valor: number | string; children: React.ReactNode } & React.ComponentProps<typeof Animated.Text>) {
  const reduced = useReducedMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const previo = useRef(valor);
  useEffect(() => {
    if (previo.current === valor) return;
    previo.current = valor;
    if (reduced) return;
    escala.setValue(1.07);
    const anim = Animated.spring(escala, { toValue: 1, friction: 5, tension: 190, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [valor, escala, reduced]);
  return (
    <Animated.Text {...rest} style={[style, { transform: [{ scale: escala }] }]}>
      {children}
    </Animated.Text>
  );
}

/** Botón para agregar una partida por tipo (como «Tipo de partida» en la web). */
function BotonAgregar({
  etiqueta,
  detalle,
  icon,
  error,
  disabled,
  onPress,
}: {
  etiqueta: string;
  detalle: string;
  icon: (color: string) => React.ReactNode;
  error: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Agregar ${etiqueta.toLowerCase()}`}
      accessibilityHint={detalle}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.agregar,
        { borderColor: error ? colors.danger : colors.primary, backgroundColor: pressed ? colors.primaryRing : colors.surface },
      ]}
    >
      <View style={[styles.agregarIcono, { backgroundColor: colors.primaryRing }]}>{icon(colors.primary)}</View>
      <View style={styles.flex}>
        <Text style={[styles.agregarTexto, { color: colors.primary }]}>+ {etiqueta}</Text>
        <Text style={[styles.agregarDetalle, { color: colors.inkSubtle }]} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Fila de opción de exportación: casilla animada, etiqueta y explicación, como
 * `PdfOptionCheckbox` de la web. Toda la fila es el área táctil.
 */
function OpcionCasilla({
  label,
  hint,
  activa,
  destacada = false,
  ultima = false,
  disabled,
  onCambiar,
}: {
  label: string;
  hint: string;
  activa: boolean;
  /** Garantía: fondo dorado cuando está activa. */
  destacada?: boolean;
  ultima?: boolean;
  disabled?: boolean;
  onCambiar: (valor: boolean) => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const marca = useRef(new Animated.Value(activa ? 1 : 0)).current;

  useEffect(() => {
    const destino = activa ? 1 : 0;
    if (reduced) {
      marca.setValue(destino);
      return;
    }
    const anim = Animated.spring(marca, { toValue: destino, friction: 7, tension: 200, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [activa, marca, reduced]);

  const acento = destacada ? colors.goldSoftText : colors.primary;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activa, disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => onCambiar(!activa)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.opcion,
        ultima ? null : { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
        {
          backgroundColor: pressed
            ? colors.surfaceSunken
            : activa && destacada
              ? colors.goldSoftBg
              : 'transparent',
        },
      ]}
    >
      <View style={[styles.casilla, { borderColor: activa ? acento : colors.lineStrong, backgroundColor: colors.surface }]}>
        <Animated.View
          style={[
            styles.casillaRelleno,
            {
              backgroundColor: acento,
              opacity: marca,
              transform: [{ scale: marca.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            },
          ]}
        >
          <IconCheck color={colors.onPrimary} size={12} />
        </Animated.View>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.opcionLabel, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.opcionHint, { color: colors.inkSubtle }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function TextoError({ texto }: { texto: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.error} accessibilityRole="alert">
      <IconAlerta color={colors.danger} size={12} />
      <Text style={[styles.errorTexto, { color: colors.danger }]}>{texto}</Text>
    </View>
  );
}

/** Control segmentado de status: tres opciones del mismo ancho, la elegida con su color. */
function StatusSelector({
  valor,
  onChange,
  disabled,
}: {
  valor: CotizacionFormState['status'];
  onChange: (s: CotizacionFormState['status']) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.segmento, { backgroundColor: colors.surfaceSunken, borderColor: colors.line }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Status de la cotización"
    >
      {COTIZACION_STATUSES.map((s) => {
        const activo = s === valor;
        const tono = statusTone(s, colors);
        return (
          <Pressable
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo, disabled }}
            accessibilityLabel={statusLabel(s)}
            onPress={() => onChange(s)}
            disabled={disabled}
            style={[styles.segmentoOpcion, styles.segmentoConIcono, activo ? { backgroundColor: tono.bg } : null]}
          >
            <CotizacionStatusIcon status={s} color={activo ? tono.text : colors.inkSubtle} size={13} />
            <Text style={[styles.segmentoTexto, { color: activo ? tono.text : colors.inkMuted }]}>{statusLabel(s)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LineaRecibo({ label, valor, color }: { label: string; valor: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.reciboLinea}>
      <Text style={[styles.reciboLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.reciboValor, { color: color ?? colors.ink }]}>{valor}</Text>
    </View>
  );
}

const NUMERO = 26;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  requisitos: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  requisitosTitulo: { fontFamily: font.semibold, fontSize: 13, marginBottom: 2 },
  requisito: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  requisitoPunto: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  requisitoTexto: { ...type.label, flex: 1 },
  seccion: { gap: spacing.md },
  seccionCabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  numeroCaja: { width: NUMERO, height: NUMERO },
  numero: {
    width: NUMERO,
    height: NUMERO,
    borderRadius: NUMERO / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroListo: { position: 'absolute', top: 0, left: 0 },
  numeroTexto: { fontFamily: font.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seccionTitulo: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  seccionDescripcion: { ...type.caption, fontSize: 12, lineHeight: 16 },
  opcional: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  opcionalTexto: { fontFamily: font.semibold, fontSize: 10 },
  tarjeta: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  tarjetaCuerpo: { padding: spacing.lg, gap: spacing.md },
  grupo: { gap: spacing.sm },
  grupoCabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  grupoTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  grupoMeta: { ...type.caption, fontSize: 11 },
  grupoTarjeta: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  grupoError: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  clienteFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  clienteVacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    minHeight: TOUCH_TARGET + 16,
  },
  clienteAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  clienteIniciales: { fontFamily: font.semibold, fontSize: 15 },
  clienteNombre: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  clienteAyuda: { ...type.caption, fontSize: 12 },
  clienteTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  clienteTipoPunto: { width: 6, height: 6, borderRadius: 3 },
  clienteTipoTexto: { fontFamily: font.semibold, fontSize: 11 },
  cambiar: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  cambiarTexto: { fontFamily: font.semibold, fontSize: 13 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filaIcono: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  filaLabel: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.3 },
  filaValor: { ...type.body, fontSize: 15, marginTop: 1 },
  canal: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  canalTexto: { fontFamily: font.semibold, fontSize: 11 },
  filaInput: { ...type.body, fontSize: 15, paddingVertical: 2, paddingHorizontal: 0, minHeight: 26 },
  filaBloque: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filaBloqueCabeza: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tiposCaja: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingLeft: spacing.lg + 32 + spacing.md },
  ayuda: { ...type.caption, fontSize: 12 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorTexto: { ...type.caption, fontSize: 12, flex: 1 },
  filaCeldas: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segmento: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segmentoOpcion: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentoConIcono: { flexDirection: 'row', gap: 5 },
  segmentoTexto: { fontFamily: font.semibold, fontSize: 13 },
  categoria: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  categoriaIcono: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoriaLinea: { flex: 1, height: StyleSheet.hairlineWidth },
  categoriaTexto: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  categoriaConteo: { ...type.mono, fontSize: 11 },
  grupoPartidas: { gap: spacing.sm },
  sinTarjeta: { gap: spacing.md },
  subtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  subtotalLabel: { ...type.caption },
  subtotalValor: { fontFamily: font.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  vacio: { alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.xl },
  vacioTitulo: { fontFamily: font.semibold, fontSize: 15 },
  vacioIcono: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { ...type.caption, textAlign: 'center' },
  resumenPartidas: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, paddingVertical: spacing.md },
  metrica: { flex: 1, alignItems: 'center', gap: 2 },
  metricaCabeza: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricaValor: { fontFamily: font.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  metricaLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  metricaDivisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  agregarFila: { flexDirection: 'row', gap: spacing.sm },
  agregar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET + 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
  },
  agregarIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  agregarTexto: { fontFamily: font.semibold, fontSize: 14 },
  agregarDetalle: { ...type.caption, fontSize: 11 },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minHeight: 30,
    borderRadius: radius.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  tipoChipTexto: { fontFamily: font.semibold, fontSize: 12, flexShrink: 1 },
  tipoChipQuitar: { fontFamily: font.semibold, fontSize: 16, lineHeight: 18 },
  recibo: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  reciboCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  reciboTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  garantia: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  garantiaTexto: { fontFamily: font.semibold, fontSize: 11 },
  reciboLinea: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  reciboLabel: { ...type.caption, flex: 1 },
  reciboValor: { ...type.mono, fontFamily: font.semibold },
  reciboCorte: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: spacing.xs },
  reciboTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  reciboTotalLabel: { fontFamily: font.semibold, fontSize: 15 },
  reciboTotalValor: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  opcion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  casilla: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, marginTop: 1, overflow: 'hidden' },
  casillaRelleno: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionLabel: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
  opcionHint: { ...type.caption, fontSize: 12, lineHeight: 17, marginTop: 2 },
  cortas: { borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  corta: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  cortaNombre: { fontFamily: font.semibold, fontSize: 14 },
  cortaPrevia: { ...type.caption, fontSize: 11, lineHeight: 16 },
  cortaCampo: { marginTop: spacing.sm, marginBottom: -spacing.lg },
  barra: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  barraEstado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barraError: { ...type.caption, fontSize: 12, flex: 1 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  barraTotal: { flex: 1, minWidth: 0 },
  barraTotalLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase' },
  barraTotalValor: { fontFamily: font.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  barraBoton: { flex: 1.1 },
});
