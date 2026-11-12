import { IsMongoId } from 'class-validator';

export class AccountIdParamDto {
  @IsMongoId({ message: 'id must be a valid account id' })
  id!: string;
}
