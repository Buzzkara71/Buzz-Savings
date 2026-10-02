import { ArrowDownLeft, ArrowUpRight, Wallet, ReceiptText } from "lucide-react";
import {
  bankMoney,
  statementActivity,
  statementMonths,
  type BankStatement,
  type StatementRow,
} from "./bankStatement";
import {
  categoryColors,
  monthLabel,
  shortMoney,
  type Category,
} from "./domain";

export function BankLifetimeCards({
  statement,
  onOpen,
}: {
  statement: BankStatement;
  onOpen: () => void;
}) {
  const totals = statementActivity(statement);
  return (
    <section
      className="lifetime-section bank-lifetime"
      aria-label="Bank statement balance"
    >
      <div className="lifetime-heading">
        <div>
          <span className="eyebrow">YOUR CURRENT FINANCIAL RECORDS</span>
          <h2>Your money, so far.</h2>
          <p>
            {statement.account} · {statement.from} – {statement.to}
          </p>
        </div>
        <button className="text-button" onClick={onOpen}>
          View bank statement <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="stats-grid lifetime-grid">
        <section
          className="stat-card balance-card"
          aria-label="Available balance"
        >
          <div className="stat-top">
            <span>Available balance</span>
            <Wallet size={21} />
          </div>
          <strong className="stat-value">
            {bankMoney(statement.closingCents)}
          </strong>
          <p className="stat-foot">
            Bank closing balance · as of {statement.to}
          </p>
          <div className="balance-decoration" />
        </section>
        <section className="stat-card" aria-label="All-time cash in">
          <div className="stat-top">
            <span>Total cash in</span>
            <ArrowDownLeft size={21} />
          </div>
          <strong className="stat-value">{bankMoney(totals.incoming)}</strong>
          <p className="stat-foot">All incoming movements in this statement</p>
        </section>
        <section className="stat-card" aria-label="All-time cash out">
          <div className="stat-top">
            <span>Total cash out</span>
            <ArrowUpRight size={21} />
          </div>
          <strong className="stat-value">{bankMoney(totals.outgoing)}</strong>
          <p className="stat-foot">All outgoing movements in this statement</p>
        </section>
        <section className="stat-card" aria-label="All-time expenses">
          <div className="stat-top">
            <span>Identified spending</span>
            <ReceiptText size={21} />
          </div>
          <strong className="stat-value">{bankMoney(totals.expense)}</strong>
          <p className="stat-foot">Payments, bank fees and tax</p>
        </section>
      </div>
      <div className="total-held bank-source-note">
        <span>
          Opening balance <strong>{bankMoney(statement.openingCents)}</strong> +
          cash in − cash out = available balance.
        </span>
        <span>
          Cash movements include transfers and loans. Identified income:{" "}
          <strong>{bankMoney(totals.income)}</strong>. {totals.review}{" "}
          transactions need review.
        </span>
      </div>
    </section>
  );
}

export function BankCategoriesCard({
  statement,
  month,
}: {
  statement: BankStatement;
  month: string;
}) {
  const totals = statementActivity(statement, month);
  const color = (category: string) =>
    categoryColors[category as Category] ?? "#475569";
  let stop = 0;
  const gradient = totals.categories
    .map((c) => {
      const start = stop;
      stop += (c.amountCents / totals.expense) * 100;
      return `${color(c.category)} ${start}% ${stop}%`;
    })
    .join(", ");
  return (
    <section className="card category-card">
      <div className="section-heading">
        <div>
          <h2>Where does it go?</h2>
          <p>Identified bank spending · {monthLabel(month)}</p>
        </div>
      </div>
      <div className="category-chart">
        <div
          className="donut"
          style={{
            background: gradient ? `conic-gradient(${gradient})` : "#e5e9ed",
          }}
          role="img"
          aria-label={`Total expenses ${bankMoney(totals.expense)}`}
        >
          <div>
            <span>Total expenses</span>
            <strong>{shortMoney(totals.expense / 100)}</strong>
            <small>IDR</small>
          </div>
        </div>
      </div>
      <div className="category-legend">
        {totals.categories.map((c) => (
          <div key={c.category}>
            <span>
              <i style={{ background: color(c.category) }} />
              {c.category}
            </span>
            <strong title={bankMoney(c.amountCents)}>
              {Math.round((c.amountCents / totals.expense) * 100)}%
            </strong>
          </div>
        ))}
        {!totals.categories.length && (
          <p className="muted">No identified spending this month.</p>
        )}
      </div>
      <p className="bank-explanation">
        Transfers and loan movements are excluded. {totals.review} entries need
        review.
      </p>
    </section>
  );
}

export function BankRecentTransactions({
  rows,
  compact = true,
}: {
  rows: StatementRow[];
  compact?: boolean;
}) {
  const sorted = [...rows].reverse();
  return (
    <div className="table-scroll">
      <table className="transaction-table bank-recent">
        <thead>
          <tr>
            <th>Transactions</th>
            <th>Category</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, compact ? 4 : undefined).map((row) => (
            <tr key={row.id}>
              <td>
                <div className="transaction-name">
                  <div>
                    <strong>{row.source}</strong>
                    <span>
                      {row.description}
                      {row.review ? " · Needs review" : ""}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-tag">{row.category}</span>
              </td>
              <td className="date-cell">
                {row.date}
                <small>{row.time}</small>
              </td>
              <td
                className={`amount ${row.amountCents > 0 ? "income" : "expense"}`}
              >
                {row.amountCents > 0 ? "+" : ""}
                {bankMoney(row.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="muted">No matching bank transactions.</p>}
    </div>
  );
}

export function BankMonthlyHistory({
  statement,
  month,
  onOpenMonth,
}: {
  statement: BankStatement;
  month: string;
  onOpenMonth: (month: string) => void;
}) {
  return (
    <section
      className="card monthly-history"
      id="bank-monthly-history"
      aria-labelledby="bank-history-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="bank-history-title">Monthly history</h2>
          <p>Bank balances and cash movements across the statement period.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Opening</th>
              <th>Cash in</th>
              <th>Cash out</th>
              <th>Closing</th>
            </tr>
          </thead>
          <tbody>
            {statementMonths(statement).map((row) => (
              <tr
                key={row.month}
                className={row.month === month ? "selected-month" : ""}
              >
                <th scope="row">
                  <button
                    className="history-month"
                    aria-label={`View bank transactions for ${monthLabel(row.month)}`}
                    onClick={() => onOpenMonth(row.month)}
                  >
                    <span>
                      {monthLabel(row.month)}
                      <small>{row.count} transactions</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                </th>
                {[row.opening, row.incoming, row.outgoing, row.closing].map(
                  (amount, i) => (
                    <td
                      key={i}
                      data-label={
                        ["Opening", "Cash in", "Cash out", "Closing"][i]
                      }
                    >
                      {bankMoney(amount)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
