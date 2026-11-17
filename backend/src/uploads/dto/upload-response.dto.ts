import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    example: '/uploads/3f2b9c1e-8d4a-4b7e-9a51-2c6f0d1e7a44.jpg',
    description:
      'Relative URL. The frontend adds the backend address in front.',
  })
  url!: string;

  @ApiProperty({ example: 182340, description: 'Size in bytes' })
  size!: number;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;
}
