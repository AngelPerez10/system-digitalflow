import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Line, Path } from 'react-native-svg';
import { toUserMessage } from '@/api/errors';
import { uploadProyectoImage } from '@/api/proyectosApi';
import { comprimirFotoParaSubida } from '@/features/orders/comprimirFoto';
import { IconCamera, IconNote } from '@/features/orders/components/icons';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import type { ProyectoNotaDia } from '@/types/proyecto';
import { crearNotaDia, NOTA_DIA_MIN_CHARS } from '../editarProyectoForm';

const MAX_FOTOS_DIA = 2;

interface Props {
  notas: ProyectoNotaDia[];
  errores?: Record<string, string>;
  disabled?: boolean;
  requiereMinimo: boolean;
  onChange: (notas: ProyectoNotaDia[]) => void;
}

function IconGaleria({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5h16a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 15.5 8 11a1.5 1.5 0 0 1 2.1 0l1.4 1.4"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 14l2.5-2.5a1.5 1.5 0 0 1 2.1 0L21 15"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconTacho({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7h15" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 7 7.2 19a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4L17.5 7"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={10} y1={10.5} x2={10.3} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={14} y1={10.5} x2={13.7} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function IconMas({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FotosDia({
  urls,
  disabled,
  onChange,
}: {
  urls: string[];
  disabled?: boolean;
  onChange: (urls: string[]) => void;
}) {
  const { colors } = useTheme();
  const [subiendo, setSubiendo] = useState(false);
  const cupo = MAX_FOTOS_DIA - urls.length;

  const subirSeleccion = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const seleccion = assets.filter((a) => a.uri).slice(0, cupo);
    if (seleccion.length === 0) return;
    setSubiendo(true);
    try {
      const nuevas: string[] = [];
      for (const asset of seleccion) {
        try {
          const dataUrl = await comprimirFotoParaSubida(asset.uri);
          nuevas.push(await uploadProyectoImage(dataUrl, 'proyectos/bitacora'));
        } catch (err) {
          Alert.alert('No se pudo subir la foto', toUserMessage(err));
        }
      }
      if (nuevas.length > 0) onChange([...urls, ...nuevas]);
    } finally {
      setSubiendo(false);
    }
  };

  const tomarFoto = async () => {
    if (disabled || subiendo || cupo <= 0) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa la cámara en Ajustes para fotografiar la jornada.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, exif: false });
    if (result.canceled) return;
    await subirSeleccion(result.assets);
  };

  const elegirGaleria = async () => {
    if (disabled || subiendo || cupo <= 0) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa el acceso a fotos en Ajustes para adjuntar evidencia.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: cupo,
      exif: false,
    });
    if (result.canceled) return;
    await subirSeleccion(result.assets);
  };

  const quitar = (index: number) => {
    Alert.alert('Quitar foto', '¿Quitar esta foto del día?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => onChange(urls.filter((_, i) => i !== index)) },
    ]);
  };

  return (
    <View style={styles.fotosBloque}>
      {urls.length > 0 ? (
        <View style={styles.fotosFila}>
          {urls.map((url, index) => (
            <View key={`${url}-${index}`} style={styles.fotoCelda}>
              <Image source={{ uri: url }} style={[styles.foto, { backgroundColor: colors.surfaceSunken }]} resizeMode="cover" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${index + 1}`}
                disabled={disabled}
                onPress={() => quitar(index)}
                style={styles.quitarFoto}
                hitSlop={6}
              >
                <Text style={styles.quitarFotoTexto}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {cupo > 0 && !disabled ? (
        <View style={styles.fotoAcciones}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar foto del día"
            disabled={subiendo}
            onPress={() => void tomarFoto()}
            style={({ pressed }) => [
              styles.fotoBoton,
              { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
            ]}
          >
            {subiendo ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <IconCamera color={colors.primary} size={14} />
                <Text style={[styles.fotoBotonTexto, { color: colors.ink }]}>Cámara</Text>
              </>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir foto del día de la galería"
            disabled={subiendo}
            onPress={() => void elegirGaleria()}
            style={({ pressed }) => [
              styles.fotoBoton,
              { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
            ]}
          >
            <IconGaleria color={colors.primary} size={14} />
            <Text style={[styles.fotoBotonTexto, { color: colors.ink }]}>Galería</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Bitácora por jornada — texto + hasta 2 fotos por día. El mínimo de
 * `NOTA_DIA_MIN_CHARS` solo se exige al cerrar el proyecto.
 */
export function NotasPorDiaEditor({ notas, errores, disabled, requiereMinimo, onChange }: Props) {
  const { colors } = useTheme();

  const actualizarNota = (index: number, valor: string) => {
    onChange(notas.map((nota, i) => (i === index ? { ...nota, nota: valor } : nota)));
  };

  const actualizarFotos = (index: number, urls: string[]) => {
    onChange(notas.map((nota, i) => (i === index ? { ...nota, imagenesUrls: urls } : nota)));
  };

  const agregarDia = () => {
    onChange([...notas, crearNotaDia()]);
  };

  const quitarDia = (index: number) => {
    Alert.alert(
      `Quitar día ${index + 1}`,
      'Se borrará la nota y las fotos de esta jornada. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => onChange(notas.filter((_, i) => i !== index)),
        },
      ],
    );
  };

  return (
    <View style={styles.lista}>
      {notas.map((nota, index) => {
        const largo = nota.nota.trim().length;
        const error = errores?.[nota.id];
        const faltan = Math.max(0, NOTA_DIA_MIN_CHARS - largo);
        const completo = requiereMinimo ? largo >= NOTA_DIA_MIN_CHARS : largo > 0;
        return (
          <View key={nota.id} style={[styles.dia, { borderColor: colors.line, backgroundColor: colors.surface }]}>
            <View style={[styles.diaEncabezado, { borderBottomColor: colors.line }]}>
              <View style={styles.diaEncabezadoIzq}>
                <View
                  style={[
                    styles.diaNumero,
                    { backgroundColor: completo ? colors.statusResueltoBg : colors.primaryRing },
                  ]}
                >
                  <Text style={[styles.diaNumeroTexto, { color: completo ? colors.statusResueltoText : colors.primary }]}>
                    {index + 1}
                  </Text>
                </View>
                <IconNote color={colors.inkSubtle} size={14} />
                <Text style={[styles.diaTitulo, { color: colors.ink }]}>Día {index + 1}</Text>
              </View>
              {notas.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar día ${index + 1}`}
                  disabled={disabled}
                  onPress={() => quitarDia(index)}
                  hitSlop={8}
                  style={styles.quitarDiaBoton}
                >
                  <IconTacho color={colors.danger} size={15} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.diaCuerpo}>
              <TextField
                label={`Nota del día ${index + 1}`}
                value={nota.nota}
                onChangeText={(valor) => actualizarNota(index, valor)}
                placeholder="Avances, pendientes o hallazgos del día…"
                multiline
                editable={!disabled}
                error={error}
                helper={
                  requiereMinimo
                    ? faltan > 0
                      ? `${largo} / ${NOTA_DIA_MIN_CHARS} · faltan ${faltan} para cerrar`
                      : `${largo} caracteres · listo para cerrar`
                    : `${largo} caracteres · al cerrar se piden ${NOTA_DIA_MIN_CHARS}`
                }
              />

              <FotosDia
                urls={nota.imagenesUrls}
                disabled={disabled}
                onChange={(urls) => actualizarFotos(index, urls)}
              />
            </View>
          </View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar día a la bitácora"
        disabled={disabled}
        onPress={agregarDia}
        style={({ pressed }) => [
          styles.agregarDia,
          { borderColor: colors.primaryRing, backgroundColor: pressed ? colors.surfaceSunken : colors.surface },
        ]}
      >
        <IconMas color={colors.primary} size={15} />
        <Text style={[styles.agregarDiaTexto, { color: colors.primary }]}>Agregar día</Text>
      </Pressable>
    </View>
  );
}

const FOTO_TAM = 60;

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  dia: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  diaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diaEncabezadoIzq: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  diaNumero: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  diaNumeroTexto: { ...type.label, fontSize: 12, fontVariant: ['tabular-nums'] },
  diaTitulo: { ...type.bodyMedium },
  quitarDiaBoton: {
    width: TOUCH_TARGET - 12,
    height: TOUCH_TARGET - 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaCuerpo: { padding: spacing.md, gap: spacing.sm },
  fotosBloque: { gap: spacing.sm },
  fotosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fotoCelda: { width: FOTO_TAM, height: FOTO_TAM },
  foto: { width: '100%', height: '100%', borderRadius: radius.sm },
  quitarFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(9,9,11,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitarFotoTexto: { color: '#FFFFFF', fontSize: 14, lineHeight: 16, fontWeight: '600' },
  fotoAcciones: { flexDirection: 'row', gap: spacing.sm },
  fotoBoton: {
    flex: 1,
    minHeight: TOUCH_TARGET - 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  fotoBotonTexto: { ...type.label, fontSize: 13 },
  agregarDia: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  agregarDiaTexto: { ...type.label },
});
