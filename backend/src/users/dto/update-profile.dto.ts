import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// An empty phone ("" or only spaces) means "remove my phone number"
const phoneValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

// 7 to 15 digits (the international maximum), optional leading +, and spaces,
// dashes or parentheses between the digits
export const PHONE_REGEX = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s\-()]+$/;
export const PHONE_MESSAGE =
  'Phone number must have 7 to 15 digits, may start with +, and may use spaces, dashes and parentheses';

// ACC-09. Every field is optional, but a field that is sent must be valid.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Mariam Gad' })
  @ValidateIf((o: UpdateProfileDto) => o.name !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '+20 100 123 4567',
    nullable: true,
    description: 'Send "" or null to remove the phone number',
  })
  @Transform(phoneValue)
  @ValidateIf((o: UpdateProfileDto) => o.phone !== undefined && o.phone !== null)
  @IsString()
  @MaxLength(25)
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'One of the currencies in Countries.csv',
  })
  @ValidateIf((o: UpdateProfileDto) => o.preferredCurrency !== undefined)
  @Transform(trimUpper)
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'preferredCurrency must be a 3-letter currency code such as USD',
  })
  preferredCurrency?: string;
}