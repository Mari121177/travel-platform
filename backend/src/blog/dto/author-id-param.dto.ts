import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AuthorIdParamDto {
  @ApiProperty({
    description: 'The author (user) id',
    example: '6af9e8ac2223888dc79c1efc',
  })
  @IsMongoId()
  id!: string;
}
