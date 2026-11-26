import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Logo } from "./Logo";

const exploreLinks = [
  { href: "/flights", label: "Search flights" },
  { href: "/hotels", label: "Search hotels" },
  { href: "/itineraries/public", label: "Public itineraries" },
  { href: "/blog", label: "Travel stories" },
];

const accountLinks = [
  { href: "/profile", label: "My profile" },
  { href: "/flight-bookings", label: "Flight bookings" },
  { href: "/hotel-bookings", label: "Hotel bookings" },
  { href: "/notifications", label: "Notifications" },
];

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-brand-900">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo variant="light" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-brand-100/80">
            {siteConfig.description}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-brand-100">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-brand-100">
            {accountLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-brand-200/70">
        © {year} {siteConfig.name} · Software Project I, Winter 2026
      </div>
    </footer>
  );
}
