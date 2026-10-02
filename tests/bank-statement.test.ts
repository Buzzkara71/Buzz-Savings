import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseBankStatement,
  statementTotals,
  statementMonths,
  statementCSV,
  bankMoney,
  statementActivity,
  statementChartData,
} from "../src/bankStatement.ts";
import { emptyData, parseAppData } from "../src/domain.ts";
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/bank-statement.json", import.meta.url),
    "utf8",
  ),
);
test("bank statements reconcile exact cents and separate loans, savings and transfers from earnings", () => {
  const statement = parseBankStatement(fixture)!;
  assert(statement);
  assert.deepEqual(statementTotals(statement.transactions), {
    incoming: 510055,
    outgoing: 78511,
    income: 55,
    expense: 27511,
    review: 1,
  });
  assert.deepEqual(
    statementMonths(statement).map((m) => [
      m.month,
      m.opening,
      m.closing,
      m.count,
    ]),
    [
      ["2026-01", 100025, 260069, 5],
      ["2026-02", 260069, 531569, 3],
      ["2026-03", 531569, 531569, 0],
    ],
  );
  const backup = { ...emptyData(), bankStatement: statement };
  assert.deepEqual(parseAppData(JSON.parse(JSON.stringify(backup))), backup);
});
test("malformed, duplicated, reordered and unbalanced bank records cannot be imported", () => {
  for (const change of [
    { amountCents: 0 },
    { amountCents: 0.55 },
    { balanceCents: 100081 },
    { date: "2026-02-30" },
    { date: "2025-12-31" },
    { time: "25.00" },
    { kind: "expense" },
    { category: "Unknown" },
    { note: 4 },
  ]) {
    const next = structuredClone(fixture);
    Object.assign(next.transactions[0], change);
    assert.equal(parseBankStatement(next), null);
  }
  const duplicate = structuredClone(fixture);
  duplicate.transactions[1].id = "r1";
  assert.equal(parseBankStatement(duplicate), null);
  assert.equal(parseBankStatement({ ...fixture, closingCents: 1 }), null);
  assert.equal(
    parseBankStatement({
      ...fixture,
      transactions: fixture.transactions.slice().reverse(),
    }),
    null,
  );
  assert.equal(parseAppData({ ...emptyData(), bankStatement: {} }), null);
});
test("statement CSV keeps signed numeric amounts and neutralizes formulas in source text", () => {
  const r = structuredClone(fixture.transactions[7]);
  r.source = ' -HYPERLINK("x")';
  r.note = "=1+1";
  const csv = statementCSV([r]);
  assert(csv.includes('"-10"'));
  assert(csv.includes("\"' -HYPERLINK"));
  assert(csv.includes('"\'=1+1"'));
});

test("currency formatting preserves the final cent at the safe integer limit", () => {
  assert.equal(bankMoney(9007199254740991), "Rp\u00a090.071.992.547.409,91");
  assert.equal(bankMoney(-1), "-Rp\u00a00,01");
});

test("bank dashboard spending, categories and weekly movements agree across months", () => {
  const statement = parseBankStatement(fixture)!;
  const january = statementActivity(statement, "2026-01");
  assert.equal(january.expense, 11);
  assert.equal(january.income, 55);
  assert.equal(january.savingsIn, 50000);
  assert.equal(january.savingsOut, 10000);
  assert.equal(
    january.categories.reduce((sum, c) => sum + c.amountCents, 0),
    january.expense,
  );
  for (const month of statementMonths(statement)) {
    const chart = statementChartData(statement, month.month);
    assert.equal(
      chart.reduce((sum, r) => sum + r.Income, 0),
      month.incoming,
    );
    assert.equal(
      chart.reduce((sum, r) => sum + r.Expenses, 0),
      month.outgoing,
    );
  }
  const february = statementActivity(statement, "2026-02");
  assert.equal(february.income, 0); // Loan proceeds are cash in, not income.
  assert.equal(february.expense, 27500); // The unresolved transfer is not spending.
  assert.equal(february.incoming, 300000);
  assert.equal(february.outgoing, 28500);
  assert.equal(february.review, 1);
  assert.deepEqual(statementActivity(statement, "2026-03").selected, []);
  const latest = {
    ...statement,
    transactions: statement.transactions.map((r, i) =>
      i === 7
        ? {
            ...r,
            category: "Bills" as const,
            kind: "expense" as const,
            review: false,
          }
        : r,
    ),
  };
  assert.equal(statementActivity(latest, "2026-02").expense, 28500);
  assert.equal(latest.closingCents, statement.closingCents);
});
