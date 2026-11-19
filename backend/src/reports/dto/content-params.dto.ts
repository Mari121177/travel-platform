import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { ReportTargetType } from '../report.constants';

export class ContentParamsDto {
  @ApiProperty({ enum: Object.values(ReportTargetType), example: 'post' })
  @IsIn(Object.values(ReportTargetType))
  type!: ReportTargetType;

  @ApiProperty({ description: 'Post, comment, review or itinerary id' })
  @IsMongoId()
  id!: string;
}
