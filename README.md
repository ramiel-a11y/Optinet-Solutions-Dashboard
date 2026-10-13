# Optinet Solutions Dashboard — demo

A demo of the Optinet Solutions operations dashboard, filled with **invented data**.
No client, figure or person in it is real.

Stack: Next.js 16 · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres + Auth) · Drizzle.

## Signing in

Sign in as `demo@optinetsolutions.com` with the password set as `DEMO_PASSWORD` when the
data was seeded. The demo account is an admin, so every add, edit and delete form can be
tried. Edits only touch dummy data, and re-seeding puts everything back.

## Setup

1. Create a Supabase project. In Authentication settings, turn off **Allow new users to sign up**.
2. Copy `.env.example` to `.env` and fill it in from that project; the comments explain each value.
3. Install, create the tables and load the demo data:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. Run `npm run dev` (on Windows, double-click `start.bat`) and open http://localhost:3000.

## Refreshing the demo

The data runs from January 1 of last year to the day it is seeded, so it ages. About a
month later the current month looks empty and the invoice reminders turn overdue. Run
`npm run db:seed` again to refresh it. This also wipes any edits made through the demo login.

The seed refuses to run against a database that holds data it did not put there, so a
`DATABASE_URL` pointing at the wrong database fails before anything is deleted.

## Deploying (Vercel)

Set four environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`DATABASE_URL` and `ENCRYPTION_KEY`. Use the same `ENCRYPTION_KEY` the data was seeded
with. The service-role key and `DEMO_PASSWORD` are only needed on the machine that runs the
seed. Add `OPENAI_API_KEY` to switch on Ask AI.

Supabase's free plan pauses a project after about a week without traffic. The site then
errors until the project is restored from the Supabase dashboard.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the test suite (Vitest) |
| `npm run db:migrate` | Create or update the tables |
| `npm run db:seed` | Wipe and reload the demo data, and reset the demo login |

## Licence

Copyright © 2026 Optinet Solutions. All rights reserved. This code is proprietary and
shared for evaluation only; no licence to use, copy or modify it is granted. See
[LICENSE](LICENSE).
