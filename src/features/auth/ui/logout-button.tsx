"use client";

import { Button } from "@/shared/ui/button";

interface LogoutButtonProps {
  label: string;
}

export function LogoutButton({ label }: LogoutButtonProps) {
  return (
    <form action="/api/auth/logout" method="POST">
      <Button type="submit" variant="ghost" size="sm">
        {label}
      </Button>
    </form>
  );
}
