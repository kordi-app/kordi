"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  from?: number;
  onComplete: () => void;
}

export function Countdown({ from = 3, onComplete }: CountdownProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  if (count <= 0) return null;

  return (
    <div className="flex flex-1 items-center justify-center">
      <span
        key={count}
        className="animate-[countdown_0.6s_ease-out] text-8xl font-semibold neon-text"
      >
        {count}
      </span>
    </div>
  );
}
