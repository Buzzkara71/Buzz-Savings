import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  ArrowUpRight,
  Coffee,
  ShoppingBag,
  CarFront,
  Zap,
  Music2,
  Wallet,
  BriefcaseBusiness,
  Ellipsis,
  Plus,
  Pencil,
  CalendarDays,
  Check,
  Sprout,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  categoryColors,
  chartData,
  dateLabel,
  money,
  shortMoney,
  today,
  type Category,
  type Task,
  type Transaction,
} from "./domain";

export function Dialog({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: Category;
  size?: number;
}) {
  const Icon = {
    "Food & drinks": Coffee,
    Shopping: ShoppingBag,
    Transport: CarFront,
    Bills: Zap,
    Entertainment: Music2,
    Other: Ellipsis,
    Salary: Wallet,
    Freelance: BriefcaseBusiness,
    Savings: Sprout,
  }[category];
  return (
    <span
      className="category-icon"
      style={{
        color: categoryColors[category],
        background: `${categoryColors[category]}20`,
      }}
    >
      <Icon size={size} />
    </span>
  );
}

export function MascotIllustration() {
  return (
    <figure className="mascot-art">
      <span className="mascot-spark mascot-spark-one" aria-hidden="true">
        ✧
      </span>
      <div className="mascot-portrait">
        <img
          src="/images/buzz-mascot.png"
          alt="A cyan-haired chibi character hugging a green plush toy"
          width="640"
          height="640"
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <figcaption>
        <span className="tiny-dot green" />
        Your focus buddy
      </figcaption>
      <span className="mascot-spark mascot-spark-two" aria-hidden="true">
        ✦
      </span>
    </figure>
  );
}

export function CashChart({
  transactions,
  month,
  animate = true,
}: {
  transactions: Transaction[];
  month: string;
  animate?: boolean;
}) {
  const rows = chartData(transactions, month);
  if (!transactions.some((t) => t.date.startsWith(month)))
    return (
      <EmptyState
        title="Your chart starts here"
        text="Add your first transaction to see this month’s cash flow."
      />
    );
  return (
    <div
      className="cash-chart"
      role="img"
      aria-label={`Weekly income and expense chart. ${rows.map((r) => `${r.label}: income ${money(r.Income)}, expenses ${money(r.Expenses)}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={rows}
          margin={{ top: 12, right: 10, left: -17, bottom: 0 }}
        >
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity={0.13} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 5"
            vertical={false}
            stroke="#e5e9ed"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#75808c", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={shortMoney}
            tick={{ fill: "#75808c", fontSize: 10 }}
            width={65}
          />
          <Tooltip
            formatter={(v) => money(Number(v))}
            labelFormatter={(label) => `Date ${label}`}
            contentStyle={{
              border: "1px solid #e2e8ed",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="Income"
            stroke="#0891b2"
            strokeWidth={2.5}
            fill="url(#incomeFill)"
            isAnimationActive={animate}
            animationDuration={700}
          />
          <Area
            type="monotone"
            dataKey="Expenses"
            stroke="#64748b"
            strokeWidth={2.5}
            fill="url(#expenseFill)"
            strokeDasharray="5 3"
            isAnimationActive={animate}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TaskItem({
  task,
  toggle,
  edit,
}: {
  task: Task;
  toggle: () => void;
  edit: () => void;
}) {
  const late = !task.done && task.due < today();
  return (
    <div className={`task-item ${task.done ? "is-done" : ""}`}>
      <button
        className="task-checkbox"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Mark ${task.title} ${task.done ? "incomplete" : "complete"}`}
        onClick={toggle}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
      </button>
      <button className="task-content" onClick={edit}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span>{task.category}</span>
          <span className={late ? "overdue" : ""}>
            <CalendarDays size={11} />{" "}
            {task.due === today() ? "Today" : dateLabel(task.due)}
            {late ? " · Overdue" : ""}
          </span>
        </span>
      </button>
      <span className={`priority ${task.priority.toLowerCase()}`}>
        {task.priority}
      </span>
      <button
        className="task-edit icon-button"
        aria-label={`Edit ${task.title}`}
        onClick={edit}
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  actionLabel = "Add your first entry",
}: {
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Plus size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="text-button" onClick={action}>
          {actionLabel}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
