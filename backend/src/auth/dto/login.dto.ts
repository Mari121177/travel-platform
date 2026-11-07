import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'mariam@example.com' })
  @IsString()
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'Passw0rdOK' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}