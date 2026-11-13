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

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
// Every PNG ends with an empty IEND chunk
const PNG_IEND_CHUNK = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

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
    // Do not trust the declared type: check the real file structure
    if (!this.hasValidStructure(file.buffer, file.mimetype)) {
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
   * and files that are already gone. Any other failure is thrown, so the
   * caller knows the image was NOT removed.
   */
  async deleteByUrl(url: string): Promise<void> {
    if (!UPLOAD_URL_REGEX.test(url)) return;
    try {
      await unlink(join(UPLOADS_DIR, basename(url)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private hasValidStructure(buffer: Buffer, mimeType: string): boolean {
    return mimeType === 'image/png'
      ? this.isValidPng(buffer)
      : this.isValidJpeg(buffer);
  }

  // signature + a real IHDR header with non-zero size + IEND at the end
  private isValidPng(buffer: Buffer): boolean {
    // 8 signature + 25 IHDR chunk + 12 IEND chunk
    if (buffer.length < 45) return false;
    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
    if (buffer.readUInt32BE(8) !== 13) return false;
    if (buffer.toString('ascii', 12, 16) !== 'IHDR') return false;
    if (buffer.readUInt32BE(16) === 0 || buffer.readUInt32BE(20) === 0) {
      return false;
    }
    return buffer.subarray(buffer.length - 12).equals(PNG_IEND_CHUNK);
  }

  // signature + a frame header with non-zero size + end-of-image marker
  private isValidJpeg(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return false;
    }

    // must end with FF D9 (zero padding after it is tolerated)
    let end = buffer.length;
    while (end > 2 && buffer[end - 1] === 0x00) end--;
    if (buffer[end - 2] !== 0xff || buffer[end - 1] !== 0xd9) return false;

    // walk the segments until the frame header (SOFn), which holds the size
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset] !== 0xff) return false;
      const marker = buffer[offset + 1];

      if (marker === 0xff) {
        offset += 1; // fill byte
        continue;
      }
      // markers without a length
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        offset += 2;
        continue;
      }

      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) return false;

      const isFrameHeader =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isFrameHeader) {
        if (offset + 9 > buffer.length) return false;
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return width > 0 && height > 0;
      }
      // image data started before any frame header
      if (marker === 0xda) return false;

      offset += 2 + length;
    }
    return false;
  }
}