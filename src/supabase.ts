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
  const row = value as Partial<CloudSnapshot> | null;
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
  const result = await supabase
    .rpc("buzz_save_workspace", { p_data: data, p_expected_revision: revision })
    .abortSignal(AbortSignal.timeout(20000));
  if (result.error) throw cloudError(result.error);
  return snapshot(result.data);
}
