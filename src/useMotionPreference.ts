import { useEffect, useState } from "react";

const MOTION_KEY = "buzz.motion.paused";

export function useMotionPreference() {
  const [paused, setPaused] = useState(() => {
    try {
      return (
        (localStorage.getItem(MOTION_KEY) ??
          localStorage.getItem("ruang.motion.paused")) === "true"
      );
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(MOTION_KEY, String(next));
    } catch {
      /* The preference still applies for this visit. */
    }
  }

  return { enabled: !paused && !reduced, reduced, toggle };
}
