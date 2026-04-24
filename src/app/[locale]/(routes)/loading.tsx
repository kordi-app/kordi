import { Loader2 } from "lucide-react";

/**
 * Shared Suspense fallback for all (routes) pages.
 * Streams the sidebar/header shell while the nested page fetches.
 */
export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Loader2
        className="size-6 animate-spin text-black opacity-60"
        strokeWidth={1.75}
        aria-label="Loading"
      />
    </main>
  );
}
