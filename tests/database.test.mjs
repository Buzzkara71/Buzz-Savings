import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const carol = "cccccccc-cccc-4ccc-cccc-cccccccccccc";
const payload = {
  version: 2,
  profile: {
    fullName: "Alice Example",
    occupation: "Designer",
    location: "Jakarta",
    bio: "Saving for a trip",
    avatar: "spark",
  },
  name: "Alice",
  budget: 5000000,
  demo: false,
  tasks: [
    {
      id: "legacy-task",
      title: "Private plan",
      category: "Work",
      priority: "High",
      due: "2026-10-01",
      done: false,
    },
  ],
  transactions: [
    {
      id: "legacy-income",
      name: "Private salary",
      type: "income",
      amount: 8500000,
      category: "Salary",
      date: "2026-10-01",
    },
  ],
  goals: [
    {
      id: "legacy-goal",
      name: "Trip",
      target: 10000000,
      saved: 500000,
      color: "peach",
    },
  ],
};
const read = async () =>
  (await db.query("select public.buzz_read_workspace() as snapshot")).rows[0]
    .snapshot;
const save = async (revision, data) =>
  (
    await db.query(
      "select public.buzz_save_workspace($1, $2::jsonb) as snapshot",
      [revision, JSON.stringify(data)],
    )
  ).rows[0].snapshot;
async function identity(id, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`set role ${role}`);
}
before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [
    alice,
    bob,
    carol,
  ]);
  const sql = await readFile(
    new URL("../supabase/migrations/202610010001_buzz.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
  await identity(carol);
  await read();
  const legacy = { ...payload, version: 1 };
  delete legacy.profile;
  await save(0, legacy);
  await db.exec("reset role");
  const upgrade = await readFile(
    new URL(
      "../supabase/migrations/202610020001_savings_profile.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(upgrade);
  await db.exec(upgrade);
  const photos = await readFile(
    new URL(
      "../supabase/migrations/202610020002_custom_photos.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(photos);
  await db.exec(photos);
});
after(async () => {
  await db.close();
});

test("new accounts start empty and workspace writes preserve records and order", async () => {
  await identity(alice);
  const empty = await read();
  assert.equal(empty.revision, 0);
  assert.equal(empty.data.demo, false);
  assert.deepEqual(empty.data.transactions, []);
  const saved = await save(0, payload);
  assert.equal(saved.revision, 1);
  assert.deepEqual(saved.data, payload);
  assert.deepEqual((await read()).data, payload);
});
test("RLS isolates accounts, anonymous requests are denied, and direct writes cannot bypass revisions", async () => {
  await identity(bob);
  const second = await read();
  assert.deepEqual(second.data.transactions, []);
  assert.equal(
    (await db.query("select * from public.buzz_transactions")).rows.length,
    0,
  );
  assert.deepEqual(
    (await db.query("select user_id from public.buzz_profiles")).rows,
    [{ user_id: bob }],
  );
  await assert.rejects(
    db.query("update public.buzz_profiles set revision = 9"),
    { code: "42501" },
  );
  await assert.rejects(db.query("delete from public.buzz_transactions"), {
    code: "42501",
  });
  await identity("", "anon");
  await assert.rejects(read(), { code: "42501" });
  await assert.rejects(save(0, payload), { code: "42501" });
  await assert.rejects(db.query("select * from public.buzz_transactions"), {
    code: "42501",
  });
  await identity("");
  await assert.rejects(read(), { code: "42501" });
  await identity(alice);
  assert.deepEqual((await read()).data, payload);
});
test("an outdated device cannot overwrite newer records", async () => {
  await identity(alice);
  await assert.rejects(save(0, { ...payload, name: "Stale device" }), {
    code: "40001",
  });
  assert.deepEqual((await read()).data, payload);
  assert.equal((await read()).revision, 1);
});
test("invalid values and duplicate IDs roll back every collection and its revision", async () => {
  await identity(alice);
  for (const change of [
    { amount: 1.5 },
    { amount: -1 },
    { amount: "1000" },
    { amount: 1000000000001 },
    { date: "2026-02-30" },
    { date: "2026-1-01" },
    { category: "Shopping" },
  ]) {
    await assert.rejects(
      save(1, {
        ...payload,
        transactions: [{ ...payload.transactions[0], ...change }],
      }),
    );
    assert.deepEqual((await read()).data, payload);
    assert.equal((await read()).revision, 1);
  }
  await assert.rejects(
    save(1, { ...payload, tasks: [payload.tasks[0], payload.tasks[0]] }),
    { code: "23505" },
  );
  assert.deepEqual((await read()).data, payload);
  await assert.rejects(save(1, { ...payload, budget: 0.5 }), { code: "22023" });
  await assert.rejects(
    save(1, { ...payload, tasks: [{ ...payload.tasks[0], done: "false" }] }),
    { code: "22023" },
  );
});
test("deletions and goal contributions commit atomically without affecting another account", async () => {
  await identity(alice);
  const changed = {
    ...payload,
    transactions: [],
    goals: [{ ...payload.goals[0], saved: 750000 }],
  };
  const saved = await save(1, changed);
  assert.equal(saved.revision, 2);
  assert.deepEqual(saved.data, changed);
  await identity(bob);
  assert.equal((await read()).revision, 0);
  assert.deepEqual((await read()).data.goals, []);
});

test("upgrade preserves existing opening savings and rejects old clients without overwriting", async () => {
  await identity(carol);
  const upgraded = await read();
  assert.equal(upgraded.data.version, 2);
  assert.deepEqual(upgraded.data.goals, payload.goals);
  assert.deepEqual(upgraded.data.transactions, payload.transactions);
  assert.equal(upgraded.data.profile.avatar, "initials");
  await assert.rejects(save(1, { ...payload, version: 1 }), { code: "22023" });
  assert.deepEqual(await read(), upgraded);
});

test("linked transfers and profile details round trip and invalid links roll back atomically", async () => {
  await identity(alice);
  const current = await read();
  const transfer = {
    id: "transfer",
    name: "Travel savings",
    type: "savings",
    amount: 250000,
    category: "Savings",
    date: "2026-10-02",
    goalId: "legacy-goal",
  };
  const next = {
    ...payload,
    goals: [{ ...payload.goals[0], cover: "horizon" }],
    transactions: [...payload.transactions, transfer],
  };
  const saved = await save(current.revision, next);
  assert.deepEqual(saved.data, next);
  for (const invalid of [
    { ...next, transactions: [{ ...transfer, goalId: "other-user-goal" }] },
    { ...next, transactions: [{ ...transfer, goalId: undefined }] },
    { ...next, transactions: [{ ...transfer, amount: 1e12 }] },
    { ...next, transactions: [{ ...transfer, category: "Other" }] },
    {
      ...next,
      transactions: [{ ...transfer, type: "expense", category: "Other" }],
    },
    { ...next, profile: { ...next.profile, bio: "x".repeat(301) } },
    { ...next, goals: [{ ...next.goals[0], cover: "invalid" }] },
    { ...next, goals: [] },
  ]) {
    await assert.rejects(save(saved.revision, invalid));
    assert.deepEqual(await read(), saved);
  }
  const edited = await save(saved.revision, {
    ...next,
    transactions: [{ ...transfer, amount: 600000 }],
  });
  assert.equal(edited.data.goals[0].saved, 500000);
  assert.equal(edited.data.transactions[0].amount, 600000);
  const deleted = await save(edited.revision, { ...next, transactions: [] });
  assert.equal(deleted.data.transactions.length, 0);
  assert.equal(deleted.data.goals[0].saved, 500000);
  await identity(bob);
  assert.deepEqual((await read()).data.transactions, []);
  assert.equal((await read()).data.profile.fullName, "");
});

test("photos round trip privately; old clients preserve them and explicit removal works", async () => {
  await identity(alice);
  const initial = await read();
  assert.equal(initial.supportsPhotos, true);
  const photo = "data:image/jpeg;base64,/9j/";
  const withPhotos = {
    ...payload,
    profile: { ...payload.profile, photo },
    goals: [{ ...payload.goals[0], photo }],
  };
  const saved = await save(initial.revision, withPhotos);
  assert.deepEqual(saved.data, withPhotos);
  // The v2 app before photo support never sends this property.
  const fromOldClient = await save(saved.revision, {
    ...payload,
    name: "Updated elsewhere",
  });
  assert.equal(fromOldClient.data.profile.photo, photo);
  assert.equal(fromOldClient.data.goals[0].photo, photo);
  for (const invalid of [
    "https://example.com/photo.jpg",
    "data:image/svg+xml,<svg/>",
    "data:image/jpeg;base64,invalid!",
    photo + "A".repeat(180000),
  ]) {
    await assert.rejects(
      save(fromOldClient.revision, {
        ...withPhotos,
        profile: { ...withPhotos.profile, photo: invalid },
      }),
    );
    await assert.rejects(
      save(fromOldClient.revision, {
        ...withPhotos,
        goals: [{ ...withPhotos.goals[0], photo: invalid }],
      }),
    );
    assert.deepEqual(await read(), fromOldClient);
  }
  await identity(bob);
  assert.equal(
    (await db.query("select photo from public.buzz_goals")).rows.length,
    0,
  );
  assert.equal((await read()).data.profile.photo, undefined);
  await identity(alice);
  const removed = await save(fromOldClient.revision, {
    ...payload,
    profile: { ...payload.profile, photo: null },
    goals: [{ ...payload.goals[0], photo: null }],
  });
  assert.deepEqual(removed.data, payload);
});
