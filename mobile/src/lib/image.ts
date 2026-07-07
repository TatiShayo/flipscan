// Client-side image prep: downscale to <=1024px and JPEG-compress BEFORE upload
// (BUILD_PROMPT §10 cost control + faster upload). The server re-checks size and
// re-encodes; this is the first line, not the only line.
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

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
    base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  return { uri: result.uri, base64 };
}
