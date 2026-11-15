import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_REGEX,
} from '../../common/validation/password';

export const ModeratorType = {
  Hotel: 'hotel',
  Airline: 'airline',
} as const;

export type ModeratorType = (typeof ModeratorType)[keyof typeof ModeratorType];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// ACC-13: an admin creates a moderator linked to exactly one provider.
// The temporary password must be replaced at the first login.
export class CreateModeratorDto {
  @ApiProperty({ example: 'Hana Esam' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'hana.moderator@example.com' })
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ enum: Object.values(ModeratorType), example: 'hotel' })
  @IsIn(Object.values(ModeratorType))
  type!: ModeratorType;

  @ApiProperty({ description: 'Hotel or airline id from the seeded data' })
  @IsMongoId({ message: 'providerId must be a valid provider id' })
  providerId!: string;

  @ApiProperty({
    example: 'Temp1234Pass',
    minLength: 8,
    description: 'Temporary password; the moderator must change it at login',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @MaxLength(64)
  temporaryPassword!: string;
}
