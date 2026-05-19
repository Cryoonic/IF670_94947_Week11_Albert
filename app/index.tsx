import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

type PhotoRecord = {
  latitude: number;
  longitude: number;
  image_url: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Index() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [lastLocation, setLastLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);

  const ensurePermissions = async () => {
    const cameraResult = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!cameraResult.granted) {
      Alert.alert(
        "Permission ditolak",
        "Izinkan akses kamera terlebih dahulu.",
      );
      return false;
    }

    const locationResult = await Location.requestForegroundPermissionsAsync();

    if (locationResult.status !== "granted") {
      Alert.alert(
        "Permission ditolak",
        "Izinkan akses lokasi terlebih dahulu.",
      );
      return false;
    }

    const notificationResult = await Notifications.requestPermissionsAsync();

    if (notificationResult.status !== "granted") {
      Alert.alert(
        "Permission ditolak",
        "Izinkan akses notifikasi terlebih dahulu.",
      );
      return false;
    }

    return true;
  };

  const sendDatabaseNotification = async (
    success: boolean,
    latitude: number | null,
    longitude: number | null,
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: success
          ? "Data Berhasil Masuk Database"
          : "Data Gagal Masuk Database",
        body:
          `Latitude: ${latitude ?? "-"}\n` + `Longitude: ${longitude ?? "-"}`,
      },
      trigger: null,
    });
  };

  const takePhotoAndUpload = async () => {
    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      const allowed = await ensurePermissions();
      if (!allowed) return;

      setIsUploading(true);
      setLastImageUrl(null);

      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });

      if (!photo?.uri) {
        throw new Error("Foto gagal diambil.");
      }

      setPreviewUri(photo.uri);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      latitude = location.coords.latitude;
      longitude = location.coords.longitude;

      setLastLocation(location.coords);

      const fileName = `photo-${Date.now()}.jpg`;
      const filePath = `photos/${fileName}`;

      const response = await fetch(photo.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      const payload: PhotoRecord = {
        latitude: latitude,
        longitude: longitude,
        image_url: publicUrlData.publicUrl,
      };

      const { error: insertError } = await supabase
        .from("photo")
        .insert([payload]);

      if (insertError) {
        await sendDatabaseNotification(false, latitude, longitude);
        throw insertError;
      }

      await sendDatabaseNotification(true, latitude, longitude);

      setLastImageUrl(publicUrlData.publicUrl);

      Alert.alert("Success", "Foto dan geolokasi berhasil masuk ke Supabase.");
    } catch (error: any) {
      await sendDatabaseNotification(false, latitude, longitude);

      Alert.alert("Error", error?.message ?? "Gagal upload data ke Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>IF670 Week 12</Text>
      <Text style={styles.subtitle}>
        Camera + Geolocation + Supabase + Notification
      </Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      </View>

      <Pressable
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={takePhotoAndUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Take Photo & Upload</Text>
        )}
      </Pressable>

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.preview} />
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Data Terakhir</Text>

        <Text style={styles.infoText}>
          Latitude: {lastLocation?.latitude ?? "-"}
        </Text>

        <Text style={styles.infoText}>
          Longitude: {lastLocation?.longitude ?? "-"}
        </Text>

        <Text style={styles.infoText} numberOfLines={2}>
          Image URL: {lastImageUrl ?? "-"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f7fb",
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 18,
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
  },
  cameraWrapper: {
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#111827",
    height: 360,
  },
  camera: {
    flex: 1,
  },
  button: {
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#1f2937",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  preview: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    marginTop: 16,
  },
  infoBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  infoTitle: {
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  infoText: {
    color: "#374151",
    marginBottom: 4,
  },
});
