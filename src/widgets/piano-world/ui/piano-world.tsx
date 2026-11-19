"use client";

import dynamic from "next/dynamic";
import type { PianoWorldCopy } from "../model/copy";

// three.js is ~600 KB and needs WebGL — load it on the client only, after the page shell
const PianoWorldScene = dynamic(() => import("./piano-world-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
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
  return <PianoWorldScene copy={copy} playerName={playerName} isGuest={isGuest} />;
}
