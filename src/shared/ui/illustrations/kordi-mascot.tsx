"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

interface KordiMascotProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  mood?: "idle" | "correct" | "wrong";
}

const SIZE_PX = {
  xs: 28,
  sm: 64,
  md: 112,
  lg: 176,
} as const;

const MOOD_SRC = {
  idle: "/chordy/chordy-idle.png",
  correct: "/chordy/chordy-correct.png",
  wrong: "/chordy/chordy-wrong.png",
} as const;

export function KordiMascot({ className, size = "md", interactive = false, mood = "idle" }: KordiMascotProps) {
  const [happy, setHappy] = useState(false);

  const px = SIZE_PX[size];
  const src = happy ? MOOD_SRC.correct : MOOD_SRC[mood];

  const handleClick = () => {
    if (!interactive) return;
    setHappy(true);
    setTimeout(() => setHappy(false), 1500);
  };

  return (
    <div
      className={cn(
        interactive && "cursor-pointer select-none active:scale-90 transition-transform duration-150",
        happy && "animate-[wiggle_0.4s_ease-in-out]",
        className,
      )}
      onClick={handleClick}
    >
      <Image
        src={src}
        alt="Chordy"
        width={px}
        height={px}
        className="object-contain"
        priority={size === "md" || size === "lg"}
      />
    </div>
  );
}
