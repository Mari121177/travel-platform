# Frontend — Travel Planning and Booking Platform

Next.js 15 (App Router) + TypeScript + Tailwind CSS 3.

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000 (Swagger at `/api/docs`)
- The frontend proxies `/api/*` and `/uploads/*` to the backend, so browser
  requests stay same-origin and the httpOnly auth cookies work.

## Run it

Start the backend first (from the repository root):

```bash
cd backend
npm run start:dev
```

Then the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001.

Optional local config: copy `.env.example` to `.env.local`.
The defaults already point at the local backend.

```bash
cp .env.example .env.local
```

If login does not stick in your browser, add `COOKIE_SECURE=false` to
`backend/.env` and restart the backend. The backend defaults to `Secure`
cookies, and some browsers refuse them on plain `http://localhost`.

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Development server on port 3001      |
| `npm run build`     | Production build                     |
| `npm run start`     | Production server on port 3001       |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript, no emit                  |

Run `npm run lint` and `npm run build` before opening a PR.

## Shared foundation (owned by Mariam)

Do not edit these files without asking. Build your page inside its own route
folder and import from the foundation.

```
src/app/layout.tsx
src/app/globals.css
src/app/(public|auth|account|user|moderator|admin)/layout.tsx
src/components/ui/*
src/components/layout/*
src/lib/api/client.ts
src/lib/api/errors.ts
src/lib/api/server.ts
src/lib/auth/*
src/lib/types.ts
src/lib/utils.ts
src/lib/validation.ts
src/lib/status.ts
next.config.ts
tailwind.config.ts
```

If you need a new shared component or an API-client change, ask Mariam.
Do not duplicate shared code.

## How to call the API

```ts
import { api } from "@/lib/api/client";

const flights = await api.get<FlightSearchResponse>("/flights/search", {
  query: { origin: "CAI", destination: "DXB", date: "2026-12-01", passengers: 2 },
});

await api.post("/flight-bookings/hold", { flightId, cabin, passengers });
```

Paths do **not** include `/api`; the client adds it. All calls go through the
Next.js proxy. Cookies are sent automatically (`credentials: "same-origin"`).

- `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`, `api.upload`
- On `401` the client tries `/api/auth/refresh` once, then retries.
- Errors throw `ApiError` with `status` and `messages`.
- Use `getErrorMessages(error)` / `getErrorMessage(error)` for display.

Uploads:

```ts
const form = new FormData();
form.append("file", file);
const result = await api.upload<{ url: string }>("/uploads/images", form);
```

Use `assetUrl(result.url)` for image sources. `/uploads/*` is proxied too.

## Auth and route guards

`AuthProvider` (in the root layout) calls `/api/auth/me` and exposes:

```ts
const { user, status, login, logout, refresh, setUser } = useAuth();
```

`status` is `"loading" | "authenticated" | "guest"`.

Route groups already apply the correct guard:

| Group          | Paths                          | Guard                          |
| -------------- | ------------------------------ | ------------------------------ |
| `(public)`     | `/`, `/flights`, `/hotels`, `/blog`, public itineraries | none |
| `(auth)`       | `/login`, `/register`          | redirects logged-in users      |
| `(account)`    | `/profile`, `/notifications`   | any logged-in user             |
| `(user)`       | bookings, itineraries, favourites, reviews, checkout | `user` |
| `(moderator)`  | `/moderator/*`                 | airline or hotel moderator     |
| `(admin)`      | `/admin/*`                     | `admin`                        |

To send a guest to login and bring them back afterwards, use:

```ts
router.push(`/login?next=${encodeURIComponent(pathname)}`);
```

The login page honours `next` after a successful login.

## UI kit

Import from `@/components/ui`:

- `Button` (variants: primary, secondary, outline, ghost, danger, success)
- `Input`, `Select`, `Textarea`, `Checkbox`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`
- `Badge`, `Alert`, `Modal`, `ConfirmDialog`
- `Pagination`, `Spinner`, `FullPageSpinner`, `Skeleton`, `TableSkeleton`
- `EmptyState`, `ErrorState`
- Icons from `@/components/ui/icons`

Use `buttonClasses(...)` from `@/lib/ui` when you need a button-styled link.

`ConfirmDialog` is required before destructive actions (delete, cancel,
suspend).

## Page conventions

Every page needs:

- a loading state (`Spinner`, `TableSkeleton`, or skeletons),
- an error state (`ErrorState` or `Alert` with a retry action),
- an empty state (`EmptyState`) for lists and searches,
- responsive layout (test mobile and desktop),
- role-appropriate navigation (the layout handles it),
- confirmation before destructive actions.

Backend validation and authorization are authoritative. Frontend checks are
for UX only (GEN-13).

## Server-side data (SSR / ISR)

Client components use `api`. For server components, use:

```ts
import { serverApiPublic, serverApiAuth } from "@/lib/api/server";

const post = await serverApiPublic<Post>(`/posts/${id}`, 300); // ISR, 5 min
const bookings = await serverApiAuth<BookingList>("/flight-bookings"); // user session
```

- `serverApiPublic(path, revalidate)` for public pages (ISR/static).
- `serverApiAuth(path)` forwards the browser cookies (dynamic SSR).
- These helpers are server-only. Do not import them into a client component.

Recommended rendering from the project PDF is a guide: public blog/itinerary
details use ISR, search/listing pages use dynamic SSR, editors use client
components.

## Notifications bell

The bell is in the layout. It reads `/api/notifications/unread-count`.
When a page marks notifications as read, dispatch:

```ts
window.dispatchEvent(new Event("notifications:updated"));
```

The event name is exported as `NOTIFICATIONS_UPDATED_EVENT` from
`@/components/layout/NotificationBell`.

## Stripe

`@stripe/stripe-js` and `@stripe/react-stripe-js` are installed.
Add the test publishable key to `.env.local`:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Never commit keys. Checkout pages are owned by Habiba Ahmed.

## Routes by owner

- Mariam: `/`, `/login`, `/register`, `/profile`, `/admin/accounts`, `/admin/reports`, foundation.
- Malk: `/moderator/airline/*`, `/blog/*`.
- Ghada: `/flights/*`, `/admin/bookings`, `/admin/analytics`, `/admin/audit-logs`, `/admin/providers`.
- Adala: `/flight-bookings/*`.
- Hana: `/hotels/*`, `/moderator/hotel/*`.
- Maya: `/hotel-bookings/*`, `/reviews`, `/moderator/hotel-reservations`.
- Habiba Ahmed: `/checkout/[bookingType]/[bookingId]`, `/notifications`.
- Habiba Khaled: `/itineraries/*`, `/favourites`.

Placeholder pages are marked with the owner and requirement IDs. Replace the
placeholder inside your own route folder.

## Branch and PR rules

- Branch from latest `develop`:
  `feature/<REQ-ID>-frontend-<page>`
- PR into `develop`, one teammate review, no self-merge.
- Do not commit `.env`, secrets, keys or test images.
- Do not edit backend code in a frontend branch. Report missing endpoints to
  Mariam.
