import { UPLOADS_URL_PREFIX } from './upload.constants';

/**
 * An image is identified by the random name the upload endpoint gave it:
 * "/uploads/<uuid>.jpg" has the image id "<uuid>" (GEN-08).
 */
export function imageIdFromUrl(url: string): string {
  const fileName = url.slice(url.lastIndexOf('/') + 1);
  return fileName.slice(0, fileName.lastIndexOf('.'));
}

/** The stored URL (".jpg" or ".png") that belongs to an image id, if any. */
export function findUrlByImageId(
  urls: string[],
  imageId: string,
): string | undefined {
  return urls.find((url) =>
    url.startsWith(`${UPLOADS_URL_PREFIX}/${imageId}.`),
  );
}
