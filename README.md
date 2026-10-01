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

## Features

- **Overview:** monthly money left, income, expenses, task progress, weekly charts, spending categories, and budget status.
- **Tasks:** add, edit, delete, complete, set priorities and due dates, filter, and switch between list and board views.
- **Finances:** choose a month and year, review every transaction, filter by type/category, and export the visible results to CSV. Monthly history compares income, expenses, and net cash flow for all twelve months; select a month to open its full transaction list.
- **Amount inputs:** type `1250000` or paste `1.250.000`. Thousands separators appear automatically in transactions, budgets, savings targets, and contributions. Editing an existing amount keeps the same readable format.
- **Savings goals:** create goals and record contributions manually.
- **Search:** find tasks and transactions across all months. Press **Ctrl+K** to focus the search field.
- **Settings:** edit your display name and monthly budget, download or restore a JSON backup, start fresh, or load demo data.
- **Sidebar:** active navigation, pending-task count, quick task creation, overall task progress, and an accessible mobile drawer. Profile and settings stay at the bottom.
- **Motion controls:** pause/resume animations with a saved preference. Charts and decorative motion respect your device’s reduced-motion setting.

The original user-supplied mascot is stored at **public/images/buzz-mascot.png**. CSS provides its floating animation. On phones, it sits below the banner text.

## Data and calculations

The first visit includes clearly labeled **demo data**. Use **Settings → Start fresh** to begin with your own records.

Data is stored in this browser under **buzz.dashboard.v1**. It survives reloads but does not sync across devices. Clearing browser storage removes it. JSON backups include all records; CSV exports include transactions only.

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

The app has no sign-in, bank connection, or cloud backend. Google Fonts needs internet on its first load; system fonts are used as a fallback.

## Stack

React 19, TypeScript, Vite, custom CSS, Recharts, and Lucide React. Data is stored with localStorage. Validation uses the Node test runner and Playwright.

## Build and checks

```powershell
npm run build
npm test
npm run test:e2e
```

The production build is written to **dist**. Preview it with **npm run preview -- --port 5173 --strictPort** after stopping the development server.

Browser tests use an installed Chrome browser. If needed, change **playwright.config.ts** to use a Playwright-managed Chromium installation.

Checks cover financial totals, all twelve months and year boundaries, amount formatting and validation, CSV escaping, backup validation, English labels, legacy migration, task and transaction workflows, savings, search, persistence, and responsive navigation.

## Structure

```text
src/
  App.tsx                 Dashboard, navigation, state, and interactions
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
tests/
  domain.test.ts          Data and calculation checks
  e2e/app.spec.ts          Browser workflows and migration checks
```
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
# Buzz-Savings
