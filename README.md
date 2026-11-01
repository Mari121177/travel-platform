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

3. Create `backend/.env` (copy the variable names from `.env.example`) and add the
   MongoDB connection string sent privately by the team leader:

   ```
   MONGODB_URI=<team-mongodb-atlas-connection-string>
   ```

   Never commit `.env`.

4. Run the backend:

   ```bash
   npm run start:dev
   ```

5. Open Swagger UI: http://localhost:3000/api/docs

All routes start with `/api`.

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
| auth, users, admin | Mariam | ACC, GEN-07, GEN-09, GEN-10 |
| airlines, flights | Malk | FLT-01 to FLT-10 |
| flights (search) | Ghada | FLT-11 to FLT-18 |
| flight-bookings | Adala | FLT-19 to FLT-29 |
| hotels | Hana | HTL-01 to HTL-15 |
| hotel-bookings | Maya | HTL-16 to HTL-26 |
| payments, notifications | Habiba Ahmed | PAY, GEN |
| itineraries, blog, uploads | Habiba Khaled | ITN, BLG, GEN-08 |

## Milestones

- Milestone 1 (Backend and API): 20/11
- Milestone 2 (Frontend and integration): 11/12