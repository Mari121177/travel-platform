import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

// For routes with one id: /activities/:id, /budgets/:id, /transport-costs/:id
export class ObjectIdParamDto {
  @ApiProperty({ example: '6af7ca36955bba4cb2d256b1' })
  @IsMongoId({ message: 'id must be a valid id' })
  id!: string;
}
