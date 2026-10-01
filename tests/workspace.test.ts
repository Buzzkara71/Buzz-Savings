import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData } from "../src/domain.ts";
import { mergeBrowserData } from "../src/workspace.ts";

test("browser imports add new IDs once and preserve cloud records and settings", () => {
  const cloud: AppData = {
    ...emptyData("Cloud user"),
    budget: 123,
    tasks: [
      {
        id: "shared",
        title: "New title",
        category: "Work",
        priority: "High",
        due: "2026-10-01",
        done: true,
      },
    ],
  };
  const local: AppData = {
    ...emptyData("Old user"),
    budget: 999,
    tasks: [
      { ...cloud.tasks[0], title: "Old title", done: false },
      { ...cloud.tasks[0], id: "new" },
    ],
  };
  const result = mergeBrowserData(cloud, local);
  assert.equal(result.tasks.length, 2);
  assert.deepEqual(result.tasks[0], cloud.tasks[0]);
  assert.equal(result.name, "Cloud user");
  assert.equal(result.budget, 123);
  assert.deepEqual(mergeBrowserData(result, local), result);
  assert.equal(cloud.tasks.length, 1);
});
