# Travel Planning and Booking Platform

Software Project I, Winter 2026 (German International University)

Stack: NestJS (backend), Next.js (frontend), MongoDB Atlas (database).

## Repository structure

```
travel-platform/
├── backend/          NestJS API (Milestone 1)
├── frontend/         Next.js app (Milestone 2)
├── docs/
│   ├── requirements/ Excel requirements sheet
│   └── api/          API documentation
├── AI_PROMPTS.txt    Log of AI prompts (mandatory)
├── .env.example
└── README.md
```

## Backend setup

1. Clone the repo and switch to `develop`:

   ```bash
   git clone <repo-url>
   cd travel-platform
   git checkout develop
   ```

2. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Create `backend/.env` (copy the variable names from `.env.example`).

   Required for the backend and seeded admin:

   ```
   MONGODB_URI=<team-mongodb-atlas-connection-string>
   JWT_SECRET=<your-own-long-random-string>
   ADMIN_EMAIL=<admin email>
   ADMIN_PASSWORD=<admin password with at least one letter and one digit>
   ADMIN_NAME=<admin display name>
   ```

   - `MONGODB_URI`: the connection string sent privately by the team leader.
   - `JWT_SECRET`: generate your own by running this command and copying its output:

     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

   - `ADMIN_*`: used by the startup seeder to create the single admin account
     (ACC-18). The account is created only if it does not already exist.

   Optional integrations:

   ```
   PLATFORM_CURRENCY=USD
   FXRATES_API_KEY=<optional, for itinerary currency conversion>
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   COOKIE_SECURE=false
   ```

   - `PLATFORM_CURRENCY`: the single currency used by bookings, payments and
     refunds (PAY-04). Use `USD` for the milestone demo.
   - `FXRATES_API_KEY`: required only when testing live exchange-rate updates;
     cached rates are used when the API is unavailable.
   - Stripe keys are required only for payments and refunds. Use test-mode keys.
   - Set `COOKIE_SECURE=false` only for local HTTP testing if the browser refuses
     the Secure auth cookies. Never use it in production.

   Never commit `.env`.

4. Run the backend:

   ```bash
   npm run start:dev
   ```

5. Open Swagger UI: http://localhost:3000/api/docs

All routes start with `/api`.

## Milestone 1 evidence

Swagger, Postman and demo screenshots are stored in the team Drive folder:

[Project evidence — screenshots and Postman runs](https://drive.google.com/drive/folders/18qWhUFBIXJ78CwN7U0Cr9CzVvaD4swA2)

Do not commit screenshots or Postman exports to the repository; keep them in
the shared Drive folder.

## Git workflow

- `main`: stable milestone releases only.
- `develop`: integration branch. Never commit directly to `main` or `develop`.
- Create a branch from the latest `develop` for every task:

  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/FLT-11-flight-search
  ```

- Branch names: `feature/<REQ-ID>-<description>`, `fix/<REQ-ID>-<description>`,
  `refactor/<description>`, `docs/<description>`.
- Commit messages: `feat(flights): add round-trip search`, `fix(hotels): prevent double booking`.
  No vague messages like "update" or "fix".
- Open a Pull Request into `develop`, mention the requirement ID, and wait for the
  team leader's review.
- Never commit secrets or `.env` files.
- Log every AI prompt that materially helped you in `AI_PROMPTS.txt`.

## Module ownership (Milestone 1)

| Module | Owner | Requirement IDs |
|---|---|---|
| auth, users, admin, reports/moderation, reference data | Mariam | ACC, GEN-07, GEN-09, GEN-10, GEN-12, GEN-13 |
| airlines, flights, flight status and policies | Malk | FLT-01, FLT-03 to FLT-09, FLT-30 |
| airports, flight search and flight details | Ghada | FLT-02, FLT-11, FLT-12, FLT-15, FLT-17 |
| flight bookings | Adala | FLT-19 to FLT-29 |
| hotels, room calendars, hotel Swagger documentation | Hana | HTL-01 to HTL-15 |
| hotel bookings, reviews, review moderation | Maya | HTL-16 to HTL-26 |
| payments, notifications | Habiba Ahmed | PAY-01 to PAY-04, GEN-01 |
| itineraries, blog, uploads | Habiba Khaled | ITN, BLG, GEN-08 |

## Implemented bonus features

- HTL-26: hotel moderator reply to a review
- BON-01: admin analytics for confirmed bookings and revenue per provider
- BON-02: favourites for hotels and public itineraries
- BLG-13: attach an itinerary to a blog post
- ITN-28: export an itinerary as PDF

## Milestones

- Milestone 1 (Backend and API): 20/11
- Milestone 2 (Frontend and integration): 11/12