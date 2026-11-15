import { PartialType } from '@nestjs/swagger';
import { AddDayDto } from './add-day.dto';

/** ITN-05: edit a day's city and/or notes. Only the fields sent change. */
export class UpdateDayDto extends PartialType(AddDayDto) {}
