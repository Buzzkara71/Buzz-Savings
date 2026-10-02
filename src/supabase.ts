import { createClient } from "@supabase/supabase-js";
import { parseAppData, type AppData } from "./domain";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudConfigured = Boolean(url && key);
export const cloudConfigError =
  Boolean(url) !== Boolean(key)
    ? "Cloud configuration is incomplete. Set both Supabase environment variables and rebuild."
    : url &&
        (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ||
          !key?.startsWith("sb_publishable_"))
      ? "Cloud configuration is invalid. Check the Supabase URL and publishable key."
      : "";
export const supabase =
  cloudConfigured && !cloudConfigError
    ? createClient(url!, key!, {
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
                : AbortSignal.timeout(20000),
            }),
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export type CloudSnapshot = {
  data: AppData;
  revision: number;
  updatedAt: string;
};
let supportsPhotos = false;
let supportsBankStatements = false;
export class CloudError extends Error {
  constructor(
    message: string,
    public readonly kind: "conflict" | "setup" | "connection" = "connection",
  ) {
    super(message);
  }
}
function cloudError(error: { code?: string; message?: string }): CloudError {
  if (error.code === "40001")
    return new CloudError(
      "Another device has newer changes. Reload the latest data before saving again.",
      "conflict",
    );
  if (["PGRST202", "42P01", "42883"].includes(error.code ?? ""))
    return new CloudError(
      "Cloud storage is not ready yet. The workspace database needs to be set up.",
      "setup",
    );
  if (["22023", "23514", "23505"].includes(error.code ?? ""))
    return new CloudError(
      "The data could not be saved. Check amounts, dates, and duplicate entries.",
    );
  if (["42501", "PGRST301", "PGRST303"].includes(error.code ?? ""))
    return new CloudError(
      "Your session or database permissions need attention. Sign in again and retry.",
    );
  return new CloudError(
    "Could not reach cloud storage. Check your connection and try again.",
  );
}
function snapshot(value: unknown): CloudSnapshot {
  const row = value as
    | (Partial<CloudSnapshot> & {
        supportsPhotos?: boolean;
        supportsBankStatements?: boolean;
      })
    | null;
  if (row?.data?.version !== 2)
    throw new CloudError(
      "Your cloud workspace needs the savings and profile update. Run 202610020001_savings_profile.sql in Supabase SQL Editor, then try again.",
      "setup",
    );
  const data = parseAppData(row?.data);
  if (
    !data ||
    !Number.isSafeInteger(row?.revision) ||
    row!.revision! < 0 ||
    typeof row?.updatedAt !== "string"
  )
    throw new CloudError(
      "The saved workspace could not be read. Your cloud records have not been replaced.",
    );
  supportsPhotos = row.supportsPhotos === true;
  supportsBankStatements = row.supportsBankStatements === true;
  return { data, revision: row!.revision!, updatedAt: row.updatedAt };
}
export async function readCloud(): Promise<CloudSnapshot> {
  if (!supabase)
    throw new CloudError("Cloud storage is not configured.", "setup");
  const { data, error } = await supabase
    .rpc("buzz_read_workspace")
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw cloudError(error);
  return snapshot(data);
}
export async function saveCloud(
  data: AppData,
  revision: number,
): Promise<CloudSnapshot> {
  if (!supabase)
    throw new CloudError("Cloud storage is not configured.", "setup");
  if (
    !supportsPhotos &&
    (data.profile.photo || data.goals.some((goal) => goal.photo))
  ) {
    // Recheck after an administrator applies the migration, keeping the form's
    // photo draft and expected revision intact for a safe retry.
    await readCloud();
    if (!supportsPhotos)
      throw new CloudError(
        "Photo storage needs one update. Run 202610020002_custom_photos.sql in Supabase SQL Editor, then retry saving your photo.",
        "setup",
      );
  }
  // Explicit null means removal. Older app versions omit the field, so the
  // upgraded database preserves their existing photos during unrelated edits.
  if (data.bankStatement && !supportsBankStatements) {
    await readCloud();
    if (!supportsBankStatements)
      throw new CloudError(
        "Bank statement storage needs one update. Run 202610020003_bank_statements.sql in Supabase SQL Editor, then retry the import.",
        "setup",
      );
  }
  const payload = {
    ...data,
    bankStatement: data.bankStatement ?? null,
    profile: { ...data.profile, photo: data.profile.photo ?? null },
    goals: data.goals.map((goal) => ({ ...goal, photo: goal.photo ?? null })),
  };
  const result = await supabase
    .rpc("buzz_save_workspace", {
      p_data: payload,
      p_expected_revision: revision,
    })
    .abortSignal(AbortSignal.timeout(20000));
  if (result.error) throw cloudError(result.error);
  return snapshot(result.data);
}
