import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PassengerDto } from './passenger.dto';

export class CreateFlightBookingDto {
  @ApiProperty({ description: 'Outbound flight id' })
  @IsMongoId()
  flightId: string;

  @ApiPropertyOptional({ description: 'Return flight id (round trip)' })
  @IsOptional()
  @IsMongoId()
  returnFlightId?: string;

  @ApiProperty({ example: 'Economy', description: 'Cabin class (must match the flight cabins)' })
  @IsString()
  @IsNotEmpty()
  cabinClass: string;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];
}