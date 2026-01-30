import * as UTIF from 'utif';
import { getFileExtension } from './fileTypes';

const TIFF_EXTENSIONS = new Set(['.tif', '.tiff']);

// Security: Maximum file size for TIFF files (50MB)
const MAX_TIFF_FILE_SIZE = 50 * 1024 * 1024;

// Security: Maximum dimensions to prevent memory exhaustion
const MAX_TIFF_DIMENSION = 16384; // 16K pixels per side

export const isTiffFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/tif')) return true;
  const ext = getFileExtension(file.name);
  return TIFF_EXTENSIONS.has(ext);
};

export const createImagePreviewUrl = async (file: File): Promise<string> => {
  if (!isTiffFile(file)) {
    return URL.createObjectURL(file);
  }

  // Security: Validate file size before decoding to prevent DoS
  if (file.size > MAX_TIFF_FILE_SIZE) {
    throw new Error(`TIFF file too large. Maximum size is ${MAX_TIFF_FILE_SIZE / 1024 / 1024}MB`);
  }

  let buffer: ArrayBuffer;
  let ifds: UTIF.IFD[];
  
  try {
    buffer = await file.arrayBuffer();
    ifds = UTIF.decode(buffer);
  } catch {
    throw new Error('Invalid or corrupted TIFF file');
  }

  if (!ifds.length) {
    throw new Error('Unable to decode TIFF: No image data found');
  }

  const ifd = ifds[0];
  const width = ifd.width as number;
  const height = ifd.height as number;

  // Security: Validate dimensions to prevent memory exhaustion
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error('Invalid TIFF dimensions');
  }

  if (width > MAX_TIFF_DIMENSION || height > MAX_TIFF_DIMENSION) {
    throw new Error(`TIFF dimensions too large. Maximum dimension is ${MAX_TIFF_DIMENSION} pixels`);
  }

  // Security: Additional check for total pixel count to prevent memory issues
  const totalPixels = width * height;
  const maxPixels = MAX_TIFF_DIMENSION * MAX_TIFF_DIMENSION;
  if (totalPixels > maxPixels) {
    throw new Error('TIFF image too large to process');
  }

  try {
    UTIF.decodeImage(buffer, ifd);
    const rgba = UTIF.toRGBA8(ifd);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create canvas context');
    }
    
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process TIFF file');
  }
};

export const shouldRevokeObjectUrl = (url: string | null): boolean => {
  return !!url && url.startsWith('blob:');
};
