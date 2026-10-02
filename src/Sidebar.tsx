import { useEffect, useRef, useState } from "react";
import type { Profile } from "./domain";
import ProfileAvatar from "./ProfileAvatar";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Layers3,
  Plus,
  Settings2,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

type View = "overview" | "tasks" | "finance" | "goals";
type SidebarProps = {
  navigation: readonly { id: View; label: string; icon: LucideIcon }[];
  activeView: View | null;
  name: string;
  profile: Profile;
  pending: number;
  total: number;
  done: number;
  open: boolean;
  onNavigate: (view: View) => void;
  onAddTask: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onClose: () => void;
};

const descriptions: Record<View, string> = {
  overview: "Your day at a glance",
  tasks: "One task at a time",
  finance: "Know your cash flow",
  goals: "Closer to your dreams",
};

export default function Sidebar({
  navigation,
  activeView,
  name,
  profile,
  pending,
  total,
  done,
  open,
  onNavigate,
  onAddTask,
  onSettings,
  onHelp,
  onClose,
}: SidebarProps) {
  const panel = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 800px)").matches,
  );
  const progress = total ? Math.round((done / total) * 100) : 0;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const changed = () => setMobile(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    if (!open || !mobile) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>(".side-close")?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      if (!buttons?.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", containFocus);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, mobile]);

  return (
    <aside
      ref={panel}
      id="main-sidebar"
      className={`sidebar sidebar-v2 ${open ? "is-open" : ""}`}
      inert={mobile && !open}
      aria-label="My workspace"
      role={mobile && open ? "dialog" : undefined}
      aria-modal={mobile && open ? true : undefined}
    >
      <div className="side-header">
        <button
          className="side-brand"
          onClick={() => onNavigate("overview")}
          aria-label="Buzz, overview"
        >
          <span className="side-brand-symbol">
            <img src="/favicon.svg" alt="" width="39" height="39" />
          </span>
          <span>
            Buzz<span className="side-brand-dot">.</span>
            <small>GOOD DAYS START HERE</small>
          </span>
        </button>
        <button
          className="side-close"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>

      <div className="side-body">
        <button
          className="side-workspace"
          onClick={onSettings}
          aria-label="Workspace settings"
        >
          <span className="side-workspace-icon">
            <Layers3 size={18} />
          </span>
          <span>
            <small>PERSONAL SPACE</small>
            <strong>My workspace</strong>
          </span>
          <ChevronRight size={14} />
        </button>

        <div className="side-section-label">
          <span>YOUR DAILY SPACE</span>
          <span className="side-section-line" />
        </div>
        <nav className="side-navigation" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`side-link ${activeView === id ? "is-active" : ""}`}
              aria-label={label}
              aria-current={activeView === id ? "page" : undefined}
              onClick={() => onNavigate(id)}
            >
              <span className="side-link-icon">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span className="side-link-copy">
                <strong>{label}</strong>
                <small>{descriptions[id]}</small>
              </span>
              {id === "tasks" && pending > 0 ? (
                <span
                  className="side-count"
                  aria-label={`${pending} active tasks`}
                >
                  {pending > 99 ? "99+" : pending}
                </span>
              ) : activeView === id ? (
                <span className="side-active-mark" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </nav>

        <button className="side-add" onClick={onAddTask}>
          <span>
            <Plus size={17} />
            Make a plan
          </span>
          <ArrowUpRight size={16} />
        </button>

        <button
          className="side-progress"
          onClick={() => onNavigate("tasks")}
          aria-label={`View task progress, ${done} of ${total} complete`}
        >
          <div className="side-progress-heading">
            <Sparkles size={13} />
            <span>EVERY STEP COUNTS</span>
          </div>
          <div className="side-progress-content">
            <span
              className="side-progress-ring"
              style={{
                background: `conic-gradient(#22d3ee ${progress}%, #354952 0)`,
              }}
              aria-hidden="true"
            >
              <span>
                {progress === 100 ? (
                  <Check size={20} />
                ) : (
                  <>
                    {progress}
                    <small>%</small>
                  </>
                )}
              </span>
            </span>
            <span>
              <strong>
                {progress === 100 ? "You did it!" : "Your task progress"}
              </strong>
              <small>
                {total
                  ? `${done} of ${total} tasks completed`
                  : "Start with one small step."}
              </small>
            </span>
          </div>
          <span className="side-progress-footer">
            {total ? "Keep your focus" : "View your tasks"}
            <ArrowUpRight size={14} />
          </span>
        </button>
      </div>

      <div className="side-footer">
        <div className="side-utilities">
          <button onClick={onHelp} aria-label="Quick guide">
            <CircleHelp size={16} />
            <span>Guide</span>
          </button>
          <span className="side-utility-divider" />
          <button onClick={onSettings} aria-label="Settings">
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
        </div>
        <button
          className="side-profile"
          onClick={onSettings}
          aria-label="Open profile settings"
        >
          <span className="side-avatar">
            <ProfileAvatar profile={profile} name={name} />
            <i aria-hidden="true" />
          </span>
          <span className="side-profile-copy">
            <strong>{name}</strong>
            <small>{profile.occupation || "Your personal space"}</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
}
