import * as UTIF from 'utif';
import { getFileExtension } from './fileTypes';

const TIFF_EXTENSIONS = new Set(['.tif', '.tiff']);
const MAX_IMAGE_DIMENSION = 10000;

// Security: Maximum file size for TIFF files (50MB)
const MAX_TIFF_FILE_SIZE = 50 * 1024 * 1024;

// Security: Maximum dimensions to prevent memory exhaustion
const MAX_TIFF_DIMENSION = 16384; // 16K pixels per side

export const isTiffFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/tif')) return true;
  const ext = getFileExtension(file.name);
  return TIFF_EXTENSIONS.has(ext);
};

export const createImagePreviewUrl = async (file: File, pageIndex: number = 0): Promise<string> => {
  if (!isTiffFile(file)) {
    return URL.createObjectURL(file);
  }

  let canvas: HTMLCanvasElement | null = null;
  let buffer: ArrayBuffer | null = null;
  let rgba: ArrayBuffer | null = null;
  try {
    buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) {
      throw new Error('Unable to decode TIFF');
    }
    UTIF.decodeImage(buffer, ifds[0]);
    rgba = UTIF.toRGBA8(ifds[0]);
    const rawWidth = (ifds[0] as { width?: unknown }).width;
    const rawHeight = (ifds[0] as { height?: unknown }).height;
    if (
      typeof rawWidth !== 'number' ||
      !Number.isFinite(rawWidth) ||
      rawWidth <= 0 ||
      typeof rawHeight !== 'number' ||
      !Number.isFinite(rawHeight) ||
      rawHeight <= 0
    ) {
      throw new Error('Invalid TIFF dimensions');
    }
    const width = rawWidth;
    const height = rawHeight;
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to render TIFF');
    }
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } finally {
    // Explicitly clear references to help garbage collection
    // This is especially important for large TIFF files
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    buffer = null;
    rgba = null;
  }
};

export const shouldRevokeObjectUrl = (url: string | null): boolean => {
  return !!url && url.startsWith('blob:');
};
