import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ReportTargetType } from '../report.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReportDto {
  @ApiProperty({
    enum: Object.values(ReportTargetType),
    example: 'post',
  })
  @IsIn(Object.values(ReportTargetType))
  targetType!: ReportTargetType;

  @ApiProperty({ description: 'Post, comment, review or itinerary id' })
  @IsMongoId({ message: 'targetId must be a valid item id' })
  targetId!: string;

  @ApiProperty({
    example: 'This post contains abusive language.',
    maxLength: 1000,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A reason is required' })
  @MaxLength(1000)
  reason!: string;
}
