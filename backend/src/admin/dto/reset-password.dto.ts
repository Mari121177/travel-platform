import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_REGEX,
} from '../../common/validation/password';

// ACC-07a: the admin chooses the temporary password. It follows the normal
// password rules, and the account must replace it at its next login.
export class ResetPasswordDto {
  @ApiProperty({ example: 'Temp1234Pass', minLength: 8 })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @MaxLength(64)
  temporaryPassword!: string;
}
