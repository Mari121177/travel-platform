import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAirlineDto {
  @ApiProperty({ example: 'EgyptAir' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'MS', description: 'IATA 2-character code' })
  @Matches(/^[A-Za-z0-9]{2}$/, { message: 'code must be a 2-character IATA code' })
  code: string;

  @ApiPropertyOptional({ description: 'Logo URL (set via the upload endpoint, GEN-08)' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateAirlineDto extends PartialType(CreateAirlineDto) {}
