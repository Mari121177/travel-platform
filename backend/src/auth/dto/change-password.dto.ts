import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_REGEX,
} from '../../common/validation/password';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Passw0rdOK' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  @MaxLength(64)
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassw0rd1', minLength: 8 })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @MaxLength(64)
  newPassword!: string;
}