import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UPLOAD_URL_REGEX } from '../../uploads/upload.constants';

// HTL-01: what an ADMIN may send when creating a hotel.
// countryCode is NOT here: the service derives it from cityId.
export class CreateHotelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @IsString()
  @IsNotEmpty()
  cityId: string; // must exist in seeded cities (checked in service)

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5) // GEN-08: max 5 images per hotel
  @IsString({ each: true })
  @Matches(UPLOAD_URL_REGEX, {
    each: true,
    message: 'Each photo must be an image uploaded through /api/uploads/images.',
  })
  photos?: string[]; // URLs returned by the uploads module, e.g. "/uploads/<uuid>.jpg"

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  starClass?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
