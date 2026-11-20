import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { AuditAction } from '../audit-action';

// GEN-07. Page size is fixed at 10 (GEN-05).
export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ enum: Object.values(AuditAction) })
  @IsOptional()
  @IsIn(Object.values(AuditAction))
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Only actions done to this id' })
  @IsOptional()
  @IsMongoId()
  targetId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;
}
