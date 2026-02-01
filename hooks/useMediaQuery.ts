"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport matches the given media query.
 * Tailwind breakpoints: sm 640px, md 768px, lg 1024px
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
