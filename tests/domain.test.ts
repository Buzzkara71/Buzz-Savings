import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarize,
  chartData,
  shiftMonth,
  csvFor,
  isAppData,
  emptyData,
  makeDemo,
  currentMonth,
  type Transaction,
  parseAppData,
  money,
  shortMoney,
  monthLabel,
  formatAmount,
  parseAmount,
  monthlyHistory,
  transactionDateForMonth,
} from "../src/domain.ts";

const transactions: Transaction[] = [
  {
    id: "1",
    name: "Salary",
    type: "income",
    amount: 8500000,
    category: "Salary",
    date: "2026-10-01",
  },
  {
    id: "2",
    name: "Makan",
    type: "expense",
    amount: 50000,
    category: "Food & drinks",
    date: "2026-10-08",
  },
  {
    id: "3",
    name: "Bensin",
    type: "expense",
    amount: 150000,
    category: "Transport",
    date: "2026-10-31",
  },
  {
    id: "4",
    name: "Bulan lalu",
    type: "expense",
    amount: 9000000,
    category: "Other",
    date: "2026-09-30",
  },
];
test("monthly totals exclude other months and remain consistent", () => {
  const actual = summarize(transactions, "2026-10");
  assert.equal(actual.income, 8500000);
  assert.equal(actual.expense, 200000);
  assert.equal(actual.balance, 8300000);
  assert.deepEqual(
    actual.selected.map((t) => t.id),
    ["3", "2", "1"],
  );
  assert.equal(summarize([], "2026-10").balance, 0);
});
test("weekly chart includes the last day and matches financial totals", () => {
  const rows = chartData(transactions, "2026-10");
  assert.equal(rows.at(-1)?.label, "29–31");
  assert.equal(
    rows.reduce((s, r) => s + r.Expenses, 0),
    200000,
  );
  assert.equal(
    rows.reduce((s, r) => s + r.Income, 0),
    8500000,
  );
  assert.equal(chartData([], "2028-02").at(-1)?.label, "29–29");
  assert.equal(chartData([], "2027-02").length, 4);
});
test("month navigation handles year boundaries", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});
test("backup validation rejects malformed financial data and duplicate IDs", () => {
  const valid = { ...emptyData(), transactions };
  assert.equal(isAppData(valid), true);
  for (const change of [
    { amount: -1 },
    { amount: 0 },
    { amount: 0.1 },
    { amount: Infinity },
    { date: "2026-02-30" },
    { type: "other" },
    { category: "unknown" },
  ]) {
    assert.equal(
      isAppData({
        ...valid,
        transactions: [{ ...transactions[0], ...change }],
      }),
      false,
    );
  }
  assert.equal(
    isAppData({ ...valid, transactions: [transactions[0], transactions[0]] }),
    false,
  );
  assert.equal(isAppData({ ...valid, name: "   " }), false);
  assert.equal(isAppData(null), false);
});
test("CSV escapes quotes and neutralizes spreadsheet formulas", () => {
  const csv = csvFor([{ ...transactions[0], name: '=HYPERLINK("evil")' }]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"8500000"'));
});
test("demo data is valid and contains coherent financial totals", () => {
  const demo = makeDemo();
  assert.equal(isAppData(demo), true);
  const stats = summarize(demo.transactions, currentMonth());
  assert.equal(stats.income, 8500000);
  assert.equal(stats.expense, 2845000);
  assert.equal(stats.balance, 5655000);
});

test("legacy labels migrate without modifying personal records or financial values", () => {
  const old = {
    ...emptyData("Teman"),
    tasks: [
      {
        id: "old-task",
        title: "Catatan pribadi saya",
        category: "Pekerjaan",
        priority: "Tinggi",
        due: "2026-10-01",
        done: true,
      },
    ],
    transactions: [
      {
        id: "old-expense",
        name: "Makan bersama keluarga",
        type: "expense",
        category: "Makan & minum",
        amount: 275000,
        date: "2026-10-01",
      },
    ],
    goals: [
      {
        id: "old-goal",
        name: "Liburan ke Jepang",
        target: 15000000,
        saved: 6250000,
        color: "peach",
      },
    ],
  };
  const snapshot = JSON.stringify(old);
  const migrated = parseAppData(old);
  assert.ok(migrated);
  assert.equal(migrated.name, "Teman");
  assert.deepEqual(migrated.tasks[0], {
    ...old.tasks[0],
    category: "Work",
    priority: "High",
  });
  assert.deepEqual(migrated.transactions[0], {
    ...old.transactions[0],
    category: "Food & drinks",
  });
  assert.deepEqual(migrated.goals, old.goals);
  assert.equal(JSON.stringify(old), snapshot);
  assert.deepEqual(parseAppData(migrated), migrated);
  assert.equal(
    parseAppData({
      ...old,
      transactions: [{ ...old.transactions[0], amount: -1 }],
    }),
    null,
  );
  assert.equal(parseAppData({ ...old, version: 99 }), null);
});

test("legacy demo copy becomes English while custom demo entries are preserved", () => {
  const migrated = parseAppData({
    ...emptyData("Teman"),
    demo: true,
    tasks: [
      {
        id: "sample",
        title: "Selesaikan proposal proyek",
        category: "Pekerjaan",
        priority: "Tinggi",
        due: "2026-10-01",
        done: false,
      },
      {
        id: "custom",
        title: "Hubungi rekan kerja",
        category: "Pribadi",
        priority: "Rendah",
        due: "2026-10-02",
        done: true,
      },
    ],
    goals: [
      {
        id: "goal",
        name: "Dana darurat",
        target: 20000000,
        saved: 12000000,
        color: "sage",
      },
    ],
  });
  assert.ok(migrated);
  assert.equal(migrated.name, "Friend");
  assert.equal(migrated.tasks[0].title, "Finish the project proposal");
  assert.equal(migrated.tasks[1].title, "Hubungi rekan kerja");
  assert.equal(migrated.goals[0].name, "Emergency fund");
});

test("rupiah uses dot grouping while dates and exports stay in English", () => {
  assert.match(money(5655000), /Rp\s?5\.655\.000/);
  assert.equal(shortMoney(2845000), "2.8M");
  assert.equal(shortMoney(45000), "45K");
  assert.equal(monthLabel("2026-10"), "October 2026");
  assert.ok(
    csvFor(transactions).includes(
      '"Date","Description","Type","Category","Amount (IDR)"',
    ),
  );
});

test("whole-rupiah amounts parse without changing their numerical value", () => {
  for (const [input, expected] of [
    ["1250000", 1250000],
    ["1.250.000", 1250000],
    [" 50.000 ", 50000],
    ["0", 0],
    ["00100", 100],
    ["1", 1],
    ["1.000.000.000.000", 1e12],
  ] as const) {
    assert.equal(parseAmount(input), expected);
    assert.equal(parseAmount(formatAmount(expected)), expected);
  }
  for (const invalid of [
    "",
    " ",
    "-10",
    "1e5",
    "1,50",
    "1.25",
    "12.34.567",
    "Rp 1.000",
    "1.000.000.000.001",
    "9007199254740993",
    "Infinity",
  ]) {
    assert.equal(parseAmount(invalid), null, invalid);
  }
});

test("yearly history includes all twelve months, with no cross-year leakage", () => {
  const records: Transaction[] = [
    ...transactions,
    { ...transactions[0], id: "old", date: "2025-10-01", amount: 999999 },
    { ...transactions[0], id: "dec", date: "2026-12-31", amount: 300000 },
    { ...transactions[0], id: "jan", date: "2027-01-01", amount: 777777 },
  ];
  const rows = monthlyHistory(records, "2026");
  assert.equal(rows.length, 12);
  assert.deepEqual(rows[0], {
    month: "2026-01",
    income: 0,
    expense: 0,
    balance: 0,
    count: 0,
  });
  assert.deepEqual(rows[8], {
    month: "2026-09",
    income: 0,
    expense: 9000000,
    balance: -9000000,
    count: 1,
  });
  assert.deepEqual(rows[9], {
    month: "2026-10",
    income: 8500000,
    expense: 200000,
    balance: 8300000,
    count: 3,
  });
  assert.equal(rows[11].income, 300000);
  assert.equal(
    rows.reduce((sum, row) => sum + row.income, 0),
    8800000,
  );
  assert.equal(
    rows.reduce((sum, row) => sum + row.expense, 0),
    9200000,
  );
  assert.equal(
    rows.reduce((sum, row) => sum + row.balance, 0),
    -400000,
  );
});

test("new transaction dates follow past report months and never default to a future date", () => {
  assert.equal(transactionDateForMonth("2025-12", "2026-10-15"), "2025-12-01");
  assert.equal(transactionDateForMonth("2026-10", "2026-10-15"), "2026-10-15");
  assert.equal(transactionDateForMonth("2027-01", "2026-10-15"), "2026-10-15");
});
