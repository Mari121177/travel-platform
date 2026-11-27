// Hotel API calls + types for Hana's pages (HTL-02, HTL-11, HTL-12, HTL-15)
import { api } from "@/lib/api/client";
import type { ListResponse, ReferenceCity, ReferenceCountry } from "@/lib/types";

// ---------- Types (copied from the backend responses in Swagger) ----------

export interface CancellationTier {
  daysBefore: number;
  refundPercent: number;
}

export interface Hotel {
  _id: string;
  name: string;
  address: string;
  cityId: string;
  countryCode: string;
  description: string;
  photos: string[];
  starClass?: number;
  amenities: string[];
  checkInTime?: string;
  checkOutTime?: string;
  cancellationTiers: CancellationTier[];
  ratingAvg: number;
  ratingCount: number;
}

export interface AvailableRoom {
  roomId: string;
  roomNumber: string;
  type: string;
  beds: number;
  maxOccupancy: number;
  pricePerNight: number;
  totalPrice: number;
}

export interface HotelSearchResult {
  hotelId: string;
  name: string;
  address: string;
  cityId: string;
  countryCode: string;
  starClass?: number;
  photos: string[];
  amenities: string[];
  ratingAvg: number;
  ratingCount: number;
  cheapestPricePerNight: number;
  freeRooms: number;
  nights: number;
}

export interface HotelSearchResponse {
  data: HotelSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface HotelSearchParams {
  cityId?: string;
  countryCode?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "price" | "rating";
  order?: "asc" | "desc";
  page?: number;
}

export interface AvailableRoomsResponse {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: AvailableRoom[];
}

// ---------- API calls ----------

export function searchHotels(params: HotelSearchParams) {
  return api.get<HotelSearchResponse>("/hotels/search", { query: { ...params } });
}

export function getHotel(id: string) {
  return api.get<Hotel>(`/hotels/${id}`);
}

export function getAvailableRooms(id: string, checkIn: string, checkOut: string) {
  return api.get<AvailableRoomsResponse>(`/hotels/${id}/rooms/available`, {
    query: { checkIn, checkOut },
  });
}

export function getCountries() {
  return api.get<ListResponse<ReferenceCountry>>("/reference/countries");
}

export function getCities(countryCode?: string) {
  return api.get<ListResponse<ReferenceCity>>("/reference/cities", {
    query: { countryCode },
  });
}

// Maya's booking page (agreed link)
export function bookingLink(p: {
  hotelId: string;
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const q = new URLSearchParams({
    hotelId: p.hotelId,
    roomIds: p.roomIds.join(","),
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    guests: String(p.guests),
  });
  return `/hotel-bookings/new?${q.toString()}`;
}
// ---------- Reviews (Maya's endpoint, HTL-24) ----------

export interface HotelReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
  author?: { _id: string; name: string };
}

export interface HotelReviewsResponse {
  ratingAvg: number;
  ratingCount: number;
  data: HotelReview[];
  total: number;
  page: number;
  limit: number;
}

export function getHotelReviews(id: string, page = 1) {
  return api.get<HotelReviewsResponse>(`/hotels/${id}/reviews`, { query: { page } });
}