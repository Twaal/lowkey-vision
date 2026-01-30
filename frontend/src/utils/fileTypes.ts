export const ACCEPTED_IMAGE_MIME_PREFIX = 'image/';
export const ACCEPTED_IMAGE_EXTENSIONS = new Set([
  '.jpeg', '.jpg',
  '.png', 
  '.tif', '.tiff'
]);

export const ACCEPTED_IMAGE_ACCEPT_ATTR = 'image/*';

export const getFileExtension = (name: string): string => {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
};

export const isAcceptedImageFile = (file: File): boolean => {
  const typeOk = file.type.startsWith(ACCEPTED_IMAGE_MIME_PREFIX);
  const ext = getFileExtension(file.name);
  const extOk = ext ? ACCEPTED_IMAGE_EXTENSIONS.has(ext) : false;
  return typeOk || extOk;
};
