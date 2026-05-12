import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type PhotoRecord = {
  latitude: number;
  longitude: number;
  image_url: string;
};

function base64ToArrayBuffer(base64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);

  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  const len = base64.length;

  if (base64[len - 1] === '=') bufferLength--;
  if (base64[len - 2] === '=') bufferLength--;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arrayBuffer;
}

export default function Index() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);

  const ensurePermissions = async () => {
    const cameraResult = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!cameraResult.granted) {
      Alert.alert('Permission ditolak', 'Izinkan akses kamera terlebih dahulu.');
      return false;
    }

    const locationResult = await Location.requestForegroundPermissionsAsync();
    if (locationResult.status !== 'granted') {
      Alert.alert('Permission ditolak', 'Izinkan akses lokasi terlebih dahulu.');
      return false;
    }

    return true;
  };

  const takePhotoAndUpload = async () => {
    try {
      const allowed = await ensurePermissions();
      if (!allowed) return;

      setIsUploading(true);
      setLastImageUrl(null);

      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error('Foto gagal diambil.');

      setPreviewUri(photo.uri);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLastLocation(location.coords);

      const fileName = `photo-${Date.now()}.jpg`;
      const filePath = `photos/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = base64ToArrayBuffer(base64);

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const payload: PhotoRecord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        image_url: publicUrlData.publicUrl,
      };

      const { error: insertError } = await supabase.from('photo').insert([payload]);
      if (insertError) throw insertError;

      setLastImageUrl(publicUrlData.publicUrl);
      Alert.alert('Success', 'Foto dan geolokasi berhasil masuk ke Supabase.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Gagal upload data ke Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>IF670 Week 11</Text>
      <Text style={styles.subtitle}>Camera + Geolocation + Supabase</Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      </View>

      <Pressable
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={takePhotoAndUpload}
        disabled={isUploading}
      >
        {isUploading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Take Photo & Upload</Text>}
      </Pressable>

      {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Data Terakhir</Text>
        <Text style={styles.infoText}>Latitude: {lastLocation?.latitude ?? '-'}</Text>
        <Text style={styles.infoText}>Longitude: {lastLocation?.longitude ?? '-'}</Text>
        <Text style={styles.infoText} numberOfLines={2}>Image URL: {lastImageUrl ?? '-'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fb',
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 18,
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  cameraWrapper: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#111827',
    height: 360,
  },
  camera: {
    flex: 1,
  },
  button: {
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    marginTop: 16,
  },
  infoBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  infoTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  infoText: {
    color: '#374151',
    marginBottom: 4,
  },
});
