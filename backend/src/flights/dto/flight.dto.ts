import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, Matches, Min } from 'class-validator';
import { CabinClass } from '../enums/flight.enums';
import { LOCAL_DT_REGEX } from '../utils/time.util';

const LOCAL_MSG = 'must be a local date-time without offset, e.g. 2026-12-20T08:00';

export class CreateFlightDto {
  @ApiProperty({ example: 'MS777' })
  @Matches(/^[A-Za-z0-9]{2}\d{1,4}$/, { message: 'flightNumber must look like MS777' })
  flightNumber: string;

  @ApiProperty({ example: 'CAI', description: 'IATA code from the airport list' })
  @Matches(/^[A-Za-z]{3}$/, { message: 'departureAirport must be a 3-letter IATA code' })
  departureAirport: string;

  @ApiProperty({ example: 'DXB', description: 'IATA code from the airport list' })
  @Matches(/^[A-Za-z]{3}$/, { message: 'arrivalAirport must be a 3-letter IATA code' })
  arrivalAirport: string;

  @ApiProperty({ example: '2026-12-20T08:00', description: 'LOCAL time at the departure airport' })
  @Matches(LOCAL_DT_REGEX, { message: `departureTime ${LOCAL_MSG}` })
  departureTime: string;

  @ApiProperty({ example: '2026-12-20T12:30', description: 'LOCAL time at the arrival airport' })
  @Matches(LOCAL_DT_REGEX, { message: `arrivalTime ${LOCAL_MSG}` })
  arrivalTime: string;
}

/** FLT-05: all fields optional */
export class UpdateFlightDto {
  @ApiPropertyOptional({ example: '2026-12-20T09:00', description: 'Local at the departure airport' })
  @IsOptional()
  @Matches(LOCAL_DT_REGEX, { message: `departureTime ${LOCAL_MSG}` })
  departureTime?: string;

  @ApiPropertyOptional({ example: '2026-12-20T13:30', description: 'Local at the arrival airport' })
  @IsOptional()
  @Matches(LOCAL_DT_REGEX, { message: `arrivalTime ${LOCAL_MSG}` })
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Only if the flight has no bookings; also send the matching time' })
  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/)
  departureAirport?: string;

  @ApiPropertyOptional({ description: 'Only if the flight has no bookings; also send the matching time' })
  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/)
  arrivalAirport?: string;
}

export class CancelFlightDto {
  @ApiPropertyOptional({ example: 'Operational reasons' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class CreateCabinDto {
  @ApiProperty({ enum: CabinClass }) @IsEnum(CabinClass) cabinClass: CabinClass;
  @ApiProperty({ example: 150, description: 'Whole number > 0' }) @IsInt() @Min(1) totalSeats: number;
  @ApiProperty({ example: 250, description: '> 0' }) @IsNumber() @IsPositive() price: number;
  @ApiProperty({ example: 1, description: 'Free bags per passenger' }) @IsInt() @Min(0) freeBags: number;
  @ApiProperty({ example: 23, description: 'Max kg per bag' }) @IsNumber() @IsPositive() maxBagWeightKg: number;
}

export class UpdateCabinDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) totalSeats?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) freeBags?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() maxBagWeightKg?: number;
}
