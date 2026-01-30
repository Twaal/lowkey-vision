import * as UTIF from 'utif';
import { getFileExtension } from './fileTypes';

const TIFF_EXTENSIONS = new Set(['.tif', '.tiff']);
const MAX_IMAGE_DIMENSION = 10000;

export const isTiffFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/tif')) return true;
  const ext = getFileExtension(file.name);
  return TIFF_EXTENSIONS.has(ext);
};

export const createImagePreviewUrl = async (file: File): Promise<string> => {
  if (!isTiffFile(file)) {
    return URL.createObjectURL(file);
  }

  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds.length) {
    throw new Error('Unable to decode TIFF');
  }
  
  // Validate dimensions before expensive decode operations to prevent performance issues
  const width = ifds[0].width as number;
  const height = ifds[0].height as number;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new Error(`TIFF image dimensions (${width}x${height}) exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels`);
  }
  
  UTIF.decodeImage(buffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to render TIFF');
  }
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

export const shouldRevokeObjectUrl = (url: string | null): boolean => {
  return !!url && url.startsWith('blob:');
};
