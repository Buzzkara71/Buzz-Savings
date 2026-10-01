import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sprout,
  Wallet,
} from "lucide-react";
import { lifetimeSummary, money, type AppData, type Goal } from "./domain";

const phrases = [
  "Make space for what matters.",
  "Small steps. Brighter days.",
  "A little saved, a little closer.",
  "Your pace. Your possibilities.",
];
export function RotatingCopy({ enabled }: { enabled: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setIndex((current) => (current + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [enabled]);
  return (
    <div className="rotating-copy">
      <span className="sr-only">
        Plan your day, grow your savings, and make space for what matters.
      </span>
      <span
        key={index}
        className={`rotating-phrase phrase-${index}`}
        aria-hidden="true"
      >
        {phrases[index]}
      </span>
      <span className="phrase-dots" aria-hidden="true">
        {phrases.map((_, i) => (
          <i key={i} className={i === index ? "active" : ""} />
        ))}
      </span>
    </div>
  );
}

export function LifetimeCards({
  data,
  onGoals,
}: {
  data: AppData;
  onGoals: () => void;
}) {
  const totals = lifetimeSummary(data);
  return (
    <section className="lifetime-section" aria-labelledby="lifetime-title">
      <div className="lifetime-heading">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h2 id="lifetime-title">Your money, so far.</h2>
        </div>
        <span className="period-badge">All recorded history</span>
      </div>
      <div className="stats-grid lifetime-grid">
        <section
          className="stat-card balance-card"
          aria-label="Available balance"
        >
          <div className="stat-top">
            <span>Available balance</span>
            <Wallet size={21} />
          </div>
          <strong className="stat-value">{money(totals.balance)}</strong>
          <p className="stat-foot">Income − expenses − savings transfers</p>
          <div className="balance-decoration" />
        </section>
        <section className="stat-card savings-stat" aria-label="Total savings">
          <div className="stat-top">
            <span>In savings goals</span>
            <Sprout size={21} />
          </div>
          <strong className="stat-value">{money(totals.saved)}</strong>
          <button className="text-button" onClick={onGoals}>
            {data.goals.length} goals, growing with you{" "}
            <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="stat-card" aria-label="All-time income">
          <div className="stat-top">
            <span>Total income</span>
            <ArrowDownLeft size={21} />
          </div>
          <strong className="stat-value">{money(totals.income)}</strong>
          <p className="stat-foot">Every recorded income, across all months</p>
        </section>
        <section className="stat-card" aria-label="All-time expenses">
          <div className="stat-top">
            <span>Total expenses</span>
            <ArrowUpRight size={21} />
          </div>
          <strong className="stat-value">{money(totals.expense)}</strong>
          <p className="stat-foot">Spending across all months</p>
        </section>
      </div>
      <div className="total-held">
        <span>
          Total tracked money <strong>{money(totals.total)}</strong>
        </span>
        <span>
          Available balance + savings, including opening goal balances.
        </span>
      </div>
    </section>
  );
}

export function GoalCarousel({
  goals,
  renderGoal,
  create,
}: {
  goals: Goal[];
  renderGoal: (goal: Goal) => ReactNode;
  create: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [end, setEnd] = useState(false);
  function measure() {
    const el = track.current;
    if (!el) return;
    const width =
      (el.firstElementChild?.getBoundingClientRect().width ?? 0) + 20;
    setPosition(Math.round(el.scrollLeft / width));
    setEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 3);
  }
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    measure();
    return () => observer.disconnect();
  }, [goals.length]);
  function move(delta: number) {
    const el = track.current;
    if (el)
      el.scrollBy({
        left:
          delta *
          ((el.firstElementChild?.getBoundingClientRect().width ?? 0) + 20),
      });
  }
  return (
    <section
      className="goal-collection"
      aria-label="Savings goal carousel"
      aria-roledescription="carousel"
    >
      <div className="collection-heading">
        <div>
          <span className="eyebrow">A FUTURE WORTH SAVING FOR</span>
          <h2>Your next chapters</h2>
        </div>
        <div className="carousel-controls">
          <span>
            {goals.length
              ? `${Math.min(position + 1, goals.length)} / ${goals.length}`
              : "No goals yet"}
          </span>
          <button
            className="icon-button outlined"
            aria-label="Previous goals"
            disabled={!position}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button outlined"
            aria-label="Next goals"
            disabled={end}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        className="goal-carousel"
        ref={track}
        onScroll={measure}
        tabIndex={0}
        aria-label="Your savings goals. Use left and right arrow keys to browse."
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            ["ArrowLeft", "ArrowRight"].includes(event.key)
          ) {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {goals.map(renderGoal)}
        <button className="add-goal" onClick={create}>
          <span>+</span>
          <strong>What’s your next dream?</strong>
          <p>Name it. Start making it happen.</p>
        </button>
      </div>
    </section>
  );
}
