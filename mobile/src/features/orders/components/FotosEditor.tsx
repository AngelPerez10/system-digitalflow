import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { toUserMessage } from '@/api/errors';
import { uploadOrdenImage } from '@/api/ordenesApi';
import { colors, elevation, radius, spacing, TOUCH_TARGET, type } from '@/theme/tokens';
import { IconCamera } from './icons';

interface Props {
  urls: string[];
  maxFotos: number;
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

const HUECO = spacing.sm;
const COLUMNAS = 2;

/**
 * Galería editable: miniaturas existentes + botones para cámara / galería.
 * Sube de inmediato a Cloudinary (`POST /ordenes/upload-image/`) y solo guarda
 * la URL https en el formulario — el PATCH de la orden manda la lista completa.
 *
 * Calidad 0.55 en el picker: el backend recorta a ~80 KB; no hace falta
 * `expo-image-manipulator` para la v1.
 */
export function FotosEditor({ urls, maxFotos, onChange, disabled = false }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cupo = Math.max(0, maxFotos - urls.length);
  const lleno = cupo <= 0;

  const subirAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) return;
    setSubiendo(true);
    setError(null);
    const nuevas: string[] = [];
    try {
      for (const asset of assets.slice(0, cupo)) {
        const mime = asset.mimeType?.startsWith('image/') ? asset.mimeType : 'image/jpeg';
        if (!asset.base64) {
          setError('No se pudo leer la foto. Inténtalo de nuevo.');
          continue;
        }
        if (mime.includes('heic') || mime.includes('heif')) {
          setError('Las fotos HEIC no se pueden subir. Usa JPG en la cámara.');
          continue;
        }
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        const url = await uploadOrdenImage(dataUrl, 'ordenes/fotos');
        nuevas.push(url);
      }
      if (nuevas.length > 0) onChange([...urls, ...nuevas]);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSubiendo(false);
    }
  };

  const pedirPermisoCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa la cámara en Ajustes para fotografiar la evidencia.');
      return false;
    }
    return true;
  };

  const pedirPermisoGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa el acceso a fotos en Ajustes para adjuntar evidencia.');
      return false;
    }
    return true;
  };

  const tomarFoto = async () => {
    if (disabled || lleno || subiendo) return;
    if (!(await pedirPermisoCamara())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      base64: true,
      exif: false,
    });
    if (result.canceled) return;
    await subirAssets(result.assets);
  };

  const elegirGaleria = async () => {
    if (disabled || lleno || subiendo) return;
    if (!(await pedirPermisoGaleria())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: cupo,
      exif: false,
    });
    if (result.canceled) return;
    await subirAssets(result.assets);
  };

  const quitar = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.cupo}>
        {urls.length} de {maxFotos} fotos
      </Text>

      <View style={styles.grid}>
        {urls.map((url, index) => (
          <View key={`${url}-${index}`} style={styles.celda}>
            <Image source={{ uri: url }} style={styles.miniatura} resizeMode="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar foto ${index + 1}`}
              disabled={disabled || subiendo}
              onPress={() => quitar(index)}
              style={({ pressed }) => [styles.quitar, pressed ? styles.quitarPressed : null]}
              hitSlop={6}
            >
              <Text style={styles.quitarTexto}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.acciones}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomar foto"
          accessibilityState={{ disabled: disabled || lleno || subiendo }}
          disabled={disabled || lleno || subiendo}
          onPress={() => void tomarFoto()}
          style={({ pressed }) => [
            styles.boton,
            pressed ? styles.botonPressed : null,
            lleno || subiendo ? styles.botonInactivo : null,
          ]}
        >
          <IconCamera color={colors.primary} size={16} />
          <Text style={styles.botonTexto}>Cámara</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir de la galería"
          accessibilityState={{ disabled: disabled || lleno || subiendo }}
          disabled={disabled || lleno || subiendo}
          onPress={() => void elegirGaleria()}
          style={({ pressed }) => [
            styles.boton,
            pressed ? styles.botonPressed : null,
            lleno || subiendo ? styles.botonInactivo : null,
          ]}
        >
          <Text style={styles.botonTexto}>Galería</Text>
        </Pressable>
      </View>

      {subiendo ? (
        <View style={styles.cargando} accessibilityRole="progressbar" accessibilityLabel="Subiendo fotos">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.cargandoTexto}>Subiendo…</Text>
        </View>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {lleno ? (
        <Text style={styles.lleno}>Límite de fotos alcanzado para esta orden.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  cupo: { ...type.caption, color: colors.inkMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -HUECO / 2 },
  celda: {
    width: `${100 / COLUMNAS}%`,
    aspectRatio: 4 / 3,
    padding: HUECO / 2,
  },
  miniatura: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    ...elevation.panel,
  },
  quitar: {
    position: 'absolute',
    top: HUECO / 2 + 6,
    right: HUECO / 2 + 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(9,9,11,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitarPressed: { opacity: 0.7 },
  quitarTexto: { color: '#FFFFFF', fontSize: 18, lineHeight: 20, fontWeight: '600' },
  acciones: { flexDirection: 'row', gap: spacing.sm },
  boton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  botonPressed: { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong },
  botonInactivo: { opacity: 0.45 },
  botonTexto: { ...type.label, color: colors.ink },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cargandoTexto: { ...type.caption, color: colors.inkMuted },
  error: { ...type.caption, color: colors.danger },
  lleno: { ...type.caption, color: colors.inkSubtle },
});
