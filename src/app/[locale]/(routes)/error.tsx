"use client"; // Error boundaries must be Client Components

import { RouteErrorPage } from "@/views/errors";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteErrorPage error={error} retry={unstable_retry} />;
}
