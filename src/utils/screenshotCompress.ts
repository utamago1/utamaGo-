export const FEEDBACK_SCREENSHOT_MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB raw upload cap
export const FEEDBACK_SCREENSHOT_MAX_CHARS = 260_000; // ~190 KB binary, safely under 1 MB Firestore limit

export interface CompressedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  fileName: string;
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('File gambar tidak dapat dibuka atau rusak.'));
    img.src = src;
  });
}

function renderCompressedDataUrl(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): { dataUrl: string; width: number; height: number } {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH, 1));
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }

  // Fill neutral dark-safe backdrop in case source PNG has transparency
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, width, height };
}

/**
 * Compresses and resizes a user-selected screenshot so it stays crisp and legible
 * for bug debugging while remaining strictly below FEEDBACK_SCREENSHOT_MAX_CHARS.
 */
export async function compressFeedbackScreenshot(
  file: File,
): Promise<CompressedScreenshot> {
  if (!file || !ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase())) {
    throw new Error('Format file harus berupa gambar PNG, JPG, atau WebP.');
  }
  if (file.size > FEEDBACK_SCREENSHOT_MAX_RAW_BYTES) {
    throw new Error('Ukuran file terlalu besar (maksimal 10 MB).');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  const attempts: ReadonlyArray<{ maxDim: number; quality: number }> = [
    { maxDim: 1080, quality: 0.78 },
    { maxDim: 960, quality: 0.7 },
    { maxDim: 820, quality: 0.6 },
    { maxDim: 680, quality: 0.5 },
    { maxDim: 540, quality: 0.42 },
  ];

  let best: { dataUrl: string; width: number; height: number } | null = null;
  for (const step of attempts) {
    const rendered = renderCompressedDataUrl(img, step.maxDim, step.quality);
    best = rendered;
    if (rendered.dataUrl.length <= FEEDBACK_SCREENSHOT_MAX_CHARS) {
      break;
    }
  }

  if (!best || best.dataUrl.length > FEEDBACK_SCREENSHOT_MAX_CHARS) {
    throw new Error(
      'Screenshot terlalu padat untuk dikompres. Coba potong bagian error saja lalu unggah ulang.',
    );
  }

  // Approximate binary size in KB from base64 length
  const commaIdx = best.dataUrl.indexOf(',');
  const base64Len = commaIdx >= 0 ? best.dataUrl.length - commaIdx - 1 : best.dataUrl.length;
  const approxBytes = Math.round((base64Len * 3) / 4);

  return {
    dataUrl: best.dataUrl,
    width: best.width,
    height: best.height,
    sizeKb: Math.max(1, Math.round(approxBytes / 1024)),
    fileName: file.name || 'screenshot.jpg',
  };
}
