import type { ReactNode } from "react";

interface FriendRowProps {
  name: string;
  avatar: ReactNode;
  /** a short line under the name */
  note?: ReactNode;
  actions?: ReactNode;
}

/** One person in a list: avatar, name (and a note), actions on the right. */
export function FriendRow({ name, avatar, note, actions }: FriendRowProps) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-t5 font-medium text-foreground">{name}</p>
        {note ? <p className="mt-0.5 truncate text-t3 text-muted-foreground">{note}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
