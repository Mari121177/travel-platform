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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ImageParamsDto } from '../uploads/dto/image-params.dto';
import { imageFileInterceptor } from '../uploads/image-file.interceptor';
import type { UploadedImage } from '../uploads/uploads.service';
import { ActivityImagesService } from './activity-images.service';
import { ObjectIdParamDto } from './dto/object-id-param.dto';

// ITN-12. Owner only. An activity of someone else's private itinerary gives
// 404, one of their public itinerary gives 403 (same as ITN-01).
@ApiTags('Activities')
@ApiCookieAuth('access_token')
@Controller('activities')
export class ActivityImagesController {
  constructor(private readonly imagesService: ActivityImagesService) {}

  @Post(':id/images')
  @Roles(Role.User)
  @ApiOperation({
    summary:
      'ITN-12: attach an image to an activity (JPG or PNG, max 5 MB, up to 5 per activity)',
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
      'Returns { imageId, url, images } (all image URLs of the activity)',
  })
  @ApiBadRequestResponse({
    description:
      'No file, not a JPG or PNG, over 5 MB, or the activity already has 5 images',
  })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  @UseInterceptors(imageFileInterceptor())
  add(
    @Param() params: ObjectIdParamDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.imagesService.add(params.id, user, file);
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.User)
  @ApiOperation({
    summary: 'ITN-12: remove an image from an activity (and delete its file)',
  })
  @ApiOkResponse({ description: 'Returns { deleted: true, imageId }' })
  @ApiNotFoundResponse({ description: 'Activity or image not found' })
  remove(@Param() params: ImageParamsDto, @CurrentUser() user: AuthUser) {
    return this.imagesService.remove(params.id, params.imageId, user);
  }
}
