import { useState } from "react";
import { Download } from "lucide-react";
import {
  bankMoney,
  groupStatementRows,
  statementCSV,
  statementMonths,
  statementTotals,
  type BankStatement,
} from "./bankStatement";
import "./bankStatement.css";

export default function BankStatementPanel({
  statement,
  initialMonth = "",
}: {
  statement: BankStatement;
  initialMonth?: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [query, setQuery] = useState("");
  const [review, setReview] = useState(false);
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState("");
  const monthly = statementMonths(statement),
    period = monthly.find((m) => m.month === month);
  const selected = statement.transactions.filter(
    (r) => !month || r.date.startsWith(month),
  );
  const totals = statementTotals(selected);
  const rows = selected.filter(
    (r) =>
      (!review || r.review) &&
      (!kind || r.kind === kind) &&
      `${r.source} ${r.description} ${r.note} ${r.id} ${r.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 30)),
    current = Math.min(page, pages - 1);
  const categories = groupStatementRows(
    selected.filter((r) => r.kind === "expense"),
    (r) => r.category,
  )
    .map(([name, rs]) => ({ name, amount: statementTotals(rs).expense }))
    .sort((a, b) => b.amount - a.amount);
  const pockets = groupStatementRows(
    selected.filter((r) => r.kind === "savings"),
    (r) => r.source,
  );
  function exportRows() {
    const url = URL.createObjectURL(
      new Blob([statementCSV(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `buzz-bank-${month || statement.from + "_" + statement.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="bank-report" aria-labelledby="bank-report-title">
      <div className="bank-report-heading">
        <div>
          <span className="eyebrow">RECONCILED WITH YOUR STATEMENT</span>
          <h2 id="bank-report-title">{statement.account}</h2>
          <p>
            {statement.from} – {statement.to} · {statement.transactions.length}{" "}
            transactions
          </p>
        </div>
        <label>
          Statement period
          <select
            aria-label="Statement period"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statement dates</option>
            {monthly.map((m) => (
              <option key={m.month} value={m.month}>
                {m.month}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="bank-stats">
        {[
          ["Opening balance", period?.opening ?? statement.openingCents],
          ["Cash in", totals.incoming],
          ["Cash out", totals.outgoing],
          ["Closing balance", period?.closing ?? statement.closingCents],
        ].map(([label, amount]) => (
          <article key={label} aria-label={String(label)}>
            <span>{label}</span>
            <strong>{bankMoney(Number(amount))}</strong>
          </article>
        ))}
      </div>
      <p className="bank-explanation">
        Cash in and cash out include transfers, savings movements and loans. The
        balance covers this bank account only. This statement supplies the
        dashboard’s financial monitoring.
      </p>
      <div className="bank-breakdown">
        <section className="card">
          <h3>Identified spending</h3>
          <strong className="bank-figure">{bankMoney(totals.expense)}</strong>
          <p>Payments, fees and tax. Unresolved transfers are excluded.</p>
          <ul>
            {categories.map((c) => (
              <li key={c.name}>
                <span>{c.name}</span>
                <strong>{bankMoney(c.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>Classification</h3>
          <ul>
            <li>
              <span>Identified income</span>
              <strong>{bankMoney(totals.income)}</strong>
            </li>
            <li>
              <span>Needs review</span>
              <strong>{totals.review} transactions</strong>
            </li>
          </ul>
          <p>
            Categories use bank descriptions and merchant names. “Other” with a
            review flag needs more context. Each row includes the reason and
            original PDF page.
          </p>
          <h3>Savings pocket movements</h3>
          {pockets.length ? (
            <ul>
              {pockets.map(([name, rs]) => {
                const s = statementTotals(rs!);
                return (
                  <li key={name}>
                    <span>
                      {name}
                      <small>
                        In: {bankMoney(s.outgoing)} · Out:{" "}
                        {bankMoney(s.incoming)}
                      </small>
                    </span>
                    <strong>{bankMoney(s.outgoing - s.incoming)}</strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No savings movements in this period.</p>
          )}
          <p>
            Net deposits shown here are not current pocket balances. A pocket
            statement is needed to confirm its balance.
          </p>
        </section>
      </div>
      <section className="card">
        <h3>Monthly cash flow</h3>
        <div className="bank-table-scroll">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Transactions</th>
                <th>Opening</th>
                <th>Cash in</th>
                <th>Cash out</th>
                <th>Closing</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setMonth(m.month);
                        setPage(0);
                      }}
                    >
                      {m.month}
                    </button>
                  </td>
                  <td>{m.count}</td>
                  {[m.opening, m.incoming, m.outgoing, m.closing].map(
                    (v, i) => (
                      <td key={i}>{bankMoney(v)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="bank-report-heading">
          <h3>Statement transactions</h3>
          <button className="button secondary" onClick={exportRows}>
            <Download size={15} />
            Export filtered CSV
          </button>
        </div>
        <div className="bank-filters">
          <label>
            Search statement
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Merchant, category or transaction ID"
            />
          </label>
          <label>
            Movement
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All movements</option>
              {[
                "income",
                "expense",
                "transfer",
                "savings",
                "loan",
                "review",
              ].map((k) => (
                <option key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="bank-review-check">
            <input
              type="checkbox"
              checked={review}
              onChange={(e) => {
                setReview(e.target.checked);
                setPage(0);
              }}
            />
            Needs review only
          </label>
        </div>
        <p aria-live="polite">
          {rows.length} matching transactions · Page {current + 1} of {pages}
        </p>
        <div className="bank-table-scroll">
          <table className="bank-table bank-transactions">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction</th>
                <th>Classification</th>
                <th>Amount</th>
                <th>Bank balance</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .reverse()
                .slice(current * 30, (current + 1) * 30)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.date}
                      <small>
                        {r.time} · PDF p. {r.page}
                      </small>
                    </td>
                    <td>
                      <strong>{r.source}</strong>
                      <small>{r.description}</small>
                      <details>
                        <summary>Source details</summary>
                        <p>{r.note || "No bank note."}</p>
                        <p>{r.reason}</p>
                        <small>ID: {r.id}</small>
                      </details>
                    </td>
                    <td>
                      {r.category}
                      <small>{r.kind}</small>
                      {r.review && (
                        <span className="bank-review-badge">Needs review</span>
                      )}
                    </td>
                    <td className={r.amountCents > 0 ? "bank-in" : ""}>
                      {r.amountCents > 0 ? "+" : ""}
                      {bankMoney(r.amountCents)}
                    </td>
                    <td>{bankMoney(r.balanceCents)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p>No transactions match these filters.</p>}
        <div className="bank-pagination">
          <button
            className="button secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            className="button secondary"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </section>
  );
}
