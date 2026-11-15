import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  CURRENCY_CODE_LENGTH,
  MAX_AMOUNT,
  TransportMode,
} from '../itinerary.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const upperCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateTransportCostDto {
  @ApiProperty({
    example: '6af7ca5d955bba4cb2d256b2',
    description: 'The day (days[]._id of this itinerary) the trip happens on',
  })
  @IsMongoId({ message: 'dayId must be a valid id' })
  dayId!: string;

  @ApiProperty({
    enum: Object.values(TransportMode),
    example: TransportMode.Train,
  })
  @IsIn(Object.values(TransportMode))
  mode!: TransportMode;

  @ApiProperty({
    example: 'cairo',
    description: 'cityId from the seeded cities',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  fromCityId!: string;

  @ApiProperty({
    example: 'luxor',
    description: 'cityId from the seeded cities',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  toCityId!: string;

  @ApiProperty({
    example: 60,
    description: 'Not negative. At most 2 decimals.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'A currency code from the supported list',
  })
  @Transform(upperCode)
  @IsString()
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH)
  currency!: string;
}
