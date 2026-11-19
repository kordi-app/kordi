/**
 * Signed-out screens live outside the app shell: no sidebar full of pages the
 * visitor cannot open yet, just the page on the cream ground.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-svh flex-col bg-background">{children}</div>;
}
