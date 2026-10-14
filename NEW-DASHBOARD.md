# Creating a new dashboard from this template

This guide sets up a separate copy of the dashboard under another GitHub, Supabase and
Vercel account, for example a client's. The copy gets its own code, database and logins,
and shares nothing with the original.

Template: https://github.com/ramiel-a11y/Optinet-Solutions-Dashboard

## What you need

- A **GitHub** account (or the client's GitHub organization) to hold the code.
- A **Supabase** account for the database and logins. The free plan is enough to start.
- A **Vercel** account to put the dashboard online. Optional if it only runs on one computer.
- **Node.js 20.9 or newer** on the computer doing the setup: https://nodejs.org (the LTS
  version). Check with `node --version`.

## 1. Copy the code into the new account

Pick one:

- **Use this template (recommended).** On the template's GitHub page, click **Use this
  template → Create a new repository**. Choose the new owner (your account or the client's
  organization), give it a name, set it to **Private**, and create it.
- **Import it.** Go to https://github.com/new/import, paste the template's URL as the
  clone URL, choose the owner and name, set it to **Private**, and begin the import.
- **From the command line.** Create an empty repository in the new account first, then:
  ```bash
  git clone https://github.com/ramiel-a11y/Optinet-Solutions-Dashboard.git my-dashboard
  cd my-dashboard
  git remote set-url origin https://github.com/<new-owner>/<new-repo>.git
  git push -u origin main
  ```

Don't use **Fork**: a fork of a public repository is public, can't be made private, and
stays linked to this one.

## 2. Create the Supabase project

1. In Supabase, create a new project under the new account. Note the database password you
   set; you need it in step 3.
2. In **Authentication** settings, turn off **Allow new users to sign up**. This step
   matters: any signed-in user can view the dashboard, so with sign-ups left on, anyone
   could create an account and read the data.
3. Collect four values:
   - **Project URL** and the **anon** (or **publishable**) key, from Project Settings → API
   - the **service_role** (or **secret**) key, from the same page. Keep this one private.
   - the **Session pooler** connection string, from the **Connect** button at the top of
     the project. Replace `[YOUR-PASSWORD]` in it with the database password.

If the database password contains symbols such as `@`, `#` or `/`, the connection string
breaks. Reset it in Supabase to one with only letters and numbers.

## 3. Download the code and fill in `.env`

1. Get the code from **your new repository** (not the template): `git clone` it, or use
   **Code → Download ZIP** and unzip it.
2. In the project folder, copy the template file to `.env`:
   ```bash
   cp .env.example .env        # Windows: copy .env.example .env
   ```
3. Open `.env` in a text editor and fill it in. The comments in the file explain each line.
   - The four Supabase values from step 2.
   - `ENCRYPTION_KEY`: generate a new one for this dashboard. Never reuse another
     dashboard's key:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
     Keep a copy somewhere safe. Stored passwords and API tokens can't be read without it.
   - `DEMO_PASSWORD`: only needed if you load the demo data in step 5.
   - `OPENAI_API_KEY`: optional. It switches on the Ask AI assistant.

`.env` is never committed to GitHub, so these values stay on the computer.

## 4. Install and create the tables

```bash
npm install
npm run db:migrate
```

## 5. Demo data, or a real dashboard

**Demo data:** fills the dashboard with invented clients, invoices and staff, and creates a
`demo@optinetsolutions.com` admin login with `DEMO_PASSWORD`. Use this for showing the
dashboard, not for a client's real figures.

```bash
npm run db:seed
```

**A real dashboard:** skip `db:seed`. The tables start empty, and you create the logins:

1. In Supabase, open **Authentication → Users → Add user → Create new user**. Enter the
   email and a password, and tick **Auto Confirm User**.
2. New users can **view** everything but can't change anything. To let someone add, edit
   and delete records, make them an admin in the Supabase **SQL Editor**:
   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
   where email = 'name@example.com';
   ```
   The change applies the next time they load a page.
3. Sign in as an admin and add records through the dashboard. The list of services, which
   splits revenue by service, starts empty too. Add the client's services at
   `/clients/services-catalog`. That page isn't in the menu but works by URL.

Once a database holds real data, `npm run db:seed` refuses to run against it, so the demo
seed can't wipe it by accident.

## 6. Run it on your computer

```bash
npm run dev
```

Open http://localhost:3000 and sign in. On Windows you can double-click `start.bat`
instead.

## 7. Put it online (Vercel)

1. In Vercel, choose **Add New → Project** and import the new GitHub repository. If it
   isn't listed, give Vercel access to that GitHub account or organization.
2. Before deploying, add these environment variables, with the same values as `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `OPENAI_API_KEY`, optional

   Leave out the service role key and `DEMO_PASSWORD`; the site doesn't use them.
3. Deploy. Each push to the repository's `main` branch redeploys the site.

If you change an environment variable later, redeploy for it to take effect.

## Making it the client's own

The Optinet name appears in these places:

| File | What it shows |
|---|---|
| `app/layout.tsx` | Browser tab title and description |
| `app/login/page.tsx` | Sign-in page heading and tab title |
| `app/login/LoginForm.tsx` | Example email in the sign-in field |
| `components/sidebar/Sidebar.tsx` | Name at the top of the sidebar |
| `lib/ai/ask.ts` | Company name in the Ask AI instructions |
| `app/favicon.ico` | Browser tab icon |

Some sections are hidden from the menu, such as Clients, Reports and Month Allocation. Their
pages still exist; `components/sidebar/nav-items.ts` explains how to show them again.

Also update `README.md`, and the `name` in `package.json`, for the new dashboard.

## Good to know

- **The copy doesn't receive later fixes to the template.** Each dashboard is independent
  once created.
- **Supabase's free plan pauses a project after about a week with no visitors.** The site
  then shows errors until the project is restored from the Supabase dashboard. A paid plan
  doesn't pause.
- **Changing `ENCRYPTION_KEY` after data is entered makes stored passwords and API tokens
  unreadable.** Use the same key locally and on Vercel.
- **Licence.** This code is proprietary to Optinet Solutions; see `LICENSE`.
