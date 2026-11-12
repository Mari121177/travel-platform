import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// ACC-16: the reason is optional. It goes in the audit log and in the
// notification.
export class SuspendAccountDto {
  @ApiPropertyOptional({ example: 'Abusive content in blog comments' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
