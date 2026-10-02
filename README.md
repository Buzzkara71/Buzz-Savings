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

1. Open your Supabase project → **SQL Editor → New query**. For a new project, run [the base migration](supabase/migrations/202610010001_buzz.sql), [the savings and profile migration](supabase/migrations/202610020001_savings_profile.sql), then [the custom photos migration](supabase/migrations/202610020002_custom_photos.sql), in that order. For an existing project, run only migrations that have not been applied. Existing records are preserved.
2. For local development, copy **.env.example** to **.env.local** and fill in the project URL and publishable key. Restart Vite after editing it. The local file is ignored by Git.
3. In **Authentication → URL Configuration**, set **Site URL** to your Vercel production URL and allow the exact production URL and **http://127.0.0.1:5173** as redirect URLs. Confirmation and password reset links return to the app.
4. For your first personal account, use **Authentication → Users → Add user → Create new user**, enter your email and a new account password, and enable **Auto Confirm User**. Then sign in to Buzz with those account credentials. The database password is separate and is never used by Buzz.
5. To support public signup, email confirmation, and password reset, configure an email provider under Supabase Auth's **SMTP Settings**. The default sender restricts recipients to project team members. Keep email confirmation enabled. See [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp) and [redirect URL setup](https://supabase.com/docs/guides/auth/redirect-urls).
6. Add the same two public environment variables in Vercel and deploy the updated code. Open the app on two devices, sign in with the same account, add an entry, and select **Refresh** on the other device.

### Updating an existing Supabase project

The savings/profile update requires **202610020001_savings_profile.sql** and the matching app deployment. It adds profile details, goal covers, and a link from each Savings transaction to its goal. It upgrades the returned workspace to version 2 and rejects older clients' saves, so they cannot erase these new fields. Reload open tabs after deployment. The new app detects a version 1 database and shows the required migration filename instead of silently losing data. The base migration should not be rerun after the upgrade.

The custom photo update requires **202610020002_custom_photos.sql** after the savings/profile migration. It keeps format version 2 and adds a photo capability flag. The app continues to load and save ordinary records before this migration is applied. Saving a new photo asks for the migration if it is missing; the form keeps the photo so you can apply SQL and retry. Earlier version 2 clients preserve photos when their forms omit the photo field. The photos migration can be rerun safely.

### Upload custom photos

- **Profile:** open your avatar → **Upload profile photo** → choose a file → **Save settings**. The photo appears in the header, sidebar, and profile.
- **Savings goals:** create or edit a goal → **Upload goal photo** → choose a file → save. The photo becomes that goal's carousel cover.
- Use **Change** to replace a photo, **Remove** to return to an illustration/avatar, or **Cancel** to discard the draft. Selecting a preset also replaces the photo after saving.
- JPG, PNG, and WebP files up to **5 MB** and **32 megapixels** are accepted. Images are resized to a maximum edge of 512 pixels for profiles or 1200 pixels for goals, then compressed to JPEG. Transparent areas become white. Photos are displayed with a centered crop.
- Compressed photos stay below 180,000 characters each and share the workspace's **2 MB** limit. They are stored with the account records under existing RLS policies and included in JSON backups. No public bucket, separate Storage configuration, or external image service is needed. CSV exports contain transaction records only.
- In local mode, photos stay in this browser. If browser storage is full or unavailable, saving keeps the form open and offers a downloadable draft; the existing saved workspace is preserved. Sign in and explicitly import browser records to bring local goal photos to your account. Browser import retains your existing account profile.

### Import existing records

On the original browser and origin, sign in and open **Settings → Import browser data**. This merges tasks, transactions, and goals by their existing IDs. Cloud records with matching IDs and account settings are preserved, so repeating an import does not duplicate entries. Browser records remain available in local mode. If the original records are at the local development URL and you want to import on the hosted URL, download a JSON backup first, then use **Settings → Restore** on the hosted app. Restore replaces the account's whole workspace after confirmation, including its name and budget.

### Cloud behavior

- New cloud accounts start with an empty workspace. Local mode retains demo data and upgrades earlier records to the current format.
- Saving waits for the server to confirm the write. A failed save keeps the form open and offers a downloadable draft. Unsynced drafts are held in memory; download them before closing the browser or signing out.
- The app checks for changes every 30 seconds while visible and when returning to the page or reconnecting. Checks pause while editing or holding an unsynced draft. **Refresh** checks immediately. This is periodic synchronization, not a live Realtime subscription.
- Every save checks the workspace revision and commits all collections in one database transaction. If another device saved first, the app asks you to reload rather than overwriting newer records. Download the draft before reloading if needed.
- Cloud records are kept in memory while signed in. Supabase stores the login session in this browser. Signing out clears the account view; older browser-local records remain separate and are never imported automatically.
- Workspace payloads are limited to 2 MB by the database function. Writes require a connection; there is no automatic offline queue.
- With both environment variables absent, Buzz runs in local mode. With cloud configured, **Continue on this device** opens local mode explicitly. A failed cloud load shows a retry screen and never uploads an empty workspace over existing data.

### Database access

The tables are **buzz_profiles**, **buzz_tasks**, **buzz_transactions**, and **buzz_goals**. Each account owns its records through **user_id**, with Row Level Security restricting authenticated reads. Anonymous access is denied. Direct writes are revoked; **buzz_save_workspace** validates data, derives the owner from the authenticated session, checks the revision, and writes atomically. Both public RPCs use a fixed empty search path and reject unauthenticated requests. The application uses the HTTPS API; direct PostgreSQL credentials are only relevant to database administration.

## Features

- **Overview:** available balance, savings, total income and expenses across all recorded history, plus total tracked money. Monthly charts and budget status have a separate period selector that does not change the all-time balances.
- **Tasks:** add, edit, delete, complete, set priorities and due dates, filter, and switch between list and board views.
- **Finances:** choose a month and year, review every transaction, filter by type/category, and export the visible results to CSV. Monthly history compares income, expenses, and net cash flow for all twelve months; select a month to open its full transaction list.
- **Amount inputs:** type `1250000` or paste `1.250.000`. Thousands separators appear automatically in transactions, budgets, savings targets, and contributions. Editing an existing amount keeps the same readable format.
- **Savings goals:** choose one of four illustrated covers, browse a carousel with buttons, arrow keys, or touch, and add savings. Contributions create linked Savings transactions automatically. Goal totals update when those transactions change.
- **Search:** find tasks and transactions across all months. Press **Ctrl+K** to focus the search field.
- **Profile and settings:** edit display name, full name, occupation, location, bio, avatar, and monthly budget. View account email and membership date, download or restore a JSON backup, start fresh, or load demo data. Starting fresh preserves your profile details.
- **Custom photos:** upload, preview, replace, and remove profile photos and goal covers. Images resize automatically, sync with your account, and travel with JSON backups.
- **Cloud accounts:** email/password login, signup confirmation, password reset, manual and periodic refresh, and browser-data import. Account data is isolated using Supabase Auth and PostgreSQL RLS.
- **Sidebar:** active navigation, pending-task count, quick task creation, overall task progress, and an accessible mobile drawer. Profile and settings stay at the bottom.
- **Motion controls:** header phrases and type styles rotate every three seconds while the page is visible. Pause/resume with a saved preference. Typography, charts, and decorative motion respect your device’s reduced-motion setting. The goals carousel advances manually.

The original user-supplied mascot is stored at **public/images/buzz-mascot.png**. CSS provides its floating animation. On phones, it sits below the banner text.

## Data and calculations

The first visit in local mode includes clearly labeled **demo data**. Use **Settings → Start fresh** to begin with your own records. Cloud accounts start empty.

Local mode stores records in this browser under **buzz.dashboard.v1**. It survives reloads but does not sync across devices. Cloud mode stores records in Supabase under your account. JSON backups include the current workspace's records; CSV exports include transactions only.

- Available balance = all recorded income − expenses − Savings transfers, across all months. Negative balances remain visible if recorded outflows exceed income.
- Savings total = each goal's opening balance plus its linked Savings transactions. Total tracked money = available balance + savings total. Transfers move money between these two balances and do not count as spending or income.
- Money left in a monthly report = that month's income − expenses − Savings transfers. Previous balances are not carried forward in monthly reports. Weekly charts show income and spending; the savings amounts are listed in monthly history and transaction totals.
- Currency remains **Indonesian rupiah (IDR)**, with dots separating thousands and no fractional rupiah, for example **Rp1.250.000**. Stored and exported amounts remain numbers. Dates and month names are in English. Charts use **K** and **M** for thousands and millions.
- Monthly history and summary cards always include every transaction in the selected period. The list shows its own filtered count, income, and expense totals. Changing month or transaction type clears incompatible filters; saving a transaction opens its month and clears filters.
- In Finances, adding a transaction to a past month defaults to the first day of that month. Overview and goal contributions default to today, regardless of the chart period. Current or future report months default to today; recorded transactions cannot be future-dated.
- One budget applies to every month. Set it to zero to disable the budget.
- Weekly charts group dates into 1–7, 8–14, and so on.
- Expense comparisons use recorded totals from the previous month, without forecasting.
- Today’s progress includes tasks due on or before today. Overall task counts do not follow the financial month selector.
- To save, use **Add transaction → Savings**, choose a goal, and enter the amount/date, or use the goal's **Save** button. Editing, reassigning, converting, or deleting the transaction recalculates its goal automatically. Goals with linked transfers cannot be deleted until those transactions are reassigned or deleted.
- **Already saved** in the goal form is an opening balance from before tracking began. Existing manual contributions remain in that opening balance; they are not retroactively deducted from available cash. Edit it only to correct the opening amount. New savings should use transactions or **Save**.
- Reminders appear inside the app while it is open; there are no push notifications.
- Backups are validated before import. CSV exports neutralize spreadsheet formulas in text fields.

### Compatibility with earlier versions

Buzz automatically reads existing data from **ruang.dashboard.v1** when no Buzz data exists. Built-in categories, priorities, and known demo copy become English. IDs, amounts, dates, completion states, and user-written content are preserved. The original storage entry is kept for recovery. Older JSON backups are also supported, and animation preferences carry over.

Version 1 backups are upgraded to version 2 on load, with an empty profile and the original opening savings. The local storage key stays **buzz.dashboard.v1** for compatibility, but its payload is version 2. Backups include the complete profile, covers, and goal links.

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
  DashboardExtras.tsx     All-time balances, rotating copy, and goal carousel
  GoalArtwork.tsx         Four local SVG cover illustrations
  ProfileAvatar.tsx       Custom photo or preset avatar
  PhotoUpload.tsx         Photo picker, preview, and validation feedback
  photos.ts              Image resizing and saved-photo validation
  domain.ts               Models, calculations, validation, CSV, and demo data
  legacy.ts               Compatibility mappings for older data
  useMotionPreference.ts  Saved motion preference and reduced-motion support
  styles.css              Base design and responsive layout
  theme.css               Cyan and gray theme, mascot, and animations
  sidebar.css             Dark sidebar and responsive navigation
  finance.css             Financial reports and amount input styling
  cloud.css               Authentication and synchronization styling
  enhancements.css        Header, savings carousel, and profile styling
supabase/migrations/
  202610010001_buzz.sql    Tables, RLS, validation, and atomic read/save API
  202610020001_savings_profile.sql  Linked savings, profiles, and format upgrade
  202610020002_custom_photos.sql    Private photos and compatible save/read API
tests/
  domain.test.ts          Data and calculation checks
  workspace.test.ts       Import behavior checks
  database.test.mjs       Real PostgreSQL migration and security checks
  e2e/app.spec.ts          Browser workflows and migration checks
  e2e/cloud.spec.ts        Cloud authentication and persistence workflows
  e2e/savings.spec.ts      Goal links, all-time balance, profile, and motion
  e2e/photos.spec.ts       Photo uploads, backup/restore, and storage failures
```
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
