import { useState, type FormEvent } from "react";
import CurrencyInput from "./CurrencyInput";
import {
  Trash2,
  Download,
  Upload,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  type AppData,
  type Task,
  type Transaction,
  type Goal,
  type Category,
  expenseCategories,
  incomeCategories,
  today,
  uid,
  money,
  parseAmount,
} from "./domain";

type FormProps<T> = {
  initial?: T;
  save: (value: T) => void;
  cancel: () => void;
  remove?: () => void;
};
function Actions({
  cancel,
  remove,
  text = "Save",
}: {
  cancel: () => void;
  remove?: () => void;
  text?: string;
}) {
  return (
    <div className="form-actions">
      {remove && (
        <button
          type="button"
          className="icon-button danger"
          aria-label="Delete entry"
          onClick={remove}
        >
          <Trash2 size={18} />
        </button>
      )}
      <button type="button" className="button secondary" onClick={cancel}>
        Cancel
      </button>
      <button type="submit" className="button primary">
        {text}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
export function TaskForm({ initial, save, cancel, remove }: FormProps<Task>) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title")).trim();
    if (!title) return;
    save({
      id: initial?.id ?? uid(),
      title,
      due: String(f.get("due")),
      category: String(f.get("category")),
      priority: f.get("priority") as Task["priority"],
      done: initial?.done ?? false,
    });
  };
  return (
    <form onSubmit={submit} className="form">
      <label>
        Task name
        <input
          name="title"
          placeholder="What would you like to get done?"
          defaultValue={initial?.title}
          required
          maxLength={120}
          autoFocus
          pattern=".*\S.*"
        />
      </label>
      <div className="form-row">
        <label>
          Due date
          <input
            type="date"
            name="due"
            defaultValue={initial?.due ?? today()}
            required
            min="1900-01-01"
            max="9999-12-31"
          />
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={initial?.priority ?? "Medium"}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>
      </div>
      <label>
        Category
        <select name="category" defaultValue={initial?.category ?? "Personal"}>
          {["Personal", "Work", "Personal growth", "Health"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <Actions
        cancel={cancel}
        remove={remove}
        text={initial ? "Save changes" : "Add task"}
      />
    </form>
  );
}
export function TransactionForm({
  initial,
  save,
  cancel,
  remove,
  defaultDate = today(),
}: FormProps<Transaction> & { defaultDate?: string }) {
  const [type, setType] = useState<"expense" | "income">(
    initial?.type ?? "expense",
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) return;
    save({
      id: initial?.id ?? uid(),
      name,
      amount: parseAmount(String(f.get("amount")))!,
      type,
      category: f.get("category") as Category,
      date: String(f.get("date")),
    });
  };
  return (
    <form onSubmit={submit} className="form">
      <div className="segmented">
        <button
          type="button"
          className={type === "expense" ? "active" : ""}
          onClick={() => setType("expense")}
        >
          Expenses
        </button>
        <button
          type="button"
          className={type === "income" ? "active" : ""}
          onClick={() => setType("income")}
        >
          Income
        </button>
      </div>
      <label>
        Description
        <input
          name="name"
          placeholder="e.g. Afternoon coffee"
          defaultValue={initial?.name}
          required
          maxLength={120}
          autoFocus
          pattern=".*\S.*"
        />
      </label>
      <CurrencyInput
        label="Amount (IDR)"
        name="amount"
        min={1}
        defaultValue={initial?.amount}
      />
      <div className="form-row">
        <label>
          Category
          <select
            key={type}
            name="category"
            defaultValue={initial?.type === type ? initial.category : undefined}
          >
            {(type === "expense" ? expenseCategories : incomeCategories).map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Date
          <input
            name="date"
            type="date"
            defaultValue={initial?.date ?? defaultDate}
            max={today()}
            min="1900-01-01"
            required
          />
        </label>
      </div>
      <Actions
        cancel={cancel}
        remove={remove}
        text={initial ? "Save changes" : "Save transaction"}
      />
    </form>
  );
}
export function GoalForm({ initial, save, cancel, remove }: FormProps<Goal>) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) return;
    save({
      id: initial?.id ?? uid(),
      name,
      target: parseAmount(String(f.get("target")))!,
      saved: parseAmount(String(f.get("saved")))!,
      color: String(f.get("color")),
    });
  };
  return (
    <form onSubmit={submit} className="form">
      <label>
        Goal name
        <input
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. A trip to Japan"
          required
          maxLength={80}
          autoFocus
          pattern=".*\S.*"
        />
      </label>
      <div className="form-row">
        <CurrencyInput
          label="Target (IDR)"
          name="target"
          min={1}
          defaultValue={initial?.target}
        />
        <CurrencyInput
          label="Already saved (IDR)"
          name="saved"
          defaultValue={initial?.saved ?? 0}
        />
      </div>
      <label>
        Color
        <select name="color" defaultValue={initial?.color ?? "peach"}>
          <option value="peach">Cyan</option>
          <option value="sage">Gray</option>
          <option value="lavender">Slate blue</option>
        </select>
      </label>
      <p className="form-hint">
        Goals are tracked manually, separately from your transaction balance.
      </p>
      <Actions
        cancel={cancel}
        remove={remove}
        text={initial ? "Save changes" : "Create goal"}
      />
    </form>
  );
}
export function ContributionForm({
  goal,
  save,
  cancel,
}: {
  goal: Goal;
  save: (amount: number) => void;
  cancel: () => void;
}) {
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        save(parseAmount(String(new FormData(e.currentTarget).get("amount")))!);
      }}
    >
      <div className="contribution-info">
        <span>Already saved</span>
        <strong>{money(goal.saved)}</strong>
        <span>of {money(goal.target)}</span>
      </div>
      <CurrencyInput
        label="Add savings (IDR)"
        name="amount"
        min={1}
        max={1e12 - goal.saved}
        autoFocus
        placeholder="100.000"
      />
      <p className="form-hint">
        This entry does not deduct from your balance or create a transaction.
      </p>
      <Actions cancel={cancel} text="Add savings" />
    </form>
  );
}
export function SettingsForm({
  data,
  save,
  cancel,
  backup,
  restore,
  reset,
  demo,
}: {
  data: AppData;
  save: (name: string, budget: number) => void;
  cancel: () => void;
  backup: () => void;
  restore: (file: File) => void;
  reset: () => void;
  demo: () => void;
}) {
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name")).trim();
        if (name) save(name, parseAmount(String(f.get("budget")))!);
      }}
    >
      <label>
        Display name
        <input
          name="name"
          defaultValue={data.name}
          required
          maxLength={30}
          pattern=".*\S.*"
        />
      </label>
      <CurrencyInput
        label="Monthly spending budget (IDR)"
        name="budget"
        defaultValue={data.budget}
      />
      <p className="form-hint">
        The same budget applies each month. Your data is stored in this browser;
        download a backup before switching devices or clearing browser data.
      </p>
      <div className="backup-actions">
        <button type="button" className="button secondary" onClick={backup}>
          <Download size={15} /> Back up
        </button>
        <label className="button secondary upload-button">
          <Upload size={15} /> Restore
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Restore JSON backup"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) restore(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="settings-reset">
        <AlertCircle size={17} />
        <div>
          <strong>
            {data.demo ? "Ready to make it yours?" : "Manage your workspace"}
          </strong>
          <p>
            {data.demo
              ? "Clear the demo data and start fresh."
              : "You’ll be asked to confirm before replacing data."}
          </p>
          <button type="button" className="text-button danger" onClick={reset}>
            Start fresh
          </button>
          {!data.demo && (
            <button type="button" className="text-button" onClick={demo}>
              Load demo data
            </button>
          )}
        </div>
      </div>
      <Actions cancel={cancel} text="Save settings" />
    </form>
  );
}
