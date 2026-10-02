import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { preparePhoto } from "./photos";

export default function PhotoUpload({
  kind,
  value,
  onChange,
  onBusy,
}: {
  kind: "profile" | "goal";
  value?: string | null;
  onChange: (photo: string | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = kind === "profile" ? "profile photo" : "goal photo";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function select(file: File) {
    setError("");
    setBusy(true);
    onBusy(true);
    try {
      const photo = await preparePhoto(file, kind);
      if (mounted.current) onChange(photo);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not prepare this photo. Try another file.",
        );
    } finally {
      if (mounted.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  return (
    <div className={`photo-upload photo-upload-${kind}`}>
      <div className="photo-upload-heading">
        <strong>
          {kind === "profile" ? "Your photo" : "Make it personal"}
        </strong>
        <span>JPG, PNG, WebP · up to 5 MB</span>
      </div>
      {value && (
        <img
          className={`photo-preview photo-preview-${kind}`}
          src={value}
          alt={
            kind === "profile" ? "Profile photo preview" : "Goal photo preview"
          }
        />
      )}
      <div className="photo-upload-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={16} />
          {busy
            ? "Preparing photo…"
            : `${value ? "Change" : "Upload"} ${label}`}
        </button>
        {value && (
          <button
            type="button"
            className="text-button danger"
            disabled={busy}
            onClick={() => {
              setError("");
              onChange(null);
            }}
          >
            <Trash2 size={15} />
            Remove {label}
          </button>
        )}
      </div>
      <input
        ref={input}
        className="photo-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={`Upload ${label}`}
        aria-describedby={`${id}-hint`}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void select(file);
        }}
      />
      <p id={`${id}-hint`} className="form-hint">
        Photos are resized automatically.{" "}
        {kind === "profile"
          ? "Your photo appears in your profile, header, and sidebar."
          : "Your photo replaces the illustration on this goal."}{" "}
        Save your changes to keep it.
      </p>
      {busy && (
        <p className="photo-status" role="status">
          Preparing your photo…
        </p>
      )}
      {error && (
        <p className="photo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
