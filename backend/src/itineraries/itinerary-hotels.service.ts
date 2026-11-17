import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { SearchHotelsDto } from '../hotels/dto/search-hotels.dto';
import { HotelsService } from '../hotels/hotels.service';
import type { ItineraryHotelsQueryDto } from './dto/itinerary-hotels-query.dto';
import { ItinerariesService } from './itineraries.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "2026-12-22" + 1 day -> "2026-12-23" (UTC, so time zones cannot shift it)
function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * ITN-25: for every city group of an itinerary, the hotels of that city that
 * have free rooms for the group's dates. It reuses the HTL-11 / HTL-12 search,
 * so filtering, sorting and the "free rooms" rules are the same everywhere.
 */
@Injectable()
export class ItineraryHotelsService {
  constructor(
    private readonly itineraries: ItinerariesService,
    private readonly hotels: HotelsService,
  ) {}

  async findForCityGroups(
    id: string,
    user: AuthUser,
    query: ItineraryHotelsQueryDto,
  ) {
    const guests = query.guests ?? 1;
    const rooms = query.rooms ?? 1;
    if (rooms > guests) {
      throw new BadRequestException(
        'The number of rooms cannot be more than the number of guests.',
      );
    }
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'The minimum price cannot be higher than the maximum price.',
      );
    }

    // Owner only: a stranger gets 404 (private) or 403 (public), as elsewhere
    const itinerary = await this.itineraries.getOwnedOrFail(id, user);
    const view = await this.itineraries.buildView(itinerary);
    const today = new Date().toISOString().slice(0, 10);

    const cityGroups = await Promise.all(
      view.cityGroups.map(async (group) => {
        const checkIn = group.startDate;
        const checkOut = nextDay(group.endDate);
        const base = {
          cityId: group.cityId,
          cityName: group.cityName,
          startDay: group.startDay,
          endDay: group.endDay,
          checkIn,
          checkOut,
          nights: group.dayCount,
        };

        // The HTL-11 search refuses past check-in dates; say so per group
        if (checkIn < today) {
          return {
            ...base,
            total: 0,
            hotels: [],
            message: 'This stay starts in the past, so no hotels can be shown.',
          };
        }

        const search: SearchHotelsDto = {
          cityId: group.cityId,
          checkIn,
          checkOut,
          guests,
          rooms,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
          minRating: query.minRating,
          sortBy: query.sortBy ?? 'price',
          order: query.order,
          page: 1,
        };
        const result = await this.hotels.searchHotels(search);
        return {
          ...base,
          total: result.total,
          hotels: result.data,
          ...(result.total === 0
            ? { message: 'No hotels with free rooms for these dates.' }
            : {}),
        };
      }),
    );

    return { itineraryId: id, guests, rooms, cityGroups };
  }
}
