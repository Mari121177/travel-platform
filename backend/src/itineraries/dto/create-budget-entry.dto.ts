import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsString, Length, Max, Min } from 'class-validator';
import {
  BudgetCategory,
  CURRENCY_CODE_LENGTH,
  MAX_AMOUNT,
} from '../itinerary.constants';

const upperCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateBudgetEntryDto {
  @ApiProperty({
    enum: Object.values(BudgetCategory),
    example: BudgetCategory.Food,
  })
  @IsIn(Object.values(BudgetCategory))
  category!: BudgetCategory;

  @ApiProperty({
    example: 40,
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
