import heic2any from "heic2any";

const MAX_DIMENSION = 1200;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const JPEG_QUALITY = 0.8;

/** Convert, resize, and compress an image file to a JPEG Blob ready for upload. */
export async function processImageFile(file: File): Promise<File> {
  let inputBlob: Blob = file;

  // Convert HEIC/HEIF to JPEG first
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (isHeic) {
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
    inputBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  // Decode image via bitmap
  const bitmap = await createImageBitmap(inputBlob);
  const { width, height } = bitmap;

  let targetWidth = width;
  let targetHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const compressed = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress image"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  if (compressed.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Image too large after compression (${(compressed.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    );
  }

  // Return as File with .jpg extension so the backend sees a proper filename
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([compressed], `${baseName}.jpg`, { type: "image/jpeg" });
}
