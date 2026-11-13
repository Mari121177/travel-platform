import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UploadResponseDto } from './dto/upload-response.dto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './upload.constants';
import { UploadsService } from './uploads.service';
import type { UploadedImage } from './uploads.service';

@ApiTags('Uploads')
@ApiCookieAuth('access_token')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Any logged-in user may upload. Which images belong to which post, activity,
  // hotel or airline (and the max of 5) is checked by the module that owns them.
  @Post('images')
  @ApiOperation({ summary: 'Upload one image: JPG or PNG, max 5 MB (GEN-08)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadResponseDto })
  @UseInterceptors(
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
    }),
  )
  upload(@UploadedFile() file?: UploadedImage) {
    return this.uploadsService.saveImage(file);
  }
}