import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

/** PAY-02: the user ticked the policy acceptance checkbox. */
export class AcceptPoliciesDto {
  @ApiProperty({
    example: true,
    description: 'Must be true. Payment is blocked until the policies are accepted.',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the policies before paying' })
  accepted!: boolean;
}
