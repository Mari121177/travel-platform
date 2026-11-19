import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportStatus, ReportTargetType } from '../report.constants';

export class ListReportsQueryDto {
  @ApiPropertyOptional({
    enum: Object.values(ReportStatus),
    description: 'Defaults to open reports',
  })
  @IsOptional()
  @IsIn(Object.values(ReportStatus))
  status: ReportStatus = ReportStatus.Open;

  @ApiPropertyOptional({ enum: Object.values(ReportTargetType) })
  @IsOptional()
  @IsIn(Object.values(ReportTargetType))
  targetType?: ReportTargetType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
