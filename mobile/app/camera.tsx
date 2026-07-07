// Full-screen camera route — minimal chrome, pulsing framing corners, barcode-mode
// segmented toggle (BUILD_PROMPT §1-2, PLAYBOOK art direction). Capture -> shutter haptic
// -> downscale -> push into the scan-progress screen with the prepared image as a param.
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { prepareImage } from '@/lib/image';
import { useCapturedImageStore } from '@/store/captureStore';

type Mode = 'photo' | 'barcode';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('photo');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const setCaptured = useCapturedImageStore((s) => s.setCaptured);

  // NOTE: true subject-centering detection would need on-device object detection, which
  // isn't wired up yet (NEEDS HUMAN / fast-follow). The corners pulse continuously as a
  // gentler stand-in for "a subject is centered" rather than faking a detector.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);
  const cornerStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
      if (!photo?.uri) throw new Error('capture failed');
      const prepared = await prepareImage(photo.uri);
      setCaptured({ images: [prepared], mode: 'photo' });
      router.replace('/scanning');
    } catch {
      setCapturing(false);
    }
  }, [capturing, setCaptured]);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (capturing) return;
      setCapturing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCaptured({ images: [], mode: 'barcode', barcode: result.data });
      router.replace('/scanning');
    },
    [capturing, setCaptured],
  );

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Icon name="camera" size={32} color={Colors.inkFaint} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            FlipScan can&apos;t identify items without seeing them. Enable camera access to keep scanning.
          </Text>
          <Button title="Grant access" onPress={() => requestPermission()} />
          <Button title="Not now" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={mode === 'barcode' ? handleBarcode : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'],
        }}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <Icon name="x" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => setMode('photo')}
              style={[styles.modeOption, mode === 'photo' && styles.modeOptionActive]}
            >
              <Text style={[styles.modeLabel, mode === 'photo' && styles.modeLabelActive]}>Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('barcode')}
              style={[styles.modeOption, mode === 'barcode' && styles.modeOptionActive]}
            >
              <Text style={[styles.modeLabel, mode === 'barcode' && styles.modeLabelActive]}>Barcode</Text>
            </Pressable>
          </View>
        </View>

        {mode === 'photo' && (
          <View style={styles.frameWrap} pointerEvents="none">
            <Animated.View style={[styles.corner, styles.cornerTL, cornerStyle]} />
            <Animated.View style={[styles.corner, styles.cornerTR, cornerStyle]} />
            <Animated.View style={[styles.corner, styles.cornerBL, cornerStyle]} />
            <Animated.View style={[styles.corner, styles.cornerBR, cornerStyle]} />
          </View>
        )}

        <View style={styles.bottomBar}>
          <Text style={styles.hint}>
            {mode === 'photo' ? 'Center the item in the frame' : 'Point at the barcode'}
          </Text>
          {mode === 'photo' && (
            <Pressable
              onPress={handleCapture}
              disabled={capturing}
              style={[styles.shutter, capturing && styles.shutterDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
            >
              <View style={styles.shutterInner} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.overlay,
    borderRadius: Radius.pill,
    padding: 4,
  },
  modeOption: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  modeOptionActive: { backgroundColor: Colors.cream },
  modeLabel: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.white },
  modeLabelActive: { color: Colors.ink },
  frameWrap: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: 220,
  },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: Colors.cream },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 8 },
  bottomBar: { alignItems: 'center', paddingBottom: Spacing.xxl, gap: Spacing.lg },
  hint: { color: Colors.white, fontFamily: Fonts.bodyMedium, fontSize: 14 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.white },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  permissionTitle: { fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.white },
  permissionBody: { fontFamily: Fonts.body, fontSize: 14, color: Colors.white, textAlign: 'center', opacity: 0.8 },
});
