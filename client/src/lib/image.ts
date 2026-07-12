/** Downscale + compress an image file to a JPEG data URL for OCR upload. */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  return bitmapToDataUrl(bitmap, maxDim, quality);
}

export function canvasCaptureToDataUrl(
  video: HTMLVideoElement,
  maxDim = 1600,
  quality = 0.85,
): string {
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function bitmapToDataUrl(
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number,
): string {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
