import type { ComponentType, SVGProps } from "react";
import {
  Bell,
  BookOpen,
  Building,
  Calendar,
  CreditCard,
  Heart,
  Home,
  Map,
  Plane,
  ShieldCheck,
  Ticket,
  User,
  Users,
} from "@/components/ui/icons";
import type { Role } from "@/lib/types";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const accountSection: NavSection = {
  title: "Account",
  items: [
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "My profile", href: "/profile", icon: User },
  ],
};

export function navSectionsForRole(role: Role): NavSection[] {
  switch (role) {
    case "admin":
      return [
        {
          title: "Administration",
          items: [
            { label: "Accounts", href: "/admin/accounts", icon: Users },
            { label: "Reports", href: "/admin/reports", icon: ShieldCheck },
            { label: "Bookings", href: "/admin/bookings", icon: Ticket },
            { label: "Analytics", href: "/admin/analytics", icon: Calendar },
            { label: "Audit logs", href: "/admin/audit-logs", icon: BookOpen },
            { label: "Providers", href: "/admin/providers", icon: Building },
          ],
        },
        accountSection,
      ];
    case "airline_moderator":
      return [
        {
          title: "Airline",
          items: [
            {
              label: "Dashboard",
              href: "/moderator/airline",
              icon: Home,
              exact: true,
            },
            {
              label: "Airline profile",
              href: "/moderator/airline/profile",
              icon: Building,
            },
            {
              label: "Policies",
              href: "/moderator/airline/policies",
              icon: ShieldCheck,
            },
            {
              label: "Flights",
              href: "/moderator/airline/flights",
              icon: Plane,
            },
          ],
        },
        accountSection,
      ];
    case "hotel_moderator":
      return [
        {
          title: "Hotel",
          items: [
            {
              label: "Dashboard",
              href: "/moderator/hotel",
              icon: Home,
              exact: true,
            },
            {
              label: "Hotel profile",
              href: "/moderator/hotel/profile",
              icon: Building,
            },
            {
              label: "Rooms",
              href: "/moderator/hotel/rooms",
              icon: Map,
            },
            {
              label: "Availability",
              href: "/moderator/hotel/availability",
              icon: Calendar,
            },
            {
              label: "Reservations",
              href: "/moderator/hotel-reservations",
              icon: Ticket,
            },
          ],
        },
        accountSection,
      ];
    default:
      return [
        {
          title: "Explore",
          items: [
            { label: "Home", href: "/", icon: Home, exact: true },
            { label: "Flights", href: "/flights", icon: Plane },
            { label: "Hotels", href: "/hotels", icon: Building },
            {
              label: "Public itineraries",
              href: "/itineraries/public",
              icon: Map,
            },
            { label: "Travel stories", href: "/blog", icon: BookOpen },
          ],
        },
        {
          title: "My travel",
          items: [
            {
              label: "Flight bookings",
              href: "/flight-bookings",
              icon: Plane,
            },
            { label: "Hotel bookings", href: "/hotel-bookings", icon: Building },
            { label: "Itineraries", href: "/itineraries", icon: Map },
            { label: "Favourites", href: "/favourites", icon: Heart },
            { label: "My reviews", href: "/reviews", icon: CreditCard },
          ],
        },
        accountSection,
      ];
  }
}
