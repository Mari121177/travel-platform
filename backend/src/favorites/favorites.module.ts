import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hotel, HotelSchema } from '../hotels/schemas/hotel.schema';
import { Itinerary, ItinerarySchema } from '../itineraries/schemas/itinerary.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { Favorite, FavoriteSchema } from './schemas/favorite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: Itinerary.name, schema: ItinerarySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
