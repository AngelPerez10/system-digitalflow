import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eliminarCotizacion } from '@/api/cotizacionesApi';
import { toUserMessage } from '@/api/errors';
import { correoSugerido, enviarPdfPorCorreo } from '@/api/pdfApi';
import { inicialesUsuarioDisplay } from '@/auth/nombreUsuario';
import { useSession } from '@/auth/SessionProvider';
import { canDeleteModule, canEditModule } from '@/auth/permissions';
import { Avatar } from '@/components/Avatar';
import { EnviarPdfCorreoModal } from '@/components/EnviarPdfCorreoModal';
import { IconCorreo, IconDocumento, IconEditar, IconPhone, IconWhatsApp } from '@/components/icons';
import { ReportePdf } from '@/components/ReportePdf';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { ErrorState } from '@/components/StateViews';
import {
  agruparPorCategoria,
  calcularTotales,
  clienteDisplay,
  esProducto,
  folioDisplay,
  formatCantidad,
  formatMoneda,
  medioLabel,
  statusLabel,
  statusTone,
} from '@/features/cotizaciones/cotizacionFormat';
import { ConceptoFila } from '@/features/cotizaciones/components/ConceptoFila';
import { CotizacionDetalleHeader } from '@/features/cotizaciones/components/CotizacionDetalleHeader';
import { DetalleCotizacionSkeleton } from '@/features/cotizaciones/components/CotizacionSkeletons';
import { useCotizacion } from '@/features/cotizaciones/useCotizaciones';
import { useTheme } from '@/theme/ThemeProvider';
import { elevationFor, font, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { abrirEnlace } from '@/utils/abrirEnlace';
import { formatFecha } from '@/utils/fecha';
import { useReducedMotion } from '@/utils/useReducedMotion';
import { enlacesWhatsApp, telefonoWhatsApp } from '@/utils/whatsapp';

type Pestana = 'resumen' | 'partidas' | 'documento';

/**
 * Detalle de la cotización con los mismos datos que la web: cliente y
 * seguimiento, condiciones comerciales, partidas (agrupadas por categoría)
 * y registro. Acciones rápidas arriba y tres pestañas:
 * Resumen, Partidas y Documento. En garantía los montos se muestran en $0.
 */
export default function DetalleCotizacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cotizacionId = Number(id);
  const { cotizacion, cargando, error, recargar } = useCotizacion(Number.isFinite(cotizacionId) ? cotizacionId : null);
  const { user, permissions } = useSession();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [eliminando, setEliminando] = useState(false);
  const [correoAbierto, setCorreoAbierto] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  if (cargando) return <DetalleCotizacionSkeleton />;
  if (error || !cotizacion) return <ErrorState message={error ?? 'Cotización no encontrada.'} onRetry={recargar} />;

  const puedeEditar = canEditModule(permissions, user, 'cotizaciones');
  const puedeEliminar = canDeleteModule(permissions, user, 'cotizaciones');
  const folio = folioDisplay(cotizacion);
  const totales = calcularTotales(cotizacion.items, cotizacion.descuento_cliente_pct, cotizacion.anticipo_pct);
  const monto = (n: number) => formatMoneda(cotizacion.es_garantia ? 0 : n);
  const telefono = cotizacion.contacto_telefono || cotizacion.cliente_telefono || '';
  const cancelada = cotizacion.status === 'CANCELADA';
  const productos = cotizacion.items.filter(esProducto).length;
  const piezas = cotizacion.items.reduce((a, i) => a + Math.max(0, i.cantidad), 0);
  const tipos = cotizacion.tipo_trabajo_nombres.split(',').map((t) => t.trim()).filter(Boolean);
  const grupos = agruparPorCategoria(cotizacion.items, cotizacion.categorias_productos);
  const tono = statusTone(cotizacion.status, colors);

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const abrirWhatsApp = async () => {
    const { app, web } = enlacesWhatsApp(telefonoWhatsApp(telefono), `Hola ${cotizacion.contacto || ''}`.trim());
    try {
      await Linking.openURL(app);
    } catch {
      await abrirEnlace(web, 'No se pudo abrir WhatsApp.');
    }
  };

  const confirmarEliminar = () => {
    Alert.alert(
      '¿Eliminar esta cotización?',
      `Se borrará ${folio} de ${clienteDisplay(cotizacion)} de forma permanente junto con sus partidas. Esto no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            setEliminando(true);
            try {
              await eliminarCotizacion(cotizacion.id);
              router.back();
            } catch (e) {
              setEliminando(false);
              Alert.alert('No se pudo eliminar', toUserMessage(e));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ title: `${folio} · ${statusLabel(cotizacion.status)}`, headerShown: false }} />
      <StatusBar style="light" />

      <CotizacionDetalleHeader cotizacion={cotizacion} onVolver={() => router.back()} />

      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityLabel={`Detalle de la cotización ${folio}`}
      >
        <View style={styles.acciones}>
          <Accion
            etiqueta="Llamar"
            icon={<IconPhone color={telefono ? colors.statusResueltoText : colors.inkSubtle} size={18} />}
            tono={colors.statusResueltoBg}
            disabled={!telefono}
            onPress={() => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.')}
          />
          <Accion
            etiqueta="WhatsApp"
            icon={<IconWhatsApp size={19} color={telefono ? undefined : colors.inkSubtle} />}
            tono={colors.surfaceSunken}
            disabled={!telefono}
            onPress={() => void abrirWhatsApp()}
          />
          <Accion
            etiqueta="Correo"
            icon={<IconCorreo color={cancelada ? colors.inkSubtle : colors.primary} size={18} />}
            tono={colors.primaryRing}
            disabled={cancelada}
            onPress={() => setCorreoAbierto(true)}
          />
          <Accion
            etiqueta="PDF"
            icon={<IconDocumento color={colors.roseText} size={18} />}
            tono={colors.roseBg}
            onPress={() => cambiarPestana('documento')}
          />
        </View>

        <View style={[styles.tabsCaja, { backgroundColor: colors.canvas }]}>
          <SegmentedTabs<Pestana>
            accessibilityLabel="Secciones de la cotización"
            value={pestana}
            onChange={cambiarPestana}
            tabs={[
              { key: 'resumen', label: 'Resumen' },
              { key: 'partidas', label: 'Partidas', badge: cotizacion.items.length },
              { key: 'documento', label: 'Documento' },
            ]}
          />
        </View>

        <View style={styles.contenido}>
          {pestana === 'resumen' ? (
            <Aparecer key="resumen">
              <Grupo titulo="Cliente y seguimiento">
                <Fila label={cotizacion.prospecto ? 'Prospecto' : 'Cliente'} valor={clienteDisplay(cotizacion)} primera />
                <Fila label="Contacto" valor={cotizacion.contacto || '—'} />
                <Fila
                  label="Teléfono"
                  valor={telefono || '—'}
                  accion={Boolean(telefono)}
                  onPress={telefono ? () => void abrirEnlace(`tel:${telefono}`, 'No se pudo iniciar la llamada.') : undefined}
                />
                <Fila label="Medio de contacto" valor={medioLabel(cotizacion.medio_contacto)} />
                <Fila label="Fecha" valor={cotizacion.fecha ? formatFecha(cotizacion.fecha) : '—'} />
                <View style={[styles.filaEstado, { borderTopColor: colors.line }]}>
                  <Text style={[styles.filaLabel, { color: colors.inkMuted }]}>Status</Text>
                  <View style={styles.estadoDerecha}>
                    <View style={[styles.pill, { backgroundColor: tono.bg }]}>
                      <View style={[styles.pillPunto, { backgroundColor: tono.text }]} />
                      <Text style={[styles.pillTexto, { color: tono.text }]}>{statusLabel(cotizacion.status)}</Text>
                    </View>
                    {cotizacion.es_garantia ? (
                      <View style={[styles.pill, { backgroundColor: colors.goldSoftBg }]}>
                        <Text style={[styles.pillTexto, { color: colors.goldSoftText }]}>Garantía</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Grupo>

              <Grupo titulo="Tipo de trabajo">
                <View style={[styles.relleno, styles.chips]}>
                  {tipos.length > 0 ? (
                    tipos.map((t) => (
                      <View key={t} style={[styles.chip, { backgroundColor: colors.statusPausadoBg }]}>
                        <Text style={[styles.chipTexto, { color: colors.statusPausadoText }]}>{t}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.vacio, { color: colors.inkSubtle }]}>Sin tipo de trabajo.</Text>
                  )}
                </View>
              </Grupo>

              <Grupo titulo="Condiciones comerciales">
                <Fila label="Descuento de cliente" valor={`${formatCantidad(cotizacion.descuento_cliente_pct)}%`} primera />
                <Fila label={`Anticipo ${formatCantidad(cotizacion.anticipo_pct)}%`} valor={monto(totales.anticipo)} />
                <Fila label="Saldo" valor={monto(totales.saldo)} />
              </Grupo>

              <Grupo titulo="Registro">
                <Persona
                  rol="Creó"
                  nombre={cotizacion.creado_por_full_name}
                  avatar={cotizacion.creado_por_avatar_url}
                  fecha={cotizacion.fecha_creacion}
                  primera
                />
                {cotizacion.actualizado_por_full_name ? (
                  <Persona
                    rol="Última edición"
                    nombre={cotizacion.actualizado_por_full_name}
                    avatar={cotizacion.actualizado_por_avatar_url}
                    fecha={cotizacion.fecha_actualizacion}
                  />
                ) : null}
                {cotizacion.enviado_en ? (
                  <View style={[styles.envio, { borderTopColor: colors.line }]}>
                    <Text style={[styles.personaRol, { color: colors.inkSubtle }]}>Enviada al cliente</Text>
                    <Text style={[styles.personaNombre, { color: colors.ink }]}>
                      {formatFecha(cotizacion.enviado_en)}
                      {cotizacion.enviado_por_full_name ? ` · ${cotizacion.enviado_por_full_name}` : ''}
                    </Text>
                    {cotizacion.enviado_comentario ? (
                      <View style={styles.cita}>
                        <View style={[styles.citaBarra, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.citaTexto, { color: colors.inkMuted }]}>{cotizacion.enviado_comentario}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Grupo>
            </Aparecer>
          ) : null}

          {pestana === 'partidas' ? (
            <Aparecer key="partidas">
              <View style={[styles.conteos, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Conteo valor={String(cotizacion.items.length)} label="Partidas" />
                <View style={[styles.conteoDivisor, { backgroundColor: colors.line }]} />
                <Conteo valor={String(productos)} label="Productos" />
                <View style={[styles.conteoDivisor, { backgroundColor: colors.line }]} />
                <Conteo valor={formatCantidad(piezas)} label="Piezas" />
              </View>

              {cotizacion.items.length === 0 ? (
                <Grupo titulo="Partidas">
                  <Text style={[styles.relleno, styles.vacio, { color: colors.inkSubtle }]}>Esta cotización aún no tiene partidas.</Text>
                </Grupo>
              ) : (
                grupos.map((g) => (
                  <Grupo key={g.clave} titulo={g.nombre ?? (grupos.length > 1 ? 'Sin categoría' : 'Partidas')} meta={`${g.items.length}`}>
                    <View style={styles.rellenoHorizontal}>
                      {g.items.map((item, i) => (
                        <ConceptoFila key={item.claveLocal} item={cotizacion.es_garantia ? { ...item, precio_lista: 0 } : item} primera={i === 0} />
                      ))}
                    </View>
                  </Grupo>
                ))
              )}

              <View style={[styles.totales, { backgroundColor: colors.surfaceSunken }]}>
                <Linea label="Suma de partidas" valor={monto(totales.subtotalLineas)} />
                {totales.descuentoCliente > 0 && !cotizacion.es_garantia ? (
                  <Linea
                    label={`Descuento de cliente (${formatCantidad(cotizacion.descuento_cliente_pct)}%)`}
                    valor={`-${monto(totales.descuentoCliente)}`}
                    color={colors.statusResueltoText}
                  />
                ) : null}
                <View style={[styles.totalesDivisor, { backgroundColor: colors.line }]} />
                <View style={styles.linea}>
                  <Text style={[styles.totalLabel, { color: colors.ink }]}>Total con IVA</Text>
                  <Text style={[styles.totalValor, { color: cancelada ? colors.inkSubtle : colors.ink }, cancelada ? styles.tachado : null]}>
                    {monto(cotizacion.total)}
                  </Text>
                </View>
                {cotizacion.es_garantia ? (
                  <Text style={[styles.nota, { color: colors.goldSoftText }]}>Garantía: los montos se muestran en $0, igual que en el PDF.</Text>
                ) : null}
              </View>
            </Aparecer>
          ) : null}

          {pestana === 'documento' ? (
            <Aparecer key="documento">
              <Grupo titulo="Reporte PDF">
                <View style={styles.relleno}>
                  <ReportePdf
                    base={`/cotizaciones/${cotizacion.id}`}
                    nombreArchivo={`Cotizacion_${folio}.pdf`}
                    meta={`Cotización · ${statusLabel(cotizacion.status)}${cotizacion.es_garantia ? ' · Garantía' : ''}`}
                    documento={`la cotización ${folio}`}
                    telefono={telefono}
                    puedeEnviar={!cancelada}
                    notaSinEnvio="Solo se envían cotizaciones pendientes o autorizadas."
                  />
                </View>
              </Grupo>
            </Aparecer>
          ) : null}
        </View>
      </ScrollView>

      <EnviarPdfCorreoModal
        visible={correoAbierto}
        descripcion={`Cotizacion_${folio}.pdf llega como archivo adjunto desde tu cuenta de correo.`}
        obtenerSugerido={(signal) => correoSugerido(`/cotizaciones/${cotizacion.id}`, signal)}
        enviar={(correo) => enviarPdfPorCorreo(`/cotizaciones/${cotizacion.id}`, correo)}
        onCerrar={() => setCorreoAbierto(false)}
        onEnviado={(mensaje) => {
          setCorreoAbierto(false);
          Alert.alert('Cotización enviada', mensaje);
        }}
      />

      {puedeEditar || puedeEliminar ? (
        <View
          style={[
            styles.barra,
            { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {puedeEliminar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar cotización"
              accessibilityState={{ busy: eliminando, disabled: eliminando }}
              disabled={eliminando}
              onPress={confirmarEliminar}
              style={({ pressed }) => [
                styles.botonEliminar,
                { borderColor: colors.dangerLine, backgroundColor: pressed ? colors.dangerBg : colors.surface },
                eliminando ? styles.atenuado : null,
              ]}
            >
              <Text style={[styles.botonEliminarTexto, { color: colors.danger }]}>{eliminando ? 'Eliminando…' : 'Eliminar'}</Text>
            </Pressable>
          ) : null}
          {puedeEditar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar cotización"
              onPress={() => router.push(`/cotizaciones/${cotizacion.id}/editar` as Href)}
              style={({ pressed }) => [styles.botonEditar, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
            >
              <IconEditar color={colors.onPrimary} size={16} />
              <Text style={[styles.botonEditarTexto, { color: colors.onPrimary }]}>Editar cotización</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Contenido de una pestaña: aparece con un deslizamiento corto al cambiar. */
function Aparecer({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, reduced]);
  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }], gap: spacing.xl }}
    >
      {children}
    </Animated.View>
  );
}

/** Acción rápida: icono en placa de color y etiqueta, todas del mismo tamaño. */
function Accion({
  etiqueta,
  icon,
  tono,
  onPress,
  disabled = false,
}: {
  etiqueta: string;
  icon: React.ReactNode;
  tono: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accion,
        { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.line, opacity: disabled ? 0.5 : 1 },
        elevationFor(colors, 'card'),
      ]}
    >
      <View style={[styles.accionIcono, { backgroundColor: tono }]}>{icon}</View>
      <Text style={[styles.accionTexto, { color: colors.ink }]}>{etiqueta}</Text>
    </Pressable>
  );
}

function Grupo({ titulo, meta, children }: { titulo: string; meta?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <View style={styles.grupoCabeza}>
        <Text style={[styles.grupoTitulo, { color: colors.inkSubtle }]} accessibilityRole="header">
          {titulo}
        </Text>
        {meta ? <Text style={[styles.grupoMeta, { color: colors.inkSubtle }]}>{meta}</Text> : null}
      </View>
      <View style={[styles.grupoTarjeta, { backgroundColor: colors.surface, borderColor: colors.line }, elevationFor(colors, 'panel')]}>
        {children}
      </View>
    </View>
  );
}

function Fila({
  label,
  valor,
  primera = false,
  accion = false,
  onPress,
}: {
  label: string;
  valor: string;
  primera?: boolean;
  accion?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const contenido = (
    <>
      <Text style={[styles.filaLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.filaValor, { color: accion ? colors.primary : colors.ink }]} numberOfLines={2}>
        {valor}
      </Text>
    </>
  );
  const estilo = [styles.fila, primera ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }];
  if (!onPress) {
    return (
      <View style={estilo} accessible accessibilityLabel={`${label}: ${valor}`}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valor}`}
      onPress={onPress}
      style={({ pressed }) => [...estilo, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      {contenido}
    </Pressable>
  );
}

/** Persona del registro con su foto de perfil (o iniciales si no tiene). */
function Persona({
  rol,
  nombre,
  avatar,
  fecha,
  primera = false,
}: {
  rol: string;
  nombre: string | null;
  avatar: string | null;
  fecha: string | null;
  primera?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.persona, primera ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}
      accessible
      accessibilityLabel={`${rol}: ${nombre ?? 'sin registro'}${fecha ? `, ${formatFecha(fecha)}` : ''}`}
    >
      <Avatar
        uri={avatar}
        iniciales={inicialesUsuarioDisplay(nombre ?? '', '?')}
        size={38}
        fondo={colors.navy}
        color={colors.onNavy}
        borderColor={colors.line}
      />
      <View style={styles.flex}>
        <Text style={[styles.personaRol, { color: colors.inkSubtle }]}>{rol}</Text>
        <Text style={[styles.personaNombre, { color: nombre ? colors.ink : colors.inkSubtle }]} numberOfLines={1}>
          {nombre ?? 'Sin registro'}
        </Text>
      </View>
      {fecha ? <Text style={[styles.personaFecha, { color: colors.inkSubtle }]}>{formatFecha(fecha)}</Text> : null}
    </View>
  );
}

function Conteo({ valor, label }: { valor: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.conteo} accessible accessibilityLabel={`${valor} ${label.toLowerCase()}`}>
      <Text style={[styles.conteoValor, { color: colors.ink }]}>{valor}</Text>
      <Text style={[styles.conteoLabel, { color: colors.inkSubtle }]}>{label}</Text>
    </View>
  );
}

function Linea({ label, valor, color }: { label: string; valor: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.linea}>
      <Text style={[styles.lineaLabel, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.lineaValor, { color: color ?? colors.ink }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: spacing.xxl },
  acciones: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  accion: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: TOUCH_TARGET + 36,
  },
  accionIcono: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  accionTexto: { fontFamily: font.semibold, fontSize: 13 },
  tabsCaja: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  contenido: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  grupo: { gap: spacing.sm },
  grupoCabeza: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.xs },
  grupoTitulo: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  grupoMeta: { ...type.mono, fontSize: 11 },
  grupoTarjeta: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  relleno: { padding: spacing.lg },
  rellenoHorizontal: { paddingHorizontal: spacing.lg },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filaLabel: { ...type.caption, fontSize: 13 },
  filaValor: { fontFamily: font.semibold, fontSize: 14, textAlign: 'right', flexShrink: 1 },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  estadoDerecha: { flexDirection: 'row', gap: spacing.xs },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  pillPunto: { width: 6, height: 6, borderRadius: 3 },
  pillTexto: { fontFamily: font.semibold, fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipTexto: { ...type.label, fontSize: 12, fontFamily: font.semibold },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  personaRol: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  personaNombre: { fontFamily: font.semibold, fontSize: 14 },
  personaFecha: { ...type.mono, fontSize: 12 },
  envio: { gap: 3, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  cita: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  citaBarra: { width: 2, borderRadius: 1 },
  citaTexto: { ...type.caption, flex: 1, lineHeight: 19 },
  conteos: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, paddingVertical: spacing.md },
  conteo: { flex: 1, alignItems: 'center', gap: 2 },
  conteoValor: { fontFamily: font.bold, fontSize: 20, fontVariant: ['tabular-nums'] },
  conteoLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  conteoDivisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  vacio: { ...type.caption },
  totales: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  totalesDivisor: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  linea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  lineaLabel: { ...type.caption, flex: 1 },
  lineaValor: { ...type.mono, fontFamily: font.semibold },
  totalLabel: { fontFamily: font.semibold, fontSize: 15 },
  totalValor: { fontFamily: font.bold, fontSize: 20, fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
  nota: { ...type.caption, fontSize: 12 },
  barra: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  botonEliminar: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEliminarTexto: { ...type.button, fontFamily: font.semibold },
  atenuado: { opacity: 0.5 },
  botonEditar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
  },
  botonEditarTexto: { ...type.button },
});
