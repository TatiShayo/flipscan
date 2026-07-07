// Client-side image prep: downscale to <=1024px and JPEG-compress BEFORE upload
// (BUILD_PROMPT §10 cost control + faster upload). The server re-checks size and
// re-encodes; this is the first line, not the only line.
//
// NOTE: SDK 57's top-level `expo-file-system` exports (readAsStringAsync, etc.) are
// deprecation stubs that THROW at runtime — the real implementation lives behind the new
// `File` class API (`new File(uri).base64()`). Use that, not the legacy free functions.
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.7;

export interface PreparedImage {
  uri: string;
  base64: string;
}

export async function prepareImage(uri: string): Promise<PreparedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIM } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  let base64 = result.base64 ?? '';
  if (!base64) {
    base64 = await new File(result.uri).base64();
  }
  return { uri: result.uri, base64 };
}
