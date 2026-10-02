import { useCallback, useEffect, useRef, useState } from "react";
import { emptyData, isAppData, type AppData } from "./domain";
import { CloudError, readCloud, saveCloud } from "./supabase";
import { loadLocalData, saveLocalData } from "./workspace";

export function useWorkspace(userId: string | undefined, editing: boolean) {
  const [initial] = useState(() =>
    userId ? { data: emptyData(), warning: "" } : loadLocalData(),
  );
  const [data, setData] = useState(initial.data);
  const dataRef = useRef(data);
  const revision = useRef(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const [ready, setReady] = useState(!userId);
  const [loading, setLoading] = useState(Boolean(userId));
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState(initial.warning);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [lastSynced, setLastSynced] = useState("");
  const [failedDraft, setFailedDraft] = useState<AppData | null>(null);
  const draftRef = useRef<AppData | null>(null);

  const refresh = useCallback(
    async (automatic = false) => {
      if (
        !userId ||
        lock.current ||
        (automatic && (editingRef.current || draftRef.current))
      )
        return false;
      lock.current = true;
      const startedWhileEditing = editingRef.current;
      if (mounted.current) setLoading(true);
      try {
        const snapshot = await readCloud();
        if (!mounted.current) return false;
        // A form may have opened while this request was in flight. Keep its
        // original revision so saving cannot silently overwrite newer data.
        if (!startedWhileEditing && editingRef.current) return false;
        revision.current = snapshot.revision;
        dataRef.current = snapshot.data;
        setData(snapshot.data);
        setReady(true);
        setError("");
        setConflict(false);
        setFailedDraft(null);
        draftRef.current = null;
        setLastSynced(new Date().toISOString());
        return true;
      } catch (reason) {
        if (mounted.current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load your cloud workspace. Try again.",
          );
        return false;
      } finally {
        lock.current = false;
        if (mounted.current) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    mounted.current = true;
    if (!userId)
      return () => {
        mounted.current = false;
      };
    void refresh();
    const check = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const timer = window.setInterval(check, 30000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [userId, refresh]);
  useEffect(() => {
    if (!busy && !failedDraft) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, failedDraft]);

  async function update(fn: (previous: AppData) => AppData): Promise<boolean> {
    if (lock.current || !ready || conflict) return false;
    const next = fn(dataRef.current);
    if (!isAppData(next)) {
      setError("Some details are invalid. Please check your entries.");
      return false;
    }
    if (
      new TextEncoder().encode(JSON.stringify(next, null, 2)).length >
      2 * 1024 * 1024
    ) {
      setError(
        "Your workspace is over the 2 MB limit. Remove a photo or use a smaller image, then save again.",
      );
      return false;
    }
    if (!userId) {
      try {
        saveLocalData(next);
        setWarning("");
      } catch {
        setError(
          "Browser storage is full or unavailable. Your changes have not been saved. Download the draft or try a smaller photo.",
        );
        draftRef.current = next;
        setFailedDraft(next);
        return false;
      }
      dataRef.current = next;
      setData(next);
      setError("");
      draftRef.current = null;
      setFailedDraft(null);
      return true;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const snapshot = await saveCloud(next, revision.current);
      if (!mounted.current) return false;
      dataRef.current = snapshot.data;
      revision.current = snapshot.revision;
      setData(snapshot.data);
      setLastSynced(new Date().toISOString());
      draftRef.current = null;
      setFailedDraft(null);
      return true;
    } catch (reason) {
      if (mounted.current) {
        draftRef.current = next;
        setFailedDraft(next);
        setConflict(reason instanceof CloudError && reason.kind === "conflict");
        setError(
          reason instanceof Error
            ? reason.message
            : "Save not confirmed. Check your connection and refresh before retrying.",
        );
      }
      return false;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    data,
    ready,
    loading,
    busy,
    warning,
    error,
    conflict,
    lastSynced,
    failedDraft,
    update,
    refresh,
  };
}
