"use client";

import { Button } from "@/shared/ui/button";

interface LogoutButtonProps {
  label: string;
  className?: string;
}

export function LogoutButton({ label, className }: LogoutButtonProps) {
  return (
    <form action="/api/auth/logout" method="POST" className={className}>
      <Button type="submit" variant="ghost" size="sm" className="w-full">
        {label}
      </Button>
    </form>
  );
}
