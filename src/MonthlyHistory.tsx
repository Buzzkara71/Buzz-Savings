import { ArrowUpRight } from "lucide-react";
import { monthlyHistory, money, monthLabel, type Transaction } from "./domain";

export default function MonthlyHistory({
  transactions,
  month,
  onOpenMonth,
  years,
  onYearChange,
}: {
  transactions: Transaction[];
  month: string;
  onOpenMonth: (month: string) => void;
  years: string[];
  onYearChange: (year: string) => void;
}) {
  const year = month.slice(0, 4);
  const rows = monthlyHistory(transactions, year);
  const totals = rows.reduce(
    (sum, row) => ({
      income: sum.income + row.income,
      expense: sum.expense + row.expense,
      balance: sum.balance + row.balance,
    }),
    { income: 0, expense: 0, balance: 0 },
  );

  return (
    <section
      className="card monthly-history"
      id="monthly-history"
      aria-labelledby="monthly-history-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="monthly-history-title">
            Monthly history <span>{year}</span>
          </h2>
          <p>Compare every month. Select one to see all its transactions.</p>
        </div>
        <label className="history-year">
          Year
          <select
            aria-label="Choose history year"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          >
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="history-totals">
        <div>
          <span>Income in {year}</span>
          <strong>{money(totals.income)}</strong>
        </div>
        <div>
          <span>Expenses in {year}</span>
          <strong>{money(totals.expense)}</strong>
        </div>
        <div>
          <span>Net cash flow in {year}</span>
          <strong>{money(totals.balance)}</strong>
        </div>
      </div>
      <div className="table-scroll">
        <table className="history-table">
          <caption className="sr-only">
            Monthly income, expenses, and net cash flow for {year}. All recorded
            transactions, regardless of filters.
          </caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Income</th>
              <th scope="col">Expenses</th>
              <th scope="col">Net cash flow</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={row.month === month ? "selected-month" : ""}
              >
                <th scope="row">
                  <button
                    className="history-month"
                    aria-label={`View transactions for ${monthLabel(row.month)}`}
                    aria-current={row.month === month ? "date" : undefined}
                    onClick={() => onOpenMonth(row.month)}
                  >
                    <span>
                      {monthLabel(row.month).replace(` ${year}`, "")}
                      <small>
                        {row.count ? `${row.count} transactions` : "No records"}
                      </small>
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                </th>
                <td className="history-income" data-label="Income">
                  {money(row.income)}
                </td>
                <td data-label="Expenses">{money(row.expense)}</td>
                <td
                  data-label="Net cash flow"
                  className={row.balance < 0 ? "history-negative" : ""}
                >
                  {money(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="history-note">
        Net cash flow = income − expenses. Each month is calculated separately.
      </p>
    </section>
  );
}
