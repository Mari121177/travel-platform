import Link from "next/link";
import { DestinationShowcase } from "@/components/public/DestinationShowcase";
import {
  ArrowRight,
  BookOpen,
  Building,
  Map,
  Plane,
  Sparkles,
  Ticket,
} from "@/components/ui/icons";
import { buttonClasses } from "@/lib/ui";

const features = [
  {
    href: "/flights",
    title: "Flights",
    description:
      "Search one-way or round-trip flights, compare cabins and book with a 10-minute seat hold.",
    icon: Plane,
  },
  {
    href: "/hotels",
    title: "Hotels",
    description:
      "Find rooms by city and dates, see the total stay price and reserve several rooms together.",
    icon: Building,
  },
  {
    href: "/itineraries/public",
    title: "Itineraries",
    description:
      "Build day-by-day plans with activities, transport and a budget in your own currency.",
    icon: Map,
  },
  {
    href: "/blog",
    title: "Stories",
    description:
      "Read and share travel experiences, like posts and join the conversation.",
    icon: BookOpen,
  },
] as const;

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="container-page relative grid gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-50 ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              Flights, hotels, itineraries and stories
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl">
              Plan the whole trip, not just the flight.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-brand-50/90 sm:text-lg">
              Search and book flights and hotels, build a day-by-day itinerary
              with a live budget, and share the journey with other travellers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/flights" className={buttonClasses("primary", "lg")}>
                Search flights
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/hotels"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/20"
              >
                Find hotels
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wide text-brand-100/70">
                  Book
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  Flights &amp; hotels
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-brand-100/70">
                  Plan
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  Days &amp; budgets
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-brand-100/70">
                  Share
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  Stories &amp; itineraries
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="rounded-2xl bg-white p-5 text-ink shadow-pop">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Quick start</p>
                  <Ticket className="h-5 w-5 text-brand-600" />
                </div>
                <div className="mt-4 grid gap-3">
                  <Link
                    href="/flights"
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                      <Plane className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">
                        Find a flight
                      </span>
                      <span className="block text-xs text-slate-500">
                        Compare routes, cabins and prices
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-600" />
                  </Link>
                  <Link
                    href="/hotels"
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                      <Building className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">
                        Book a hotel
                      </span>
                      <span className="block text-xs text-slate-500">
                        Rooms by dates, guests and budget
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-600" />
                  </Link>
                  <Link
                    href="/itineraries/public"
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Map className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">
                        Plan an itinerary
                      </span>
                      <span className="block text-xs text-slate-500">
                        Days, activities and budgets
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-600" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Everything in one place
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            One account, the whole journey
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Book, plan and share without juggling tabs.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="group card-surface flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  Explore
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="container-page py-14 sm:py-16">
          <DestinationShowcase />
        </div>
      </section>

      <section className="container-page py-14 sm:py-16">
        <div className="card-surface flex flex-col items-start justify-between gap-6 overflow-hidden border-0 bg-gradient-to-r from-brand-700 to-brand-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Ready to plan your next trip?
            </h2>
            <p className="mt-2 text-sm text-brand-50/90">
              Create a free account and keep every booking and itinerary
              together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
