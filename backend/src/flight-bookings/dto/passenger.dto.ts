import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum PassengerType {
  Adult = 'adult',
  Child = 'child',
  Infant = 'infant',
}

export class ExtraBagDto {
  @ApiProperty({ example: 20, description: 'Weight of this extra bag in kg' })
  @IsNumber()
  @IsPositive()
  weightKg: number;
}

export class PassengerDto {
  @ApiProperty({ example: 'Nihal Ahmed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '1998-05-20', description: 'Date of birth (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'A12345678', description: 'Passport or national ID number' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{5,20}$/, {
    message: 'passportNumber must be 5-20 letters or digits',
  })
  passportNumber: string;

  @ApiPropertyOptional({ enum: PassengerType, default: PassengerType.Adult })
  @IsOptional()
  @IsEnum(PassengerType)
  type?: PassengerType;

  @ApiPropertyOptional({ type: [ExtraBagDto], description: 'Optional extra bags (FLT-19)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraBagDto)
  extraBags?: ExtraBagDto[];
}