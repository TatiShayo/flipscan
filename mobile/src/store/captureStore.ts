// Transient (non-persisted) hand-off between /camera -> /scanning -> /result/[scanId].
// Router params are a poor fit for base64 image payloads; a plain in-memory zustand
// store is the simplest correct mechanism for a single-flight, same-session hand-off.
import { create } from 'zustand';
import type { PreparedImage } from '@/lib/image';
import type { ScanResult } from '@/types/scan';

export interface PendingCapture {
  images: PreparedImage[];
  mode: 'photo' | 'barcode';
  barcode?: string;
  mockVariant?: 'low_conf' | 'barcode';
}

interface CaptureState {
  pending: PendingCapture | null;
  lastResult: ScanResult | null;
  lastImageUri: string | null;
  // The primary photo(s) from the scan that just produced lastResult — kept around so a
  // low-confidence rescan (BUILD_PROMPT §11 "Snap the tag") can append a second photo to
  // the SAME capture rather than starting a fresh single-photo scan.
  lastImages: PreparedImage[];
  setCaptured: (capture: PendingCapture) => void;
  setResult: (result: ScanResult, imageUri: string | null, images?: PreparedImage[]) => void;
  clear: () => void;
}

export const useCapturedImageStore = create<CaptureState>((set) => ({
  pending: null,
  lastResult: null,
  lastImageUri: null,
  lastImages: [],
  setCaptured: (capture) => set({ pending: capture }),
  setResult: (result, imageUri, images) =>
    set((s) => ({
      lastResult: result,
      lastImageUri: imageUri,
      lastImages: images ?? s.lastImages,
      pending: null,
    })),
  clear: () => set({ pending: null, lastResult: null, lastImageUri: null, lastImages: [] }),
}));
