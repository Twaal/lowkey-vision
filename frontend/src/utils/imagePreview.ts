import * as UTIF from 'utif';
import { getFileExtension } from './fileTypes';

const TIFF_EXTENSIONS = new Set(['.tif', '.tiff']);

export const isTiffFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/tif')) return true;
  const ext = getFileExtension(file.name);
  return TIFF_EXTENSIONS.has(ext);
};

export const createImagePreviewUrl = async (file: File): Promise<string> => {
  if (!isTiffFile(file)) {
    return URL.createObjectURL(file);
  }

  let canvas: HTMLCanvasElement | null = null;
  try {
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) {
      throw new Error('Unable to decode TIFF');
    }
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
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
    // Explicitly clear canvas reference to help garbage collection
    // The canvas and its resources will be cleaned up by the browser
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};

export const shouldRevokeObjectUrl = (url: string | null): boolean => {
  return !!url && url.startsWith('blob:');
};
