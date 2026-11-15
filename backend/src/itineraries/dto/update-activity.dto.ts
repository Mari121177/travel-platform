import { PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';

// Every field optional. Send null for time or cost to clear it
// (clearing the cost clears its currency too).
export class UpdateActivityDto extends PartialType(CreateActivityDto) {}
