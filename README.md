<div align="center">
  <img src="public/favicon.svg" alt="Buzz logo" width="72" height="72" />
  <h1>Buzz</h1>
  <p><strong>A little more organized. A little more balanced.</strong></p>
  <p>Your personal space for everyday tasks, money, and savings goals.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&amp;logo=react&amp;logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript 5.7" />
    <img src="https://img.shields.io/badge/Vite-6-646cff?style=flat-square&amp;logo=vite&amp;logoColor=white" alt="Vite 6" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&amp;logo=supabase&amp;logoColor=white" alt="Supabase and PostgreSQL" />
  </p>
  <p>
    <a href="#features">Features</a> &middot;
    <a href="#quick-start">Quick start</a> &middot;
    <a href="#cloud-setup">Cloud setup</a> &middot;
    <a href="#bank-statements">Bank statements</a> &middot;
    <a href="#development">Development</a>
  </p>
</div>

![Buzz overview with a cyan and gray interface, financial summaries, and illustrated savings goals](docs/images/overview.png)

<p align="center"><em>Local demo workspace. All balances, tasks, and goals shown here are sample data.</em></p>

## Features

Buzz brings daily planning and personal finance into one responsive dashboard. The interface uses English text, Indonesian rupiah, cyan accents, a dark sidebar, and gentle animations with a pause control.

| Space                  | What you can do                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Overview**           | Check your latest balance, monthly cash flow, spending categories, budget, and recent activity.         |
| **Tasks**              | Plan with due dates, priorities, filters, and list or board views.                                      |
| **Finances**           | Track income, expenses, and savings; browse monthly history and export transactions to CSV.             |
| **Bank statements**    | Import a prepared statement, review uncertain entries, and use its balances across the dashboard.       |
| **Savings goals**      | Link contributions to goals, track progress, and browse a carousel with illustrated or uploaded covers. |
| **Your profile**       | Personalize your name, bio, occupation, location, avatar, and photo.                                    |
| **Search and backups** | Find tasks and transactions with **Ctrl+K**; download or restore a complete JSON backup.                |
| **Cloud accounts**     | Sign in across devices with Supabase Auth, or keep a workspace in this browser.                         |

Amount fields format `1250000` as `1.250.000` as you type. The layout adapts to phones, and animations respect the device's reduced-motion preference. Header text rotates every three seconds; the goals carousel advances manually with buttons, arrow keys, or touch.

## Quick start

Use **Node.js 24**, npm, and Git.

```sh
git clone https://github.com/Buzzkara71/Buzz-Savings.git
cd Buzz-Savings
npm ci
npm run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173**. Without Supabase environment variables, Buzz starts in local mode with sample records. Choose **Settings → Start fresh** when you are ready to use your own data.

On Windows, you can also double-click [Start Buzz.cmd](Start%20Buzz.cmd). It installs dependencies if needed and starts the development server. Keep its window open while using the app. It uses an existing portable Node runtime in `.tools` when available, otherwise your system installation; the portable runtime is excluded from Git.

Use the same address and port each time: `localhost` and `127.0.0.1` have separate browser storage.

## Cloud setup

Local mode needs no database. To access your workspace from multiple devices, connect a Supabase project.

### 1. Apply the database migrations

In your project's **SQL Editor**, run each complete file in this order:

| Order | Migration                                                                    | Adds                                                        |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1     | [Base workspace](supabase/migrations/202610010001_buzz.sql)                  | Tables, account isolation, validation, and atomic saves.    |
| 2     | [Savings and profiles](supabase/migrations/202610020001_savings_profile.sql) | Linked savings transfers, profile details, and goal covers. |
| 3     | [Custom photos](supabase/migrations/202610020002_custom_photos.sql)          | Private profile photos and goal images.                     |
| 4     | [Bank statements](supabase/migrations/202610020003_bank_statements.sql)      | Statement storage, reconciliation checks, and cloud import. |

For an existing project, apply only the migrations you have not run, in order. Deploy the matching app and reload open tabs. **Do not rerun an older migration after a newer one:** it can replace the current read/save functions with older definitions.

### 2. Configure the app

Copy [.env.example](.env.example) to `.env.local`, then fill in your project's public connection values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Restart the development server after editing this file. `.env.local` is ignored by Git. These `VITE_` values are embedded in the browser build: use the publishable key, and keep database passwords, secret keys, and service-role keys out of them.

### 3. Configure authentication

- Set Supabase Auth's **Site URL** to your production URL and allow your production URL and `http://127.0.0.1:5173` as redirect URLs.
- For a personal account, create a user in **Authentication → Users** and confirm the account, then sign in to Buzz with its email and password.
- For signup confirmation and password reset emails, configure Supabase Auth's SMTP settings and test delivery. The account password is separate from the database password.
- Sign in on a second device and select **Refresh** to verify synchronization. New cloud accounts start empty; browser records are imported explicitly.

### Deploy on Vercel

Import this GitHub repository with the project root unchanged. [vercel.json](vercel.json) already defines:

| Setting          | Value           |
| ---------------- | --------------- |
| Framework        | Vite            |
| Install command  | `npm ci`        |
| Build command    | `npm run build` |
| Output directory | `dist`          |

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the deployment's environment variables for cloud mode. Redeploy after changing them.

## Bank statements

Open **Settings → Import bank statement**, select a prepared `buzz-bank-statement` JSON file, review the preview, and confirm. The app accepts structured JSON; a PDF must be extracted and categorized beforehand. See the [synthetic sample statement](tests/fixtures/bank-statement.json) and [format validation](src/bankStatement.ts).

Once imported, the statement becomes the dashboard's financial source:

- **Latest balance:** the bank's closing balance for the statement's end date. Changing the report month keeps this balance visible.
- **Monthly monitoring:** cash in/out, identified spending, categories, budget usage, recent transactions, and monthly opening/closing balances come from the statement.
- **Review tools:** search by merchant, category, or transaction ID; filter by transaction type or review flag; inspect source notes and PDF page references; export filtered results to CSV.
- **Replacement imports:** each workspace holds one statement. Importing a newer file replaces it after confirmation and updates the dashboard without appending duplicates.
- **Manual records:** existing tasks, goals, profile details, and manual transactions are preserved. The manual ledger remains available in **Finances → Manual records** and is calculated separately. Without an imported statement, Overview uses manual records.

The displayed bank balance updates when you import a statement; there is no live bank connection. Keep personal PDFs and prepared financial datasets outside the repository and public assets.

### How money is counted

| Calculation         | Imported statement                                                                              | Manual records                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Available balance   | Opening balance + cash in − cash out.                                                           | All recorded income − expenses − savings transfers.                 |
| Income and spending | Identified entries; loans, transfers, savings movements, and unresolved transfers are excluded. | Entries recorded as income or expense.                              |
| Savings             | Pocket deposits minus withdrawals show net movements, not pocket balances.                      | A goal's opening savings + linked savings transactions.             |
| Precision           | Integer hundredths of IDR preserve interest and tax decimals.                                   | Whole rupiah, with dots as thousands separators.                    |
| Monthly history     | Opening balances carry forward, including inactive months.                                      | Each month reports its own income, expenses, and savings transfers. |

The monthly budget uses identified spending, including bank fees and tax when a statement is active. One budget applies to every month; set it to zero to disable it. Unresolved entries can affect spending totals once their classification is corrected in the prepared statement. Every imported running balance and the final balance must reconcile.

<details>
<summary><strong>Savings and reporting details</strong></summary>

- Add a manual contribution with **Add transaction → Savings** or a goal's **Save** button. Editing, reassigning, or deleting that transaction recalculates its linked goal.
- **Already saved** is a goal's opening balance from before tracking began. It is not deducted again from available cash. Goals with linked transfers cannot be deleted until those transfers are reassigned or removed.
- Manual total tracked money = available balance + savings. A savings transfer moves money between them without counting as income or spending.
- Imported pocket movements do not change manual goals. A main-account statement does not establish balances or spending in other pockets.
- Weekly charts group dates into 1–7, 8–14, and so on. Financial month filters do not change task counts or all-time manual balances.
- Past-month transaction forms default to that month's first day. Overview and goal contributions default to today. Recorded transactions cannot be future-dated.
- Reminders appear inside the open app; there are no push notifications.

</details>

## Photos and personalization

Upload a profile picture in **Settings**, or create/edit a savings goal and choose **Upload goal photo**. Preview, change, remove, or cancel before saving.

| Image         | Processing                 | Display                                                            |
| ------------- | -------------------------- | ------------------------------------------------------------------ |
| Profile photo | Maximum edge: **512 px**.  | Avatar in the header, sidebar, and profile.                        |
| Goal cover    | Maximum edge: **1200 px**. | Centered carousel crop; **1200 × 575 px** is a useful source size. |

JPG, PNG, and WebP uploads support up to **5 MB** and **32 megapixels**. Photos are resized and compressed to JPEG; transparent areas become white. Each saved photo stays within 180,000 characters and shares the workspace's **2 MB** total limit. Photos sync with account records and are included in JSON backups; no separate public image bucket is required.

## Storage, sync, and backups

| Mode      | Where records live             | Behavior                                                           |
| --------- | ------------------------------ | ------------------------------------------------------------------ |
| **Local** | This browser's `localStorage`. | Starts with demo data; survives reloads on the same origin.        |
| **Cloud** | Your Supabase account.         | Starts empty; writes require a connection and server confirmation. |

Cloud workspaces check for changes every **30 seconds** while visible, and when the page regains focus or reconnects. Checks pause during editing or while an unsaved draft exists. **Refresh** checks immediately. Revision checks prevent one device from silently overwriting another device's newer data.

<details>
<summary><strong>Importing, restoring, and recovering your records</strong></summary>

- **Import browser data** merges tasks, transactions, and goals by ID. Existing cloud records and profile settings win. A local bank statement is included only when the account has none. Repeating the import does not duplicate records.
- To move records between origins or devices, download a **JSON backup**, then use **Settings → Restore** on the destination. Restore replaces the whole workspace after confirmation, including profile, budget, photos, and statement.
- **Start fresh** and **Load demo data** replace financial records, including the statement. Start fresh retains profile details.
- A failed save keeps the form open and offers a downloadable draft. Drafts stay in memory: download them before closing, signing out, or reloading after a conflict. There is no automatic offline save queue.
- With cloud configured, **Continue on this device** opens local mode. A failed cloud load shows a retry screen and preserves the existing cloud workspace.
- JSON backups include the complete workspace. CSV exports contain transaction records and neutralize spreadsheet formulas in text fields.
- Earlier Ruang browser records and version 1 backups are upgraded on load. IDs, financial values, dates, and user-written content are preserved. The local key remains `buzz.dashboard.v1`; the current workspace payload is version 2.

</details>

### Database access

The four tables are `buzz_profiles`, `buzz_tasks`, `buzz_transactions`, and `buzz_goals`. Supabase Auth identifies each account, and Row Level Security restricts reads to the owning user. Anonymous access and direct client writes are denied.

Writes go through `buzz_save_workspace`, which validates the payload, checks its revision, and commits the workspace atomically. Both public workspace RPCs use a fixed empty search path and require authentication. The browser uses the HTTPS API and a publishable key.

## Development

| Layer                 | Tools                                           |
| --------------------- | ----------------------------------------------- |
| UI                    | React 19, TypeScript, custom CSS, Lucide icons. |
| Charts                | Recharts.                                       |
| Build                 | Vite.                                           |
| Accounts and database | Supabase Auth and PostgreSQL.                   |
| Checks                | Node test runner, PGlite, Playwright.           |

```sh
npm run build       # Type-check and create the production build
npm test            # Calculations, validation, and imports
npm run test:db     # Migrations, RLS, revisions, and rollback
npm run test:e2e    # Browser workflows and responsive layouts
npm run preview    # Serve the production build locally
```

Browser tests use installed **Google Chrome** and start isolated servers on ports **5174** and **5175**. Cloud API responses are mocked; tests do not write to a live Supabase project. Database tests run the actual migrations in local PostgreSQL through PGlite. Hosted login and email delivery should be checked with your configured project.

### Project structure

```text
src/
  App.tsx                  Dashboard, navigation, and interactions
  CloudApp.tsx             Authentication and account boundaries
  BankDashboard.tsx        Statement-based dashboard summaries
  BankStatementPanel.tsx   Statement browsing, filters, and export
  bankStatement.ts         Exact bank calculations and validation
  domain.ts                Manual records, calculations, and backups
  supabase.ts              Supabase client and workspace API
  useWorkspace.ts          Persistence, refresh, and save conflicts
  workspace.ts            Browser storage and repeatable imports
  forms.tsx                Task, transaction, goal, and settings forms
  CurrencyInput.tsx        Formatted whole-rupiah amount inputs
  DashboardExtras.tsx      All-time cards, rotating text, and carousel
  PhotoUpload.tsx          Photo picker and preview
  photos.ts                Image resizing and validation
  *.css                    Theme, layout, and responsive styles
public/                    Logo, mascot, and local images
supabase/migrations/       Ordered database migrations
tests/                     Unit, database, and browser checks
docs/images/               README previews using sample data
```

## Troubleshooting

<details>
<summary><strong>Vercel reports “added: command not found”</strong></summary>

Enter `npm ci` as the install command in Vercel's settings, without literal surrounding quotes or backticks. Backticks make the shell try to execute the command's output. Save the corrected setting and redeploy.

</details>

<details>
<summary><strong>The workspace requests a migration or cannot load</strong></summary>

Check which migrations have been applied and run the missing ones in order. Deploy the matching application, refresh open tabs, and use **Try again**. Avoid rerunning older migrations over newer ones. If a form holds an unsaved draft, download it before reloading.

</details>

<details>
<summary><strong>My local records are missing on another device or address</strong></summary>

Browser storage belongs to one browser and origin. Return to the original address to export a JSON backup, or sign in there and use **Import browser data**. Sign in with the same account on your other devices to use cloud records.

</details>

---

<p align="center">A little Buzz. A little more balance.</p>
