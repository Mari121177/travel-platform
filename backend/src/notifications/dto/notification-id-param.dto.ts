import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class NotificationIdParamDto {
  @ApiProperty({ description: 'Notification id' })
  @IsMongoId()
  id!: string;
}
