import { useState, type FormEvent } from "react";
import CurrencyInput from "./CurrencyInput";
import GoalArtwork from "./GoalArtwork";
import PhotoUpload from "./PhotoUpload";
import ProfileAvatar from "./ProfileAvatar";
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
  type Profile,
  avatarSymbols,
  coverFor,
  goalCovers,
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
  disabled = false,
}: {
  cancel: () => void;
  remove?: () => void;
  text?: string;
  disabled?: boolean;
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
      <button type="submit" className="button primary" disabled={disabled}>
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
  goals,
}: FormProps<Transaction> & { defaultDate?: string; goals: Goal[] }) {
  const [type, setType] = useState<Transaction["type"]>(
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
      ...(type === "savings" ? { goalId: String(f.get("goalId")) } : {}),
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
        <button
          type="button"
          className={type === "savings" ? "active" : ""}
          onClick={() => setType("savings")}
        >
          Savings
        </button>
      </div>
      <label>
        Description
        <input
          name="name"
          placeholder={
            type === "savings"
              ? "e.g. This month’s travel savings"
              : "e.g. Afternoon coffee"
          }
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
            {(type === "expense"
              ? expenseCategories
              : type === "savings"
                ? ["Savings"]
                : incomeCategories
            ).map((c) => (
              <option key={c}>{c}</option>
            ))}
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
      {type === "savings" && (
        <>
          <label>
            Savings goal
            <select
              name="goalId"
              aria-label="Savings goal"
              required
              defaultValue={initial?.goalId ?? ""}
            >
              <option value="" disabled>
                Choose a goal
              </option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <p className="form-hint">
            {goals.length
              ? "This transfers money from your available balance into the selected goal. Editing or deleting it also updates your savings."
              : "Create a savings goal first from the Savings goals page, then record your transfer here."}
          </p>
        </>
      )}
      <Actions
        cancel={cancel}
        remove={remove}
        text={initial ? "Save changes" : "Save transaction"}
      />
    </form>
  );
}
export function GoalForm({
  initial,
  save,
  cancel,
  remove,
  transferred = 0,
}: FormProps<Goal> & { transferred?: number }) {
  const [photo, setPhoto] = useState(initial?.photo ?? null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [cover, setCover] = useState<NonNullable<Goal["cover"]>>(
    initial ? coverFor(initial) : "journey",
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (preparingPhoto) return;
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) return;
    save({
      id: initial?.id ?? uid(),
      name,
      target: parseAmount(String(f.get("target")))!,
      saved: parseAmount(String(f.get("saved")))!,
      color: String(f.get("color")),
      cover,
      photo,
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
          max={1e12 - transferred}
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
      <fieldset className="cover-picker">
        <legend>Goal cover</legend>
        <div>
          {goalCovers.map((value) => (
            <label
              key={value}
              className={!photo && cover === value ? "selected" : ""}
            >
              <input
                type="radio"
                name="cover"
                value={value}
                checked={!photo && cover === value}
                onChange={() => {
                  setCover(value);
                  setPhoto(null);
                }}
                disabled={preparingPhoto}
              />
              <GoalArtwork cover={value} />
              <span>
                {value === "journey"
                  ? "Travel"
                  : value === "nest"
                    ? "Home & security"
                    : value === "studio"
                      ? "Tech & creativity"
                      : "Adventure"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <PhotoUpload
        kind="goal"
        value={photo}
        onChange={setPhoto}
        onBusy={setPreparingPhoto}
      />
      <p className="form-hint">
        Already saved is your opening savings balance; it does not deduct cash.
        New Savings transactions are added automatically.
        {transferred > 0 && ` Linked transfers: ${money(transferred)}.`}
      </p>
      {transferred > 0 && (
        <p className="form-hint">
          This goal has savings transfers. Reassign or delete its linked
          transactions before deleting the goal.
        </p>
      )}
      <Actions
        cancel={cancel}
        remove={transferred > 0 ? undefined : remove}
        text={initial ? "Save changes" : "Create goal"}
        disabled={preparingPhoto}
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
        This creates a Savings transaction dated today, deducts from your
        available balance, and adds to this goal.
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
  cloud = false,
  importBrowser,
  importStatement,
  email,
  joined,
}: {
  data: AppData;
  save: (name: string, budget: number, profile: Profile) => void;
  cancel: () => void;
  backup: () => void;
  restore: (file: File) => void;
  reset: () => void;
  demo: () => void;
  cloud?: boolean;
  importBrowser?: () => void;
  importStatement: (file: File) => void;
  email?: string;
  joined?: string;
}) {
  const [avatar, setAvatar] = useState(data.profile.avatar);
  const [photo, setPhoto] = useState(data.profile.photo ?? null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [displayName, setDisplayName] = useState(data.name);
  return (
    <form
      className="form profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (preparingPhoto) return;
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name")).trim();
        if (name)
          save(name, parseAmount(String(f.get("budget")))!, {
            fullName: String(f.get("fullName")).trim(),
            occupation: String(f.get("occupation")).trim(),
            location: String(f.get("location")).trim(),
            bio: String(f.get("bio")).trim(),
            avatar,
            photo,
          });
      }}
    >
      <div className="profile-preview">
        <span className={`profile-avatar avatar-${avatar}`}>
          <ProfileAvatar
            profile={{ ...data.profile, avatar, photo }}
            name={displayName}
          />
        </span>
        <div>
          <strong>{displayName || "Your profile"}</strong>
          <span>{email ?? "Local workspace"}</span>
          <small>
            {joined
              ? `Member since ${new Date(joined).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
              : "Your own space to plan and grow"}
          </small>
        </div>
      </div>
      <fieldset className="avatar-picker">
        <legend>Choose your avatar</legend>
        <div>
          {Object.entries(avatarSymbols).map(([key, symbol]) => (
            <label
              key={key}
              className={!photo && avatar === key ? "selected" : ""}
            >
              <input
                type="radio"
                name="avatar"
                value={key}
                checked={!photo && avatar === key}
                onChange={() => {
                  setAvatar(key as Profile["avatar"]);
                  setPhoto(null);
                }}
                disabled={preparingPhoto}
              />
              <span aria-hidden="true">
                {symbol || displayName.charAt(0).toUpperCase()}
              </span>
              <span className="sr-only">{key}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <PhotoUpload
        kind="profile"
        value={photo}
        onChange={setPhoto}
        onBusy={setPreparingPhoto}
      />
      <div className="profile-section-title">
        Personal details <span>Make this space yours</span>
      </div>
      <div className="form-row">
        <label>
          Display name
          <input
            name="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            maxLength={30}
            pattern=".*\S.*"
          />
        </label>
        <label>
          Full name
          <input
            name="fullName"
            autoComplete="name"
            maxLength={100}
            defaultValue={data.profile.fullName}
            placeholder="Your full name"
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Occupation
          <input
            name="occupation"
            maxLength={100}
            defaultValue={data.profile.occupation}
            placeholder="e.g. Designer or student"
          />
        </label>
        <label>
          Location
          <input
            name="location"
            maxLength={100}
            defaultValue={data.profile.location}
            placeholder="e.g. Jakarta, Indonesia"
          />
        </label>
      </div>
      <label>
        About you
        <textarea
          name="bio"
          maxLength={300}
          rows={3}
          defaultValue={data.profile.bio}
          placeholder="What are you making room for?"
        />
      </label>
      <div className="profile-facts">
        <span>{data.tasks.length} tasks</span>
        <span>{data.goals.length} savings goals</span>
        <span>Currency: IDR</span>
      </div>
      <div className="profile-section-title">Money & workspace</div>
      <CurrencyInput
        label="Monthly spending budget (IDR)"
        name="budget"
        defaultValue={data.budget}
      />
      <p className="form-hint">
        The same budget applies each month.{" "}
        {cloud
          ? "Your records are saved to your account and available after signing in on another device. Keep a backup of important records."
          : "Your data is stored in this browser; download a backup before switching devices or clearing browser data."}
      </p>
      {importBrowser && (
        <div className="browser-import">
          <strong>Bring your existing records</strong>
          <p>
            Merge this browser’s tasks, transactions, and goals into your
            account. Matching records and your account settings will be kept.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={importBrowser}
          >
            <Upload size={15} />
            Import browser data
          </button>
        </div>
      )}
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
      <div className="browser-import">
        <strong>Bank statement</strong>
        <p className="bank-import-help">
          Import a prepared Buzz statement JSON to view exact bank balances,
          monthly cash flow, transfers and categories. The preview checks every
          running balance before saving.
        </p>
        <label className="button secondary upload-button">
          <Upload size={15} /> Import bank statement
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Import bank statement"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importStatement(file);
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
      <Actions cancel={cancel} text="Save settings" disabled={preparingPhoto} />
    </form>
  );
}
