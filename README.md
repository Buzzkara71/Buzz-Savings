# Buzz

A personal dashboard for tasks, spending, and savings goals. The interface is in English, with a cyan and gray palette, a dark sidebar, and an animated mascot.

## Run on Windows

Double-click **Start Buzz.cmd**, then open **http://127.0.0.1:5173**. Keep the server window open while using the app. If a server is already running, open that address directly.

A portable Node.js runtime is available in **.tools** on this computer. It does not change the system PATH and is excluded from Git. On another computer, install Node.js 24 LTS and run:

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

Use the same address and port each time. **localhost** and **127.0.0.1** have separate browser storage.

## Deploy on Vercel

Import this repository with its root directory unchanged. The committed **vercel.json** sets the Vite framework, installation command, build command, and output directory.

If configuring these fields manually under **Settings → Build and Deployment**, enter plain text without surrounding quotes or backticks:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |

Backticks around a shell command cause its output to be executed as another command. An install log ending with **added: command not found** is a sign that the install command was entered with backticks. Correct the field, save, and redeploy.

For cloud accounts, add **VITE_SUPABASE_URL** and **VITE_SUPABASE_PUBLISHABLE_KEY** in Vercel's Environment Variables before deploying. Use the project URL and publishable key from Supabase. Redeploy after changing these values. Vite embeds these public values during the build; never use a database password, secret key, or service-role key in a VITE variable.

## Supabase setup

1. Open your Supabase project → **SQL Editor → New query**. Run the complete contents of [the database migration](supabase/migrations/202610010001_buzz.sql). It creates four tables prefixed with **buzz_**, access policies, and the read/save functions. The migration can be run again without clearing records.
2. For local development, copy **.env.example** to **.env.local** and fill in the project URL and publishable key. Restart Vite after editing it. The local file is ignored by Git.
3. In **Authentication → URL Configuration**, set **Site URL** to your Vercel production URL and allow the exact production URL and **http://127.0.0.1:5173** as redirect URLs. Confirmation and password reset links return to the app.
4. For your first personal account, use **Authentication → Users → Add user → Create new user**, enter your email and a new account password, and enable **Auto Confirm User**. Then sign in to Buzz with those account credentials. The database password is separate and is never used by Buzz.
5. To support public signup, email confirmation, and password reset, configure an email provider under Supabase Auth's **SMTP Settings**. The default sender restricts recipients to project team members. Keep email confirmation enabled. See [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp) and [redirect URL setup](https://supabase.com/docs/guides/auth/redirect-urls).
6. Add the same two public environment variables in Vercel and deploy the updated code. Open the app on two devices, sign in with the same account, add an entry, and select **Refresh** on the other device.

### Import existing records

On the original browser and origin, sign in and open **Settings → Import browser data**. This merges tasks, transactions, and goals by their existing IDs. Cloud records with matching IDs and account settings are preserved, so repeating an import does not duplicate entries. Browser records remain available in local mode. If the original records are at the local development URL and you want to import on the hosted URL, download a JSON backup first, then use **Settings → Restore** on the hosted app. Restore replaces the account's whole workspace after confirmation, including its name and budget.

### Cloud behavior

- New cloud accounts start with an empty workspace. Local mode retains demo data and the earlier storage format.
- Saving waits for the server to confirm the write. A failed save keeps the form open and offers a downloadable draft. Unsynced drafts are held in memory; download them before closing the browser or signing out.
- The app checks for changes every 30 seconds while visible and when returning to the page or reconnecting. Checks pause while editing or holding an unsynced draft. **Refresh** checks immediately. This is periodic synchronization, not a live Realtime subscription.
- Every save checks the workspace revision and commits all collections in one database transaction. If another device saved first, the app asks you to reload rather than overwriting newer records. Download the draft before reloading if needed.
- Cloud records are kept in memory while signed in. Supabase stores the login session in this browser. Signing out clears the account view; older browser-local records remain separate and are never imported automatically.
- Workspace payloads are limited to 2 MB by the database function. Writes require a connection; there is no automatic offline queue.
- With both environment variables absent, Buzz runs in local mode. With cloud configured, **Continue on this device** opens local mode explicitly. A failed cloud load shows a retry screen and never uploads an empty workspace over existing data.

### Database access

The tables are **buzz_profiles**, **buzz_tasks**, **buzz_transactions**, and **buzz_goals**. Each account owns its records through **user_id**, with Row Level Security restricting authenticated reads. Anonymous access is denied. Direct writes are revoked; **buzz_save_workspace** validates data, derives the owner from the authenticated session, checks the revision, and writes atomically. Both public RPCs use a fixed empty search path and reject unauthenticated requests. The application uses the HTTPS API; direct PostgreSQL credentials are only relevant to database administration.

## Features

- **Overview:** monthly money left, income, expenses, task progress, weekly charts, spending categories, and budget status.
- **Tasks:** add, edit, delete, complete, set priorities and due dates, filter, and switch between list and board views.
- **Finances:** choose a month and year, review every transaction, filter by type/category, and export the visible results to CSV. Monthly history compares income, expenses, and net cash flow for all twelve months; select a month to open its full transaction list.
- **Amount inputs:** type `1250000` or paste `1.250.000`. Thousands separators appear automatically in transactions, budgets, savings targets, and contributions. Editing an existing amount keeps the same readable format.
- **Savings goals:** create goals and record contributions manually.
- **Search:** find tasks and transactions across all months. Press **Ctrl+K** to focus the search field.
- **Settings:** edit your display name and monthly budget, download or restore a JSON backup, start fresh, or load demo data.
- **Cloud accounts:** email/password login, signup confirmation, password reset, manual and periodic refresh, and browser-data import. Account data is isolated using Supabase Auth and PostgreSQL RLS.
- **Sidebar:** active navigation, pending-task count, quick task creation, overall task progress, and an accessible mobile drawer. Profile and settings stay at the bottom.
- **Motion controls:** pause/resume animations with a saved preference. Charts and decorative motion respect your device’s reduced-motion setting.

The original user-supplied mascot is stored at **public/images/buzz-mascot.png**. CSS provides its floating animation. On phones, it sits below the banner text.

## Data and calculations

The first visit in local mode includes clearly labeled **demo data**. Use **Settings → Start fresh** to begin with your own records. Cloud accounts start empty.

Local mode stores records in this browser under **buzz.dashboard.v1**. It survives reloads but does not sync across devices. Cloud mode stores records in Supabase under your account. JSON backups include the current workspace's records; CSV exports include transactions only.

- Money left = income minus expenses for the selected month. Previous balances are not carried forward.
- Currency remains **Indonesian rupiah (IDR)**, with dots separating thousands and no fractional rupiah, for example **Rp1.250.000**. Stored and exported amounts remain numbers. Dates and month names are in English. Charts use **K** and **M** for thousands and millions.
- Monthly history and summary cards always include every transaction in the selected period. The list shows its own filtered count, income, and expense totals. Changing month or transaction type clears incompatible filters; saving a transaction opens its month and clears filters.
- When adding a transaction to a past month, the date starts on the first day of that month. Current or future report months default to today; recorded transactions cannot be future-dated.
- One budget applies to every month. Set it to zero to disable the budget.
- Weekly charts group dates into 1–7, 8–14, and so on.
- Expense comparisons use recorded totals from the previous month, without forecasting.
- Today’s progress includes tasks due on or before today. Overall task counts do not follow the financial month selector.
- Savings goals are tracked independently. Contributions do not create transactions or deduct from the monthly balance.
- Reminders appear inside the app while it is open; there are no push notifications.
- Backups are validated before import. CSV exports neutralize spreadsheet formulas in text fields.

### Compatibility with earlier versions

Buzz automatically reads existing data from **ruang.dashboard.v1** when no Buzz data exists. Built-in categories, priorities, and known demo copy become English. IDs, amounts, dates, completion states, and user-written content are preserved. The original storage entry is kept for recovery. Older JSON backups are also supported, and animation preferences carry over.

Buzz supports email/password accounts with Supabase. Transactions are entered manually; there is no bank connection. Google Fonts needs internet on its first load; system fonts are used as a fallback.

## Stack

React 19, TypeScript, Vite, custom CSS, Recharts, Lucide React, and Supabase Auth/PostgreSQL. Local mode uses localStorage. Validation uses the Node test runner, PGlite (a local PostgreSQL runtime), and Playwright.

## Build and checks

```powershell
npm run build
npm test
npm run test:db
npm run test:e2e
```

The production build is written to **dist**. Preview it with **npm run preview -- --port 5173 --strictPort** after stopping the development server.

Browser tests use an installed Chrome browser. If needed, change **playwright.config.ts** to use a Playwright-managed Chromium installation.

Browser tests start isolated Vite servers on ports **5174** (local mode) and **5175** (cloud mode with mocked API responses). They never create accounts or write to your live Supabase project. Database tests execute the real migration in local PostgreSQL through PGlite, with test authentication roles, and verify RLS, write restrictions, revision conflicts, validation, and rollback. Live login and email delivery must also be checked after configuring your hosted project.

Checks cover financial totals, all twelve months and year boundaries, amount formatting and validation, CSV escaping, backup validation, English labels, legacy migration, task and transaction workflows, savings, search, persistence, and responsive navigation.

## Structure

```text
src/
  App.tsx                 Dashboard, navigation, state, and interactions
  CloudApp.tsx            Authentication and account boundaries
  supabase.ts             Supabase client and cloud API
  useWorkspace.ts         Persistence, refresh, and save conflicts
  workspace.ts            Browser storage and repeatable imports
  Sidebar.tsx             Navigation, task progress, profile, and mobile drawer
  components.tsx          Dialogs, mascot, charts, tasks, and empty states
  forms.tsx               Task, transaction, goal, and settings forms
  CurrencyInput.tsx       Formatted whole-rupiah inputs and validation
  MonthlyHistory.tsx      Yearly totals and monthly transaction navigation
  domain.ts               Models, calculations, validation, CSV, and demo data
  legacy.ts               Compatibility mappings for older data
  useMotionPreference.ts  Saved motion preference and reduced-motion support
  styles.css              Base design and responsive layout
  theme.css               Cyan and gray theme, mascot, and animations
  sidebar.css             Dark sidebar and responsive navigation
  finance.css             Financial reports and amount input styling
  cloud.css               Authentication and synchronization styling
supabase/migrations/
  202610010001_buzz.sql    Tables, RLS, validation, and atomic read/save API
tests/
  domain.test.ts          Data and calculation checks
  workspace.test.ts       Import behavior checks
  database.test.mjs       Real PostgreSQL migration and security checks
  e2e/app.spec.ts          Browser workflows and migration checks
  e2e/cloud.spec.ts        Cloud authentication and persistence workflows
```
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
