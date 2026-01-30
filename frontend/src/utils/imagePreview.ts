import * as UTIF from 'utif';
import { getFileExtension } from './fileTypes';

const TIFF_EXTENSIONS = new Set(['.tif', '.tiff']);

export const isTiffFile = (file: File): boolean => {
  if (file.type === 'image/tiff') return true;
  const ext = getFileExtension(file.name);
  return TIFF_EXTENSIONS.has(ext);
};

export const createImagePreviewUrl = async (file: File, pageIndex: number = 0): Promise<string> => {
  if (!isTiffFile(file)) {
    return URL.createObjectURL(file);
  }

  try {
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    
    if (!ifds || ifds.length === 0) {
      throw new Error(`TIFF file "${file.name}" contains no valid image data. The file may be corrupted.`);
    }

    // Warn about multi-page TIFFs (only show first page)
    if (ifds.length > 1 && pageIndex === 0) {
      console.warn(`TIFF file "${file.name}" contains ${ifds.length} pages. Only the first page will be displayed.`);
    }

    // Use the requested page or default to first page
    const actualPage = Math.min(pageIndex, ifds.length - 1);
    const ifd = ifds[actualPage];

    if (!ifd.width || !ifd.height) {
      throw new Error(`TIFF page ${actualPage + 1} in "${file.name}" has invalid dimensions.`);
    }

    UTIF.decodeImage(buffer, ifd);
    const rgba = UTIF.toRGBA8(ifd);
    
    if (!rgba || rgba.length === 0) {
      throw new Error(`Failed to decode TIFF page ${actualPage + 1} in "${file.name}". The image data may be corrupted or use an unsupported compression format.`);
    }

    const width = ifd.width;
    const height = ifd.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas rendering context. Your browser may not support this operation.');
    }
    
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    
    // Convert canvas to Blob and create object URL (can be revoked like other images)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Failed to convert TIFF "${file.name}" to displayable format.`));
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error while processing TIFF file "${file.name}": ${String(error)}`);
  }
};

export const shouldRevokeObjectUrl = (url: string | null): boolean => {
  return !!url && url.startsWith('blob:');
};
