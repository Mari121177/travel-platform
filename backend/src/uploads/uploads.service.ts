import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  UPLOAD_URL_REGEX,
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from './upload.constants';

// The part of a multer file that we use (kept here so no extra types package is needed)
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const EXTENSION_BY_MIME: Record<string, 'jpg' | 'png'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

@Injectable()
export class UploadsService {
  // GEN-08: validate, store on the server, return a URL
  async saveImage(file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send multipart/form-data with the field name "file"',
      );
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG and PNG images are allowed');
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller');
    }
    // Do not trust the declared type: check the real file signature
    if (!this.signatureMatches(file.buffer, file.mimetype)) {
      throw new BadRequestException('The file is not a valid JPG or PNG image');
    }

    // Random name: the original file name is never used
    const fileName = `${randomUUID()}.${EXTENSION_BY_MIME[file.mimetype]}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(join(UPLOADS_DIR, fileName), file.buffer);

    return {
      url: `${UPLOADS_URL_PREFIX}/${fileName}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * For other modules: remove a stored image (for example when it is removed
   * from a post or activity). Ignores URLs that did not come from this module
   * and files that are already gone.
   */
  async deleteByUrl(url: string): Promise<void> {
    if (!UPLOAD_URL_REGEX.test(url)) return;
    try {
      await unlink(join(UPLOADS_DIR, basename(url)));
    } catch {
      // already deleted: nothing to do
    }
  }

  private signatureMatches(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/png') {
      return (
        buffer.length > 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }
    // JPEG files start with FF D8 FF
    return (
      buffer.length > 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
}