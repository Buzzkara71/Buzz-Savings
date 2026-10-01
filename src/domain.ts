import { legacyDemoCopy, legacyLabels, translateLegacy } from "./legacy.ts";

export type Category =
  | "Food & drinks"
  | "Shopping"
  | "Transport"
  | "Bills"
  | "Entertainment"
  | "Other"
  | "Salary"
  | "Freelance";
export type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  category: Category;
  date: string;
};
export type Task = {
  id: string;
  title: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  due: string;
  done: boolean;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: string;
};
export type AppData = {
  version: 1;
  name: string;
  budget: number;
  demo: boolean;
  transactions: Transaction[];
  tasks: Task[];
  goals: Goal[];
};

export const expenseCategories: Category[] = [
  "Food & drinks",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Other",
];
export const incomeCategories: Category[] = ["Salary", "Freelance", "Other"];
export const categoryColors: Record<Category, string> = {
  "Food & drinks": "#0891b2",
  Shopping: "#64748b",
  Transport: "#22b8cf",
  Bills: "#94a3b8",
  Entertainment: "#155e75",
  Other: "#a1a1aa",
  Salary: "#0891b2",
  Freelance: "#155e75",
};
export const today = () => localDate(new Date());
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const currentMonth = () => today().slice(0, 7);
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  return localDate(new Date(year, m - 1 + delta, 1)).slice(0, 7);
}
export const formatAmount = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

// Whole rupiah only. Dots are thousands separators, never decimal points.
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(trimmed)) return null;
  const amount = Number(trimmed.replaceAll(".", ""));
  return Number.isSafeInteger(amount) && amount <= 1e12 ? amount : null;
}

export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(n);
export const shortMoney = (n: number) =>
  Math.abs(n) >= 1e6
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n / 1e6)}M`
    : `${Math.round(n / 1000)}K`;
export const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
export const uid = () => crypto.randomUUID();
export function summarize(transactions: Transaction[], month: string) {
  const selected = transactions.filter((t) => t.date.startsWith(month));
  const income = selected
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = selected
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    selected: [...selected].sort((a, b) => b.date.localeCompare(a.date)),
    income,
    expense,
    balance: income - expense,
  };
}
export function monthlyHistory(transactions: Transaction[], year: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const summary = summarize(transactions, month);
    return {
      month,
      income: summary.income,
      expense: summary.expense,
      balance: summary.balance,
      count: summary.selected.length,
    };
  });
}

export function transactionDateForMonth(month: string, now = today()) {
  return month < now.slice(0, 7) ? `${month}-01` : now;
}
export function chartData(transactions: Transaction[], month: string) {
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  return Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
    const start = i * 7 + 1,
      end = Math.min(start + 6, days);
    const group = transactions.filter(
      (t) =>
        t.date.startsWith(month) &&
        Number(t.date.slice(-2)) >= start &&
        Number(t.date.slice(-2)) <= end,
    );
    return {
      label: `${start}–${end}`,
      Income: group
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
      Expenses: group
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    };
  });
}
export function csvFor(transactions: Transaction[]): string {
  const cell = (value: string | number) => {
    let safe = String(value);
    if (/^[=+\-@\t\r\n]/.test(safe.trimStart())) safe = `'${safe}`;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      ["Date", "Description", "Type", "Category", "Amount (IDR)"],
      ...transactions.map((t) => [
        t.date,
        t.name,
        t.type === "income" ? "Income" : "Expenses",
        t.category,
        t.amount,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function emptyData(name = "Friend"): AppData {
  return {
    version: 1,
    name,
    budget: 4500000,
    demo: false,
    transactions: [],
    tasks: [],
    goals: [],
  };
}
export function makeDemo(): AppData {
  const m = currentMonth();
  const day = new Date().getDate();
  const d = (offset: number) =>
    `${m}-${String(Math.max(1, day - offset)).padStart(2, "0")}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expenses: [string, number, Category, number][] = [
    ["Afternoon coffee", 45000, "Food & drinks", 0],
    ["Monthly groceries", 425000, "Shopping", 0],
    ["Commute to work", 35000, "Transport", 1],
    ["Spotify subscription", 55000, "Entertainment", 1],
    ["Lunch and snacks", 680000, "Food & drinks", 3],
    ["Internet and electricity", 650000, "Bills", 5],
    ["Books and home essentials", 480000, "Shopping", 7],
    ["Fuel and transport", 225000, "Transport", 9],
    ["Weekend movie", 150000, "Entertainment", 10],
    ["Monthly donation", 100000, "Other", 12],
  ];
  return {
    version: 1,
    name: "Friend",
    budget: 4500000,
    demo: true,
    transactions: [
      ...expenses.map(([name, amount, category, offset]) => ({
        id: uid(),
        name,
        amount,
        category,
        date: d(offset),
        type: "expense" as const,
      })),
      {
        id: uid(),
        name: "Monthly salary",
        amount: 7000000,
        category: "Salary",
        date: `${m}-01`,
        type: "income",
      },
      {
        id: uid(),
        name: "Freelance design project",
        amount: 1500000,
        category: "Freelance",
        date: d(4),
        type: "income",
      },
      {
        id: uid(),
        name: "Last month’s expenses",
        amount: 3250000,
        category: "Other",
        date: `${shiftMonth(m, -1)}-15`,
        type: "expense",
      },
      {
        id: uid(),
        name: "Last month’s salary",
        amount: 7000000,
        category: "Salary",
        date: `${shiftMonth(m, -1)}-01`,
        type: "income",
      },
    ],
    tasks: [
      {
        id: uid(),
        title: "Finish the project proposal",
        category: "Work",
        priority: "High",
        due: today(),
        done: false,
      },
      {
        id: uid(),
        title: "Log this week’s expenses",
        category: "Personal",
        priority: "Medium",
        due: today(),
        done: false,
      },
      {
        id: uid(),
        title: "Read 20 pages",
        category: "Personal growth",
        priority: "Low",
        due: today(),
        done: false,
      },
      {
        id: uid(),
        title: "Plan next week’s meals",
        category: "Personal",
        priority: "Medium",
        due: localDate(tomorrow),
        done: false,
      },
      {
        id: uid(),
        title: "Exercise for 30 minutes",
        category: "Health",
        priority: "Medium",
        due: today(),
        done: true,
      },
      {
        id: uid(),
        title: "Tidy up your desk",
        category: "Personal",
        priority: "Low",
        due: today(),
        done: true,
      },
    ],
    goals: [
      {
        id: uid(),
        name: "Trip to Japan",
        target: 15000000,
        saved: 6250000,
        color: "peach",
      },
      {
        id: uid(),
        name: "Emergency fund",
        target: 20000000,
        saved: 12000000,
        color: "sage",
      },
      {
        id: uid(),
        name: "New laptop",
        target: 18000000,
        saved: 4500000,
        color: "lavender",
      },
    ],
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isText = (v: unknown) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 300;
const validAmount = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const validDate = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) &&
  localDate(new Date(`${v}T12:00:00`)) === v;
export function isAppData(v: unknown): v is AppData {
  if (
    !isRecord(v) ||
    v.version !== 1 ||
    !isText(v.name) ||
    !validAmount(v.budget) ||
    typeof v.demo !== "boolean"
  )
    return false;
  if (
    !Array.isArray(v.tasks) ||
    !Array.isArray(v.transactions) ||
    !Array.isArray(v.goals)
  )
    return false;
  return (
    v.tasks.every(
      (t) =>
        isRecord(t) &&
        isText(t.id) &&
        isText(t.title) &&
        isText(t.category) &&
        ["High", "Medium", "Low"].includes(String(t.priority)) &&
        validDate(t.due) &&
        typeof t.done === "boolean",
    ) &&
    v.transactions.every(
      (t) =>
        isRecord(t) &&
        isText(t.id) &&
        isText(t.name) &&
        validAmount(t.amount) &&
        Number(t.amount) > 0 &&
        ["income", "expense"].includes(String(t.type)) &&
        (t.type === "income" ? incomeCategories : expenseCategories).includes(
          t.category as Category,
        ) &&
        validDate(t.date),
    ) &&
    v.goals.every(
      (g) =>
        isRecord(g) &&
        isText(g.id) &&
        isText(g.name) &&
        validAmount(g.target) &&
        Number(g.target) > 0 &&
        validAmount(g.saved) &&
        ["peach", "sage", "lavender"].includes(String(g.color)),
    ) &&
    [v.tasks, v.transactions, v.goals].every(
      (items) => new Set(items.map((i) => i.id)).size === items.length,
    )
  );
}

/** Accept the current format and translate known labels in older backups. */
export function parseAppData(value: unknown): AppData | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.transactions) ||
    !Array.isArray(value.goals)
  )
    return null;
  const demoText = (text: unknown) =>
    value.demo === true ? translateLegacy(text, legacyDemoCopy) : text;
  const normalized = {
    ...value,
    name: value.demo === true && value.name === "Teman" ? "Friend" : value.name,
    tasks: value.tasks.map((t) =>
      isRecord(t)
        ? {
            ...t,
            title: demoText(t.title),
            category: translateLegacy(t.category, legacyLabels),
            priority: translateLegacy(t.priority, legacyLabels),
          }
        : t,
    ),
    transactions: value.transactions.map((t) =>
      isRecord(t)
        ? {
            ...t,
            name: demoText(t.name),
            category: translateLegacy(t.category, legacyLabels),
          }
        : t,
    ),
    goals: value.goals.map((g) =>
      isRecord(g) ? { ...g, name: demoText(g.name) } : g,
    ),
  };
  return isAppData(normalized) ? normalized : null;
}
