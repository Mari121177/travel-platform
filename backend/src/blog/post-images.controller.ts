import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ImageParamsDto } from '../uploads/dto/image-params.dto';
import { imageFileInterceptor } from '../uploads/image-file.interceptor';
import type { UploadedImage } from '../uploads/uploads.service';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { PostImagesService } from './post-images.service';

// BLG-10. Only the author, who is always the logged-in user.
@ApiTags('Blog')
@ApiCookieAuth()
@Roles(Role.User)
@Controller('posts')
export class PostImagesController {
  constructor(private readonly imagesService: PostImagesService) {}

  @Post(':id/images')
  @ApiOperation({
    summary:
      'BLG-10: attach an image to my post (JPG or PNG, max 5 MB, up to 5 per post)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({
    description:
      'Returns { imageId, url, images } (all image URLs of the post)',
  })
  @ApiBadRequestResponse({
    description:
      'No file, not a JPG or PNG, over 5 MB, or the post already has 5 images',
  })
  @ApiForbiddenResponse({ description: "Someone else's published post" })
  @ApiNotFoundResponse({ description: "Not found, or someone else's draft" })
  @UseInterceptors(imageFileInterceptor())
  add(
    @CurrentUser('id') userId: string,
    @Param() params: PostIdParamDto,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.imagesService.add(userId, params.id, file);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({
    summary: 'BLG-10: remove an image from my post (and delete its file)',
  })
  @ApiOkResponse({ description: 'Returns { deleted: true, imageId }' })
  @ApiForbiddenResponse({ description: "Someone else's published post" })
  @ApiNotFoundResponse({
    description: "Post or image not found, or someone else's draft",
  })
  remove(@CurrentUser('id') userId: string, @Param() params: ImageParamsDto) {
    return this.imagesService.remove(userId, params.id, params.imageId);
  }
}
