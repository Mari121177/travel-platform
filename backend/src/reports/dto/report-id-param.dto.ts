import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ReportIdParamDto {
  @ApiProperty({ description: 'Report id' })
  @IsMongoId()
  id!: string;
}
