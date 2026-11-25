export type Role = "user" | "admin" | "airline_moderator" | "hotel_moderator";

export type AccountStatus = "active" | "suspended" | "deactivated";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  assignedProviderId: string | null;
  preferredCurrency: string;
  mustChangePassword: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface MessageResponse {
  message: string;
}

export interface ReferenceCountry {
  code: string;
  name: string;
  currency: string;
}

export interface ReferenceCity {
  cityId: string;
  name: string;
  countryCode: string;
}
