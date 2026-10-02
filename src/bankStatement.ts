// Statement amounts are integer hundredths of IDR, preserving bank interest and tax.
export const statementKinds = [
  "income",
  "expense",
  "transfer",
  "savings",
  "loan",
  "review",
] as const;
export const statementCategories = [
  "Food & drinks",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Other",
  "Salary",
  "Freelance",
  "Interest",
  "Bank fees & tax",
  "Own-account transfer",
  "Pocket transfer",
  "Investment transfer",
  "Savings",
  "Loan proceeds",
  "Loan repayment",
] as const;
export type StatementRow = {
  id: string;
  date: string;
  time: string;
  source: string;
  description: string;
  note: string;
  amountCents: number;
  balanceCents: number;
  page: number;
  kind: (typeof statementKinds)[number];
  category: (typeof statementCategories)[number];
  review: boolean;
  reason: string;
};
export type BankStatement = {
  format: "buzz-bank-statement";
  version: 1;
  id: string;
  account: string;
  sourceFile: string;
  from: string;
  to: string;
  openingCents: number;
  closingCents: number;
  transactions: StatementRow[];
};
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 300) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const cents = (v: unknown): v is number =>
  Number.isSafeInteger(v) && Math.abs(v as number) <= 1e14;
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  v >= "1900-01-01" &&
  v <= "9999-12-31" &&
  new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v;
export function parseBankStatement(value: unknown): BankStatement | null {
  try {
    if (
      !record(value) ||
      value.format !== "buzz-bank-statement" ||
      value.version !== 1 ||
      !text(value.id) ||
      !text(value.account) ||
      !text(value.sourceFile) ||
      !date(value.from) ||
      !date(value.to) ||
      value.from > value.to ||
      !cents(value.openingCents) ||
      !cents(value.closingCents) ||
      !Array.isArray(value.transactions) ||
      !value.transactions.length ||
      value.transactions.length > 10000
    )
      return null;
    let incoming = 0,
      outgoing = 0;
    let balance = value.openingCents,
      previous = value.from;
    const ids = new Set<string>();
    for (const row of value.transactions) {
      if (
        !record(row) ||
        !text(row.id) ||
        !text(row.source) ||
        !text(row.description) ||
        typeof row.note !== "string" ||
        row.note.length > 1000 ||
        !text(row.reason, 1000) ||
        !date(row.date) ||
        row.date < previous ||
        row.date > value.to ||
        typeof row.time !== "string" ||
        !/^(?:[01]\d|2[0-3])\.[0-5]\d$/.test(row.time) ||
        !cents(row.amountCents) ||
        !row.amountCents ||
        !cents(row.balanceCents) ||
        !Number.isInteger(row.page) ||
        Number(row.page) < 1 ||
        Number(row.page) > 10000 ||
        !statementKinds.includes(row.kind as StatementRow["kind"]) ||
        !statementCategories.includes(
          row.category as StatementRow["category"],
        ) ||
        typeof row.review !== "boolean"
      )
        return null;
      if (
        ids.has(row.id as string) ||
        (row.kind === "income" && row.amountCents < 0) ||
        (row.kind === "expense" && row.amountCents > 0) ||
        (row.kind === "review" && row.review !== true)
      )
        return null;
      balance += row.amountCents;
      incoming += Math.max(0, row.amountCents);
      outgoing += Math.max(0, -row.amountCents);
      if (!Number.isSafeInteger(incoming) || !Number.isSafeInteger(outgoing))
        return null;
      if (!Number.isSafeInteger(balance) || balance !== row.balanceCents)
        return null;
      ids.add(row.id as string);
      previous = row.date;
    }
    return balance === value.closingCents ? (value as BankStatement) : null;
  } catch {
    return null;
  }
}
export const bankMoney = (cents: number) => {
  const absolute = BigInt(Math.abs(cents));
  return `${cents < 0 ? "-" : ""}Rp\u00a0${new Intl.NumberFormat("id-ID").format(absolute / 100n)},${String(absolute % 100n).padStart(2, "0")}`;
};
export function statementTotals(rows: StatementRow[]) {
  return rows.reduce(
    (sum, row) => ({
      incoming: sum.incoming + Math.max(0, row.amountCents),
      outgoing: sum.outgoing + Math.max(0, -row.amountCents),
      income: sum.income + (row.kind === "income" ? row.amountCents : 0),
      expense: sum.expense + (row.kind === "expense" ? -row.amountCents : 0),
      review: sum.review + Number(row.review),
    }),
    { incoming: 0, outgoing: 0, income: 0, expense: 0, review: 0 },
  );
}
export function statementMonths(statement: BankStatement) {
  const result: {
    month: string;
    opening: number;
    closing: number;
    count: number;
    incoming: number;
    outgoing: number;
  }[] = [];
  let opening = statement.openingCents;
  for (
    let month = statement.from.slice(0, 7);
    month <= statement.to.slice(0, 7);

  ) {
    const rows = statement.transactions.filter((row) =>
      row.date.startsWith(month),
    );
    const totals = statementTotals(rows),
      closing = rows.at(-1)?.balanceCents ?? opening;
    result.push({
      month,
      opening,
      closing,
      count: rows.length,
      incoming: totals.incoming,
      outgoing: totals.outgoing,
    });
    opening = closing;
    const [year, n] = month.split("-").map(Number);
    month =
      n === 12 ? `${year + 1}-01` : `${year}-${String(n + 1).padStart(2, "0")}`;
  }
  return result;
}
export function statementCSV(rows: StatementRow[]) {
  const cell = (v: string | number) => {
    const str = String(v);
    const safe =
      typeof v === "string" && /^[=+\-@\t\r\n]/.test(str.trimStart())
        ? "'" + str
        : str;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      [
        "Date",
        "Time",
        "Source",
        "Description",
        "Note",
        "Kind",
        "Category",
        "Amount (IDR)",
        "Balance (IDR)",
        "Needs review",
        "Reason",
        "PDF page",
        "Bank transaction ID",
      ],
      ...rows.map((r) => [
        r.date,
        r.time,
        r.source,
        r.description,
        r.note,
        r.kind,
        r.category,
        r.amountCents / 100,
        r.balanceCents / 100,
        r.review ? "Yes" : "No",
        r.reason,
        r.page,
        r.id,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function groupStatementRows(
  rows: StatementRow[],
  key: (row: StatementRow) => string,
) {
  const groups = new Map<string, StatementRow[]>();
  for (const row of rows) {
    const k = key(row);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(row);
  }
  return [...groups.entries()];
}
