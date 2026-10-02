import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseBankStatement,
  statementTotals,
  statementMonths,
  statementCSV,
  bankMoney,
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
