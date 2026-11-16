import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsUUID } from 'class-validator';

// For DELETE /activities/:id/images/:imageId and /posts/:id/images/:imageId
export class ImageParamsDto {
  @ApiProperty({ example: '6af7ca36955bba4cb2d256b1' })
  @IsMongoId({ message: 'id must be a valid id' })
  id!: string;

  @ApiProperty({
    example: 'e7611c65-e1cf-4d74-8d35-a1fcae2a8b5d',
    description: 'The image id: the uuid part of the image URL',
  })
  @IsUUID('4', { message: 'imageId must be a valid image id' })
  imageId!: string;
}
