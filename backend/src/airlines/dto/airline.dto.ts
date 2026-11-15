import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { UPLOAD_URL_REGEX } from '../../uploads/upload.constants';

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
  @Matches(UPLOAD_URL_REGEX, {
    message: 'logoUrl must be a URL returned by the upload endpoint',
  })
  logoUrl?: string;
}

export class UpdateAirlineDto extends PartialType(CreateAirlineDto) {}
