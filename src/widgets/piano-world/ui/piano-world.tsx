"use client";

import dynamic from "next/dynamic";
import type { PianoWorldCopy } from "./copy";
import { WorldErrorBoundary } from "./world-error-boundary";
import { WorldLoading } from "./hud/world-loading";

// three.js is ~600 KB and needs WebGL — load it on the client only, after the page shell
const PianoWorldScene = dynamic(() => import("./piano-world-scene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full bg-muted">
      <WorldLoading drawing />
    </div>
  ),
});

export function PianoWorld({
  copy,
  playerName,
  isGuest,
}: {
  copy: PianoWorldCopy;
  playerName: string;
  isGuest: boolean;
}) {
  return (
    <WorldErrorBoundary>
      <PianoWorldScene copy={copy} playerName={playerName} isGuest={isGuest} />
    </WorldErrorBoundary>
  );
}
