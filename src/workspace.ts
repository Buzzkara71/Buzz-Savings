import { emptyData, makeDemo, parseAppData, type AppData } from "./domain.ts";

const STORAGE_KEY = "buzz.dashboard.v1";
const LEGACY_STORAGE_KEY = "ruang.dashboard.v1";
export function browserBackup(): AppData | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? parseAppData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function loadLocalData() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    const data = raw ? parseAppData(JSON.parse(raw)) : makeDemo();
    if (!data)
      return {
        data: emptyData(),
        warning:
          "Your saved data could not be read. Restore a backup in Settings before saving new changes.",
      };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      return {
        data,
        warning:
          "Browser storage is unavailable. Download a backup to keep your changes.",
      };
    }
    return { data, warning: "" };
  } catch {
    return {
      data: emptyData(),
      warning:
        "Browser storage is unavailable. Download a backup to keep your changes.",
    };
  }
}
export function saveLocalData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Import is repeatable: existing cloud IDs win, so an older browser never overwrites them.
export function mergeBrowserData(cloud: AppData, local: AppData): AppData {
  const merge = <T extends { id: string }>(existing: T[], incoming: T[]) => {
    const ids = new Set(existing.map((item) => item.id));
    return [...existing, ...incoming.filter((item) => !ids.has(item.id))];
  };
  return {
    ...cloud,
    tasks: merge(cloud.tasks, local.tasks),
    transactions: merge(cloud.transactions, local.transactions),
    goals: merge(cloud.goals, local.goals),
    ...(!cloud.bankStatement && local.bankStatement
      ? { bankStatement: local.bankStatement }
      : {}),
  };
}
