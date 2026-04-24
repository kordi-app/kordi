interface MidiStatusProps {
  midiName: string | undefined;
  fallback: string;
}

export function MidiStatus({ midiName, fallback }: MidiStatusProps) {
  return (
    <div className="mb-2 flex w-full max-w-4xl justify-end">
      {midiName ? (
        <span className="flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1 text-xs font-bold uppercase text-white">
          <span className="size-1.5 rounded-full bg-white" />
          {midiName}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1 text-xs font-bold uppercase text-black">
          <span className="size-1.5 rounded-full bg-black opacity-40" />
          {fallback}
        </span>
      )}
    </div>
  );
}
