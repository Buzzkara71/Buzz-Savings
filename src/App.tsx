import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useWorkspace } from "./useWorkspace";
import { browserBackup, mergeBrowserData } from "./workspace";
import {
  LayoutDashboard,
  ListTodo,
  Wallet,
  Sprout,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CircleHelp,
  Download,
  Menu,
  X,
  CalendarDays,
  Circle,
  SlidersHorizontal,
  ShieldCheck,
  Pencil,
  PartyPopper,
  CircleAlert,
  PanelTop,
  Columns3,
  Leaf,
  Pause,
  Play,
  Cloud,
  RefreshCw,
  LogOut,
} from "lucide-react";
import Sidebar from "./Sidebar";
import MonthlyHistory from "./MonthlyHistory";
import GoalArtwork from "./GoalArtwork";
import ProfileAvatar from "./ProfileAvatar";
import { GoalCarousel, LifetimeCards, RotatingCopy } from "./DashboardExtras";
import { useMotionPreference } from "./useMotionPreference";
import {
  type AppData,
  type Task,
  type Transaction,
  type Goal,
  makeDemo,
  emptyData,
  parseAppData,
  today,
  currentMonth,
  monthLabel,
  shiftMonth,
  summarize,
  money,
  shortMoney,
  expenseCategories,
  incomeCategories,
  categoryColors,
  csvFor,
  dateLabel,
  transactionDateForMonth,
  goalBalance,
  lifetimeSummary,
  coverFor,
  uid,
} from "./domain";
import {
  Dialog,
  TaskItem,
  CategoryIcon,
  CashChart,
  EmptyState,
  MascotIllustration,
} from "./components";
import {
  TaskForm,
  TransactionForm,
  GoalForm,
  ContributionForm,
  SettingsForm,
} from "./forms";

type View = "overview" | "tasks" | "finance" | "goals";
type Modal =
  | { type: "task"; item?: Task }
  | { type: "transaction"; item?: Transaction }
  | { type: "goal"; item?: Goal }
  | { type: "contribution"; item: Goal }
  | { type: "settings" }
  | { type: "help" }
  | { type: "notifications" }
  | { type: "confirm"; title: string; text: string; action: () => void };
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "finance", label: "Finances", icon: Wallet },
  { id: "goals", label: "Savings goals", icon: Sprout },
] as const;

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App({
  session,
  onSignOut,
  onSignIn,
}: {
  session?: Session;
  onSignOut?: () => Promise<void>;
  onSignIn?: () => void;
}) {
  const motion = useMotionPreference();
  const [view, setView] = useState<View>("overview");
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const workspace = useWorkspace(session?.user.id, Boolean(modal));
  const { data, warning, busy, error, conflict } = workspace;
  const [accountError, setAccountError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [taskFilter, setTaskFilter] = useState("All");
  const [taskLayout, setTaskLayout] = useState<"list" | "board">("list");
  const [transactionFilter, setTransactionFilter] =
    useState("All transactions");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const searchRef = useRef<HTMLInputElement>(null);
  const ledgerHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMobileMenu(false);
        setSearch("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function update(fn: (previous: AppData) => AppData, message = "") {
    const saved = await workspace.update(fn);
    if (saved && message) setToast(message);
    return saved;
  }
  function navigate(next: View) {
    setView(next);
    setSearch("");
    setMobileMenu(false);
  }
  const close = () => {
    if (!busy) setModal(null);
  };
  const clearTransactionFilters = () => {
    setTransactionFilter("All transactions");
    setCategoryFilter("All categories");
  };
  const selectMonth = (next: string) => {
    setMonth(next);
    clearTransactionFilters();
  };
  const reportYears = [
    ...new Set([
      currentMonth().slice(0, 4),
      month.slice(0, 4),
      ...data.transactions.map((t) => t.date.slice(0, 4)),
      ...[-1, 1].map((offset) => String(Number(month.slice(0, 4)) + offset)),
    ]),
  ]
    .filter((year) => Number(year) >= 1900 && Number(year) <= 9999)
    .sort()
    .reverse();
  const summary = summarize(data.transactions, month);
  const lifetime = lifetimeSummary(data);
  const previous = summarize(data.transactions, shiftMonth(month, -1));
  const completion = data.tasks.length
    ? Math.round(
        (data.tasks.filter((t) => t.done).length / data.tasks.length) * 100,
      )
    : 0;
  const pending = data.tasks.filter((t) => !t.done);
  const todayTasks = data.tasks.filter((t) => t.due <= today());
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayProgress = todayTasks.length
    ? Math.round((todayDone / todayTasks.length) * 100)
    : 0;
  const query = search.trim().toLocaleLowerCase("en");
  const filteredTasks = data.tasks
    .filter((t) =>
      `${t.title} ${t.category}`.toLocaleLowerCase("en").includes(query),
    )
    .filter(
      (t) =>
        taskFilter === "All" ||
        (taskFilter === "Active" && !t.done) ||
        (taskFilter === "Completed" && t.done) ||
        (taskFilter === "Today" && t.due === today()),
    );
  const allMatches = data.transactions
    .filter((t) =>
      `${t.name} ${t.category}`.toLocaleLowerCase("en").includes(query),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const filteredTransactions = summary.selected.filter(
    (t) =>
      (transactionFilter === "All transactions" ||
        t.type ===
          (transactionFilter === "Income"
            ? "income"
            : transactionFilter === "Savings"
              ? "savings"
              : "expense")) &&
      (categoryFilter === "All categories" || t.category === categoryFilter),
  );
  const hasTransactionFilters =
    transactionFilter !== "All transactions" ||
    categoryFilter !== "All categories";
  const filterCategories =
    transactionFilter === "Income"
      ? incomeCategories
      : transactionFilter === "Expenses"
        ? expenseCategories
        : transactionFilter === "Savings"
          ? ["Savings"]
          : [
              ...new Set([
                ...expenseCategories,
                ...incomeCategories,
                "Savings",
              ]),
            ];
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const filteredExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const categoryTotals = expenseCategories
    .map((category) => ({
      category,
      amount: summary.selected
        .filter((t) => t.type === "expense" && t.category === category)
        .reduce((s, t) => s + t.amount, 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const budgetPercent =
    data.budget > 0 ? Math.round((summary.expense / data.budget) * 100) : 0;
  const delta =
    previous.expense > 0
      ? ((summary.expense - previous.expense) / previous.expense) * 100
      : null;

  const toggleTask = (task: Task) =>
    update(
      (d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === task.id ? { ...t, done: !t.done } : t,
        ),
      }),
      task.done
        ? "Task marked as incomplete."
        : "One step forward. Task complete!",
    );
  const saveTask = async (task: Task) => {
    const saved = await update(
      (d) => ({
        ...d,
        tasks: d.tasks.some((t) => t.id === task.id)
          ? d.tasks.map((t) => (t.id === task.id ? task : t))
          : [...d.tasks, task],
      }),
      "Task saved.",
    );
    if (saved) close();
  };
  const saveTransaction = async (item: Transaction) => {
    const saved = await update(
      (d) => ({
        ...d,
        transactions: d.transactions.some((t) => t.id === item.id)
          ? d.transactions.map((t) => (t.id === item.id ? item : t))
          : [item, ...d.transactions],
      }),
      "Transaction saved.",
    );
    if (saved) {
      selectMonth(item.date.slice(0, 7));
      setSearch("");
      close();
    }
  };
  const saveGoal = async (goal: Goal) => {
    const saved = await update(
      (d) => ({
        ...d,
        goals: d.goals.some((g) => g.id === goal.id)
          ? d.goals.map((g) => (g.id === goal.id ? goal : g))
          : [...d.goals, goal],
      }),
      "Savings goal saved.",
    );
    if (saved) close();
  };
  const remove = (kind: "tasks" | "transactions" | "goals", id: string) => {
    if (kind === "goals" && data.transactions.some((t) => t.goalId === id)) {
      setToast(
        "This goal has savings transfers. Reassign or delete its linked transactions before deleting the goal.",
      );
      return;
    }
    setModal({
      type: "confirm",
      title: "Delete this entry?",
      text: session
        ? "This entry will be removed from your account on all devices."
        : "This entry will be removed from your dashboard and browser storage.",
      action: async () => {
        const saved = await update(
          (d) => ({ ...d, [kind]: d[kind].filter((item) => item.id !== id) }),
          "Entry deleted.",
        );
        if (saved) close();
      },
    });
  };
  const exportCSV = () => {
    download(
      `buzz-transactions-${month}.csv`,
      csvFor(filteredTransactions),
      "text/csv;charset=utf-8;",
    );
    setToast(`${filteredTransactions.length} transactions exported.`);
  };
  const backup = () => {
    download(
      `buzz-backup-${today()}.json`,
      JSON.stringify(data, null, 2),
      "application/json",
    );
    setToast("Backup downloaded.");
  };
  const backupDraft = () => {
    if (workspace.failedDraft)
      download(
        `buzz-unsynced-${today()}.json`,
        JSON.stringify(workspace.failedDraft, null, 2),
        "application/json",
      );
  };
  const reloadCloud = () => {
    if (workspace.failedDraft || modal) {
      setModal({
        type: "confirm",
        title: "Reload your cloud records?",
        text: "This closes your current form and discards the unsynced draft. Download the draft first if you need to keep it.",
        action: async () => {
          if (await workspace.refresh()) close();
        },
      });
    } else void workspace.refresh();
  };
  const signOut = async () => {
    if (!onSignOut || busy || signingOut) return;
    setSigningOut(true);
    setAccountError("");
    try {
      await onSignOut();
    } catch (reason) {
      setAccountError(
        reason instanceof Error
          ? reason.message
          : "Could not sign out. Try again.",
      );
    } finally {
      setSigningOut(false);
    }
  };
  const requestSignOut = () => {
    if (workspace.failedDraft)
      setModal({
        type: "confirm",
        title: "Sign out with an unsynced draft?",
        text: "The draft will be removed from this device when you sign out. Download it before continuing if you want to keep it.",
        action: signOut,
      });
    else void signOut();
  };
  const importBrowser = () => {
    const local = browserBackup();
    if (!local) {
      setToast(
        "No readable browser data was found. You can restore a JSON backup instead.",
      );
      return;
    }
    setModal({
      type: "confirm",
      title: "Import this browser’s records?",
      text: `${local.tasks.length} tasks, ${local.transactions.length} transactions, and ${local.goals.length} goals will be merged into ${session?.user.email}. Existing records with matching IDs and your cloud settings will be kept.${local.demo ? " This browser includes demo data." : ""}`,
      action: async () => {
        if (
          await update(
            (current) => mergeBrowserData(current, local),
            "Browser records imported.",
          )
        )
          close();
      },
    });
  };
  async function restore(file: File) {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("too big");
      const parsed = parseAppData(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      setModal({
        type: "confirm",
        title: "Restore this backup?",
        text: `This backup will replace your current records. Tasks: ${parsed.tasks.length}. Transactions: ${parsed.transactions.length}. Goals: ${parsed.goals.length}.`,
        action: async () => {
          if (await update(() => parsed, "Backup restored.")) close();
        },
      });
    } catch {
      setToast("Invalid backup. Choose a valid Buzz JSON backup (up to 2 MB).");
    }
  }

  const sectionHeading = (
    title: string,
    subtitle: string,
    action?: ReactNode,
  ) => (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
  const monthPicker = (
    <div className="month-picker">
      <button
        className="icon-button"
        onClick={() => selectMonth(shiftMonth(month, -1))}
        disabled={month === "1900-01"}
        aria-label="Previous month"
      >
        <ChevronLeft size={15} />
      </button>
      <CalendarDays size={15} aria-hidden="true" />
      <select
        aria-label="Choose report month"
        value={month}
        onChange={(e) => selectMonth(e.target.value)}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const value = `${month.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
          return (
            <option key={value} value={value}>
              {monthLabel(value).replace(` ${month.slice(0, 4)}`, "")}
            </option>
          );
        })}
      </select>
      <select
        aria-label="Choose report year"
        value={month.slice(0, 4)}
        onChange={(e) => selectMonth(`${e.target.value}-${month.slice(5)}`)}
      >
        {reportYears.map((year) => (
          <option key={year}>{year}</option>
        ))}
      </select>
      <button
        className="icon-button"
        onClick={() => selectMonth(shiftMonth(month, 1))}
        disabled={month === "9999-12"}
        aria-label="Next month"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
  const addButton = (type: "task" | "transaction" | "goal", label: string) => (
    <button className="button primary" onClick={() => setModal({ type })}>
      <Plus size={17} />
      {label}
    </button>
  );

  function transactionTable(items: Transaction[], compact = false) {
    if (!items.length)
      return (
        <EmptyState
          title={query ? "No matching transactions" : "No transactions yet"}
          text={
            query
              ? "Try a different search term."
              : "Add your first income or expense."
          }
          action={query ? undefined : () => setModal({ type: "transaction" })}
        />
      );
    return (
      <div className="table-scroll">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Transactions</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, compact ? 4 : undefined).map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="transaction-name">
                    <CategoryIcon category={t.category} />
                    <div>
                      <strong>{t.name}</strong>
                      <span>
                        {t.type === "income"
                          ? "Income"
                          : t.type === "savings"
                            ? `Savings · ${data.goals.find((g) => g.id === t.goalId)?.name ?? "Goal"}`
                            : "Expenses"}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-tag">{t.category}</span>
                </td>
                <td className="date-cell">
                  {dateLabel(t.date)}
                  {query || compact ? ` ${t.date.slice(0, 4)}` : ""}
                </td>
                <td className={`amount ${t.type}`}>
                  {t.type === "income" ? "+" : "−"}
                  {money(t.amount)}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Edit transaction ${t.name}`}
                    onClick={() => setModal({ type: "transaction", item: t })}
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  function cashflowCard() {
    return (
      <section className="card cashflow-card">
        {sectionHeading(
          "Cash flow",
          monthLabel(month),
          <div className="chart-legend">
            <span>
              <i className="income-dot" />
              Income
            </span>
            <span>
              <i className="expense-dot" />
              Expenses
            </span>
          </div>,
        )}
        <CashChart
          transactions={data.transactions}
          month={month}
          animate={motion.enabled}
        />
        <div className="chart-footer">
          <span>Weekly overview</span>
          {view === "finance" ? (
            <a className="text-button" href="#monthly-history">
              Monthly history <ArrowUpRight size={14} />
            </a>
          ) : (
            <button className="text-button" onClick={() => navigate("finance")}>
              View finances <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </section>
    );
  }
  function categoriesCard() {
    let stop = 0;
    const gradient = categoryTotals
      .map((c) => {
        const start = stop;
        stop += (c.amount / summary.expense) * 100;
        return `${categoryColors[c.category]} ${start}% ${stop}%`;
      })
      .join(", ");
    return (
      <section className="card category-card">
        {sectionHeading("Where does it go?", "Your spending by category")}
        <div className="category-chart">
          <div
            className="donut"
            style={{
              background: gradient ? `conic-gradient(${gradient})` : "#e5e9ed",
            }}
            role="img"
            aria-label={`Total expenses ${money(summary.expense)}`}
          >
            <div>
              <span>Total expenses</span>
              <strong>{shortMoney(summary.expense)}</strong>
              <small>IDR</small>
            </div>
          </div>
        </div>
        <div className="category-legend">
          {categoryTotals.slice(0, 4).map((c) => (
            <div key={c.category}>
              <span>
                <i style={{ background: categoryColors[c.category] }} />
                {c.category}
              </span>
              <strong>{Math.round((c.amount / summary.expense) * 100)}%</strong>
            </div>
          ))}
          {categoryTotals.length > 4 && (
            <div>
              <span>
                <i style={{ background: "#a1a1aa" }} />
                Other categories
              </span>
              <strong>
                {Math.round(
                  (categoryTotals.slice(4).reduce((s, c) => s + c.amount, 0) /
                    summary.expense) *
                    100,
                )}
                %
              </strong>
            </div>
          )}
          {!categoryTotals.length && (
            <p className="muted">No expenses this month.</p>
          )}
        </div>
      </section>
    );
  }
  function statCards() {
    return (
      <div className="stats-grid">
        <section className="stat-card balance-card">
          <div className="stat-top">
            <span>Money left this month</span>
            <span className="stat-icon">
              <Wallet size={18} />
            </span>
          </div>
          <strong className="stat-value">{money(summary.balance)}</strong>
          <div className="stat-foot">
            <span className="light-pill">
              <ArrowUpRight size={12} />
              {summary.income > 0
                ? Math.round((summary.balance / summary.income) * 100)
                : 0}
              %
            </span>
            <span>of this month’s income</span>
          </div>
          <div className="balance-decoration" />
        </section>
        <section className="stat-card">
          <div className="stat-top">
            <span>Income</span>
            <span className="stat-icon sage">
              <ArrowDownLeft size={18} />
            </span>
          </div>
          <strong className="stat-value">{money(summary.income)}</strong>
          <div className="stat-foot">
            <span className="tiny-dot green" />
            {summary.selected.filter((t) => t.type === "income").length}{" "}
            transactions this month
          </div>
        </section>
        <section className="stat-card">
          <div className="stat-top">
            <span>Expenses</span>
            <span className="stat-icon peach">
              <ArrowUpRight size={18} />
            </span>
          </div>
          <strong className="stat-value">{money(summary.expense)}</strong>
          <div className="stat-foot">
            {delta !== null ? (
              <>
                <span className={`delta ${delta > 0 ? "up" : ""}`}>
                  {delta > 0 ? "↑" : "↓"}{" "}
                  {Math.abs(delta).toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>
                <span>vs. last month</span>
              </>
            ) : (
              <span>No previous month to compare</span>
            )}
          </div>
        </section>
        {view === "finance" ? (
          <section className="stat-card">
            <div className="stat-top">
              <span>Recorded transactions</span>
              <span className="stat-icon lavender">
                <ListTodo size={18} />
              </span>
            </div>
            <strong className="stat-value">{summary.selected.length}</strong>
            <div className="stat-foot">{monthLabel(month)}</div>
          </section>
        ) : (
          <section className="stat-card">
            <div className="stat-top">
              <span>Tasks completed</span>
              <span className="stat-icon lavender">
                <CheckCheck size={18} />
              </span>
            </div>
            <strong className="stat-value">
              {data.tasks.filter((t) => t.done).length}
              <small> / {data.tasks.length} tasks</small>
            </strong>
            <div className="stat-foot progress-stat">
              <div className="progress-track">
                <span style={{ width: `${completion}%` }} />
              </div>
              <span>{completion}%</span>
            </div>
          </section>
        )}
      </div>
    );
  }

  function goalCard(goal: Goal) {
    const saved = goalBalance(goal, data.transactions);
    const percent = Math.min(100, Math.round((saved / goal.target) * 100));
    return (
      <article className={`goal-card ${goal.color}`} key={goal.id}>
        <div className="goal-cover">
          <GoalArtwork
            cover={coverFor(goal)}
            photo={goal.photo}
            alt={`${goal.name} cover photo`}
          />
          <span className="goal-cover-badge">
            {saved >= goal.target ? "Goal reached" : "Your next chapter"}
          </span>
        </div>
        <div className="goal-top">
          <span className="goal-icon">
            <Sprout size={22} />
          </span>
          <button
            className="icon-button"
            aria-label={`Edit goal ${goal.name}`}
            onClick={() => setModal({ type: "goal", item: goal })}
          >
            <Pencil size={15} />
          </button>
        </div>
        <h3>{goal.name}</h3>
        <p>
          {saved >= goal.target
            ? "Goal reached. You did it!"
            : "A little closer with every step."}
        </p>
        <div className="goal-amount">
          <strong>{money(saved)}</strong>
          <span>{percent}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`${goal.name} progress`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="goal-bottom">
          <span>of {money(goal.target)}</span>
          <button
            className="text-button"
            disabled={saved >= 1e12}
            onClick={() => setModal({ type: "contribution", item: goal })}
          >
            <Plus size={14} /> Save
          </button>
        </div>
      </article>
    );
  }

  if (session && !workspace.ready)
    return (
      <main className="cloud-loading">
        <Cloud size={32} />
        <h1>
          {workspace.loading
            ? "Opening your cloud workspace…"
            : "Your workspace needs attention."}
        </h1>
        {error && <p role="alert">{error}</p>}
        {accountError && <p role="alert">{accountError}</p>}
        <p>{session.user.email}</p>
        <div className="cloud-loading-actions">
          <button
            className="button primary"
            disabled={workspace.loading}
            onClick={() => void workspace.refresh()}
          >
            Try again
          </button>
          <button
            className="button secondary"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </main>
    );
  return (
    <div
      className="app-shell"
      data-motion={motion.enabled ? "on" : "off"}
      aria-busy={busy}
    >
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <Sidebar
        navigation={navigation}
        activeView={query ? null : view}
        name={data.name}
        profile={data.profile}
        pending={pending.length}
        total={data.tasks.length}
        done={data.tasks.length - pending.length}
        open={mobileMenu}
        onNavigate={navigate}
        onAddTask={() => setModal({ type: "task" })}
        onSettings={() => setModal({ type: "settings" })}
        onHelp={() => setModal({ type: "help" })}
        onClose={() => setMobileMenu(false)}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              aria-expanded={mobileMenu}
              aria-controls="main-sidebar"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="header-workspace-mark">
              <img src="/favicon.svg" width="30" height="30" alt="" />
            </span>
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>
              {query ? "Search" : navigation.find((n) => n.id === view)?.label}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="header-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              className="icon-button motion-toggle"
              aria-label={
                motion.reduced
                  ? "Animations follow your device settings"
                  : motion.enabled
                    ? "Pause animations"
                    : "Enable animations"
              }
              title={
                motion.reduced
                  ? "Animations are disabled by your device settings"
                  : motion.enabled
                    ? "Pause animations"
                    : "Enable animations"
              }
              disabled={motion.reduced}
              onClick={motion.toggle}
            >
              {motion.enabled ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="Search tasks or transactions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything..."
              />
              {search ? (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd>Ctrl K</kbd>
              )}
            </div>
            <button
              className="notification-button icon-button"
              aria-label="View task reminders"
              onClick={() => setModal({ type: "notifications" })}
            >
              <Bell size={19} />
              {pending.some((t) => t.due <= today()) && <i />}
            </button>
            <button
              className={`header-profile avatar-${data.profile.avatar}`}
              aria-label="Open profile"
              onClick={() => setModal({ type: "settings" })}
            >
              <span className="avatar small">
                <ProfileAvatar profile={data.profile} name={data.name} />
              </span>
              <span className="header-profile-copy">
                <strong>{data.name}</strong>
                <small>{data.profile.occupation || "My personal space"}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          </div>
        </header>
        <main id="main-content">
          {session ? (
            <div className="cloud-bar">
              <Cloud size={19} />
              <div>
                <strong>
                  {busy
                    ? "Saving to cloud…"
                    : error
                      ? "Sync needs attention"
                      : workspace.loading
                        ? "Checking for updates…"
                        : "Cloud connected"}
                </strong>
                <span>
                  {session.user.email}
                  {workspace.lastSynced &&
                    ` · Checked ${new Date(workspace.lastSynced).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </div>
              <button
                className="text-button"
                disabled={busy || workspace.loading}
                onClick={reloadCloud}
              >
                <RefreshCw size={15} />
                Refresh
              </button>
              <button
                className="text-button"
                disabled={busy || signingOut}
                onClick={requestSignOut}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          ) : (
            onSignIn && (
              <div className="cloud-bar">
                <Cloud size={19} />
                <div>
                  <strong>On this device</strong>
                  <span>
                    Sign in to access your records from other devices.
                  </span>
                </div>
                <button className="button secondary" onClick={onSignIn}>
                  Sign in to sync
                </button>
              </div>
            )
          )}
          {(error || accountError) && (
            <div className="storage-warning cloud-warning" role="alert">
              <CircleAlert size={19} />
              <span>{error || accountError}</span>
              {workspace.failedDraft && (
                <button className="text-button" onClick={backupDraft}>
                  Download draft
                </button>
              )}
              {session && (
                <button
                  className="text-button"
                  disabled={busy || workspace.loading}
                  onClick={reloadCloud}
                >
                  Reload latest
                </button>
              )}
            </div>
          )}
          {warning && (
            <div className="storage-warning" role="alert">
              <CircleAlert size={19} />
              <span>{warning}</span>
              <button className="text-button" onClick={backup}>
                Download backup
              </button>
            </div>
          )}
          <div
            className={`page-heading ${view === "overview" && !query ? "overview-heading" : ""}`}
          >
            <div>
              <div className="eyebrow">
                <span className="tiny-dot green" />
                {query
                  ? "FIND YOUR NOTES"
                  : view === "overview"
                    ? "A LITTLE MORE INTENTIONAL, EVERY DAY"
                    : view === "tasks"
                      ? "ONE STEP AT A TIME"
                      : view === "finance"
                        ? "MORE AWARE. BETTER PREPARED."
                        : "BIG DREAMS START HERE"}
              </div>
              <h1>
                {query ? (
                  "Search results"
                ) : view === "overview" ? (
                  <>
                    Hey, {data.name} <span className="greeting-spark">✳</span>
                  </>
                ) : view === "tasks" ? (
                  "Make room for focus."
                ) : view === "finance" ? (
                  "Your money. Your pace."
                ) : (
                  "A little closer, every day."
                )}
              </h1>
              <p>
                {query
                  ? `Entries matching “${search.trim()}”.`
                  : view === "overview"
                    ? "Let’s make today a little lighter and more meaningful."
                    : view === "tasks"
                      ? "Write it down. Take it one task at a time."
                      : view === "finance"
                        ? "Track today. Plan for tomorrow."
                        : "Every little saving brings your dreams closer."}
              </p>
              {!query && <RotatingCopy enabled={motion.enabled} />}
            </div>
            <div className="heading-actions">
              {!query && view === "finance" && monthPicker}
              {!query &&
                addButton(
                  view === "tasks"
                    ? "task"
                    : view === "goals"
                      ? "goal"
                      : "transaction",
                  view === "tasks"
                    ? "Add task"
                    : view === "goals"
                      ? "Create goal"
                      : "Add transaction",
                )}
            </div>
          </div>
          {data.demo && (
            <div className="demo-banner">
              <span>
                <span className="demo-label">DEMO DATA</span>Take a look around,
                then make it yours.
              </span>
              <button onClick={() => setModal({ type: "settings" })}>
                Start fresh <ArrowRight size={13} />
              </button>
            </div>
          )}

          {query ? (
            <div className="search-results">
              <section className="card">
                {sectionHeading(
                  "Tasks",
                  `${data.tasks.filter((t) => `${t.title} ${t.category}`.toLocaleLowerCase("en").includes(query)).length} results found`,
                )}
                {data.tasks
                  .filter((t) =>
                    `${t.title} ${t.category}`
                      .toLocaleLowerCase("en")
                      .includes(query),
                  )
                  .map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      toggle={() => toggleTask(t)}
                      edit={() => setModal({ type: "task", item: t })}
                    />
                  ))}
                {!data.tasks.some((t) =>
                  `${t.title} ${t.category}`
                    .toLocaleLowerCase("en")
                    .includes(query),
                ) && (
                  <EmptyState
                    title="No matching tasks"
                    text="Try a different search term."
                  />
                )}
              </section>
              <section className="card">
                {sectionHeading(
                  "Transactions",
                  `${allMatches.length} results across all months`,
                )}
                {transactionTable(allMatches)}
              </section>
            </div>
          ) : view === "overview" ? (
            <>
              <LifetimeCards data={data} onGoals={() => navigate("goals")} />
              <section className="welcome-banner">
                <div>
                  <span className="banner-eyebrow">
                    <Sprout size={15} /> GROW AT YOUR OWN PACE
                  </span>
                  <h2>
                    Small plans today.
                    <br />
                    <span>A little more ease tomorrow.</span>
                  </h2>
                  <p>
                    Plan your day, track your money, and celebrate progress.
                    <br />
                    There’s room for it all here.
                  </p>
                  <button
                    className="banner-button"
                    onClick={() => navigate("tasks")}
                  >
                    See today’s plans <ArrowRight size={16} />
                  </button>
                </div>
                <MascotIllustration />
                <div className="daily-progress">
                  <span className="progress-spark">✧</span>
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#0891b2 ${todayProgress}%, #dce7ec 0)`,
                    }}
                  >
                    <div>
                      {todayProgress}
                      <small>%</small>
                    </div>
                  </div>
                  <strong>Today’s progress</strong>
                  <span>
                    {todayDone} of {todayTasks.length} due tasks completed
                  </span>
                </div>
              </section>
              <GoalCarousel
                goals={data.goals}
                renderGoal={goalCard}
                create={() => setModal({ type: "goal" })}
              />
              <div className="overview-month-heading">
                <div>
                  <span className="eyebrow">A CLOSER LOOK</span>
                  <h2>Monthly activity</h2>
                </div>
                {monthPicker}
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-main">
                  {cashflowCard()}
                  <section className="card transactions-card">
                    {sectionHeading(
                      "Recent transactions",
                      "Your latest entries across all months.",
                      <button
                        className="text-button"
                        onClick={() => navigate("finance")}
                      >
                        View all <ArrowRight size={14} />
                      </button>,
                    )}
                    {transactionTable(lifetime.selected, true)}
                  </section>
                </div>
                <div className="dashboard-side">
                  <section className="card tasks-card">
                    {sectionHeading(
                      "Today’s focus",
                      `${pending.filter((t) => t.due <= today()).length} tasks waiting for you`,
                      <button
                        className="icon-button outlined"
                        aria-label="Add task"
                        onClick={() => setModal({ type: "task" })}
                      >
                        <Plus size={17} />
                      </button>,
                    )}
                    <div className="dashboard-tasks">
                      {[...todayTasks]
                        .sort(
                          (a, b) =>
                            Number(a.done) - Number(b.done) ||
                            a.due.localeCompare(b.due),
                        )
                        .slice(0, 4)
                        .map((t) => (
                          <TaskItem
                            key={t.id}
                            task={t}
                            toggle={() => toggleTask(t)}
                            edit={() => setModal({ type: "task", item: t })}
                          />
                        ))}
                      {!todayTasks.length && (
                        <EmptyState
                          title="A little breathing room"
                          text="Add one small thing you’d like to do."
                          action={() => setModal({ type: "task" })}
                        />
                      )}
                    </div>
                    <button
                      className="all-tasks-button"
                      onClick={() => navigate("tasks")}
                    >
                      View all tasks
                      <ArrowRight size={14} />
                    </button>
                  </section>
                  {categoriesCard()}
                </div>
              </div>
              <section className="budget-strip">
                <span
                  className={`budget-icon ${budgetPercent > 100 ? "over-budget" : ""}`}
                >
                  <ShieldCheck size={21} />
                </span>
                <div>
                  <strong>
                    {!data.budget
                      ? "Give your spending a plan."
                      : budgetPercent > 100
                        ? "Time to check your budget."
                        : "Your spending is on track."}
                  </strong>
                  <span>
                    {!data.budget
                      ? "Set your monthly budget in Settings."
                      : `${money(summary.expense)} of your ${money(data.budget)} budget used.`}
                  </span>
                </div>
                <div className="budget-progress">
                  <div>
                    <span>Monthly budget</span>
                    <strong>{budgetPercent}%</strong>
                  </div>
                  <div className="progress-track">
                    <span
                      className={budgetPercent > 100 ? "over-budget" : ""}
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  className="icon-button"
                  aria-label="Edit budget"
                  onClick={() => setModal({ type: "settings" })}
                >
                  <ArrowUpRight size={20} />
                </button>
              </section>
            </>
          ) : view === "tasks" ? (
            <>
              <div className="task-summary">
                <div>
                  <span className="summary-icon sage">
                    <ListTodo size={22} />
                  </span>
                  <span>
                    <strong>{data.tasks.length}</strong>Total tasks
                  </span>
                </div>
                <div>
                  <span className="summary-icon peach">
                    <Circle size={22} />
                  </span>
                  <span>
                    <strong>{pending.length}</strong>In progress
                  </span>
                </div>
                <div>
                  <span className="summary-icon lavender">
                    <CheckCheck size={22} />
                  </span>
                  <span>
                    <strong>{data.tasks.length - pending.length}</strong>
                    Completed
                  </span>
                </div>
                <div className="completion-summary">
                  <strong>{completion}%</strong>
                  <span>Small steps are still progress.</span>
                  <div className="progress-track">
                    <span style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>
              <div className="view-toolbar">
                <div className="tabs" aria-label="Filter tasks">
                  {["All", "Active", "Today", "Completed"].map((filter) => (
                    <button
                      key={filter}
                      className={taskFilter === filter ? "active" : ""}
                      onClick={() => setTaskFilter(filter)}
                      aria-pressed={taskFilter === filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="layout-toggle">
                  <button
                    aria-label="List view"
                    aria-pressed={taskLayout === "list"}
                    className={taskLayout === "list" ? "active" : ""}
                    onClick={() => setTaskLayout("list")}
                  >
                    <PanelTop size={17} />
                  </button>
                  <button
                    aria-label="Board view"
                    aria-pressed={taskLayout === "board"}
                    className={taskLayout === "board" ? "active" : ""}
                    onClick={() => setTaskLayout("board")}
                  >
                    <Columns3 size={17} />
                  </button>
                </div>
              </div>
              {!filteredTasks.length ? (
                <section className="card">
                  <EmptyState
                    title="Room for a new plan"
                    text="No tasks in this view. Start with one small step."
                    action={() => setModal({ type: "task" })}
                  />
                </section>
              ) : taskLayout === "list" ? (
                <section className="card full-task-list">
                  {filteredTasks.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      toggle={() => toggleTask(t)}
                      edit={() => setModal({ type: "task", item: t })}
                    />
                  ))}
                </section>
              ) : (
                <div className="task-board">
                  {["High", "Medium", "Low"].map((priority) => (
                    <section className="board-column" key={priority}>
                      <h2>
                        <span className={`priority ${priority.toLowerCase()}`}>
                          {priority}
                        </span>
                        <small>
                          {
                            filteredTasks.filter((t) => t.priority === priority)
                              .length
                          }
                        </small>
                      </h2>
                      {filteredTasks
                        .filter((t) => t.priority === priority)
                        .map((t) => (
                          <TaskItem
                            key={t.id}
                            task={t}
                            toggle={() => toggleTask(t)}
                            edit={() => setModal({ type: "task", item: t })}
                          />
                        ))}
                      {!filteredTasks.some((t) => t.priority === priority) && (
                        <p className="board-empty">No tasks yet.</p>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : view === "finance" ? (
            <>
              <div className="finance-period">
                <div>
                  <span className="period-eyebrow">MONTHLY REPORT</span>
                  <strong>{monthLabel(month)}</strong>
                  <span>
                    Income, expenses, and savings transfers for this month.
                  </span>
                </div>
                <div className="period-actions">
                  {month !== currentMonth() && (
                    <button
                      className="button secondary"
                      onClick={() => selectMonth(currentMonth())}
                    >
                      This month
                    </button>
                  )}
                  <a className="text-button" href="#monthly-history">
                    Browse monthly history <ArrowDownLeft size={16} />
                  </a>
                </div>
              </div>
              {statCards()}
              <div className="finance-charts">
                {cashflowCard()}
                {categoriesCard()}
              </div>
              <section
                className="card finance-transactions"
                id="monthly-transactions"
                aria-labelledby="transactions-title"
              >
                <div className="section-heading">
                  <div>
                    <h2
                      id="transactions-title"
                      ref={ledgerHeadingRef}
                      tabIndex={-1}
                    >
                      Transactions · {monthLabel(month)}
                    </h2>
                    <p>Every entry for the selected month, newest first.</p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={exportCSV}
                    disabled={!filteredTransactions.length}
                  >
                    <Download size={15} /> Export CSV
                  </button>
                </div>
                <div className="transaction-filters">
                  <SlidersHorizontal size={16} />
                  <select
                    aria-label="Filter transaction type"
                    value={transactionFilter}
                    onChange={(e) => {
                      setTransactionFilter(e.target.value);
                      setCategoryFilter("All categories");
                    }}
                  >
                    {["All transactions", "Expenses", "Income", "Savings"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                  <select
                    aria-label="Filter category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {["All categories", ...filterCategories].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  {hasTransactionFilters && (
                    <button
                      className="text-button clear-filters"
                      onClick={clearTransactionFilters}
                    >
                      <X size={14} />
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="filtered-summary" role="status">
                  <span>
                    Showing <strong>{filteredTransactions.length}</strong> of{" "}
                    {summary.selected.length} transactions
                  </span>
                  <span>
                    Income <strong>{money(filteredIncome)}</strong>
                  </span>
                  <span>
                    Expenses <strong>{money(filteredExpense)}</strong>
                  </span>
                  <span>
                    Savings{" "}
                    <strong>
                      {money(
                        filteredTransactions
                          .filter((t) => t.type === "savings")
                          .reduce((sum, t) => sum + t.amount, 0),
                      )}
                    </strong>
                  </span>
                </div>
                {!filteredTransactions.length ? (
                  <EmptyState
                    title={
                      hasTransactionFilters && summary.selected.length
                        ? "No transactions match these filters"
                        : `No transactions in ${monthLabel(month)}`
                    }
                    text={
                      hasTransactionFilters && summary.selected.length
                        ? "Clear the filters to see every entry for this month."
                        : "Choose another month or add an income or expense."
                    }
                    action={
                      hasTransactionFilters && summary.selected.length
                        ? clearTransactionFilters
                        : () => setModal({ type: "transaction" })
                    }
                    actionLabel={
                      hasTransactionFilters && summary.selected.length
                        ? "Clear filters"
                        : "Add transaction"
                    }
                  />
                ) : (
                  transactionTable(filteredTransactions)
                )}
              </section>
              <MonthlyHistory
                transactions={data.transactions}
                month={month}
                years={reportYears}
                onYearChange={(year) =>
                  selectMonth(`${year}-${month.slice(5)}`)
                }
                onOpenMonth={(next) => {
                  selectMonth(next);
                  ledgerHeadingRef.current?.focus({ preventScroll: true });
                  ledgerHeadingRef.current?.scrollIntoView({
                    block: "start",
                    behavior: motion.enabled ? "smooth" : "instant",
                  });
                }}
              />
            </>
          ) : (
            <>
              <div className="goals-intro">
                <div className="goals-intro-icon">
                  <Sprout size={34} />
                </div>
                <div>
                  <span>Your recorded savings</span>
                  <strong>{money(lifetime.saved)}</strong>
                  <p>
                    {
                      data.goals.filter(
                        (g) => goalBalance(g, data.transactions) >= g.target,
                      ).length
                    }{" "}
                    of {data.goals.length} goals reached. Keep growing!
                  </p>
                </div>
                <span className="goal-intro-flower">✳</span>
              </div>
              <GoalCarousel
                goals={data.goals}
                renderGoal={goalCard}
                create={() => setModal({ type: "goal" })}
              />
              <p className="goals-note">
                <CircleHelp size={15} />
                Savings transfers automatically update these goals and your
                available balance. Opening savings are included in your goal
                totals.
              </p>
            </>
          )}
          <footer className="footer">
            <span>A little Buzz. A little more balance.</span>
            <span>
              <span className={`tiny-dot ${warning ? "orange" : "green"}`} />
              {warning || error
                ? "Storage needs attention"
                : session
                  ? busy
                    ? "Saving to cloud…"
                    : "Saved to your account"
                  : "Saved in this browser"}
              <span className="footer-separator">·</span>Made with intention{" "}
              <Leaf size={12} />
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          key={modal.type}
          title={
            modal.type === "task"
              ? modal.item
                ? "Edit task"
                : "One new plan."
              : modal.type === "transaction"
                ? modal.item
                  ? "Edit transaction"
                  : "Give your money a story."
                : modal.type === "goal"
                  ? modal.item
                    ? "Edit savings goal"
                    : "Make room for a dream."
                  : modal.type === "contribution"
                    ? `Save toward ${modal.item.name}`
                    : modal.type === "settings"
                      ? "Make Buzz your own."
                      : modal.type === "help"
                        ? "Welcome to Buzz."
                        : modal.type === "notifications"
                          ? "A little reminder for you."
                          : modal.title
          }
          subtitle={
            modal.type === "task"
              ? "A small step today can make a difference."
              : modal.type === "transaction"
                ? "One entry toward a clearer picture."
                : undefined
          }
          close={close}
        >
          {error && (
            <div className="dialog-sync-error" role="alert">
              <p>{error}</p>
              {workspace.failedDraft && (
                <button className="text-button" onClick={backupDraft}>
                  Download draft
                </button>
              )}
              {conflict && (
                <button className="text-button" onClick={reloadCloud}>
                  Reload latest
                </button>
              )}
            </div>
          )}
          {busy && (
            <p className="dialog-saving" role="status">
              Saving to your account…
            </p>
          )}
          <fieldset className="dialog-fields" disabled={busy || signingOut}>
            {modal.type === "task" && (
              <TaskForm
                initial={modal.item}
                save={saveTask}
                cancel={close}
                remove={
                  modal.item ? () => remove("tasks", modal.item!.id) : undefined
                }
              />
            )}
            {modal.type === "transaction" && (
              <TransactionForm
                initial={modal.item}
                goals={data.goals}
                defaultDate={
                  view === "finance" ? transactionDateForMonth(month) : today()
                }
                save={saveTransaction}
                cancel={close}
                remove={
                  modal.item
                    ? () => remove("transactions", modal.item!.id)
                    : undefined
                }
              />
            )}
            {modal.type === "goal" && (
              <GoalForm
                initial={modal.item}
                transferred={
                  modal.item
                    ? goalBalance(modal.item, data.transactions) -
                      modal.item.saved
                    : 0
                }
                save={saveGoal}
                cancel={close}
                remove={
                  modal.item ? () => remove("goals", modal.item!.id) : undefined
                }
              />
            )}
            {modal.type === "contribution" && (
              <ContributionForm
                goal={{
                  ...modal.item,
                  saved: goalBalance(modal.item, data.transactions),
                }}
                cancel={close}
                save={async (amount) => {
                  const id = modal.item.id;
                  const saved = await update(
                    (d) => ({
                      ...d,
                      transactions: [
                        {
                          id: uid(),
                          name: `Savings for ${modal.item.name}`,
                          amount,
                          type: "savings",
                          category: "Savings",
                          date: today(),
                          goalId: id,
                        },
                        ...d.transactions,
                      ],
                    }),
                    "Savings added. Your goal is getting closer!",
                  );
                  if (saved) close();
                }}
              />
            )}
            {modal.type === "settings" && (
              <SettingsForm
                data={data}
                email={session?.user.email}
                joined={session?.user.created_at}
                cloud={Boolean(session)}
                importBrowser={session ? importBrowser : undefined}
                cancel={close}
                save={async (name, budget, profile) => {
                  if (
                    await update(
                      (d) => ({ ...d, name, budget, profile }),
                      "Settings saved.",
                    )
                  )
                    close();
                }}
                backup={backup}
                restore={restore}
                reset={() =>
                  setModal({
                    type: "confirm",
                    title: "Ready for a fresh start?",
                    text: "All tasks, transactions, and goals will be deleted. Download a backup in Settings first if you need to keep them.",
                    action: async () => {
                      const saved = await update(
                        () => ({
                          ...emptyData(data.name),
                          profile: data.profile,
                        }),
                        "Your workspace is ready for a fresh start.",
                      );
                      if (saved) {
                        setMonth(currentMonth());
                        close();
                      }
                    },
                  })
                }
                demo={() =>
                  setModal({
                    type: "confirm",
                    title: "Load demo data?",
                    text: "Your current data will be replaced with demo data. Download a backup first if you need to keep it.",
                    action: async () => {
                      if (
                        await update(
                          () => makeDemo(),
                          "Demo data is ready to explore.",
                        )
                      ) {
                        setMonth(currentMonth());
                        close();
                      }
                    },
                  })
                }
              />
            )}
            {modal.type === "confirm" && (
              <div className="confirm-content">
                <p>{modal.text}</p>
                <div className="form-actions">
                  <button className="button secondary" onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="button danger-button"
                    onClick={modal.action}
                  >
                    Yes, continue
                  </button>
                </div>
              </div>
            )}
            {modal.type === "help" && (
              <div className="help-content">
                <p>
                  A simple place to organize your day and understand your money.
                </p>
                <div>
                  <ListTodo />
                  <span>
                    <strong>Plan your day</strong>Add tasks, set priorities, and
                    check them off. Click a task title to edit it.
                  </span>
                </div>
                <div>
                  <Wallet />
                  <span>
                    <strong>Track each step</strong>Record income and expenses.
                    Choose a month to see your charts and export transactions to
                    CSV.
                  </span>
                </div>
                <div>
                  <Sprout />
                  <span>
                    <strong>Bring your dreams closer</strong>Create savings
                    goals and record your progress with the Save button.
                  </span>
                </div>
                <div>
                  <Download />
                  <span>
                    <strong>Keep your records safe</strong>
                    {session
                      ? "Your records are saved to your account. Other devices check for updates when you return and every 30 seconds. Use Refresh to check now."
                      : "Your data stays in this browser. Sign in to sync across devices when cloud storage is configured."}{" "}
                    Download and restore JSON backups in Settings.
                  </span>
                </div>
                <button className="button primary" onClick={close}>
                  Let’s get started <ArrowRight size={16} />
                </button>
              </div>
            )}
            {modal.type === "notifications" && (
              <div className="reminders">
                {pending.filter((t) => t.due <= today()).length ? (
                  pending
                    .filter((t) => t.due <= today())
                    .map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        toggle={() => toggleTask(t)}
                        edit={() => setModal({ type: "task", item: t })}
                      />
                    ))
                ) : (
                  <div className="empty-state">
                    <PartyPopper size={32} />
                    <h3>All caught up!</h3>
                    <p>No tasks are due today.</p>
                  </div>
                )}
                <p className="form-hint">
                  Reminders appear here while the app is open.
                </p>
              </div>
            )}
          </fieldset>
        </Dialog>
      )}
    </div>
  );
}
