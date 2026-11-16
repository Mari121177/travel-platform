import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './upload.constants';

/**
 * Reads ONE image from the form field "file" (GEN-08): JPG or PNG, at most
 * 5 MB, and no other form fields. UploadsService.saveImage() then checks the
 * real file structure and stores it.
 */
export const imageFileInterceptor = () =>
  FileInterceptor('file', {
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1, fields: 0 },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        return callback(
          new BadRequestException('Only JPG and PNG images are allowed'),
          false,
        );
      }
      callback(null, true);
    },
  });
