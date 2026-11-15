import { PartialType } from '@nestjs/swagger';
import { CreateItineraryDto } from './create-itinerary.dto';

// Every field optional (ITN-01 edit, ITN-20 visibility change)
export class UpdateItineraryDto extends PartialType(CreateItineraryDto) {}
