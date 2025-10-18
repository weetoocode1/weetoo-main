"use client";

import { cn } from "@/lib/utils";
import { MoonStarIcon, SunIcon } from "lucide-react";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const changeTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    const newTheme = theme === "dark" ? "light" : "dark";

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, [theme, setTheme]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        changeTheme();
      }
    },
    [changeTheme]
  );

  const isDarkMode = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      ref={buttonRef}
      onClick={changeTheme}
      onKeyDown={handleKeyDown}
      className={cn("cursor-pointer", className)}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDarkMode ? (
        <SunIcon className="size-4.5" />
      ) : (
        <MoonStarIcon className="size-4.5" />
      )}
    </Button>
  );
};
