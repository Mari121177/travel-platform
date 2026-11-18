import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ResolveAction = {
  Dismiss: 'dismiss',
  Hide: 'hide',
  Delete: 'delete',
} as const;
export type ResolveAction = (typeof ResolveAction)[keyof typeof ResolveAction];

export class ResolveReportDto {
  @ApiProperty({ enum: Object.values(ResolveAction), example: 'hide' })
  @IsIn(Object.values(ResolveAction))
  action!: ResolveAction;
}
