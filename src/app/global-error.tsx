"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import "./globals.css";

/**
 * Replaces the root layout when it fails, so nothing above it is available: no
 * i18n provider, no theme. Both languages are shown, and the html has its own tags.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="ko">
      <body className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <title>Kordi</title>
        <h1 className="text-xl font-semibold">문제가 생겼어요 · Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요. · Please try again in a moment.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          >
            다시 시도 · Try again
          </button>
          {/* a full page load on purpose: the root layout is what failed */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="h-9 rounded-lg border border-border px-4 text-sm font-medium leading-9">
            홈 · Home
          </a>
        </div>
      </body>
    </html>
  );
}
