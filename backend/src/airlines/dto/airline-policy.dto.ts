import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNumber, IsPositive, Max, Min, ValidateNested } from 'class-validator';

/** FLT-08 */
export class BaggagePolicyDto {
  @ApiProperty({ example: 40, description: 'Price per extra bag (> 0)' })
  @IsNumber()
  @IsPositive()
  extraBagPrice: number;

  @ApiProperty({ example: 2, description: 'Max extra bags per passenger (>= 0)' })
  @IsInt()
  @Min(0)
  @Max(20)
  maxExtraBags: number;
}

/** FLT-09 */
export class CancellationTierDto {
  @ApiProperty({ example: 7, description: 'Integer >= 0, unique per airline' })
  @IsInt()
  @Min(0)
  daysBeforeDeparture: number;

  @ApiProperty({ example: 80, description: '0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercent: number;
}

export class CancellationPolicyDto {
  @ApiProperty({
    type: [CancellationTierDto],
    example: [
      { daysBeforeDeparture: 14, refundPercent: 100 },
      { daysBeforeDeparture: 7, refundPercent: 50 },
      { daysBeforeDeparture: 0, refundPercent: 0 },
    ],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CancellationTierDto)
  tiers: CancellationTierDto[];
}
